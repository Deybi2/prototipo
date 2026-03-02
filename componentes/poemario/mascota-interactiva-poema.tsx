"use client"
import { useMemo } from "react"

interface Props { mouseX: number; mouseY: number; bounds: DOMRect | null }

function limitarPupila(dx: number, dy: number, radioMaximo = 4) {
  const distancia = Math.sqrt(dx * dx + dy * dy)
  if (distancia <= radioMaximo) return { x: dx, y: dy }
  const factor = radioMaximo / distancia
  return { x: dx * factor, y: dy * factor }
}

export function MascotaInteractivaPoema({ mouseX, mouseY, bounds }: Props) {
  const { pupilaIzquierda, pupilaDerecha, tilt } = useMemo(() => {
    if (!bounds) return { pupilaIzquierda: { x: 0, y: 0 }, pupilaDerecha: { x: 0, y: 0 }, tilt: 0 }
    const centroX = bounds.left + bounds.width / 2
    const centroY = bounds.top + 70
    const dx = mouseX - centroX
    const dy = mouseY - centroY
    const tiltBase = (dx / Math.max(bounds.width / 2, 1)) * 8
    const movimiento = limitarPupila(dx / 40, dy / 40)
    return { pupilaIzquierda: movimiento, pupilaDerecha: movimiento, tilt: Math.max(-8, Math.min(8, tiltBase)) }
  }, [mouseX, mouseY, bounds])

  return (
    <div className="absolute -top-18 left-1/2 -translate-x-1/2 z-20 transition-transform duration-200" style={{ transform: `translateX(-50%) rotate(${tilt}deg)` }}>
      <span className="absolute -top-4 right-0 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">En desarrollo</span>
      <svg width="180" height="110" viewBox="0 0 180 110" className="drop-shadow-lg">
        <g id="patitas"><ellipse cx="62" cy="98" rx="12" ry="8" fill="#f3d7a4" /><ellipse cx="118" cy="98" rx="12" ry="8" fill="#f3d7a4" /></g>
        <g id="cabeza"><ellipse cx="90" cy="52" rx="55" ry="40" fill="#f8e2b8" /><ellipse cx="60" cy="30" rx="14" ry="18" fill="#f1cd95" /><ellipse cx="120" cy="30" rx="14" ry="18" fill="#f1cd95" /></g>
        <g id="ojos"><ellipse cx="70" cy="52" rx="13" ry="11" fill="white" /><ellipse cx="110" cy="52" rx="13" ry="11" fill="white" /><circle cx={70 + pupilaIzquierda.x} cy={52 + pupilaIzquierda.y} r="4.5" fill="#1f2937" className="transition-all duration-150" /><circle cx={110 + pupilaDerecha.x} cy={52 + pupilaDerecha.y} r="4.5" fill="#1f2937" className="transition-all duration-150" /></g>
      </svg>
    </div>
  )
}
