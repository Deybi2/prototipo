// =============================================================================
// HOOK DEL POEMARIO - Matematicas en Verso
// =============================================================================
// Maneja el estado y las acciones del poemario usando el estado global.
// Los favoritos y poemas desbloqueados se persisten a traves del contexto.
// =============================================================================

"use client"

import { useState, useCallback, useMemo } from "react"
import type { Poema, EstadoPoemario } from "@/tipos/poemario"
import { todosLosPoemas } from "@/datos/poemas-ejemplo"
import { useAplicacion } from "@/contextos/contexto-aplicacion"

export function usarPoemario() {
  const { estado, dispatch } = useAplicacion()
  const [poemaSeleccionado, setPoemaSeleccionado] = useState<Poema | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos")
  const [favoritosLocal, setFavoritosLocal] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    const guardados = localStorage.getItem(
      `mathverso_favoritos_${estado.usuarioActual?.id || "anon"}`,
    )
    return guardados ? JSON.parse(guardados) : []
  })

  // Construir poemas con estado de desbloqueo del contexto global
  const poemas = useMemo<Poema[]>(() => {
    return todosLosPoemas.map((poema) => ({
      ...poema,
      esFavorito: favoritosLocal.includes(poema.id),
      desbloqueado:
        poema.desbloqueado ||
        estado.inventario.poemasDesbloqueados.includes(poema.id),
    }))
  }, [estado.inventario.poemasDesbloqueados, favoritosLocal])

  // Alternar favorito
  const alternarFavorito = useCallback(
    (poemaId: string) => {
      setFavoritosLocal((prev) => {
        const nuevos = prev.includes(poemaId)
          ? prev.filter((id) => id !== poemaId)
          : [...prev, poemaId]

        if (typeof window !== "undefined") {
          localStorage.setItem(
            `mathverso_favoritos_${estado.usuarioActual?.id || "anon"}`,
            JSON.stringify(nuevos),
          )
        }
        return nuevos
      })

      // Actualizar poema seleccionado si coincide
      setPoemaSeleccionado((prev) => {
        if (prev && prev.id === poemaId) {
          return { ...prev, esFavorito: !prev.esFavorito }
        }
        return prev
      })
    },
    [estado.usuarioActual?.id],
  )

  // Desbloquear poema con monedas del estado global
  const desbloquearPoema = useCallback(
    (poemaId: string): boolean => {
      const poema = todosLosPoemas.find((p) => p.id === poemaId)
      if (!poema || poema.desbloqueado) return false
      if (estado.inventario.poemasDesbloqueados.includes(poemaId)) return false

      const costo = poema.monedasParaDesbloquear || 0
      if (estado.estadisticas.monedas < costo) return false

      // Restar monedas y desbloquear a traves del contexto global
      dispatch({ type: "RESTAR_MONEDAS", payload: costo })
      dispatch({ type: "DESBLOQUEAR_POEMA", payload: poemaId })

      return true
    },
    [estado.estadisticas.monedas, estado.inventario.poemasDesbloqueados, dispatch],
  )

  // Compartir poema
  const compartirPoema = useCallback(async (poema: Poema) => {
    const textoCompartir = `"${poema.titulo}" - ${poema.autor}\n\n${poema.contenido}\n\nMatematicas en Verso - Aprende matematicas con poesia`

    if (navigator.share) {
      try {
        await navigator.share({ title: poema.titulo, text: textoCompartir })
        return true
      } catch {
        return false
      }
    } else {
      try {
        await navigator.clipboard.writeText(textoCompartir)
        return true
      } catch {
        return false
      }
    }
  }, [])

  // Obtener poemas filtrados
  const poemasFiltrados = useMemo(() => {
    if (filtroCategoria === "todos") return poemas
    if (filtroCategoria === "favoritos")
      return poemas.filter((p) => p.esFavorito)
    return poemas.filter((p) => p.categoria === filtroCategoria)
  }, [poemas, filtroCategoria])

  // Estadisticas del poemario
  const estadisticas: EstadoPoemario = {
    poemasDesbloqueados: estado.inventario.poemasDesbloqueados,
    poemasLeidos: [],
    poemasFavoritos: favoritosLocal,
    totalPoemas: todosLosPoemas.length,
    poemasColeccionados: poemas.filter((p) => p.desbloqueado).length,
  }

  return {
    poemas,
    poemasFiltrados,
    poemaSeleccionado,
    setPoemaSeleccionado,
    favoritos: favoritosLocal,
    alternarFavorito,
    desbloquearPoema,
    compartirPoema,
    filtroCategoria,
    setFiltroCategoria,
    estadisticas,
    cargando: false,
    monedasUsuario: estado.estadisticas.monedas,
  }
}
