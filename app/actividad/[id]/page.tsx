// =============================================================================
// PANTALLA DE EJERCICIO - Matematicas en Verso
// =============================================================================
// Muestra ejercicios individuales con feedback. Despacha XP, monedas,
// penalizaciones y progreso al estado global mediante el contexto.
// =============================================================================

"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Lightbulb, ArrowLeft } from "lucide-react"
import { useAplicacion } from "@/contextos/contexto-aplicacion"
import { ejerciciosEjemplo } from "@/datos/ejercicios-ejemplo"
import { actividadesEjemplo } from "@/datos/actividades-ejemplo"
import { leccionesEjemplo } from "@/datos/lecciones-ejemplo"
import { validarRespuesta, calcularPuntuacion, formatearTiempo } from "@/lib/validadores"
import { ModalRespuestaCorrecta } from "@/componentes/modales/modal-respuesta-correcta"
import { ModalRespuestaIncorrecta } from "@/componentes/modales/modal-respuesta-incorrecta"
import { ModalNivelCompletado } from "@/componentes/modales/modal-nivel-completado"
import type { EjercicioConcreto } from "@/tipos/dominio"

// Constantes de recompensas y penalizaciones
const XP_POR_CORRECTO = 15
const MONEDAS_POR_CORRECTO = 5
const XP_PENALIZACION = 5
const XP_BONUS_NIVEL = 50
const MONEDAS_BONUS_NIVEL = 20

export default function PantallaActividad() {
  const router = useRouter()
  const params = useParams()
  const actividadId = params.id as string
  const { estado, dispatch } = useAplicacion()

  // Obtener ejercicios de esta actividad
  const ejercicios = useMemo<EjercicioConcreto[]>(
    () =>
      ejerciciosEjemplo
        .filter((e) => e.actividadId === actividadId)
        .sort((a, b) => a.orden - b.orden),
    [actividadId],
  )

  // Obtener datos de la actividad y leccion
  const actividad = useMemo(
    () => actividadesEjemplo.find((a) => a.id === actividadId),
    [actividadId],
  )

  // Estado de ejercicios
  const [indiceActual, setIndiceActual] = useState(0)
  const [respuestaUsuario, setRespuestaUsuario] = useState("")
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<string | null>(null)
  const [tiempoInicio, setTiempoInicio] = useState<Date>(new Date())
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)
  const [intentos, setIntentos] = useState(0)
  const [mostrarPista, setMostrarPista] = useState(false)

  // Acumuladores para el resumen al final del nivel
  const [xpAcumulado, setXpAcumulado] = useState(0)
  const [monedasAcumuladas, setMonedasAcumuladas] = useState(0)
  const [correctosAcumulados, setCorrectosAcumulados] = useState(0)

  // Estados de modales
  const [modalCorrecto, setModalCorrecto] = useState(false)
  const [modalIncorrecto, setModalIncorrecto] = useState(false)
  const [modalNivelCompletado, setModalNivelCompletado] = useState(false)

  // Datos para el modal
  const [puntuacionObtenida, setPuntuacionObtenida] = useState(0)
  const [explicacionActual, setExplicacionActual] = useState("")

  const ejercicioActual = ejercicios[indiceActual]

  // Timer
  useEffect(() => {
    const intervalo = setInterval(() => {
      setTiempoTranscurrido((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(intervalo)
  }, [])

  // Resetear cuando cambia el ejercicio
  useEffect(() => {
    setRespuestaUsuario("")
    setOpcionSeleccionada(null)
    setMostrarPista(false)
    setTiempoInicio(new Date())
    setIntentos(0)
  }, [indiceActual])

  // Redirigir si no hay usuario
  useEffect(() => {
    if (!estado.usuarioActual) {
      router.push("/bienvenida")
    }
  }, [estado.usuarioActual, router])

  // Manejar pista con pistas del inventario
  const manejarPedirPista = useCallback(() => {
    if (estado.inventario.pistasDisponibles > 0) {
      dispatch({ type: "USAR_PISTA" })
      setMostrarPista(true)
    } else {
      setMostrarPista(true) // Mostrar de todas formas pero sin gastar pista
    }
  }, [estado.inventario.pistasDisponibles, dispatch])

  if (!ejercicioActual || !estado.usuarioActual) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No hay ejercicios disponibles para esta actividad.</p>
          <Button onClick={() => router.back()} variant="outline">
            Volver
          </Button>
        </div>
      </div>
    )
  }

  const manejarComprobar = () => {
    const respuesta =
      ejercicioActual.tipo === "seleccion_multiple"
        ? opcionSeleccionada
        : respuestaUsuario
    const esCorrecto = validarRespuesta(ejercicioActual, respuesta || "")
    const tiempoUtilizado =
      (new Date().getTime() - tiempoInicio.getTime()) / 1000
    const puntuacion = calcularPuntuacion(
      ejercicioActual,
      esCorrecto,
      tiempoUtilizado,
    )

    setIntentos((prev) => prev + 1)
    setPuntuacionObtenida(puntuacion)

    // Despachar al estado global
    dispatch({
      type: "COMPLETAR_EJERCICIO",
      payload: {
        ejercicioId: ejercicioActual.id,
        correcto: esCorrecto,
        xp: esCorrecto ? XP_POR_CORRECTO : 0,
        monedas: esCorrecto ? MONEDAS_POR_CORRECTO : 0,
      },
    })

    // Actualizar misiones diarias
    if (esCorrecto) {
      setXpAcumulado((prev) => prev + XP_POR_CORRECTO)
      setMonedasAcumuladas((prev) => prev + MONEDAS_POR_CORRECTO)
      setCorrectosAcumulados((prev) => prev + 1)

      // Actualizar misiones de tipo "ejercicios"
      estado.misionesDiarias.forEach((mision) => {
        if (mision.tipo === "ejercicios" && !mision.completada) {
          dispatch({
            type: "ACTUALIZAR_PROGRESO_MISION",
            payload: {
              misionId: mision.id,
              progreso: mision.progresoActual + 1,
            },
          })
        }
        if (mision.tipo === "perfecto" && !mision.completada) {
          dispatch({
            type: "ACTUALIZAR_PROGRESO_MISION",
            payload: {
              misionId: mision.id,
              progreso: mision.progresoActual + 1,
            },
          })
        }
      })

      setExplicacionActual(ejercicioActual.explicacionCorrecto)
      setModalCorrecto(true)
    } else {
      // Penalizacion: resetear progreso de mision "perfecto"
      estado.misionesDiarias.forEach((mision) => {
        if (mision.tipo === "perfecto" && !mision.completada) {
          dispatch({
            type: "ACTUALIZAR_PROGRESO_MISION",
            payload: { misionId: mision.id, progreso: 0 },
          })
        }
      })

      setExplicacionActual(ejercicioActual.explicacionIncorrecto)
      setModalIncorrecto(true)
    }
  }

  const manejarContinuar = () => {
    setModalCorrecto(false)

    if (indiceActual < ejercicios.length - 1) {
      setIndiceActual((prev) => prev + 1)
      setTiempoTranscurrido(0)
    } else {
      // Nivel completado: marcar actividad como completada
      const actividadActual = actividadesEjemplo.find(
        (a) => a.id === actividadId,
      )
      if (actividadActual) {
        // Encontrar la siguiente actividad en la misma leccion
        const actividadesMismaLeccion = actividadesEjemplo
          .filter((a) => a.leccionId === actividadActual.leccionId)
          .sort((a, b) => a.orden - b.orden)
        const indiceActividad = actividadesMismaLeccion.findIndex(
          (a) => a.id === actividadId,
        )
        const siguienteActividad = actividadesMismaLeccion[indiceActividad + 1]

        dispatch({
          type: "COMPLETAR_ACTIVIDAD",
          payload: {
            actividadId,
            siguienteActividadId: siguienteActividad?.id,
          },
        })

        // Verificar si se completaron TODAS las actividades de la leccion
        const todasCompletadas = actividadesMismaLeccion.every(
          (a) =>
            a.id === actividadId ||
            estado.progreso.actividadesCompletadas.includes(a.id),
        )

        if (todasCompletadas) {
          const leccion = leccionesEjemplo.find(
            (l) => l.id === actividadActual.leccionId,
          )
          if (leccion) {
            // Encontrar siguiente leccion
            const leccionesMismaCategoria = leccionesEjemplo
              .filter((l) => l.categoriaId === leccion.categoriaId)
              .sort((a, b) => a.orden - b.orden)
            const indiceLeccion = leccionesMismaCategoria.findIndex(
              (l) => l.id === leccion.id,
            )
            const siguienteLeccion = leccionesMismaCategoria[indiceLeccion + 1]

            dispatch({
              type: "COMPLETAR_LECCION",
              payload: {
                leccionId: leccion.id,
                siguienteLeccionId: siguienteLeccion?.id,
              },
            })

            // Verificar si se completaron TODAS las lecciones de la categoria
            const todasLeccionesCompletadas = leccionesMismaCategoria.every(
              (l) =>
                l.id === leccion.id ||
                estado.progreso.leccionesCompletadas.includes(l.id),
            )

            if (todasLeccionesCompletadas) {
              // Encontrar la siguiente categoria
              const { categoriasEjemplo } = require("@/datos/categorias-ejemplo")
              const categoriaActual = categoriasEjemplo.find(
                (c: any) => c.id === leccion.categoriaId,
              )
              if (categoriaActual) {
                const siguienteCategoria = categoriasEjemplo.find(
                  (c: any) => c.orden === categoriaActual.orden + 1,
                )
                dispatch({
                  type: "COMPLETAR_CATEGORIA",
                  payload: {
                    categoriaId: leccion.categoriaId,
                    siguienteCategoriaId: siguienteCategoria?.id,
                  },
                })
              }
            }
          }
        }
      }

      // Bonus XP y monedas por completar nivel
      dispatch({ type: "AGREGAR_EXPERIENCIA", payload: XP_BONUS_NIVEL })
      dispatch({ type: "AGREGAR_MONEDAS", payload: MONEDAS_BONUS_NIVEL })

      setModalNivelCompletado(true)
    }
  }

  const manejarReintentar = () => {
    setModalIncorrecto(false)
    setRespuestaUsuario("")
    setOpcionSeleccionada(null)
  }

  const manejarFinalizarNivel = () => {
    setModalNivelCompletado(false)
    router.back()
  }

  const progresoActual = ((indiceActual + 1) / ejercicios.length) * 100

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header con progreso */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          {/* Boton volver + barra de progreso */}
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.back()}
              className="p-1 hover:bg-slate-100 rounded-full shrink-0"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progresoActual}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-600 shrink-0">
              {indiceActual + 1}/{ejercicios.length}
            </span>
          </div>

          {/* Tiempo y estadisticas */}
          <div className="flex justify-between text-sm text-slate-500">
            <span>Tiempo: {formatearTiempo(tiempoTranscurrido)}</span>
            <span>Pistas: {estado.inventario.pistasDisponibles}</span>
            <span>Intentos: {intentos}</span>
          </div>
        </div>
      </header>

      {/* Contenido del ejercicio */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        {/* Titulo del ejercicio */}
        <div className="bg-slate-800 text-white rounded-t-xl p-3 text-center">
          <h2 className="font-semibold text-sm">
            {actividad?.titulo || "Ejercicio"}
          </h2>
          <p className="text-slate-300 text-xs mt-1">
            {ejercicioActual.descripcion}
          </p>
        </div>

        {/* Contenedor del problema */}
        <div className="bg-white rounded-b-xl shadow-md p-5 mb-6">
          {/* Vidas / XP info */}
          <div className="flex items-center justify-between mb-4 text-xs text-slate-500">
            <span>+{XP_POR_CORRECTO} XP por respuesta correcta</span>
            <span className="text-red-500">-{XP_PENALIZACION} XP por error</span>
          </div>

          {/* Pregunta */}
          <p className="text-slate-700 mb-6 leading-relaxed">
            {ejercicioActual.pregunta}
          </p>

          {/* Opciones o input segun el tipo */}
          {ejercicioActual.tipo === "seleccion_multiple" &&
            ejercicioActual.opciones && (
              <div className="space-y-3">
                {ejercicioActual.opciones.map((opcion) => (
                  <button
                    key={opcion.id}
                    onClick={() => setOpcionSeleccionada(opcion.id)}
                    className={cn(
                      "w-full p-4 rounded-lg text-left border-2 transition-all",
                      opcionSeleccionada === opcion.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    {opcion.texto}
                  </button>
                ))}
              </div>
            )}

          {ejercicioActual.tipo === "respuesta_numerica" && (
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Tu respuesta"
                value={respuestaUsuario}
                onChange={(e) => setRespuestaUsuario(e.target.value)}
                className="text-lg py-6 text-center border-slate-300"
              />
              <p className="text-xs text-slate-400 text-center">
                (Expresa como fraccion simplificada o decimal).
              </p>
            </div>
          )}
        </div>

        {/* Pista */}
        {mostrarPista && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-2">
              <Lightbulb
                className="text-amber-500 shrink-0 mt-1"
                size={18}
              />
              <p className="text-amber-800 text-sm italic">
                {ejercicioActual.pistaPoetica}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Botones de accion */}
      <footer className="bg-white border-t border-slate-200 p-4 sticky bottom-0">
        <div className="max-w-lg mx-auto space-y-3">
          <Button
            onClick={manejarComprobar}
            disabled={!respuestaUsuario && !opcionSeleccionada}
            className="w-full py-6 text-lg font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50"
          >
            Comprobar
          </Button>

          <Button
            onClick={manejarPedirPista}
            variant="outline"
            disabled={mostrarPista}
            className="w-full py-4 border-slate-300"
          >
            Pedir Pista
            {estado.inventario.pistasDisponibles > 0 && !mostrarPista && (
              <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {estado.inventario.pistasDisponibles} disponibles
              </span>
            )}
          </Button>
        </div>
      </footer>

      {/* Modales */}
      <ModalRespuestaCorrecta
        estaAbierto={modalCorrecto}
        onContinuar={manejarContinuar}
        puntuacion={puntuacionObtenida}
      />

      <ModalRespuestaIncorrecta
        estaAbierto={modalIncorrecto}
        onReintentar={manejarReintentar}
        explicacion={explicacionActual}
        respuestaCorrecta={String(ejercicioActual.respuestaCorrecta)}
      />

      <ModalNivelCompletado
        estaAbierto={modalNivelCompletado}
        onContinuar={manejarFinalizarNivel}
        xpGanado={xpAcumulado + XP_BONUS_NIVEL}
        monedasGanadas={monedasAcumuladas + MONEDAS_BONUS_NIVEL}
        poemasGanados={correctosAcumulados >= ejercicios.length ? 1 : 0}
      />
    </div>
  )
}
