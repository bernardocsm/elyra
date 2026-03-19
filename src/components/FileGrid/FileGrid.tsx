import { useEffect, useRef, useState, useMemo } from 'react'
import { useStore } from '../../store/workspace'
import FileCard from './FileCard'
import type { Item } from '../../types'

// ─── Layout constants (spec) ────────────────────────────────────────────────
const CARD_W = 150   // normal card width
const WIDE_W = 316   // wide card (canvas) = 2 normal cols + 1 gap
const CARD_H = 179   // card height (149 thumb + 6 gap + 24 label)
const GAP    = 16    // gap between cards (spec: 166 - 150 = 16)

interface Props {
  parentId: string | null
  search: string
  typeFilter?: 'all' | 'notes' | 'trash'
  onOpen: (item: Item) => void
}

export default function FileGrid({ parentId, search, typeFilter = 'all', onOpen }: Props) {
  const { items, sortBy, setContextMenu } = useStore()

  // ── Dynamic container width ───────────────────────────────────────────────
  const containerRef  = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(814) // fallback matches px-6 panel

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(([entry]) => {
      setContainerW(Math.floor(entry.contentRect.width))
    })
    ro.observe(el)
    // Measure immediately (before first paint)
    setContainerW(Math.floor(el.offsetWidth))
    return () => ro.disconnect()
  }, [])

  // ── Filter & sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = items.filter((i) => {
      if (search.trim()) {
        return i.name.toLowerCase().includes(search.toLowerCase())
      }
      return i.parent_id === parentId
    })

    if (typeFilter === 'notes') {
      list = list.filter((i) => i.type === 'note')
    }

    switch (sortBy) {
      case 'name':
        return [...list].sort((a, b) => a.name.localeCompare(b.name))
      case 'modified':
        return [...list].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
      case 'type':
        return [...list].sort((a, b) => a.type.localeCompare(b.type))
      default: // 'created'
        return [...list].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    }
  }, [items, parentId, search, typeFilter, sortBy])

  // ── Absolute layout: left-to-right, wrap when line is full ───────────────
  const positioned = useMemo(() => {
    let x = 0
    let y = 0

    return filtered.map((item) => {
      const wide = item.type === 'canvas'
      const w    = wide ? WIDE_W : CARD_W

      // Wrap if item doesn't fit on current row
      if (x > 0 && x + w > containerW) {
        x = 0
        y += CARD_H + GAP
      }

      const pos = { item, x, y, wide }
      x += w + GAP
      return pos
    })
  }, [filtered, containerW])

  const totalH = positioned.length > 0
    ? Math.max(...positioned.map((p) => p.y)) + CARD_H
    : 0

  // ── Right-click on background ─────────────────────────────────────────────
  function handleBgContextMenu(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, itemId: null, isBackground: true })
    }
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (filtered.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex-1 flex flex-col items-center justify-center py-16 text-text-dark-secondary w-full"
        onContextMenu={handleBgContextMenu}
      >
        {search ? (
          <>
            <p className="text-sm font-medium">No results for "{search}"</p>
            <p className="text-xs mt-1 opacity-60">Try a different search term</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">Nothing here yet</p>
            <p className="text-xs mt-1 opacity-60">Right-click to create something</p>
          </>
        )}
      </div>
    )
  }

  return (
    /*
     * Outer div: full width, measured by ResizeObserver.
     * Inner div: absolute-positioned cards, height = last row bottom edge.
     */
    <div ref={containerRef} className="w-full">
      <div
        className="relative w-full"
        style={{ height: totalH, minHeight: CARD_H }}
        onContextMenu={handleBgContextMenu}
      >
        {positioned.map(({ item, x, y, wide }) => (
          <div
            key={item.id}
            className="absolute"
            style={{ left: x, top: y }}
          >
            <FileCard item={item} wide={wide} onOpen={onOpen} />
          </div>
        ))}
      </div>
    </div>
  )
}
