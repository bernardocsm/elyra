import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../store/workspace'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const FOLDER_COLORS = [
  { hex: '#527160', name: 'Vine green' },
  { hex: '#5B82B5', name: 'Blueberry blue' },
  { hex: '#9C7FC1', name: 'Acai purple' },
  { hex: '#CC768D', name: 'Raspberry red' },
  { hex: '#AC8472', name: 'Seed brown' },
  { hex: '#D17866', name: 'Grapefruit orange' },
  { hex: '#DCAB6F', name: 'Kiwi yellow' },
  { hex: '#383441', name: 'Dragonfruit gray' },
]

export default function ContextMenu() {
  const {
    contextMenu, setContextMenu,
    items, updateItem, addItem,
    workspace, openPanel, softDeleteItem,
    openMoveToModal, openNewFolderModal,
    setInfoPanelItemId,
  } = useStore()
  const ref = useRef<HTMLDivElement>(null)
  const [showColors, setShowColors] = useState(false)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setContextMenu(null)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  // Reset submenu on close
  useEffect(() => {
    if (!contextMenu) setShowColors(false)
  }, [contextMenu])

  if (!contextMenu) return null

  const item = contextMenu.itemId ? items.find((i) => i.id === contextMenu.itemId) : null

  async function handleOpen() {
    if (!item) return
    openPanel({ type: item.type as any, itemId: item.id })
    setContextMenu(null)
  }

  function handleOpenInNewPane() {
    if (!item) return
    // Force a new split panel
    const store = useStore.getState()
    const id = `panel-${Date.now()}`
    store.openPanel({ type: item.type as any, itemId: item.id })
    setContextMenu(null)
  }

  function handleAskAI() {
    setContextMenu(null)
    toast('AI context coming soon', { icon: '✨' })
  }

  async function handlePin() {
    if (!item) return
    const newPinned = !item.is_pinned
    updateItem(item.id, { is_pinned: newPinned })
    await supabase.from('items').update({ is_pinned: newPinned }).eq('id', item.id)
    setContextMenu(null)
    toast.success(newPinned ? `"${item.name}" pinned` : `"${item.name}" unpinned`)
  }

  async function handleRename() {
    if (!item) return
    setContextMenu(null)
    const name = prompt('Rename:', item.name)
    if (!name || name.trim() === '' || name === item.name) return
    updateItem(item.id, { name: name.trim() })
    await supabase.from('items').update({ name: name.trim() }).eq('id', item.id)
  }

  async function handleDuplicate() {
    if (!item || !workspace) return
    setContextMenu(null)
    const { data } = await supabase
      .from('items')
      .insert({
        workspace_id: item.workspace_id,
        parent_id: item.parent_id,
        type: item.type,
        name: `${item.name} (copy)`,
        content: item.content,
        color: item.color,
        position: item.position + 1,
      })
      .select()
      .single()
    if (data) {
      addItem(data as any)
      toast.success('Duplicated')
    }
  }

  function handleMoveTo() {
    if (!item) return
    setContextMenu(null)
    openMoveToModal([item.id])
  }

  function handleShare() {
    setContextMenu(null)
    toast('Sharing coming soon', { icon: '🔗' })
  }

  function handleDownload() {
    if (!item) return
    setContextMenu(null)
    const content = item.content ?? ''
    const ext = item.type === 'note' ? '.md' : item.type === 'canvas' ? '.canvas' : '.txt'
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${item.name}${ext}`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Downloaded "${item.name}"`)
  }

  function handleVersionHistory() {
    setContextMenu(null)
    toast('Version history coming soon', { icon: '🕐' })
  }

  function handleInformation() {
    if (!item) return
    setContextMenu(null)
    setInfoPanelItemId(item.id)
    // Open the item's panel so info panel can appear
    openPanel({ type: item.type as any, itemId: item.id })
  }

  async function handleDelete() {
    if (!item) return
    setContextMenu(null)
    softDeleteItem(item.id)
    await supabase
      .from('items')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', item.id)
    toast.success(`"${item.name}" moved to Trash`)
  }

  async function handleChangeColor(color: string) {
    if (!item) return
    updateItem(item.id, { color })
    await supabase.from('items').update({ color }).eq('id', item.id)
    setContextMenu(null)
    setShowColors(false)
  }

  async function handleCreate(type: 'note' | 'folder' | 'canvas') {
    if (!workspace) return
    setContextMenu(null)
    if (type === 'folder') {
      openNewFolderModal(null)
      return
    }
    const count = useStore.getState().items.filter((i) => i.parent_id === null).length
    const names = { note: 'Untitled note', folder: 'Untitled folder', canvas: 'Untitled canvas' }
    const { data } = await supabase
      .from('items')
      .insert({
        workspace_id: workspace.id,
        type,
        name: names[type],
        parent_id: null,
        position: count,
      })
      .select()
      .single()
    if (data) addItem(data as any)
  }

  // ── Color submenu ──
  if (showColors && item) {
    return createPortal(
      <div
        ref={ref}
        className="fixed z-[1000] bg-background-main border border-divider rounded-xl shadow-xl p-3 min-w-[200px]"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setShowColors(false)}
            className="p-1 rounded hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className="text-xs font-semibold text-text-dark-secondary uppercase tracking-wider">Color</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {FOLDER_COLORS.map(({ hex, name: colorName }) => (
            <button
              key={hex}
              title={colorName}
              onClick={() => handleChangeColor(hex)}
              className="flex flex-col items-center gap-1"
            >
              <div
                className="rounded-lg transition-all hover:scale-110"
                style={{
                  width: 36, height: 36,
                  background: hex,
                  outline: item.color === hex ? `2.5px solid ${hex}` : '2.5px solid transparent',
                  outlineOffset: 2,
                }}
              />
              <span className="text-[9px] text-text-dark-secondary/70 leading-none text-center w-full truncate px-0.5">
                {colorName}
              </span>
            </button>
          ))}
        </div>
      </div>,
      document.body
    )
  }

  // ── Item context menu ──
  type MenuItem =
    | { label: string; action: () => void; danger?: boolean; sub?: string; icon?: string }
    | null

  const itemMenuItems: MenuItem[] = item ? [
    { label: 'Open', action: handleOpen },
    { label: 'Open in new pane', action: handleOpenInNewPane },
    null,
    { label: 'Ask AI', action: handleAskAI, icon: '✨' },
    null,
    { label: item.is_pinned ? 'Unpin' : 'Pin', action: handlePin },
    { label: 'Rename', action: handleRename },
    { label: 'Duplicate', action: handleDuplicate },
    null,
    ...(item.type === 'folder' ? [
      { label: 'Change color ▶', action: () => setShowColors(true) } as MenuItem,
    ] : []),
    null,
    { label: 'Share', action: handleShare },
    { label: 'Move to', action: handleMoveTo },
    { label: 'Download', action: handleDownload },
    ...(item.type !== 'folder' ? [
      { label: 'Version history', action: handleVersionHistory } as MenuItem,
    ] : []),
    { label: 'Information', action: handleInformation },
    null,
    { label: 'Delete', action: handleDelete, danger: true },
  ] : []

  // ── Background context menu ──
  const bgMenuItems: MenuItem[] = [
    { label: 'New Note', action: () => handleCreate('note') },
    { label: 'New Canvas', action: () => handleCreate('canvas') },
    { label: 'New Folder', action: () => handleCreate('folder') },
  ]

  const menuItems = item ? itemMenuItems : bgMenuItems

  // Keep menu in viewport
  const menuW = 210
  const approxH = (menuItems.filter(Boolean).length * 34) + 16
  let { x, y } = contextMenu
  if (typeof window !== 'undefined') {
    if (x + menuW > window.innerWidth - 8) x = window.innerWidth - menuW - 8
    if (y + approxH > window.innerHeight - 8) y = window.innerHeight - approxH - 8
  }

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[1000] bg-background-main border border-divider rounded-xl shadow-xl p-1 min-w-[210px]"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menuItems.map((m, i) => {
        if (m === null) {
          return <div key={`sep-${i}`} className="my-1 h-px bg-divider mx-1" />
        }
        return (
          <button
            key={m.label}
            onClick={m.action}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-neutral-dark-5 text-left"
            style={{
              height: 34,
              color: m.danger ? '#CC768D' : '#272523',
            }}
          >
            {m.icon && <span className="text-xs w-4 text-center shrink-0">{m.icon}</span>}
            <span className="flex-1">{m.label}</span>
            {m.label.endsWith('▶') && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-dark-secondary/50">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
          </button>
        )
      })}
    </div>,
    document.body
  )
}
