"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthPocketbase } from "@/hooks/use-auth-pocketbase"

export default function PantallaInicioSesion() {
  const router = useRouter()
  const { cargando, error, setError, login, verificarConexion } = useAuthPocketbase()
  const [formulario, setFormulario] = useState({ email: "", contraseña: "" })
  const [conectado, setConectado] = useState<boolean | null>(null)

  useEffect(() => {
    const check = async () => setConectado(await verificarConexion())
    void check()
  }, [verificarConexion])

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(formulario.email, formulario.contraseña)
    if (ok) router.push("/mapa")
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-800 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-3xl bg-white/95 shadow-2xl border border-indigo-100 p-6 md:p-8 transition-all">
        <button onClick={() => router.push("/bienvenida")} className="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 mb-6">
          <ArrowLeft size={18} /> Volver
        </button>

        <h1 className="text-2xl font-bold text-indigo-950 mb-1">Iniciar sesión</h1>
        <p className="text-indigo-700 text-sm mb-6">Tu progreso se sincroniza con el servidor.</p>

        {conectado === false && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm flex items-center gap-2">
            <WifiOff size={16} /> No hay conexión con el servidor. Intenta más tarde.
          </div>
        )}

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" required value={formulario.email} onChange={(e) => { setFormulario((p) => ({ ...p, email: e.target.value })); setError(null) }} className="mt-1 border-indigo-200 focus-visible:ring-indigo-500" />
          </div>
          <div>
            <Label htmlFor="contraseña">Contraseña</Label>
            <Input id="contraseña" type="password" required value={formulario.contraseña} onChange={(e) => { setFormulario((p) => ({ ...p, contraseña: e.target.value })); setError(null) }} className="mt-1 border-indigo-200 focus-visible:ring-indigo-500" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <Button type="submit" disabled={cargando || conectado === false} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all">
            {cargando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Validando…</> : "Entrar"}
          </Button>
        </form>
      </section>
    </main>
  )
}
