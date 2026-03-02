// =============================================================================
// CLIENTE POCKETBASE - Matemáticas en Verso
// =============================================================================

import PocketBase from "pocketbase"

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || ""

export const pb = new PocketBase(POCKETBASE_URL || "http://127.0.0.1:8090")
pb.autoCancellation(false)

export const pocketbaseConfigurado = Boolean(POCKETBASE_URL)

export const estaAutenticado = (): boolean => pb.authStore.isValid
export const obtenerUsuarioActual = () => pb.authStore.model
export const cerrarSesion = () => pb.authStore.clear()

export const refrescarToken = async () => {
  try {
    await pb.collection("usuarios").authRefresh()
    return true
  } catch {
    pb.authStore.clear()
    return false
  }
}

export const obtenerRegistro = async <T>(
  coleccion: string,
  id: string,
  opciones?: object,
): Promise<T | null> => {
  try {
    return (await pb.collection(coleccion).getOne(id, opciones)) as T
  } catch (error) {
    console.error(`Error obteniendo registro de ${coleccion}:`, error)
    return null
  }
}

export const obtenerLista = async <T>(
  coleccion: string,
  pagina = 1,
  porPagina = 50,
  filtro?: string,
  ordenar?: string,
): Promise<T[]> => {
  try {
    const resultado = await pb.collection(coleccion).getList(pagina, porPagina, {
      filter: filtro,
      sort: ordenar,
    })
    return resultado.items as T[]
  } catch (error) {
    console.error(`Error obteniendo lista de ${coleccion}:`, error)
    return []
  }
}

export const crearRegistro = async <T>(
  coleccion: string,
  datos: object,
): Promise<T | null> => {
  try {
    return (await pb.collection(coleccion).create(datos)) as T
  } catch (error) {
    console.error(`Error creando registro en ${coleccion}:`, error)
    return null
  }
}

export const actualizarRegistro = async <T>(
  coleccion: string,
  id: string,
  datos: object,
): Promise<T | null> => {
  try {
    return (await pb.collection(coleccion).update(id, datos)) as T
  } catch (error) {
    console.error(`Error actualizando registro en ${coleccion}:`, error)
    return null
  }
}

export default pb
