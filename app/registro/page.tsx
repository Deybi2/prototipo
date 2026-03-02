"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useAplicacion, guardarUsuario, buscarUsuarioPorEmail, guardarEstadoUsuario } from "@/contextos/contexto-aplicacion"
import { ESTADO_INICIAL, type UsuarioGuardado } from "@/tipos/estado-global"
import { registrarUsuarioRemoto } from "@/lib/sincronizacion-pb"

export default function PantallaRegistro() {
  const router = useRouter()
  const { dispatch } = useAplicacion()
  const [formulario, setFormulario] = useState({ nombreUsuario: "", email: "", contraseña: "" })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError(null)

    const usuarioRemoto = await registrarUsuarioRemoto(formulario)
    if (usuarioRemoto) {
      dispatch({ type: "CARGAR_ESTADO", payload: { ...ESTADO_INICIAL, usuarioActual: usuarioRemoto } })
      setCargando(false)
      router.push("/mapa")
      return
    }

    const usuarioExistente = buscarUsuarioPorEmail(formulario.email)
    if (usuarioExistente) {
      setError("Ya existe una cuenta con este email")
      setCargando(false)
      return
    }

    const nuevoUsuario: UsuarioGuardado = {
      id: `usuario-${Date.now()}`,
      email: formulario.email,
      nombreUsuario: formulario.nombreUsuario,
      nombre: formulario.nombreUsuario,
      contraseña: formulario.contraseña,
      esAdmin: false,
      fechaRegistro: new Date().toISOString(),
    }

    const guardado = guardarUsuario(nuevoUsuario)
    if (!guardado) {
      setError("No se pudo registrar en PocketBase ni en modo local")
      setCargando(false)
      return
    }

    const estadoInicial = { ...ESTADO_INICIAL, usuarioActual: nuevoUsuario }
    guardarEstadoUsuario(nuevoUsuario.id, estadoInicial)
    dispatch({ type: "INICIAR_SESION", payload: nuevoUsuario })
    setCargando(false)
    router.push("/mapa")
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button onClick={() => router.push("/bienvenida")} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-8"><ArrowLeft size={20} /><span>Volver</span></button>
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-8">Crear Cuenta</h1>
        <form onSubmit={manejarEnvio} className="space-y-5">
          <div className="space-y-2"><Label htmlFor="nombreUsuario">Nombre de Usuario</Label><Input id="nombreUsuario" value={formulario.nombreUsuario} onChange={(e) => setFormulario((p) => ({ ...p, nombreUsuario: e.target.value }))} required /></div>
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formulario.email} onChange={(e) => setFormulario((p) => ({ ...p, email: e.target.value }))} required /></div>
          <div className="space-y-2"><Label htmlFor="contraseña">Contraseña</Label><Input id="contraseña" type="password" value={formulario.contraseña} onChange={(e) => setFormulario((p) => ({ ...p, contraseña: e.target.value }))} required minLength={6} /></div>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-600 text-sm">{error}</p></div>}
          <Button type="submit" disabled={cargando} className="w-full py-6 text-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl">{cargando ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Creando...</> : "Registrarse"}</Button>
        </form>
      </div>
    </main>
  )
}
