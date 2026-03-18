import { useMemo } from 'react'
import { useStore } from '../../store/workspace'
import FileCard from './FileCard'
import type { Item } from '../../types'

const CARD_W = 150
const WIDE_W = 316
const CARD_H = 179
const GAP = 16
const CONTAINER_W = 814

interface Props {
  parentId: string | null
  search: string
  typeFilter?: 'all' | 'notes' | 'trash'
  onOpen: (item: Item) => void
}

export default function FileGrid({ parentId, search, typeFilter = 'all', onOpen }: Props) {
  const { items, sortBy, setContextMenu } = useStore()

  const filtered = useMemo(() => {
    let list = items.filter((i) => {
      // Scope: only items in this parent
      if (search.trim()) {
        // Search across all items, not just this parent
        return i.name.toLowerCase().includes(search.toLowerCase())
      }
      return i.parent_id === parentId
    })

    // Tab filter
    if (typeFilter === 'notes') {
      list = list.filter((i) => i.type === 'note')
    }

    // Sort
    switch (sortBy) {
      case 'name':
        list = [...list].sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'modified':
        list = [...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        break
      case 'type':
        list = [...list].sort((a, b) => a.type.localeCompare(b.type))
        break
      default: // created
        list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return list
  }, [items, parentId, search, typeFilter, sortBy])

  // Layout: place items left-to-right, wrap when line is full
  const positioned = useMemo(() => {
    let x = 0
    let y = 0

    return filtered.map((item) => {
      const wide = item.type === 'canvas'
      const w = wide ? WIDE_W : CARD_W

      // Wrap if doesn't fit
      if (x > 0 && x + w > CONTAINER_W) {
        x = 0
        y += CARD_H + GAP
      }

      const pos = { item, x, y, wide }
      x += w + GAP
      return pos
    })
  }, [filtered])

  const totalH = positioned.length > 0
    ? Math.max(...positioned.map((p) => p.y)) + CARD_H
    : 0

  function handleBgContextMenu(e: React.MouseEvent) {
    // Only if clicking directly on the container (not a card)
    if (e.target === e.currentTarget) {
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, itemId: null, isBackground: true })
    }
  }

  if (filtered.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center py-16 text-text-dark-secondary"
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
    <div
      className="relative w-full"
      style={{ height: totalH, minHeight: 100 }}
      onContextMenu={handleBgContextMenu}
    >
      {positioned.map(({ item, x, y, wide }) => (
        <div key={item.id} className="absolute" style={{ left: x, top: y }}>
          <FileCard item={item} wide={wide} onOpen={onOpen} />
        </div>
      ))}
    </div>
  )
}
