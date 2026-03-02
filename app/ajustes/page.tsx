"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, Moon, Volume2, Info, Shield, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAplicacion } from "@/contextos/contexto-aplicacion"

export default function PantallaAjustes() {
  const router = useRouter()
  const { estado, dispatch } = useAplicacion()

  useEffect(() => {
    if (!estado.usuarioActual) router.push("/bienvenida")
  }, [estado.usuarioActual, router])

  const alternarConfiguracion = (clave: "notificaciones" | "modoNocturno" | "sonidos") => {
    dispatch({ type: "ACTUALIZAR_CONFIGURACION", payload: { [clave]: !estado.configuracion[clave] } })
  }

  const opcionesAjuste = [
    { id: "notificaciones", icono: <Bell size={20} />, etiqueta: "Notificaciones", descripcion: "Recibe recordatorios", valor: estado.configuracion.notificaciones, onChange: () => alternarConfiguracion("notificaciones") },
    { id: "modoNocturno", icono: <Moon size={20} />, etiqueta: "Modo Nocturno", descripcion: "Activa tema oscuro global", valor: estado.configuracion.modoNocturno, onChange: () => alternarConfiguracion("modoNocturno") },
    { id: "sonidos", icono: <Volume2 size={20} />, etiqueta: "Sonidos", descripcion: "Efectos de sonido", valor: estado.configuracion.sonidos, onChange: () => alternarConfiguracion("sonidos") },
  ]

  const opcionesInformacion = [
    { icono: <Info size={20} />, etiqueta: "Acerca de", descripcion: "Versión 1.1.0", accion: () => {} },
    { icono: <Shield size={20} />, etiqueta: "Privacidad", descripcion: "Política de privacidad", accion: () => {} },
    { icono: <HelpCircle size={20} />, etiqueta: "Ayuda", descripcion: "Centro de ayuda", accion: () => {} },
  ]

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><ArrowLeft size={24} className="text-slate-700 dark:text-slate-100" /></button>
          <h1 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Ajustes</h1>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm mb-6">
          <h2 className="px-4 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800">Preferencias</h2>
          {opcionesAjuste.map((opcion, index) => (
            <div key={opcion.id} className={cn("flex items-center justify-between p-4", index < opcionesAjuste.length - 1 && "border-b border-slate-100 dark:border-slate-800")}>
              <div className="flex items-center gap-3"><div className="text-slate-500">{opcion.icono}</div><div><p className="font-medium text-slate-800 dark:text-slate-100">{opcion.etiqueta}</p><p className="text-slate-500 text-xs">{opcion.descripcion}</p></div></div>
              <button onClick={opcion.onChange} className={cn("relative w-12 h-7 rounded-full transition-colors", opcion.valor ? "bg-emerald-500" : "bg-slate-300")}><span className={cn("absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform", opcion.valor ? "translate-x-6" : "translate-x-1")} /></button>
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm">
          <h2 className="px-4 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800">Información</h2>
          {opcionesInformacion.map((opcion, index) => (
            <button key={index} onClick={opcion.accion} className={cn("w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors", index < opcionesInformacion.length - 1 && "border-b border-slate-100 dark:border-slate-800")}>
              <div className="flex items-center gap-3"><div className="text-slate-500">{opcion.icono}</div><div className="text-left"><p className="font-medium text-slate-800 dark:text-slate-100">{opcion.etiqueta}</p><p className="text-slate-500 text-xs">{opcion.descripcion}</p></div></div>
              <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700">En desarrollo</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
