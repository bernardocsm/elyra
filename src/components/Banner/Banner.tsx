import { useEffect, useRef, useState, useCallback } from 'react'
import { useStore } from '../../store/workspace'
import { drawSilkBanner, getSilkColor } from '../../lib/noise'
import { supabase } from '../../lib/supabase'
import CoverPicker from './CoverPicker'

export default function Banner() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { workspace, setWorkspace } = useStore()
  const [hovered, setHovered] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const renderBanner = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !workspace) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { cover_type, cover_value } = workspace

    if (cover_type === 'silk') {
      const silk = getSilkColor(cover_value)
      drawSilkBanner(canvas, silk.base)
    } else if (cover_type === 'solid') {
      ctx.fillStyle = cover_value
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else if (cover_type === 'gradient') {
      // Parse "linear-gradient(135deg, #color1, #color2)"
      const match = cover_value.match(/linear-gradient\(135deg,\s*([^,]+),\s*([^)]+)\)/)
      if (match) {
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
        grad.addColorStop(0, match[1].trim())
        grad.addColorStop(1, match[2].trim())
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    } else if (cover_type === 'image') {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      img.src = cover_value
    }
  }, [workspace?.cover_type, workspace?.cover_value])

  useEffect(() => {
    renderBanner()
  }, [renderBanner])

  async function handleSelectCover(type: string, value: string) {
    if (!workspace) return
    // Optimistic update
    setWorkspace({ ...workspace, cover_type: type as any, cover_value: value })
    setPickerOpen(false)
    // Persist
    await supabase
      .from('workspaces')
      .update({ cover_type: type, cover_value: value })
      .eq('id', workspace.id)
  }

  async function handleRemoveCover() {
    await handleSelectCover('silk', 'Forest')
  }

  return (
    <div
      className="relative w-full shrink-0 transition-[height] duration-200"
      style={{ height: 192 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <canvas
        ref={canvasRef}
        width={920}
        height={192}
        className="w-full h-full"
        style={{ display: 'block' }}
      />

      {(hovered || pickerOpen) && (
        <button
          onClick={() => setPickerOpen((o) => !o)}
          className="absolute flex items-center gap-1.5 cursor-pointer bg-background-main/90 hover:bg-background-main text-text-dark-secondary hover:text-text-dark-primary text-xs border border-divider shadow-sm transition-colors rounded-md"
          style={{ top: 12, left: 12, height: 26, padding: '4px 10px' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          Change cover
        </button>
      )}

      {pickerOpen && (
        <>
          {/* Click-outside overlay */}
          <div
            className="fixed inset-0 z-[300]"
            onClick={() => setPickerOpen(false)}
          />
          {/* Picker */}
          <CoverPicker
            current={{
              type: workspace?.cover_type ?? 'silk',
              value: workspace?.cover_value ?? 'Forest',
            }}
            onSelect={handleSelectCover}
            onRemove={handleRemoveCover}
          />
        </>
      )}
    </div>
  )
}
