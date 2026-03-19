// ContextMenu — spec:
//   Container : min-width:200px, border-radius:12px, bg-background-main,
//               border border-divider, shadow-xl, p-1, z-[1000]
//   Row       : height:36px, px-3, rounded-lg, text-sm, hover:bg-neutral-dark-5
//               icon 14px left, label flex-1, shortcut right (muted)
//   Danger    : color #CC768D (accent-raspberry)
//   Separator : 1px bg-divider, mx-1 my-1
//
//   Item menu   (12 options): Open · Open in pane · Ask AI |
//                              Pin · Rename · Duplicate · Change Color |
//                              Share · Move to · Download · Information |
//                              Delete (danger)
//   Background  (7 options) : New Note · New Chat · New Canvas · Paste Link |
//                              New Folder · Upload Files · Refresh

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../store/workspace'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// ── Icons (14×14) ─────────────────────────────────────────────────────────────

function Icon({ children, color = 'currentColor' }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="shrink-0 flex items-center justify-center text-text-dark-secondary" style={{ width: 14, height: 14, color }}>
      {children}
    </span>
  )
}

const icons = {
  open: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  split: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/>
    </svg>
  ),
  ai: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  ),
  pin: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/>
    </svg>
  ),
  rename: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>
    </svg>
  ),
  duplicate: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  color: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
    </svg>
  ),
  share: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  ),
  move: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
    </svg>
  ),
  download: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
  note: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#39624D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  canvas: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9C7FC1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
    </svg>
  ),
  chat: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#39624D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  ),
  link: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B82B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  folder: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#686764" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  upload: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#686764" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  ),
  refresh: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  removeFolder: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      <line x1="9" y1="12" x2="15" y2="18"/><line x1="15" y1="12" x2="9" y2="18"/>
    </svg>
  ),
}

// ── Color palette ─────────────────────────────────────────────────────────────

const COLORS = [
  '#527160', '#5B82B5', '#9C7FC1', '#CC768D',
  '#D17866', '#DCAB6F', '#383441', '#AC8472',
]

// ── Main component ─────────────────────────────────────────────────────────────

export default function ContextMenu() {
  const {
    contextMenu, setContextMenu,
    items, updateItem, removeItem, addItem,
    workspace, openPanel, splitPanel,
    setSidebarMode, setCommandPaletteOpen,
    openMoveToModal,
  } = useStore()

  const ref = useRef<HTMLDivElement>(null)

  // ── Close on outside click or Escape ────────────────────────────────────────
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

  if (!contextMenu) return null

  const item = contextMenu.itemId ? items.find((i) => i.id === contextMenu.itemId) : null

  // ── Item actions ─────────────────────────────────────────────────────────────

  function close() { setContextMenu(null) }

  function handleOpen() {
    if (!item) return
    openPanel({ type: item.type as any, itemId: item.id })
    close()
  }

  function handleOpenInPane() {
    if (!item) return
    splitPanel({ type: item.type as any, itemId: item.id })
    close()
  }

  function handleAskAI() {
    setSidebarMode('ai')
    close()
  }

  async function handlePin() {
    if (!item) return
    const newPinned = !item.is_pinned
    updateItem(item.id, { is_pinned: newPinned })
    await supabase.from('items').update({ is_pinned: newPinned }).eq('id', item.id)
    close()
    toast.success(newPinned ? `"${item.name}" pinned` : `"${item.name}" unpinned`)
  }

  async function handleRename() {
    if (!item) return
    close()
    const name = prompt('Rename:', item.name)
    if (!name || name.trim() === '' || name === item.name) return
    updateItem(item.id, { name: name.trim() })
    await supabase.from('items').update({ name: name.trim() }).eq('id', item.id)
  }

  async function handleDuplicate() {
    if (!item || !workspace) return
    close()
    const { data } = await supabase
      .from('items')
      .insert({
        workspace_id: item.workspace_id,
        parent_id: item.parent_id,
        type: item.type,
        name: `${item.name} copy`,
        content: item.content,
        color: item.color,
        position: item.position + 1,
      })
      .select().single()
    if (data) {
      addItem(data as any)
      toast.success('Duplicated')
    }
  }

  async function handleChangeColor(color: string) {
    if (!item) return
    updateItem(item.id, { color })
    await supabase.from('items').update({ color }).eq('id', item.id)
    close()
  }

  function handleShare() {
    close()
    toast('Sharing coming soon', { icon: '🔗' })
  }

  function handleMoveTo() {
    if (!item) return
    close()
    openMoveToModal(item.id)
  }

  async function handleRemoveFromFolder() {
    if (!item) return
    close()
    updateItem(item.id, { parent_id: null })
    await supabase.from('items').update({ parent_id: null }).eq('id', item.id)
    toast.success(`"${item.name}" moved to home`)
  }

  function handleDownload() {
    close()
    toast('Download coming soon', { icon: '⬇️' })
  }

  function handleInformation() {
    if (!item) return
    close()
    const created = new Date(item.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })
    const updated = new Date(item.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' })
    toast(`${item.type} · Created ${created} · Updated ${updated}`, { duration: 4000 })
  }

  async function handleDelete() {
    if (!item) return
    close()
    removeItem(item.id)
    await supabase.from('items').delete().eq('id', item.id)
    toast.success(`"${item.name}" deleted`)
  }

  // ── Background actions ───────────────────────────────────────────────────────

  async function handleCreate(type: 'note' | 'canvas' | 'folder') {
    if (!workspace) return
    close()
    const count = useStore.getState().items.filter((i) => i.parent_id === null).length
    const names = { note: 'Untitled note', canvas: 'Untitled canvas', folder: 'Untitled folder' }
    const { data } = await supabase
      .from('items')
      .insert({ workspace_id: workspace.id, type, name: names[type], parent_id: null, position: count })
      .select().single()
    if (data) {
      addItem(data as any)
      if (type !== 'folder') openPanel({ type, itemId: data.id })
    }
  }

  function handleNewChat() {
    setSidebarMode('ai')
    close()
  }

  function handlePasteLink() {
    close()
    toast('Paste link coming soon', { icon: '🔗' })
  }

  function handleUpload() {
    close()
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.multiple = true
    inp.click()
  }

  function handleRefresh() {
    close()
    window.location.reload()
  }

  // ── Position clamping (keep in viewport) ─────────────────────────────────────

  // Estimate menu height: count non-null rows * 36 + separators * 9 + padding 8 + color row ~60
  let approxH: number
  if (item) {
    // 12 rows + 3 separators + color row
    approxH = 12 * 36 + 3 * (1 + 8) + 60 + 8
  } else {
    // 7 rows + 1 separator
    approxH = 7 * 36 + (1 + 8) + 8
  }
  const menuW = 220
  let { x, y } = contextMenu
  if (x + menuW > window.innerWidth - 8)  x = window.innerWidth - menuW - 8
  if (y + approxH > window.innerHeight - 8) y = window.innerHeight - approxH - 8
  if (y < 8) y = 8

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[1000] bg-background-main border border-divider rounded-xl shadow-xl p-1"
      style={{ left: x, top: y, minWidth: 200, width: menuW }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {item ? <ItemMenu /> : <BackgroundMenu />}
    </div>,
    document.body
  )

  // ── Item menu ────────────────────────────────────────────────────────────────

  function ItemMenu() {
    return (
      <>
        {/* Group 1: Open */}
        <MenuRow icon={icons.open}   label="Open"          onClick={handleOpen} />
        <MenuRow icon={icons.split}  label="Open in pane"  onClick={handleOpenInPane} shortcut="Alt+Enter" />
        <MenuRow icon={icons.ai}     label="Ask AI"        onClick={handleAskAI} />
        <Sep />

        {/* Group 2: Manage */}
        <MenuRow icon={icons.pin}       label={item?.is_pinned ? 'Unpin' : 'Pin'} onClick={handlePin} />
        <MenuRow icon={icons.rename}    label="Rename"      onClick={handleRename}    shortcut="F2" />
        <MenuRow icon={icons.duplicate} label="Duplicate"   onClick={handleDuplicate} />

        {/* Color picker row */}
        <div className="px-3 py-2">
          <p className="text-[11px] text-text-dark-secondary mb-2 flex items-center gap-1.5">
            <span className="flex items-center justify-center" style={{ width: 14, height: 14 }}>
              {icons.color}
            </span>
            Change color
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleChangeColor(color)}
                className="rounded-md border-2 transition-all hover:scale-110 shrink-0"
                style={{
                  width: 20, height: 20,
                  background: color,
                  borderColor: item?.color === color ? '#09321F' : 'transparent',
                }}
                title={color}
              />
            ))}
            {/* Clear color */}
            <button
              onClick={() => handleChangeColor('')}
              className="w-5 h-5 rounded-md border-2 border-divider flex items-center justify-center hover:scale-110 transition-all shrink-0"
              style={{ borderColor: !item?.color ? '#09321F' : 'transparent' }}
              title="Default"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#686764" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <Sep />

        {/* Group 3: Share & info */}
        <MenuRow icon={icons.share}    label="Share"       onClick={handleShare} />
        <MenuRow icon={icons.move}     label="Move to"     onClick={handleMoveTo} />
        {item?.parent_id !== null && item?.parent_id !== undefined && (
          <MenuRow icon={icons.removeFolder} label="Remove from folder" onClick={handleRemoveFromFolder} />
        )}
        <MenuRow icon={icons.download} label="Download"    onClick={handleDownload} />
        <MenuRow icon={icons.info}     label="Information" onClick={handleInformation} />
        <Sep />

        {/* Group 4: Delete */}
        <MenuRow icon={<span style={{ color: '#CC768D' }}>{icons.trash}</span>} label="Delete" onClick={handleDelete} danger />
      </>
    )
  }

  // ── Background menu ──────────────────────────────────────────────────────────

  function BackgroundMenu() {
    return (
      <>
        <MenuRow icon={icons.note}    label="New Note"     onClick={() => handleCreate('note')} />
        <MenuRow icon={icons.chat}    label="New Chat"     onClick={handleNewChat} />
        <MenuRow icon={icons.canvas}  label="New Canvas"   onClick={() => handleCreate('canvas')} />
        <MenuRow icon={icons.link}    label="Paste Link"   onClick={handlePasteLink} />
        <Sep />
        <MenuRow icon={icons.folder}  label="New Folder"     onClick={() => handleCreate('folder')} />
        <MenuRow icon={icons.upload}  label="Upload Files"  onClick={handleUpload} />
        <MenuRow icon={icons.folder}  label="Upload Folder" onClick={() => {
          close()
          const inp = document.createElement('input')
          inp.type = 'file'
          ;(inp as any).webkitdirectory = true
          inp.click()
        }} />
        <Sep />
        <MenuRow icon={icons.refresh} label="Refresh"      onClick={handleRefresh} />
      </>
    )
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MenuRow({
  icon, label, shortcut, danger, onClick,
}: {
  icon: React.ReactNode
  label: string
  shortcut?: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-3 rounded-lg text-sm transition-colors hover:bg-neutral-dark-5 text-left"
      style={{
        height: 36,
        color: danger ? '#CC768D' : '#272523',
      }}
    >
      <span className="shrink-0 flex items-center justify-center" style={{ width: 14, height: 14 }}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="text-[10px] font-mono text-text-dark-secondary opacity-50 shrink-0">
          {shortcut}
        </kbd>
      )}
    </button>
  )
}

function Sep() {
  return <div className="my-1 h-px bg-divider mx-1" />
}
