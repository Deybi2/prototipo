"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useAplicacion, validarCredenciales, obtenerEstadoUsuario } from "@/contextos/contexto-aplicacion"
import { ESTADO_INICIAL, ESTADO_ADMIN } from "@/tipos/estado-global"
import { iniciarSesionRemota, cargarEstadoRemoto } from "@/lib/sincronizacion-pb"

export default function PantallaInicioSesion() {
  const router = useRouter()
  const { dispatch } = useAplicacion()
  const [formulario, setFormulario] = useState({ email: "", contraseña: "" })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError(null)

    const remoto = await iniciarSesionRemota(formulario.email, formulario.contraseña)
    if (remoto) {
      const estadoRemoto = await cargarEstadoRemoto(remoto.id)
      dispatch({ type: "CARGAR_ESTADO", payload: estadoRemoto ? { ...estadoRemoto, usuarioActual: remoto } : { ...ESTADO_INICIAL, usuarioActual: remoto } })
      setCargando(false)
      router.push("/mapa")
      return
    }

    const usuarioLocal = validarCredenciales(formulario.email, formulario.contraseña)
    if (!usuarioLocal) {
      setError("No se pudo autenticar en PocketBase ni en modo local.")
      setCargando(false)
      return
    }

    let estadoUsuario = obtenerEstadoUsuario(usuarioLocal.id)
    if (!estadoUsuario) {
      estadoUsuario = usuarioLocal.esAdmin ? { ...ESTADO_ADMIN, usuarioActual: usuarioLocal } : { ...ESTADO_INICIAL, usuarioActual: usuarioLocal }
    } else {
      estadoUsuario.usuarioActual = usuarioLocal
    }

    dispatch({ type: "CARGAR_ESTADO", payload: estadoUsuario })
    setCargando(false)
    router.push("/mapa")
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button onClick={() => router.push("/bienvenida")} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-8"><ArrowLeft size={20} /><span>Volver</span></button>
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-8">Iniciar Sesión</h1>
        <form onSubmit={manejarEnvio} className="space-y-5">
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formulario.email} onChange={(e) => setFormulario((p) => ({ ...p, email: e.target.value }))} required /></div>
          <div className="space-y-2"><Label htmlFor="contraseña">Contraseña</Label><Input id="contraseña" type="password" value={formulario.contraseña} onChange={(e) => setFormulario((p) => ({ ...p, contraseña: e.target.value }))} required /></div>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-600 text-sm">{error}</p></div>}
          <Button type="submit" disabled={cargando} className="w-full py-6 text-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl">{cargando ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Ingresando...</> : "Entrar"}</Button>
        </form>
      </div>
    </main>
  )
}
