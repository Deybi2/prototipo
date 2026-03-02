import type { EstadoGlobal, UsuarioGuardado } from "@/tipos/estado-global"
import { pb, pocketbaseConfigurado } from "@/lib/pocketbase"

const COLECCION_USUARIOS = process.env.NEXT_PUBLIC_PB_COLECCION_USUARIOS || "usuarios"
const COLECCION_ESTADOS = process.env.NEXT_PUBLIC_PB_COLECCION_ESTADOS || "estados_usuario"

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

export async function iniciarSesionRemota(email: string, contraseña: string): Promise<UsuarioGuardado | null> {
  if (!pocketbaseConfigurado) return null
  try {
    const auth = await pb.collection(COLECCION_USUARIOS).authWithPassword(email, contraseña)
    return usuarioDesdeRecord(auth.record)
  } catch {
    return null
  }
}

export async function registrarUsuarioRemoto(payload: {
  email: string
  contraseña: string
  nombreUsuario: string
}): Promise<UsuarioGuardado | null> {
  if (!pocketbaseConfigurado) return null
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
    return usuarioDesdeRecord(auth.record)
  } catch {
    return null
  }
}

export async function cargarEstadoRemoto(usuarioId: string): Promise<EstadoGlobal | null> {
  if (!pocketbaseConfigurado) return null
  try {
    const registro = await pb.collection(COLECCION_ESTADOS).getFirstListItem(`usuarioId="${usuarioId}"`)
    return (registro.snapshot || null) as EstadoGlobal | null
  } catch {
    return null
  }
}

export async function guardarEstadoRemoto(usuarioId: string, estado: EstadoGlobal): Promise<void> {
  if (!pocketbaseConfigurado) return
  try {
    const existente = await pb.collection(COLECCION_ESTADOS).getFirstListItem(`usuarioId="${usuarioId}"`)
    await pb.collection(COLECCION_ESTADOS).update(existente.id, {
      usuarioId,
      snapshot: estado,
      actualizadoEn: new Date().toISOString(),
    })
  } catch {
    try {
      await pb.collection(COLECCION_ESTADOS).create({
        usuarioId,
        snapshot: estado,
        actualizadoEn: new Date().toISOString(),
      })
    } catch (error) {
      console.error("No se pudo sincronizar estado con PocketBase", error)
    }
  }
}

export async function obtenerSesionRemotaActiva(): Promise<UsuarioGuardado | null> {
  if (!pocketbaseConfigurado) return null
  if (!pb.authStore.isValid || !pb.authStore.model) return null
  return usuarioDesdeRecord(pb.authStore.model)
}
