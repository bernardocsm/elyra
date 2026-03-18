import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store/workspace'
import { supabase } from '../../lib/supabase'

export default function NewItemDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { workspace, addItem, openPanel, items } = useStore()

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function create(type: 'note' | 'canvas' | 'folder') {
    if (!workspace) return
    setOpen(false)
    const count = items.filter((i) => i.parent_id === null).length
    const names = { note: 'Untitled note', canvas: 'Untitled canvas', folder: 'Untitled folder' }
    const { data } = await supabase.from('items').insert({
      workspace_id: workspace.id,
      type,
      name: names[type],
      parent_id: null,
      position: count,
    }).select().single()
    if (data) {
      addItem(data as any)
      if (type !== 'folder') openPanel({ type, itemId: data.id })
    }
  }

  const options = [
    { type: 'note' as const,   label: 'New Note',   icon: '📄', color: '#39624D' },
    { type: 'canvas' as const, label: 'New Canvas', icon: '⬜', color: '#9C7FC1' },
    { type: 'folder' as const, label: 'New Folder', icon: '📁', color: '#686764' },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs font-medium rounded-full border transition-colors"
        style={{
          height: 26, padding: '4px 8px',
          background: '#ECF0ED', borderColor: '#B3BFB7', color: '#39624D',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New
      </button>

      {open && (
        <div className="absolute left-0 top-8 z-50 w-56 bg-background-main border border-divider rounded-xl shadow-xl p-1">
          {options.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => create(type)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-text-dark-primary hover:bg-neutral-dark-5 transition-colors text-left"
              style={{ height: 36 }}
            >
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
