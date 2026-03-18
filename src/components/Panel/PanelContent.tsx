import { useState, useMemo, useCallback } from 'react'
import { useStore } from '../../store/workspace'
import type { Panel, Item } from '../../types'
import { supabase } from '../../lib/supabase'
import Banner from '../Banner'
import SearchBar from '../SearchBar'
import FileGrid from '../FileGrid'
import NoteEditor from '../Editor'
import PanelHeader from './PanelHeader'

interface Props {
  panel: Panel
  canClose: boolean
}

export default function PanelContent({ panel, canClose }: Props) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'notes' | 'trash'>('all')

  const {
    closePanel, openPanel, addItem,
    addRecent, workspace, user, items,
    viewMode,
  } = useStore()

  const parentItem = panel.itemId ? items.find((i) => i.id === panel.itemId) : null
  const parentId = panel.type === 'folder' ? (panel.itemId ?? null) : null

  const handleOpen = useCallback((item: Item) => {
    openPanel({ type: item.type as any, itemId: item.id })
    addRecent(item.id)
    if (user) {
      supabase.from('recents')
        .upsert({
          user_id: user.id,
          item_id: item.id,
          accessed_at: new Date().toISOString(),
        })
        .then(() => {})
    }
  }, [user, openPanel, addRecent])

  function handleClose() {
    if (canClose) closePanel(panel.id)
  }

  // ── Note editor ──
  if (panel.type === 'note' && panel.itemId) {
    return (
      <div className="flex flex-col h-full bg-background-main overflow-hidden">
        <PanelHeader panel={panel} canClose={canClose} onClose={handleClose} />
        <div className="flex-1 overflow-hidden">
          <NoteEditor itemId={panel.itemId} />
        </div>
      </div>
    )
  }

  // ── Canvas (placeholder for now) ──
  if (panel.type === 'canvas' && panel.itemId) {
    const canvasItem = items.find((i) => i.id === panel.itemId)
    return (
      <div className="flex flex-col h-full bg-background-main overflow-hidden">
        <PanelHeader panel={panel} canClose={canClose} onClose={handleClose} />
        <div className="flex-1 flex flex-col items-center justify-center text-text-dark-secondary gap-3">
          <div className="w-16 h-16 rounded-2xl bg-neutral-dark-5 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-text-dark-primary">{canvasItem?.name ?? 'Canvas'}</p>
          <p className="text-xs opacity-60">Canvas editor coming soon</p>
        </div>
      </div>
    )
  }

  // ── Trash view ──
  if (panel.type === 'trash') {
    return (
      <div className="flex flex-col h-full bg-background-main overflow-hidden">
        <PanelHeader panel={panel} canClose={canClose} onClose={handleClose} />
        <div className="px-6 py-8 flex-1 flex flex-col items-center justify-center text-text-dark-secondary gap-2">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          <p className="text-sm font-medium text-text-dark-primary">Trash</p>
          <p className="text-xs opacity-60">Deleted folders and items will appear here.</p>
        </div>
      </div>
    )
  }

  // ── Root / Folder grid view ──
  const isRoot = panel.type === 'root'
  const typeFilter = tab === 'notes' ? 'notes' : 'all'

  return (
    <div className="flex flex-col h-full bg-background-main overflow-hidden">
      {/* Banner only on root panel */}
      {isRoot && <Banner />}

      <PanelHeader panel={panel} canClose={canClose} onClose={handleClose} />

      <SearchBar
        value={search}
        onChange={setSearch}
        folderName={parentItem?.name}
        onClearFolder={() => openPanel({ type: 'root' })}
        activeTab={tab}
        onTabChange={setTab}
      />

      {/* Grid / List */}
      <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6">
        {viewMode === 'grid' ? (
          <FileGrid
            parentId={parentId}
            search={search}
            typeFilter={typeFilter}
            onOpen={handleOpen}
          />
        ) : (
          <ListView parentId={parentId} search={search} typeFilter={typeFilter} onOpen={handleOpen} />
        )}
      </div>
    </div>
  )
}

// ── Simple list view ──
function ListView({
  parentId, search, typeFilter, onOpen,
}: {
  parentId: string | null
  search: string
  typeFilter: 'all' | 'notes'
  onOpen: (item: Item) => void
}) {
  const { items, sortBy, setContextMenu } = useStore()

  const filtered = useMemo(() => {
    let list = items.filter((i) => {
      if (search.trim()) return i.name.toLowerCase().includes(search.toLowerCase())
      return i.parent_id === parentId
    })
    if (typeFilter === 'notes') list = list.filter((i) => i.type === 'note')
    switch (sortBy) {
      case 'name': return [...list].sort((a, b) => a.name.localeCompare(b.name))
      case 'modified': return [...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      case 'type': return [...list].sort((a, b) => a.type.localeCompare(b.type))
      default: return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
  }, [items, parentId, search, typeFilter, sortBy])

  const TYPE_ICON: Record<string, string> = { folder: '📁', note: '📄', canvas: '⬜' }

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-text-dark-secondary text-sm">
        {search ? `No results for "${search}"` : 'Nothing here yet'}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {filtered.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-dark-5 cursor-pointer transition-colors group"
          style={{ height: 36 }}
          onClick={() => onOpen(item)}
          onContextMenu={(e) => {
            e.preventDefault()
            setContextMenu({ x: e.clientX, y: e.clientY, itemId: item.id })
          }}
        >
          <span className="text-sm w-5 text-center shrink-0">{TYPE_ICON[item.type] ?? '📄'}</span>
          <span className="flex-1 text-sm text-text-dark-primary truncate">{item.name}</span>
          <span className="text-xs text-text-dark-secondary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity capitalize">{item.type}</span>
          <span className="text-xs text-accent-orange shrink-0 tabular-nums">
            {new Date(item.updated_at).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  )
}
