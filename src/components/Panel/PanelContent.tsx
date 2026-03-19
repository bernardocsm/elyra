import { useState, useMemo, useCallback } from 'react'
import { useStore } from '../../store/workspace'
import type { Panel, Item } from '../../types'
import { supabase } from '../../lib/supabase'
import Banner from '../Banner'
import SearchBar from '../SearchBar'
import FileGrid from '../FileGrid'
import NoteEditor from '../Editor'
import PanelHeader from './PanelHeader'
import InfoPanel from '../InfoPanel'
import toast from 'react-hot-toast'

interface Props {
  panel: Panel
  canClose: boolean
}

// History hook for back/forward navigation within a panel
function usePanelHistory(initial: { type: Panel['type']; itemId?: string }) {
  const [history, setHistory] = useState([initial])
  const [index, setIndex] = useState(0)

  const current = history[index]

  function navigate(next: { type: Panel['type']; itemId?: string }) {
    setHistory((h) => [...h.slice(0, index + 1), next])
    setIndex((i) => i + 1)
  }

  function goBack() {
    if (index > 0) setIndex((i) => i - 1)
  }

  function goForward() {
    if (index < history.length - 1) setIndex((i) => i + 1)
  }

  return {
    current,
    history,
    index,
    navigate,
    goBack,
    goForward,
    canGoBack: index > 0,
    canGoForward: index < history.length - 1,
  }
}

export default function PanelContent({ panel, canClose }: Props) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'notes' | 'trash'>('all')

  const {
    closePanel, openPanel, addItem, updateItem,
    addRecent, workspace, user, items,
    viewMode, infoPanelItemId,
    softDeleteItem, restoreItem,
  } = useStore()

  const nav = usePanelHistory({ type: panel.type, itemId: panel.itemId })

  // When panel prop changes externally, sync nav
  const effectivePanel: Panel = {
    ...panel,
    type: nav.current.type,
    itemId: nav.current.itemId,
  }

  const parentItem = effectivePanel.itemId
    ? items.find((i) => i.id === effectivePanel.itemId)
    : null
  const parentId = effectivePanel.type === 'folder' ? (effectivePanel.itemId ?? null) : null

  const handleOpen = useCallback((item: Item) => {
    nav.navigate({ type: item.type as any, itemId: item.id })
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
  }, [user, openPanel, addRecent, nav])

  function handleClose() {
    if (canClose) closePanel(panel.id)
  }

  function handleNavigate(dir: 'back' | 'forward') {
    if (dir === 'back') nav.goBack()
    else nav.goForward()
    const target = dir === 'back' ? nav.history[nav.index - 1] : nav.history[nav.index + 1]
    if (target) {
      openPanel({ type: target.type, itemId: target.itemId })
    }
  }

  const infoPanelOpen = infoPanelItemId === effectivePanel.itemId && effectivePanel.itemId !== undefined

  // ── Note editor ──
  if (effectivePanel.type === 'note' && effectivePanel.itemId) {
    return (
      <div className="flex h-full bg-background-main overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <PanelHeader
            panel={effectivePanel}
            canClose={canClose}
            onClose={handleClose}
            onNavigate={handleNavigate}
            canGoBack={nav.canGoBack}
            canGoForward={nav.canGoForward}
          />
          <div className="flex-1 overflow-hidden">
            <NoteEditor itemId={effectivePanel.itemId} />
          </div>
        </div>
        {infoPanelOpen && <InfoPanel />}
      </div>
    )
  }

  // ── Canvas (placeholder) ──
  if (effectivePanel.type === 'canvas' && effectivePanel.itemId) {
    const canvasItem = items.find((i) => i.id === effectivePanel.itemId)
    return (
      <div className="flex h-full bg-background-main overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <PanelHeader
            panel={effectivePanel}
            canClose={canClose}
            onClose={handleClose}
            onNavigate={handleNavigate}
            canGoBack={nav.canGoBack}
            canGoForward={nav.canGoForward}
          />
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
        {infoPanelOpen && <InfoPanel />}
      </div>
    )
  }

  // ── Chat (placeholder) ──
  if (effectivePanel.type === 'chat' && effectivePanel.itemId) {
    const chatItem = items.find((i) => i.id === effectivePanel.itemId)
    return (
      <div className="flex h-full bg-background-main overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <PanelHeader
            panel={effectivePanel}
            canClose={canClose}
            onClose={handleClose}
          />
          <div className="flex-1 flex flex-col items-center justify-center text-text-dark-secondary gap-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgb(236,240,237)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#39624D" strokeWidth="1.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-text-dark-primary">{chatItem?.name ?? 'Eden AI'}</p>
            <p className="text-xs opacity-60">AI chat coming soon</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Link view ──
  if (effectivePanel.type === 'link' && effectivePanel.itemId) {
    const linkItem = items.find((i) => i.id === effectivePanel.itemId)
    return (
      <div className="flex h-full bg-background-main overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <PanelHeader panel={effectivePanel} canClose={canClose} onClose={handleClose} />
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-dark-secondary">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            <p className="text-sm font-medium text-text-dark-primary truncate px-8 text-center">
              {linkItem?.name}
            </p>
            {linkItem?.content && (
              <a
                href={linkItem.content}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent-eden hover:underline"
              >
                Open link ↗
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Trash view ──
  if (effectivePanel.type === 'trash') {
    return (
      <TrashView panel={effectivePanel} canClose={canClose} onClose={handleClose} />
    )
  }

  // ── Root / Folder grid view ──
  const isRoot = effectivePanel.type === 'root'
  const typeFilter = tab === 'notes' ? 'notes' : 'all'

  return (
    <div className="flex flex-col h-full bg-background-main overflow-hidden">
      {isRoot && <Banner />}

      <PanelHeader
        panel={effectivePanel}
        canClose={canClose}
        onClose={handleClose}
        onNavigate={handleNavigate}
        canGoBack={nav.canGoBack}
        canGoForward={nav.canGoForward}
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        folderName={parentItem?.name}
        onClearFolder={() => openPanel({ type: 'root' })}
        activeTab={tab}
        onTabChange={setTab}
      />

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

// ── Trash panel ──
function TrashView({ panel, canClose, onClose }: { panel: Panel; canClose: boolean; onClose: () => void }) {
  const { items, restoreItem, removeItem, updateItem } = useStore()
  const trashedItems = items.filter((i) => i.is_deleted)

  async function handleRestore(id: string) {
    restoreItem(id)
    await supabase.from('items').update({ is_deleted: false, deleted_at: null }).eq('id', id)
    toast.success('Restored')
  }

  async function handleDeletePermanently(id: string) {
    const item = items.find((i) => i.id === id)
    removeItem(id)
    await supabase.from('items').delete().eq('id', id)
    toast.success(`"${item?.name}" permanently deleted`)
  }

  async function handleEmptyTrash() {
    for (const item of trashedItems) {
      removeItem(item.id)
      await supabase.from('items').delete().eq('id', item.id)
    }
    toast.success('Trash emptied')
  }

  return (
    <div className="flex flex-col h-full bg-background-main overflow-hidden">
      <PanelHeader panel={panel} canClose={canClose} onClose={onClose} />

      {/* Trash warning banner */}
      {trashedItems.length > 0 && (
        <div
          className="flex items-center justify-between px-6 py-2.5 border-b border-divider text-xs text-text-dark-secondary shrink-0"
          style={{ background: 'rgba(204,118,141,0.06)' }}
        >
          <span>Items in trash will be permanently deleted after 30 days</span>
          <button
            onClick={handleEmptyTrash}
            className="text-accent-raspberry hover:underline font-medium transition-colors"
          >
            Empty Trash
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
        {trashedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-dark-secondary gap-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            <p className="text-sm font-medium text-text-dark-primary">Trash is empty</p>
            <p className="text-xs opacity-60">Items you delete will appear here for 30 days</p>
          </div>
        ) : (
          <div className="space-y-1">
            {trashedItems.map((item) => (
              <TrashItem
                key={item.id}
                item={item}
                onRestore={() => handleRestore(item.id)}
                onDelete={() => handleDeletePermanently(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const TYPE_ICON:  Record<string, string> = { folder: '📁', note: '📄', canvas: '⬜', chat: '✨', link: '🔗' }
const TYPE_LABEL: Record<string, string> = { folder: 'Folder', note: 'Note', canvas: 'Canvas', chat: 'Chat', link: 'Link' }
function typeLabel(type: string) { return TYPE_LABEL[type] ?? type }

function TrashItem({ item, onRestore, onDelete }: {
  item: Item
  onRestore: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-dark-5 cursor-default transition-colors"
      style={{ height: 42 }}
    >
      <span className="text-sm w-5 text-center shrink-0">{TYPE_ICON[item.type] ?? '📄'}</span>
      <span className="flex-1 text-sm text-text-dark-primary truncate">{item.name}</span>
      <span className="text-xs text-text-dark-secondary shrink-0 opacity-0 group-hover:opacity-100">
        {typeLabel(item.type)}
      </span>
      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors opacity-0 group-hover:opacity-100"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 bottom-8 z-50 w-44 bg-background-main border border-divider rounded-xl shadow-xl p-1">
              <button
                onClick={() => { onRestore(); setMenuOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-neutral-dark-5 text-text-dark-primary transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
                </svg>
                Restore
              </button>
              <button
                onClick={() => { onDelete(); setMenuOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-neutral-dark-5 transition-colors"
                style={{ color: '#CC768D' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                Delete permanently
              </button>
            </div>
          </>
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
  const { items, sortBy, setContextMenu, groupFolders } = useStore()

  const filtered = useMemo(() => {
    let list = items.filter((i) => {
      if (i.is_deleted) return false
      if (search.trim()) return i.name.toLowerCase().includes(search.toLowerCase())
      return i.parent_id === parentId
    })
    if (typeFilter === 'notes') list = list.filter((i) => i.type === 'note')

    let sorted: Item[]
    switch (sortBy) {
      case 'name': sorted = [...list].sort((a, b) => a.name.localeCompare(b.name)); break
      case 'modified': sorted = [...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()); break
      case 'type': sorted = [...list].sort((a, b) => a.type.localeCompare(b.type)); break
      default: sorted = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    if (groupFolders) {
      const folders = sorted.filter((i) => i.type === 'folder')
      const rest = sorted.filter((i) => i.type !== 'folder')
      return [...folders, ...rest]
    }
    return sorted
  }, [items, parentId, search, typeFilter, sortBy, groupFolders])

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
          <span className="text-xs text-text-dark-secondary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {typeLabel(item.type)}
          </span>
          <span className="text-xs shrink-0 tabular-nums" style={{ color: '#D97706' }}>
            {new Date(item.updated_at).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  )
}
