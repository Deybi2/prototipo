// =============================================================================
// PANTALLA DE DETALLE DE LECCION - Matematicas en Verso
// =============================================================================
// Muestra las actividades (niveles) disponibles dentro de una leccion.
// Usa el estado global para determinar desbloqueo y progreso real.
// =============================================================================

"use client"

import { useEffect, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, CheckCircle, Play, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAplicacion } from "@/contextos/contexto-aplicacion"
import { actividadesEjemplo } from "@/datos/actividades-ejemplo"
import { leccionesEjemplo } from "@/datos/lecciones-ejemplo"
import { ejerciciosEjemplo } from "@/datos/ejercicios-ejemplo"
import type { Actividad } from "@/tipos/dominio"

export default function PantallaLeccion() {
  const router = useRouter()
  const params = useParams()
  const leccionId = params.id as string
  const { estado, dispatch } = useAplicacion()

  // Redirigir si no hay usuario
  useEffect(() => {
    if (!estado.usuarioActual) {
      router.push("/bienvenida")
    }
  }, [estado.usuarioActual, router])

  // Obtener datos de la leccion
  const leccion = useMemo(
    () => leccionesEjemplo.find((l) => l.id === leccionId),
    [leccionId],
  )

  // Filtrar actividades de esta leccion
  const actividades = useMemo(
    () =>
      actividadesEjemplo
        .filter((a) => a.leccionId === leccionId)
        .sort((a, b) => a.orden - b.orden),
    [leccionId],
  )

  // Al entrar, desbloquear la primera actividad si la leccion esta desbloqueada
  useEffect(() => {
    if (
      estado.progreso.leccionesDesbloqueadas.includes(leccionId) &&
      actividades.length > 0
    ) {
      const primeraActividad = actividades[0]
      if (
        !estado.progreso.actividadesDesbloqueadas.includes(primeraActividad.id)
      ) {
        dispatch({
          type: "DESBLOQUEAR_ACTIVIDAD",
          payload: primeraActividad.id,
        })
      }
    }
  }, [leccionId, actividades, estado.progreso.leccionesDesbloqueadas, estado.progreso.actividadesDesbloqueadas, dispatch])

  // Determinar estado de cada actividad basandose en el estado global
  const obtenerEstadoActividad = (
    actividad: Actividad,
  ): "completada" | "en-progreso" | "bloqueada" => {
    if (estado.progreso.actividadesCompletadas.includes(actividad.id)) {
      return "completada"
    }
    if (estado.progreso.actividadesDesbloqueadas.includes(actividad.id)) {
      return "en-progreso"
    }
    return "bloqueada"
  }

  // Contar ejercicios por actividad
  const contarEjercicios = (actividadId: string): number => {
    return ejerciciosEjemplo.filter((e) => e.actividadId === actividadId).length
  }

  const manejarClickActividad = (actividad: Actividad) => {
    const estadoActividad = obtenerEstadoActividad(actividad)
    if (estadoActividad !== "bloqueada") {
      router.push(`/actividad/${actividad.id}`)
    }
  }

  // Calcular progreso de la leccion
  const actividadesCompletadas = actividades.filter((a) =>
    estado.progreso.actividadesCompletadas.includes(a.id),
  ).length
  const progresoLeccion =
    actividades.length > 0
      ? Math.round((actividadesCompletadas / actividades.length) * 100)
      : 0

  if (!estado.usuarioActual) return null

  const colorLeccion = leccion?.metadata.color || "#10B981"

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header
        className="text-white p-4 sticky top-0 z-10"
        style={{
          background: `linear-gradient(135deg, ${colorLeccion}, ${colorLeccion}dd)`,
        }}
      >
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-3 hover:opacity-80"
          >
            <ArrowLeft size={20} />
            <span>Actividad</span>
          </button>
          <h1 className="text-xl font-bold">
            {leccion?.titulo || "Leccion"}
          </h1>

          {/* Barra de progreso */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-white/80 mb-1">
              <span>Progreso</span>
              <span>
                {actividadesCompletadas}/{actividades.length} niveles
              </span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progresoLeccion}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Lista de actividades (niveles) */}
      <main className="p-4 max-w-lg mx-auto pb-8">
        <div className="space-y-3">
          {actividades.map((actividad, index) => {
            const estadoActividad = obtenerEstadoActividad(actividad)
            const estaCompletada = estadoActividad === "completada"
            const estaEnProgreso = estadoActividad === "en-progreso"
            const estaBloqueada = estadoActividad === "bloqueada"
            const numEjercicios = contarEjercicios(actividad.id)

            return (
              <button
                key={actividad.id}
                onClick={() => manejarClickActividad(actividad)}
                disabled={estaBloqueada}
                className={cn(
                  "w-full p-4 rounded-xl text-left transition-all",
                  "border-2 shadow-sm",
                  estaCompletada && "bg-emerald-50 border-emerald-300",
                  estaEnProgreso && "bg-amber-50 border-amber-300",
                  estaBloqueada &&
                    "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed",
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Numero de nivel */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0",
                      estaCompletada && "bg-emerald-500 text-white",
                      estaEnProgreso && "bg-amber-500 text-white",
                      estaBloqueada && "bg-slate-300 text-slate-500",
                    )}
                  >
                    {estaBloqueada ? (
                      <Lock size={16} />
                    ) : estaCompletada ? (
                      <CheckCircle size={18} />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className={cn(
                        "font-semibold truncate",
                        estaBloqueada ? "text-slate-400" : "text-slate-800",
                      )}
                    >
                      Nivel {index + 1}: {actividad.titulo}
                    </h3>
                    <p className="text-sm text-slate-500 truncate">
                      {actividad.objetivo}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {numEjercicios} ejercicio{numEjercicios !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Indicador de estado */}
                  {estaEnProgreso && (
                    <Play size={20} className="text-amber-600 shrink-0" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Poema recompensa al completar todas las actividades */}
        {progresoLeccion === 100 && leccion?.poemaRecompensa && (
          <div className="mt-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-5 border-2 border-amber-200">
            <h3 className="font-serif font-bold text-amber-900 text-lg text-center mb-3">
              Poema Recompensa
            </h3>
            <h4 className="font-serif font-semibold text-amber-800 text-center mb-2">
              {leccion.poemaRecompensa.titulo}
            </h4>
            <p className="font-serif text-amber-700 text-center leading-relaxed whitespace-pre-line text-sm">
              {leccion.poemaRecompensa.contenido}
            </p>
            <p className="text-amber-600 text-center text-xs mt-3 italic">
              - {leccion.poemaRecompensa.autor}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
