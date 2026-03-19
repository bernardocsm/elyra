import { useMemo } from 'react'
import { useStore } from '../../store/workspace'
import FileCard from './FileCard'
import type { Item } from '../../types'
import { supabase } from '../../lib/supabase'

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
  const { items, sortBy, setContextMenu, groupFolders, workspace, addItem, openPanel, openNewFolderModal } = useStore()

  const filtered = useMemo(() => {
    let list = items.filter((i) => {
      if (typeFilter === 'trash') return i.is_deleted
      if (i.is_deleted) return false
      if (search.trim()) return i.name.toLowerCase().includes(search.toLowerCase())
      return i.parent_id === parentId
    })

    if (typeFilter === 'notes') {
      list = list.filter((i) => i.type === 'note')
    }

    // Sort
    let sorted: Item[]
    switch (sortBy) {
      case 'name':
        sorted = [...list].sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'modified':
        sorted = [...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        break
      case 'type':
        sorted = [...list].sort((a, b) => a.type.localeCompare(b.type))
        break
      default: // created
        sorted = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    // Group folders at top
    if (groupFolders && typeFilter !== 'trash') {
      const folders = sorted.filter((i) => i.type === 'folder')
      const rest = sorted.filter((i) => i.type !== 'folder')
      return [...folders, ...rest]
    }

    return sorted
  }, [items, parentId, search, typeFilter, sortBy, groupFolders])

  // Layout: place items left-to-right, wrap when line is full
  const positioned = useMemo(() => {
    let x = 0
    let y = 0

    return filtered.map((item) => {
      const wide = item.type === 'canvas'
      const w = wide ? WIDE_W : CARD_W

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
    if (e.target === e.currentTarget) {
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, itemId: null, isBackground: true })
    }
  }

  async function quickCreate(type: 'note' | 'canvas') {
    if (!workspace) return
    const count = items.filter((i) => i.parent_id === parentId && !i.is_deleted).length
    const names = { note: 'Untitled note', canvas: 'Untitled canvas' }
    const { data } = await supabase.from('items').insert({
      workspace_id: workspace.id,
      type,
      name: names[type],
      parent_id: parentId,
      position: count,
    }).select().single()
    if (data) {
      addItem(data as any)
      openPanel({ type, itemId: data.id })
    }
  }

  if (filtered.length === 0) {
    if (search) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-text-dark-secondary" onContextMenu={handleBgContextMenu}>
          <p className="text-sm font-medium">No results for "{search}"</p>
          <p className="text-xs mt-1 opacity-60">Try a different search term</p>
        </div>
      )
    }

    if (typeFilter === 'trash') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-text-dark-secondary gap-2">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          <p className="text-sm font-medium text-text-dark-primary">Trash is empty</p>
          <p className="text-xs opacity-60">Items you delete will appear here for 30 days</p>
        </div>
      )
    }

    // Empty folder / root state
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center py-16 text-text-dark-secondary gap-4"
        onContextMenu={handleBgContextMenu}
      >
        {/* Folder icon with plus */}
        <div
          className="relative flex items-center justify-center rounded-2xl"
          style={{ width: 72, height: 72, background: 'rgba(39,37,35,0.05)' }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <div
            className="absolute -bottom-2 -right-2 flex items-center justify-center rounded-full border-2"
            style={{ width: 22, height: 22, background: '#39624D', borderColor: '#F6F6F6' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-text-dark-primary mb-0.5">Drop files here</p>
          <p className="text-xs opacity-60">Or create a new item in this folder</p>
        </div>

        {/* Quick create buttons */}
        <div className="flex items-center gap-2">
          <QuickCreateButton label="New Note" onClick={() => quickCreate('note')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </QuickCreateButton>
          <QuickCreateButton label="New Canvas" onClick={() => quickCreate('canvas')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </QuickCreateButton>
          <QuickCreateButton label="Paste Link" onClick={() => {}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </QuickCreateButton>
        </div>
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

function QuickCreateButton({ label, onClick, children }: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-divider text-sm text-text-dark-primary hover:bg-neutral-dark-5 hover:border-primary-30 transition-colors"
    >
      <span className="text-text-dark-secondary">{children}</span>
      {label}
    </button>
  )
}
