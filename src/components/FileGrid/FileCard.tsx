import { useState } from 'react'
import { useStore } from '../../store/workspace'
import type { Item } from '../../types'
import { formatDistanceToNowStrict } from 'date-fns'

// ─── Spec dimensions ────────────────────────────────────────────────────────
// Total card:  150 × 179px  (normal) | 316 × 179px (wide)
// Thumbnail:   w × 149px
// Label gap:   6px  (so 149 + 6 + 24 = 179 ✓)
// Label area:  w × 24px
const CARD_W  = 150
const WIDE_W  = 316
const THUMB_H = 149
const CARD_H  = 179   // 149 + 6 + 24
const LABEL_H = 24
const LABEL_GAP = 6   // margin between thumbnail and label

// ─── Folder colour helpers ──────────────────────────────────────────────────
const FOLDER_DEFAULT = '#39624D'

/**
 * Darken a hex colour by multiplying RGB channels by `factor`.
 * Spec-measured ratio: folder tab = 0.65 × body brightness.
 *   Verde: corpo rgb(82,111,97)  → tab rgb(53,72,63)   53/82 = 0.646
 *   Azul:  corpo rgb(91,130,181) → tab rgb(59,84,118)  59/91 = 0.648
 */
function darkenHex(hex: string, factor = 0.65): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  item: Item
  wide?: boolean
  onOpen: (item: Item) => void
}

export default function FileCard({ item, wide = false, onOpen }: Props) {
  const [hovered, setHovered] = useState(false)
  const { selectedItems, toggleSelectItem, setContextMenu, items } = useStore()

  const isSelected = selectedItems.includes(item.id)
  const childCount = items.filter((i) => i.parent_id === item.id).length
  const cardW      = wide ? WIDE_W : CARD_W

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, itemId: item.id })
  }

  function handleCheckboxClick(e: React.MouseEvent) {
    e.stopPropagation()
    toggleSelectItem(item.id)
  }

  return (
    <div
      className="group relative select-none cursor-pointer"
      style={{ width: cardW, height: CARD_H }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(item)}
      onContextMenu={handleContextMenu}
    >
      {/* ── Thumbnail ─────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          width:        cardW,
          height:       THUMB_H,
          borderRadius: 16,                        // rounded-2xl
          border:       isSelected
            ? '2px solid #39624D'                  // ring-primary when selected
            : '2px solid rgb(240,240,240)',         // border-border-subtle default
          background:   'rgba(39,37,35,0.05)',      // bg-neutral-dark-5
          transition:   'border-color 150ms',
        }}
      >
        <ThumbnailContent item={item} wide={wide} />

        {/* Checkbox — top-left, appears on hover or when selected */}
        <div
          className="absolute transition-opacity duration-150"
          style={{
            top:     8,                            // spec: top: 8px
            left:    8,                            // spec: left: 8px
            opacity: hovered || isSelected ? 1 : 0,
          }}
          onClick={handleCheckboxClick}
        >
          <div
            className="flex items-center justify-center transition-colors"
            style={{
              width:          24,                  // spec: 24×24px
              height:         24,
              background:     isSelected ? '#39624D' : 'rgba(255,255,255,0.9)',
              border:         `2px solid ${isSelected ? '#39624D' : 'rgba(39,37,35,0.1)'}`,
              borderRadius:   6,                   // rounded-md
              backdropFilter: 'blur(4px)',
            }}
          >
            {isSelected && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>

        {/* Folder child count badge — appears on hover */}
        {item.type === 'folder' && hovered && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap"
            style={{
              background:     'rgba(255,255,255,0.85)',
              border:         '1px solid rgba(39,37,35,0.1)',
              color:          '#686764',
              backdropFilter: 'blur(4px)',
            }}
          >
            {childCount} {childCount === 1 ? 'item' : 'items'}
          </div>
        )}
      </div>

      {/* ── Label row ─────────────────────────────────────────────────────── */}
      {/*
       * spec: flex items-baseline justify-between gap-2 px-1 w-full
       * gap:  LABEL_GAP = 6px  →  149 + 6 + 24 = 179 ✓
       */}
      <div
        className="flex items-baseline justify-between gap-2 px-1 w-full"
        style={{ height: LABEL_H, marginTop: LABEL_GAP }}
      >
        {/* Name — 14px, text-dark-primary, truncate */}
        <span className="text-sm text-text-dark-primary truncate leading-6 flex-1 min-w-0">
          {item.name}
        </span>

        {/* Timestamp — 12px, accent-orange, tabular-nums */}
        <span
          className="text-xs shrink-0 tabular-nums"
          style={{ color: '#D97706' }}          // text-accent-orange
        >
          {getRelativeTime(item.updated_at)}
        </span>
      </div>
    </div>
  )
}

// ─── Thumbnail content per item type ────────────────────────────────────────

function ThumbnailContent({ item, wide }: { item: Item; wide: boolean }) {
  if (item.type === 'folder') {
    return <FolderThumbnail color={item.color || FOLDER_DEFAULT} />
  }

  if (item.type === 'note') {
    return <NoteThumbnail content={item.content} wide={wide} />
  }

  if (item.type === 'canvas') {
    return <CanvasThumbnail wide={wide} />
  }

  return null
}

// ── Folder: two-tone SVG (body + tab) per Eden spec ─────────────────────────
function FolderThumbnail({ color }: { color: string }) {
  const body = color
  const tab  = darkenHex(color, 0.65) // spec: 53/82 = 0.646 ≈ 0.65

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ paddingBottom: '25%' }} // spec: pb-[25%] — shifts icon toward centre
    >
      {/*
       * Two-tone folder SVG matching Eden folder icon:
       *   tab  = darker shade (top/back part of folder)
       *   body = main colour (front face of folder)
       */}
      <svg
        width="56"
        height="46"
        viewBox="0 0 56 46"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Tab (top flap) */}
        <path
          d="M2 10C2 8.9 2.9 8 4 8H22L26 4H52C53.1 4 54 4.9 54 6V14H2V10Z"
          fill={tab}
        />
        {/* Body */}
        <path
          d="M2 14H54V42C54 43.1 53.1 44 52 44H4C2.9 44 2 43.1 2 42V14Z"
          fill={body}
        />
      </svg>
    </div>
  )
}

// ── Note: scaled-down content preview ───────────────────────────────────────
function NoteThumbnail({ content, wide }: { content: string | null; wide: boolean }) {
  // Strip HTML tags, take first ~600 chars
  const text = typeof content === 'string'
    ? content.replace(/<[^>]*>/g, '').slice(0, 600)
    : ''

  // Natural width used before scaling. We render at 2× the card width and
  // scale it down by 0.5 so the text appears at a comfortable reading size.
  const cardW    = wide ? 316 : 150
  const scale    = 0.5
  const naturalW = Math.round(cardW / scale)  // 300 or 632

  return (
    <div className="w-full h-full overflow-hidden relative">
      <div
        style={{
          position:        'absolute',
          top:             0,
          left:            0,
          width:           naturalW,
          transformOrigin: 'top left',
          transform:       `scale(${scale})`,
          padding:         '16px',
          lineHeight:      1.6,
          fontSize:        14,
          color:           'rgba(39,37,35,0.65)',
          fontFamily:      'ui-sans-serif, system-ui, sans-serif',
          whiteSpace:      'pre-wrap',
          wordBreak:       'break-word',
        }}
      >
        {text || (
          <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Empty note</span>
        )}
      </div>
    </div>
  )
}

// ── Canvas: abstract grid preview ────────────────────────────────────────────
function CanvasThumbnail({ wide }: { wide: boolean }) {
  const cols = wide ? 6 : 4
  const rows = 3
  // Varied card heights for visual interest
  const heights = [32, 20, 28, 16, 24, 32, 18, 28, 20, 16, 24, 30, 20, 16, 28, 22, 18, 24]

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows:    `repeat(${rows}, auto)`,
          gap:                 6,
          width:               wide ? '75%' : '68%',
          opacity:             0.18,
        }}
      >
        {Array.from({ length: cols * rows }).map((_, i) => (
          <div
            key={i}
            className="rounded"
            style={{
              height:     heights[i % heights.length],
              background: '#272523',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Relative timestamp (spec: "16h", "17h", "2d" etc.) ─────────────────────
function getRelativeTime(dateStr: string): string {
  try {
    const d      = new Date(dateStr)
    const diffMs = Date.now() - d.getTime()
    const diffH  = Math.floor(diffMs / 3_600_000)
    if (diffH < 1)  return 'now'
    if (diffH < 24) return `${diffH}h`
    const diffD = Math.floor(diffMs / 86_400_000)
    if (diffD < 30) return `${diffD}d`
    return formatDistanceToNowStrict(d, { addSuffix: false })
  } catch {
    return ''
  }
}
