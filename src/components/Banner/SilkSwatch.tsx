import { useEffect, useRef } from 'react'
import { drawSilkBanner, type SilkColor } from '../../lib/noise'

interface Props {
  color: SilkColor
  active: boolean
  onClick: () => void
}

export default function SilkSwatch({ color, active, onClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      drawSilkBanner(canvasRef.current, color.base)
    }
  }, [color])

  return (
    <button
      onClick={onClick}
      title={color.label}
      className="relative h-10 rounded-lg overflow-hidden transition-all hover:scale-105"
      style={{
        outline: active ? '2px solid #09321F' : '2px solid transparent',
        outlineOffset: 1,
      }}
    >
      {/* 56×40 interno — CSS w-full h-full estica ao tamanho do grid cell */}
      <canvas ref={canvasRef} width={56} height={40} className="w-full h-full" />
      {active && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#09321F" strokeWidth="3.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>
      )}
    </button>
  )
}
