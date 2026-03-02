"use client"

import { useCallback, useState } from "react"
import { ESTADO_INICIAL } from "@/tipos/estado-global"
import { useAplicacion } from "@/contextos/contexto-aplicacion"
import {
  iniciarSesionRemota,
  registrarUsuarioRemoto,
  cargarEstadoRemoto,
  verificarConexionPocketBase,
  cerrarSesionRemota,
} from "@/lib/sincronizacion-pb"

export function useAuthPocketbase() {
  const { dispatch } = useAplicacion()
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (email: string, contraseña: string) => {
    setCargando(true)
    setError(null)
    const result = await iniciarSesionRemota(email, contraseña)
    if (!result.ok) {
      dispatch({ type: "CERRAR_SESION" })
      setError(result.error)
      setCargando(false)
      return false
    }
    const estadoRemoto = await cargarEstadoRemoto(result.data.id)
    dispatch({ type: "CARGAR_ESTADO", payload: estadoRemoto ? { ...estadoRemoto, usuarioActual: result.data } : { ...ESTADO_INICIAL, usuarioActual: result.data } })
    setCargando(false)
    return true
  }, [dispatch])

  const register = useCallback(async (nombreUsuario: string, email: string, contraseña: string) => {
    setCargando(true)
    setError(null)
    const result = await registrarUsuarioRemoto({ nombreUsuario, email, contraseña })
    if (!result.ok) {
      setError(result.error)
      setCargando(false)
      return false
    }
    dispatch({ type: "CARGAR_ESTADO", payload: { ...ESTADO_INICIAL, usuarioActual: result.data } })
    setCargando(false)
    return true
  }, [dispatch])

  const verificarConexion = useCallback(async () => {
    const result = await verificarConexionPocketBase()
    if (!result.ok) setError(result.error)
    return result.ok
  }, [])

  const cerrarSesion = useCallback(() => {
    cerrarSesionRemota()
    dispatch({ type: "CERRAR_SESION" })
  }, [dispatch])

  return { cargando, error, setError, login, register, verificarConexion, cerrarSesion }
}
