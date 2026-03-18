import { useState } from 'react'
import { useStore } from '../../store/workspace'
import type { Item } from '../../types'
import { formatDistanceToNowStrict } from 'date-fns'

const CARD_W = 150
const WIDE_W = 316
const THUMB_H = 149
const CARD_H = 179

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
  const cardW = wide ? WIDE_W : CARD_W

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
      {/* Thumbnail */}
      <div
        className="relative overflow-hidden"
        style={{
          width: cardW,
          height: THUMB_H,
          borderRadius: 16,
          border: isSelected
            ? '2px solid #39624D'
            : '2px solid rgb(240,240,240)',
          background: 'rgba(39,37,35,0.05)',
          transition: 'border-color 150ms',
        }}
      >
        <ThumbnailContent item={item} wide={wide} />

        {/* Checkbox */}
        <div
          className="absolute transition-opacity duration-150"
          style={{
            top: 8, left: 8,
            opacity: hovered || isSelected ? 1 : 0,
          }}
          onClick={handleCheckboxClick}
        >
          <div
            className="flex items-center justify-center transition-colors"
            style={{
              width: 24, height: 24,
              background: isSelected ? '#39624D' : 'rgba(255,255,255,0.9)',
              border: `2px solid ${isSelected ? '#39624D' : 'rgba(39,37,35,0.1)'}`,
              borderRadius: 6,
              backdropFilter: 'blur(4px)',
            }}
          >
            {isSelected && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </div>
        </div>

        {/* Folder item count badge on hover */}
        {item.type === 'folder' && hovered && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap"
            style={{
              background: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(39,37,35,0.1)',
              color: '#686764',
              backdropFilter: 'blur(4px)',
            }}
          >
            {childCount} {childCount === 1 ? 'item' : 'items'}
          </div>
        )}
      </div>

      {/* Label row */}
      <div
        className="flex items-baseline justify-between gap-2 px-1 mt-1"
        style={{ height: 24 }}
      >
        <span
          className="text-sm text-text-dark-primary truncate leading-6 flex-1 min-w-0"
        >
          {item.name}
        </span>
        <span
          className="text-xs shrink-0 tabular-nums"
          style={{ color: '#D97706' }}
        >
          {getRelativeTime(item.updated_at)}
        </span>
      </div>
    </div>
  )
}

function ThumbnailContent({ item, wide }: { item: Item; wide: boolean }) {
  if (item.type === 'folder') {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ paddingBottom: '25%' }}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill={item.color}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
    )
  }

  if (item.type === 'note') {
    const text = typeof item.content === 'string'
      ? item.content.replace(/<[^>]*>/g, '').slice(0, 400)
      : ''
    return (
      <div className="w-full h-full overflow-hidden p-3">
        <div
          className="text-[9px] text-text-dark-secondary leading-relaxed break-words whitespace-pre-wrap origin-top-left"
          style={{
            transform: 'scale(1)',
            opacity: 0.7,
            lineHeight: 1.5,
          }}
        >
          {text || <span className="italic opacity-50">Empty note</span>}
        </div>
      </div>
    )
  }

  if (item.type === 'canvas') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div
          className="grid gap-2 opacity-20"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)', width: '60%' }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded"
              style={{
                height: i % 3 === 0 ? 24 : 16,
                background: '#686764',
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  return null
}

function getRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const diffMs = Date.now() - d.getTime()
    const diffH = Math.floor(diffMs / 3_600_000)
    if (diffH < 1) return 'now'
    if (diffH < 24) return `${diffH}h`
    const diffD = Math.floor(diffMs / 86_400_000)
    if (diffD < 30) return `${diffD}d`
    return formatDistanceToNowStrict(d, { addSuffix: false })
  } catch {
    return ''
  }
}
