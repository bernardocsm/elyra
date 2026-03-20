import { useEffect, useRef, useState, useCallback } from 'react'
import { useStore } from '../../store/workspace'
import { drawSilkBanner, getSilkColor } from '../../lib/noise'
import { supabase } from '../../lib/supabase'
import CoverPicker from './CoverPicker'

export default function Banner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const { workspace, setWorkspace } = useStore()
  const [hovered, setHovered]       = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  // ── Draw ──────────────────────────────────────────────────────────────────
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

  // ── Re-render on cover change ──────────────────────────────────────────────
  useEffect(() => {
    renderBanner()
  }, [renderBanner])

  // ── Resize canvas to match container width ────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const ro = new ResizeObserver(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const w = Math.round(container.offsetWidth)
      // Only re-set width (triggers canvas clear) when it actually changed
      if (canvas.width !== w) {
        canvas.width = w
        renderBanner()
      }
    })

    ro.observe(container)
    return () => ro.disconnect()
  }, [renderBanner])

  // ── Cover change handlers ─────────────────────────────────────────────────
  async function handleSelectCover(type: string, value: string) {
    if (!workspace) return
    setWorkspace({ ...workspace, cover_type: type as any, cover_value: value })
    setPickerOpen(false)
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
      ref={containerRef}
      className="relative w-full shrink-0 transition-[height] duration-200"
      style={{ height: 192 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        // Keep button visible while picker is open
      }}
    >
      {/* ── Silk / solid / gradient / image canvas ── */}
      <canvas
        ref={canvasRef}
        width={920}
        height={192}
        className="w-full h-full"
        style={{ display: 'block' }}
      />

      {/* ── "Change cover" button (hover reveal) ── */}
      {(hovered || pickerOpen) && (
        <button
          onClick={() => setPickerOpen((o) => !o)}
          className={[
            'absolute flex items-center gap-1.5 cursor-pointer',
            'bg-background-main/90 hover:bg-background-main',
            'text-text-dark-secondary hover:text-text-dark-primary',
            'text-xs border border-divider shadow-sm',
            'transition-colors rounded-md',
          ].join(' ')}
          style={{
            top: 12,
            left: 12,
            height: 26,
            padding: '4px 10px',
            // Exact spec: 94.5×26px — width is content-driven, matches at ~94px
          }}
        >
          {/* Image/photo icon */}
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          Change cover
        </button>
      )}

      {/* ── Cover picker popover + click-outside overlay ── */}
      {pickerOpen && (
        <>
          <div
            className="fixed inset-0 z-[300]"
            onClick={() => setPickerOpen(false)}
          />
          <CoverPicker
            current={{
              type:  workspace?.cover_type  ?? 'silk',
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
