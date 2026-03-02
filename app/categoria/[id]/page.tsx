// =============================================================================
// PANTALLA DE DETALLE DE CATEGORIA - Matematicas en Verso
// =============================================================================
// Muestra las lecciones disponibles dentro de una categoria.
// Usa el estado global para determinar progreso y desbloqueo real.
// =============================================================================

"use client"

import { useEffect, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, CheckCircle, Clock, BookOpen, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAplicacion } from "@/contextos/contexto-aplicacion"
import { leccionesEjemplo } from "@/datos/lecciones-ejemplo"
import { categoriasEjemplo } from "@/datos/categorias-ejemplo"
import { actividadesEjemplo } from "@/datos/actividades-ejemplo"
import type { Leccion } from "@/tipos/dominio"

export default function PantallaCategoria() {
  const router = useRouter()
  const params = useParams()
  const categoriaId = params.id as string
  const { estado, dispatch } = useAplicacion()

  // Redirigir si no hay usuario
  useEffect(() => {
    if (!estado.usuarioActual) {
      router.push("/bienvenida")
    }
  }, [estado.usuarioActual, router])

  // Obtener datos de la categoria
  const categoria = useMemo(
    () => categoriasEjemplo.find((c) => c.id === categoriaId),
    [categoriaId],
  )

  // Filtrar lecciones de esta categoria
  const lecciones = useMemo(
    () => leccionesEjemplo.filter((l) => l.categoriaId === categoriaId),
    [categoriaId],
  )

  // Al entrar, desbloquear la primera leccion si la categoria esta desbloqueada
  useEffect(() => {
    if (
      estado.progreso.categoriasDesbloqueadas.includes(categoriaId) &&
      lecciones.length > 0
    ) {
      const primeraLeccion = lecciones[0]
      if (!estado.progreso.leccionesDesbloqueadas.includes(primeraLeccion.id)) {
        dispatch({ type: "DESBLOQUEAR_LECCION", payload: primeraLeccion.id })
      }
    }
  }, [categoriaId, lecciones, estado.progreso.categoriasDesbloqueadas, estado.progreso.leccionesDesbloqueadas, dispatch])

  // Determinar estado de cada leccion basandose en el estado global
  const obtenerEstadoLeccion = (leccion: Leccion): "completada" | "en-progreso" | "bloqueada" => {
    if (estado.progreso.leccionesCompletadas.includes(leccion.id)) {
      return "completada"
    }
    if (estado.progreso.leccionesDesbloqueadas.includes(leccion.id)) {
      return "en-progreso"
    }
    return "bloqueada"
  }

  const manejarClickLeccion = (leccion: Leccion) => {
    const estadoLeccion = obtenerEstadoLeccion(leccion)
    if (estadoLeccion !== "bloqueada") {
      router.push(`/leccion/${leccion.id}`)
    }
  }

  // Calcular progreso general de la categoria
  const leccionesCompletadas = lecciones.filter((l) =>
    estado.progreso.leccionesCompletadas.includes(l.id),
  ).length
  const progresoCategoria = lecciones.length > 0
    ? Math.round((leccionesCompletadas / lecciones.length) * 100)
    : 0

  if (!estado.usuarioActual) return null

  const colorCategoria = categoria?.metadata.color || "#3B82F6"

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header
        className="text-white p-4 sticky top-0 z-10"
        style={{
          background: `linear-gradient(135deg, ${colorCategoria}, ${colorCategoria}dd)`,
        }}
      >
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push("/mapa")}
            className="flex items-center gap-2 mb-3 hover:opacity-80"
          >
            <ArrowLeft size={20} />
            <span>Lecciones</span>
          </button>
          <h1 className="text-xl font-bold">
            {categoria?.titulo || "Categoria"}
          </h1>
          {categoria?.subtitulo && (
            <p className="text-white/80 text-sm mt-1">{categoria.subtitulo}</p>
          )}

          {/* Barra de progreso de la categoria */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-white/80 mb-1">
              <span>Progreso</span>
              <span>
                {leccionesCompletadas}/{lecciones.length} lecciones
              </span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progresoCategoria}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Lista de lecciones */}
      <main className="p-4 max-w-lg mx-auto pb-8">
        <div className="space-y-3">
          {lecciones.map((leccion, index) => {
            const estadoLeccion = obtenerEstadoLeccion(leccion)
            const estaCompletada = estadoLeccion === "completada"
            const estaEnProgreso = estadoLeccion === "en-progreso"
            const estaBloqueada = estadoLeccion === "bloqueada"

            return (
              <button
                key={leccion.id}
                onClick={() => manejarClickLeccion(leccion)}
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
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{leccion.metadata.icono}</span>
                      <h3
                        className={cn(
                          "font-semibold",
                          estaBloqueada ? "text-slate-400" : "text-slate-800",
                        )}
                      >
                        Leccion {index + 1}: {leccion.titulo}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-1">
                      {leccion.descripcion}
                    </p>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <BookOpen size={12} />
                        {actividadesEjemplo.filter((a) => a.leccionId === leccion.id).length}{" "}
                        actividades
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {leccion.metadata.duracionEstimada} min
                      </span>
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="ml-3">
                    {estaCompletada && (
                      <CheckCircle className="text-emerald-500" size={24} />
                    )}
                    {estaEnProgreso && (
                      <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">
                        En progreso
                      </span>
                    )}
                    {estaBloqueada && (
                      <Lock className="text-slate-400" size={20} />
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
