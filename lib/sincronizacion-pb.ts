import type { EstadoGlobal, UsuarioGuardado } from "@/tipos/estado-global"
import { pb, pocketbaseConfigurado } from "@/lib/pocketbase"

const COLECCION_USUARIOS = process.env.NEXT_PUBLIC_PB_COLECCION_USUARIOS || "usuarios"
const COLECCION_ESTADOS = process.env.NEXT_PUBLIC_PB_COLECCION_ESTADOS || "estados_usuario"

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string; status?: number }

function usuarioDesdeRecord(record: any): UsuarioGuardado {
  return {
    id: record.id,
    email: record.email,
    nombreUsuario: record.nombreUsuario || record.username || record.email,
    nombre: record.nombre || record.name || record.email,
    contraseña: "",
    esAdmin: Boolean(record.esAdmin),
    fechaRegistro: record.created || new Date().toISOString(),
  }
}

function parseError(error: any): { mensaje: string; status?: number } {
  const status = error?.status
  const data = error?.response?.data
  if (status === 0 || /Failed to fetch|NetworkError|fetch/i.test(String(error?.message || ""))) {
    return { mensaje: "No hay conexión con el servidor. Intenta más tarde.", status }
  }
  if (status === 401) return { mensaje: "Correo o contraseña inválidos.", status }
  if (status === 400 && (data?.email?.code === "validation_not_unique" || data?.email?.message?.includes("unique"))) {
    return { mensaje: "Ya existe una cuenta registrada con este correo.", status }
  }
  if (status === 500) return { mensaje: "Error interno del servidor. Intenta más tarde.", status }
  return { mensaje: data?.message || "Ocurrió un error inesperado.", status }
}

export async function verificarConexionPocketBase(): Promise<Resultado<true>> {
  if (!pocketbaseConfigurado) return { ok: false, error: "No hay conexión con el servidor. Intenta más tarde." }
  try {
    await pb.health.check()
    await pb.collection(COLECCION_USUARIOS).getList(1, 1)
    return { ok: true, data: true }
  } catch (error) {
    const parsed = parseError(error)
    return { ok: false, error: parsed.mensaje, status: parsed.status }
  }
}

export async function iniciarSesionRemota(email: string, contraseña: string): Promise<Resultado<UsuarioGuardado>> {
  const conexion = await verificarConexionPocketBase()
  if (!conexion.ok) return conexion
  try {
    const auth = await pb.collection(COLECCION_USUARIOS).authWithPassword(email, contraseña)
    return { ok: true, data: usuarioDesdeRecord(auth.record) }
  } catch (error) {
    const parsed = parseError(error)
    pb.authStore.clear()
    return { ok: false, error: parsed.mensaje, status: parsed.status }
  }
}

export async function registrarUsuarioRemoto(payload: {
  email: string
  contraseña: string
  nombreUsuario: string
}): Promise<Resultado<UsuarioGuardado>> {
  const conexion = await verificarConexionPocketBase()
  if (!conexion.ok) return conexion
  try {
    await pb.collection(COLECCION_USUARIOS).create({
      email: payload.email,
      password: payload.contraseña,
      passwordConfirm: payload.contraseña,
      nombreUsuario: payload.nombreUsuario,
      nombre: payload.nombreUsuario,
      esAdmin: false,
    })
    const auth = await pb.collection(COLECCION_USUARIOS).authWithPassword(payload.email, payload.contraseña)
    return { ok: true, data: usuarioDesdeRecord(auth.record) }
  } catch (error) {
    const parsed = parseError(error)
    pb.authStore.clear()
    return { ok: false, error: parsed.mensaje, status: parsed.status }
  }
}

export async function cargarEstadoRemoto(usuarioId: string): Promise<EstadoGlobal | null> {
  try {
    const registro = await pb.collection(COLECCION_ESTADOS).getFirstListItem(`usuarioId="${usuarioId}"`)
    return (registro.snapshot || null) as EstadoGlobal | null
  } catch {
    return null
  }
}

export async function guardarEstadoRemoto(usuarioId: string, estado: EstadoGlobal): Promise<void> {
  try {
    const existente = await pb.collection(COLECCION_ESTADOS).getFirstListItem(`usuarioId="${usuarioId}"`)
    await pb.collection(COLECCION_ESTADOS).update(existente.id, { usuarioId, snapshot: estado, actualizadoEn: new Date().toISOString() })
  } catch {
    try {
      await pb.collection(COLECCION_ESTADOS).create({ usuarioId, snapshot: estado, actualizadoEn: new Date().toISOString() })
    } catch (error) {
      console.error("No se pudo sincronizar estado con PocketBase", error)
    }
  }
}

export async function obtenerSesionRemotaActiva(): Promise<UsuarioGuardado | null> {
  if (!pocketbaseConfigurado || !pb.authStore.isValid || !pb.authStore.model) return null
  try {
    await pb.collection(COLECCION_USUARIOS).authRefresh()
    return usuarioDesdeRecord(pb.authStore.model)
  } catch {
    pb.authStore.clear()
    return null
  }
}

export function cerrarSesionRemota() {
  pb.authStore.clear()
}
