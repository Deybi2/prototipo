// =============================================================================
// CONTEXTO DE APLICACION - Matematicas en Verso
// =============================================================================
// Provee el estado global de la aplicacion con persistencia POR USUARIO
// en localStorage. Cada usuario tiene su propio estado guardado.
// =============================================================================

"use client"

import { useState } from "react"
import type React from "react"
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from "react"
import {
  type EstadoGlobal,
  type UsuarioGuardado,
  type MisionDiaria,
  ESTADO_INICIAL,
  ESTADO_ADMIN,
} from "@/tipos/estado-global"
import {
  obtenerSesionRemotaActiva,
  cargarEstadoRemoto,
  guardarEstadoRemoto,
} from "@/lib/sincronizacion-pb"

// -----------------------------------------------------------------------------
// Tipos de Acciones
// -----------------------------------------------------------------------------

type AccionEstado =
  | { type: "INICIAR_SESION"; payload: UsuarioGuardado }
  | { type: "CERRAR_SESION" }
  | { type: "CARGAR_ESTADO"; payload: EstadoGlobal }
  | { type: "AGREGAR_MONEDAS"; payload: number }
  | { type: "RESTAR_MONEDAS"; payload: number }
  | { type: "AGREGAR_EXPERIENCIA"; payload: number }
  | { type: "AGREGAR_ESTRELLAS"; payload: number }
  | { type: "PENALIZAR_ERROR"; payload: number }
  | {
      type: "COMPLETAR_EJERCICIO"
      payload: {
        ejercicioId: string
        correcto: boolean
        xp: number
        monedas: number
      }
    }
  | {
      type: "COMPLETAR_ACTIVIDAD"
      payload: { actividadId: string; siguienteActividadId?: string }
    }
  | {
      type: "COMPLETAR_LECCION"
      payload: { leccionId: string; siguienteLeccionId?: string }
    }
  | {
      type: "COMPLETAR_CATEGORIA"
      payload: { categoriaId: string; siguienteCategoriaId?: string }
    }
  | { type: "DESBLOQUEAR_LECCION"; payload: string }
  | { type: "DESBLOQUEAR_ACTIVIDAD"; payload: string }
  | { type: "DESBLOQUEAR_CATEGORIA"; payload: string }
  | { type: "USAR_PISTA" }
  | { type: "COMPRAR_PISTAS"; payload: number }
  | { type: "ACTIVAR_DOBLE_XP"; payload: number }
  | { type: "ACTIVAR_PROTECCION_RACHA"; payload: number }
  | { type: "DESBLOQUEAR_FRAGMENTO"; payload: string }
  | { type: "DESBLOQUEAR_POEMA"; payload: string }
  | { type: "ACTUALIZAR_RACHA" }
  | { type: "GENERAR_MISIONES_DIARIAS" }
  | {
      type: "ACTUALIZAR_PROGRESO_MISION"
      payload: { misionId: string; progreso: number }
    }
  | { type: "COMPLETAR_MISION"; payload: string }
  | {
      type: "ACTUALIZAR_CONFIGURACION"
      payload: Partial<EstadoGlobal["configuracion"]>
    }
  | { type: "DESBLOQUEAR_LOGRO"; payload: string }
  | { type: "COMPLETAR_FUNDAMENTO"; payload: string }

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const CLAVE_SESION_ACTIVA = "mathverso_sesion_activa"

function claveEstadoUsuario(usuarioId: string): string {
  return `mathverso_estado_${usuarioId}`
}

// -----------------------------------------------------------------------------
// Reducer
// -----------------------------------------------------------------------------

function reducerEstado(
  estado: EstadoGlobal,
  accion: AccionEstado,
): EstadoGlobal {
  switch (accion.type) {
    // ---- Sesion -----------------------------------------------------------
    case "INICIAR_SESION": {
      const usuario = accion.payload
      // Intentar cargar estado guardado de este usuario
      if (typeof window !== "undefined") {
        const clave = claveEstadoUsuario(usuario.id)
        const guardado = localStorage.getItem(clave)
        if (guardado) {
          const estadoGuardado = JSON.parse(guardado) as EstadoGlobal
          // Actualizar la referencia del usuario actual por si cambio algo
          return { ...estadoGuardado, usuarioActual: usuario }
        }
      }
      // Si es admin, estado con todo desbloqueado
      if (usuario.esAdmin) {
        return { ...ESTADO_ADMIN, usuarioActual: usuario }
      }
      // Nuevo usuario: estado inicial limpio
      return { ...ESTADO_INICIAL, usuarioActual: usuario }
    }

    case "CERRAR_SESION": {
      return ESTADO_INICIAL
    }

    case "CARGAR_ESTADO":
      return accion.payload

    // ---- Monedas y XP -----------------------------------------------------
    case "AGREGAR_MONEDAS":
      return {
        ...estado,
        estadisticas: {
          ...estado.estadisticas,
          monedas: estado.estadisticas.monedas + accion.payload,
        },
      }

    case "RESTAR_MONEDAS":
      return {
        ...estado,
        estadisticas: {
          ...estado.estadisticas,
          monedas: Math.max(0, estado.estadisticas.monedas - accion.payload),
        },
      }

    case "AGREGAR_EXPERIENCIA": {
      let nuevaExperiencia = estado.estadisticas.experiencia + accion.payload
      let nuevoNivel = estado.estadisticas.nivel
      let xpParaSiguiente = estado.estadisticas.experienciaParaSiguienteNivel
      let monedasBonus = 0

      // Aplicar doble XP si esta activo
      if (estado.inventario.dobleXPActivo) {
        const fechaFin = estado.inventario.dobleXPHastaFecha
        if (fechaFin && new Date(fechaFin) > new Date()) {
          nuevaExperiencia =
            estado.estadisticas.experiencia + accion.payload * 2
        }
      }

      // Subir de nivel si corresponde
      while (nuevaExperiencia >= xpParaSiguiente) {
        nuevaExperiencia -= xpParaSiguiente
        nuevoNivel += 1
        xpParaSiguiente = nuevoNivel * 100
        monedasBonus += 50
      }

      return {
        ...estado,
        estadisticas: {
          ...estado.estadisticas,
          experiencia: nuevaExperiencia,
          nivel: nuevoNivel,
          experienciaParaSiguienteNivel: xpParaSiguiente,
          monedas: estado.estadisticas.monedas + monedasBonus,
        },
      }
    }

    case "AGREGAR_ESTRELLAS":
      return {
        ...estado,
        estadisticas: {
          ...estado.estadisticas,
          estrellas: estado.estadisticas.estrellas + accion.payload,
        },
      }

    case "PENALIZAR_ERROR": {
      const xpPenalizado = Math.min(
        accion.payload,
        estado.estadisticas.experiencia,
      )
      return {
        ...estado,
        estadisticas: {
          ...estado.estadisticas,
          experiencia: estado.estadisticas.experiencia - xpPenalizado,
          rachaActual: estado.inventario.proteccionRachaActiva
            ? estado.estadisticas.rachaActual
            : 0,
        },
      }
    }

    // ---- Completar ejercicio (XP + monedas + penalizacion) ----------------
    case "COMPLETAR_EJERCICIO": {
      const { ejercicioId, correcto, xp, monedas } = accion.payload
      const nuevosEjercicios =
        estado.progreso.ejerciciosCompletados.includes(ejercicioId)
          ? estado.progreso.ejerciciosCompletados
          : [...estado.progreso.ejerciciosCompletados, ejercicioId]

      let nuevaExperiencia = estado.estadisticas.experiencia
      let nuevasMonedas = estado.estadisticas.monedas
      let nuevaRacha = estado.estadisticas.rachaActual
      let nuevasEstrellas = estado.estadisticas.estrellas

      if (correcto) {
        nuevaExperiencia += xp
        nuevasMonedas += monedas
        nuevaRacha += 1
        nuevasEstrellas += Math.floor(xp / 2)
      } else {
        // Penalizacion por error: -5 XP
        nuevaExperiencia = Math.max(0, nuevaExperiencia - 5)
        if (!estado.inventario.proteccionRachaActiva) {
          nuevaRacha = 0
        }
      }

      // Verificar subida de nivel
      let nuevoNivel = estado.estadisticas.nivel
      let xpParaSiguiente = estado.estadisticas.experienciaParaSiguienteNivel
      while (nuevaExperiencia >= xpParaSiguiente) {
        nuevaExperiencia -= xpParaSiguiente
        nuevoNivel += 1
        xpParaSiguiente = nuevoNivel * 100
        nuevasMonedas += 50
      }

      const misionesActualizadas = estado.misionesDiarias.map((mision) => {
        if (mision.completada) return mision
        if (mision.tipo === "ejercicios") {
          const progreso = Math.min(mision.objetivo, mision.progresoActual + 1)
          return { ...mision, progresoActual: progreso, completada: progreso >= mision.objetivo }
        }
        if (mision.tipo === "perfecto" && correcto) {
          const progreso = Math.min(mision.objetivo, mision.progresoActual + 1)
          return { ...mision, progresoActual: progreso, completada: progreso >= mision.objetivo }
        }
        return mision
      })

      return {
        ...estado,
        estadisticas: {
          ...estado.estadisticas,
          experiencia: nuevaExperiencia,
          monedas: nuevasMonedas,
          nivel: nuevoNivel,
          experienciaParaSiguienteNivel: xpParaSiguiente,
          estrellas: nuevasEstrellas,
          rachaActual: nuevaRacha,
          rachaMaxima: Math.max(estado.estadisticas.rachaMaxima, nuevaRacha),
          ejerciciosTotales: estado.estadisticas.ejerciciosTotales + 1,
          ejerciciosCorrectos:
            estado.estadisticas.ejerciciosCorrectos + (correcto ? 1 : 0),
          ultimaActividad: new Date().toISOString(),
        },
        progreso: {
          ...estado.progreso,
          ejerciciosCompletados: nuevosEjercicios,
        },
        misionesDiarias: misionesActualizadas,
      }
    }

    case "COMPLETAR_FUNDAMENTO": {
      if (estado.progreso.fundamentosCompletados.includes(accion.payload)) {
        return estado
      }
      return {
        ...estado,
        progreso: {
          ...estado.progreso,
          fundamentosCompletados: [...estado.progreso.fundamentosCompletados, accion.payload],
        },
        estadisticas: {
          ...estado.estadisticas,
          experiencia: estado.estadisticas.experiencia + 20,
          monedas: estado.estadisticas.monedas + 10,
        },
      }
    }

    // ---- Completar actividad / leccion / categoria ------------------------
    case "COMPLETAR_ACTIVIDAD": {
      const { actividadId, siguienteActividadId } = accion.payload
      const nuevasCompletadas =
        estado.progreso.actividadesCompletadas.includes(actividadId)
          ? estado.progreso.actividadesCompletadas
          : [...estado.progreso.actividadesCompletadas, actividadId]

      let nuevasDesbloqueadas = estado.progreso.actividadesDesbloqueadas
      if (
        siguienteActividadId &&
        !nuevasDesbloqueadas.includes(siguienteActividadId)
      ) {
        nuevasDesbloqueadas = [...nuevasDesbloqueadas, siguienteActividadId]
      }

      return {
        ...estado,
        progreso: {
          ...estado.progreso,
          actividadesCompletadas: nuevasCompletadas,
          actividadesDesbloqueadas: nuevasDesbloqueadas,
        },
      }
    }

    case "COMPLETAR_LECCION": {
      const { leccionId, siguienteLeccionId } = accion.payload
      const nuevasCompletadas =
        estado.progreso.leccionesCompletadas.includes(leccionId)
          ? estado.progreso.leccionesCompletadas
          : [...estado.progreso.leccionesCompletadas, leccionId]

      let nuevasDesbloqueadas = estado.progreso.leccionesDesbloqueadas
      if (
        siguienteLeccionId &&
        !nuevasDesbloqueadas.includes(siguienteLeccionId)
      ) {
        nuevasDesbloqueadas = [...nuevasDesbloqueadas, siguienteLeccionId]
      }

      return {
        ...estado,
        progreso: {
          ...estado.progreso,
          leccionesCompletadas: nuevasCompletadas,
          leccionesDesbloqueadas: nuevasDesbloqueadas,
        },
      }
    }

    case "COMPLETAR_CATEGORIA": {
      const { categoriaId, siguienteCategoriaId } = accion.payload
      const nuevasCompletadas =
        estado.progreso.categoriasCompletadas.includes(categoriaId)
          ? estado.progreso.categoriasCompletadas
          : [...estado.progreso.categoriasCompletadas, categoriaId]

      let nuevasDesbloqueadas = estado.progreso.categoriasDesbloqueadas
      if (
        siguienteCategoriaId &&
        !nuevasDesbloqueadas.includes(siguienteCategoriaId)
      ) {
        nuevasDesbloqueadas = [...nuevasDesbloqueadas, siguienteCategoriaId]
      }

      return {
        ...estado,
        progreso: {
          ...estado.progreso,
          categoriasCompletadas: nuevasCompletadas,
          categoriasDesbloqueadas: nuevasDesbloqueadas,
        },
      }
    }

    // ---- Desbloquear elementos --------------------------------------------
    case "DESBLOQUEAR_LECCION":
      if (estado.progreso.leccionesDesbloqueadas.includes(accion.payload))
        return estado
      return {
        ...estado,
        progreso: {
          ...estado.progreso,
          leccionesDesbloqueadas: [
            ...estado.progreso.leccionesDesbloqueadas,
            accion.payload,
          ],
        },
      }

    case "DESBLOQUEAR_ACTIVIDAD":
      if (estado.progreso.actividadesDesbloqueadas.includes(accion.payload))
        return estado
      return {
        ...estado,
        progreso: {
          ...estado.progreso,
          actividadesDesbloqueadas: [
            ...estado.progreso.actividadesDesbloqueadas,
            accion.payload,
          ],
        },
      }

    case "DESBLOQUEAR_CATEGORIA":
      if (estado.progreso.categoriasDesbloqueadas.includes(accion.payload))
        return estado
      return {
        ...estado,
        progreso: {
          ...estado.progreso,
          categoriasDesbloqueadas: [
            ...estado.progreso.categoriasDesbloqueadas,
            accion.payload,
          ],
        },
      }

    // ---- Inventario -------------------------------------------------------
    case "USAR_PISTA":
      if (estado.inventario.pistasDisponibles <= 0) return estado
      return {
        ...estado,
        inventario: {
          ...estado.inventario,
          pistasDisponibles: estado.inventario.pistasDisponibles - 1,
        },
      }

    case "COMPRAR_PISTAS":
      return {
        ...estado,
        inventario: {
          ...estado.inventario,
          pistasDisponibles:
            estado.inventario.pistasDisponibles + accion.payload,
        },
      }

    case "ACTIVAR_DOBLE_XP": {
      const fechaFin = new Date()
      fechaFin.setDate(fechaFin.getDate() + accion.payload)
      return {
        ...estado,
        inventario: {
          ...estado.inventario,
          dobleXPActivo: true,
          dobleXPHastaFecha: fechaFin.toISOString(),
        },
      }
    }

    case "ACTIVAR_PROTECCION_RACHA": {
      const fechaFin = new Date()
      fechaFin.setDate(fechaFin.getDate() + accion.payload)
      return {
        ...estado,
        inventario: {
          ...estado.inventario,
          proteccionRachaActiva: true,
          proteccionRachaHastaFecha: fechaFin.toISOString(),
        },
      }
    }

    case "DESBLOQUEAR_FRAGMENTO":
      if (estado.inventario.fragmentosPoemas.includes(accion.payload))
        return estado
      return {
        ...estado,
        inventario: {
          ...estado.inventario,
          fragmentosPoemas: [
            ...estado.inventario.fragmentosPoemas,
            accion.payload,
          ],
        },
      }

    case "DESBLOQUEAR_POEMA":
      if (estado.inventario.poemasDesbloqueados.includes(accion.payload))
        return estado
      return {
        ...estado,
        inventario: {
          ...estado.inventario,
          poemasDesbloqueados: [
            ...estado.inventario.poemasDesbloqueados,
            accion.payload,
          ],
        },
      }

    // ---- Racha ------------------------------------------------------------
    case "ACTUALIZAR_RACHA": {
      const hoy = new Date().toDateString()
      const ultimaActividad = estado.estadisticas.ultimaActividad
        ? new Date(estado.estadisticas.ultimaActividad).toDateString()
        : null

      if (hoy === ultimaActividad) return estado

      const ayer = new Date()
      ayer.setDate(ayer.getDate() - 1)
      const ayerStr = ayer.toDateString()

      let nuevaRacha = estado.estadisticas.rachaActual
      if (ultimaActividad === ayerStr) {
        nuevaRacha += 1
      } else if (ultimaActividad !== hoy) {
        if (!estado.inventario.proteccionRachaActiva) {
          nuevaRacha = 1
        }
      }

      return {
        ...estado,
        estadisticas: {
          ...estado.estadisticas,
          rachaActual: nuevaRacha,
          rachaMaxima: Math.max(estado.estadisticas.rachaMaxima, nuevaRacha),
          ultimaActividad: new Date().toISOString(),
        },
      }
    }

    // ---- Misiones diarias -------------------------------------------------
    case "GENERAR_MISIONES_DIARIAS": {
      const hoy = new Date().toDateString()
      const misionesActuales = estado.misionesDiarias
      if (
        misionesActuales.length > 0 &&
        new Date(misionesActuales[0].fechaAsignada).toDateString() === hoy
      ) {
        return estado
      }

      const plantillas: Omit<MisionDiaria, "id" | "fechaAsignada" | "progresoActual" | "completada" | "reclamada">[] = [
        { titulo: "Ronda veloz", descripcion: "Completa 4 ejercicios", tipo: "ejercicios", objetivo: 4, recompensaXP: 40, recompensaMonedas: 20 },
        { titulo: "Precisión total", descripcion: "Responde 3 ejercicios correctos", tipo: "perfecto", objetivo: 3, recompensaXP: 60, recompensaMonedas: 30 },
        { titulo: "Impulso de práctica", descripcion: "Completa 6 ejercicios", tipo: "ejercicios", objetivo: 6, recompensaXP: 70, recompensaMonedas: 35 },
        { titulo: "Racha encendida", descripcion: "Mantén tu racha activa hoy", tipo: "racha", objetivo: 1, recompensaXP: 30, recompensaMonedas: 15 },
        { titulo: "Tiempo de estudio", descripcion: "Resuelve 5 ejercicios del día", tipo: "tiempo", objetivo: 5, recompensaXP: 55, recompensaMonedas: 25 },
      ]
      const cantidad = 3 + Math.floor(Math.random() * 3)
      const seleccionadas = [...plantillas].sort(() => Math.random() - 0.5).slice(0, cantidad)
      const nuevasMisiones: MisionDiaria[] = seleccionadas.map((misionBase, indice) => ({
        ...misionBase,
        id: `mision-${Date.now()}-${indice}`,
        progresoActual: misionBase.tipo === "racha" && estado.estadisticas.rachaActual > 0 ? 1 : 0,
        completada: misionBase.tipo === "racha" && estado.estadisticas.rachaActual > 0,
        reclamada: false,
        fechaAsignada: new Date().toISOString(),
      }))

      return { ...estado, misionesDiarias: nuevasMisiones, ultimaFechaMisiones: new Date().toISOString() }
    }

    case "ACTUALIZAR_PROGRESO_MISION": {
      const { misionId, progreso } = accion.payload
      return {
        ...estado,
        misionesDiarias: estado.misionesDiarias.map((mision) =>
          mision.id === misionId
            ? {
                ...mision,
                progresoActual: Math.min(progreso, mision.objetivo),
                completada: progreso >= mision.objetivo,
              }
            : mision,
        ),
      }
    }

    case "COMPLETAR_MISION": {
      const mision = estado.misionesDiarias.find(
        (m) => m.id === accion.payload,
      )
      if (!mision || !mision.completada || mision.reclamada) return estado
      return {
        ...estado,
        estadisticas: {
          ...estado.estadisticas,
          experiencia:
            estado.estadisticas.experiencia + mision.recompensaXP,
          monedas: estado.estadisticas.monedas + mision.recompensaMonedas,
        },
        misionesDiarias: estado.misionesDiarias.map((m) =>
          m.id === accion.payload ? { ...m, reclamada: true } : m,
        ),
      }
    }

    case "ACTUALIZAR_CONFIGURACION":
      return {
        ...estado,
        configuracion: { ...estado.configuracion, ...accion.payload },
      }

    case "DESBLOQUEAR_LOGRO":
      if (estado.inventario.logrosDesbloqueados.includes(accion.payload))
        return estado
      return {
        ...estado,
        inventario: {
          ...estado.inventario,
          logrosDesbloqueados: [
            ...estado.inventario.logrosDesbloqueados,
            accion.payload,
          ],
        },
        estadisticas: {
          ...estado.estadisticas,
          monedas: estado.estadisticas.monedas + 100,
        },
      }

    default:
      return estado
  }
}

// -----------------------------------------------------------------------------
// Contexto
// -----------------------------------------------------------------------------

interface ContextoAplicacionType {
  estado: EstadoGlobal
  dispatch: React.Dispatch<AccionEstado>
  guardarEstado: () => void
}

const ContextoAplicacion = createContext<ContextoAplicacionType | null>(null)

// -----------------------------------------------------------------------------
// Provider -- persiste POR USUARIO
// -----------------------------------------------------------------------------

export function ProveedorAplicacion({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(reducerEstado, ESTADO_INICIAL)
  const [cargado, setCargado] = useState(false)

  // 1. Restaurar solo sesión remota válida
  useEffect(() => {
    const inicializar = async () => {
      try {
        const sesionRemota = await obtenerSesionRemotaActiva()
        if (sesionRemota) {
          const estadoRemoto = await cargarEstadoRemoto(sesionRemota.id)
          if (estadoRemoto) {
            dispatch({ type: "CARGAR_ESTADO", payload: { ...estadoRemoto, usuarioActual: sesionRemota } })
          } else {
            dispatch({ type: "CARGAR_ESTADO", payload: { ...ESTADO_INICIAL, usuarioActual: sesionRemota } })
          }
        } else {
          dispatch({ type: "CERRAR_SESION" })
        }
      } catch (error) {
        console.error("Error cargando estado:", error)
        dispatch({ type: "CERRAR_SESION" })
      } finally {
        setCargado(true)
      }
    }
    void inicializar()
  }, [])

  // 2. Guardar estado cada vez que cambie (si hay usuario logueado)
  useEffect(() => {
    if (!cargado) return
    if (!estado.usuarioActual) return

    const clave = claveEstadoUsuario(estado.usuarioActual.id)
    localStorage.setItem(clave, JSON.stringify(estado))
    localStorage.setItem(CLAVE_SESION_ACTIVA, estado.usuarioActual.id)
    void guardarEstadoRemoto(estado.usuarioActual.id, estado)
  }, [estado, cargado])


  useEffect(() => {
    if (!cargado) return
    document.documentElement.classList.toggle("dark", estado.configuracion.modoNocturno)
  }, [estado.configuracion.modoNocturno, cargado])

  // 3. Limpiar sesion activa al cerrar sesion
  useEffect(() => {
    if (cargado && !estado.usuarioActual) {
      localStorage.removeItem(CLAVE_SESION_ACTIVA)
    }
  }, [estado.usuarioActual, cargado])

  const guardarEstado = () => {
    if (estado.usuarioActual) {
      const clave = claveEstadoUsuario(estado.usuarioActual.id)
      localStorage.setItem(clave, JSON.stringify(estado))
    }
  }

  if (!cargado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-700">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <ContextoAplicacion.Provider value={{ estado, dispatch, guardarEstado }}>
      {children}
    </ContextoAplicacion.Provider>
  )
}

// -----------------------------------------------------------------------------
// Hook personalizado
// -----------------------------------------------------------------------------

export function useAplicacion() {
  const contexto = useContext(ContextoAplicacion)
  if (!contexto) {
    throw new Error("useAplicacion debe usarse dentro de ProveedorAplicacion")
  }
  return contexto
}

// -----------------------------------------------------------------------------
// Utilidades legacy (sin autenticación local)
// -----------------------------------------------------------------------------

export function obtenerUsuarios(): UsuarioGuardado[] { return [] }
export function guardarUsuario(): boolean { return false }
export function buscarUsuarioPorEmail(): UsuarioGuardado | null { return null }
export function validarCredenciales(): UsuarioGuardado | null { return null }

export function obtenerEstadoUsuario(usuarioId: string): EstadoGlobal | null {
  if (typeof window === "undefined") return null
  const clave = claveEstadoUsuario(usuarioId)
  const guardado = localStorage.getItem(clave)
  return guardado ? (JSON.parse(guardado) as EstadoGlobal) : null
}

export function guardarEstadoUsuario(usuarioId: string, estado: EstadoGlobal): void {
  if (typeof window === "undefined") return
  const clave = claveEstadoUsuario(usuarioId)
  localStorage.setItem(clave, JSON.stringify(estado))
}
