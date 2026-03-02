"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { pb } from "@/lib/pocketbase"
import { useAplicacion } from "@/contextos/contexto-aplicacion"

export function useSessionGuard() {
  const router = useRouter()
  const { estado, dispatch } = useAplicacion()

  useEffect(() => {
    if (!estado.usuarioActual || !pb.authStore.isValid) {
      pb.authStore.clear()
      dispatch({ type: "CERRAR_SESION" })
      router.push("/iniciar-sesion")
    }
  }, [estado.usuarioActual, dispatch, router])
}
