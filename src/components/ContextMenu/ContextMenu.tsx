import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../store/workspace'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function ContextMenu() {
  const {
    contextMenu, setContextMenu,
    items, updateItem, removeItem, addItem,
    workspace, openPanel,
  } = useStore()
  const ref = useRef<HTMLDivElement>(null)

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

  async function handleOpen() {
    if (!item) return
    openPanel({ type: item.type as 'folder' | 'note' | 'canvas', itemId: item.id })
    setContextMenu(null)
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
        name: `${item.name} copy`,
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

  async function handleDelete() {
    if (!item) return
    setContextMenu(null)
    removeItem(item.id)
    await supabase.from('items').delete().eq('id', item.id)
    toast.success(`"${item.name}" deleted`)
  }

  async function handleChangeColor(color: string) {
    if (!item) return
    updateItem(item.id, { color })
    await supabase.from('items').update({ color }).eq('id', item.id)
    setContextMenu(null)
  }

  async function handleCreate(type: 'note' | 'folder' | 'canvas') {
    if (!workspace) return
    setContextMenu(null)
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

  // Item context menu
  const itemMenuItems = [
    { label: 'Open', action: handleOpen },
    { label: 'Open in new pane', action: async () => {
      if (!item) return
      // Force new panel by pushing
      const store = useStore.getState()
      const id = `panel-${Date.now()}`
      store.updatePanel('main', { type: item.type as any, itemId: item.id })
      setContextMenu(null)
    }},
    null,
    { label: item?.is_pinned ? 'Unpin' : 'Pin', action: handlePin },
    { label: 'Rename', action: handleRename },
    { label: 'Duplicate', action: handleDuplicate },
    null,
    ...(item?.type === 'folder' ? [{
      label: 'Change color',
      isColors: true,
      colors: ['#527160','#5B82B5','#9C7FC1','#CC768D','#D17866','#DCAB6F','#383441','#AC8472'],
    }] : []),
    null,
    { label: 'Delete', action: handleDelete, danger: true },
  ]

  // Background context menu
  const bgMenuItems = [
    { label: 'New Note', action: () => handleCreate('note') },
    { label: 'New Canvas', action: () => handleCreate('canvas') },
    { label: 'New Folder', action: () => handleCreate('folder') },
  ]

  const menuItems = item ? itemMenuItems : bgMenuItems

  // Keep menu in viewport
  const menuW = 200
  const approxH = (menuItems.filter(Boolean).length * 36) + 16
  let { x, y } = contextMenu
  if (typeof window !== 'undefined') {
    if (x + menuW > window.innerWidth - 8) x = window.innerWidth - menuW - 8
    if (y + approxH > window.innerHeight - 8) y = window.innerHeight - approxH - 8
  }

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[1000] bg-background-main border border-divider rounded-xl shadow-xl p-1 min-w-[200px]"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menuItems.map((m, i) => {
        if (m === null) {
          return <div key={`sep-${i}`} className="my-1 h-px bg-divider mx-1" />
        }
        if ('isColors' in m && m.isColors) {
          return (
            <div key="colors" className="px-3 py-2">
              <p className="text-[11px] text-text-dark-secondary mb-2">Color</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(m as any).colors.map((color: string) => (
                  <button
                    key={color}
                    onClick={() => handleChangeColor(color)}
                    className="w-7 h-7 rounded-md border-2 transition-all hover:scale-110"
                    style={{ background: color, borderColor: item?.color === color ? '#09321F' : 'transparent' }}
                  />
                ))}
              </div>
            </div>
          )
        }
        return (
          <button
            key={(m as any).label}
            onClick={(m as any).action}
            className="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-neutral-dark-5 text-left"
            style={{
              height: 36,
              color: (m as any).danger ? '#CC768D' : '#272523',
            }}
          >
            {(m as any).label}
          </button>
        )
      })}
    </div>,
    document.body
  )
}
