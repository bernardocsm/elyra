import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store/workspace'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import type { Item } from '../types'

interface FolderRowProps {
  item: Item | null // null = root
  depth: number
  selected: string | null // selected folder id (null = root)
  onSelect: (id: string | null) => void
  excludeIds: string[]
}

function FolderRow({ item, depth, selected, onSelect, excludeIds }: FolderRowProps) {
  const { items } = useStore()
  const [expanded, setExpanded] = useState(depth === 0)
  const id = item?.id ?? null
  const isSelected = selected === id
  const isExcluded = id !== null && excludeIds.includes(id)
  const children = items.filter(
    (i) => i.parent_id === id && i.type === 'folder' && !i.is_deleted && !excludeIds.includes(i.id)
  )

  if (isExcluded) return null

  return (
    <div>
      {/* Row — div instead of button so we can nest the chevron button inside */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(id)}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(id)}
        className="flex items-center w-full rounded-lg px-2 py-1.5 text-sm text-left transition-colors cursor-pointer select-none"
        style={{
          paddingLeft: 8 + depth * 16,
          background: isSelected ? 'rgb(236,240,237)' : 'transparent',
          color: isSelected ? '#09321F' : '#272523',
          opacity: isExcluded ? 0.4 : 1,
        }}
      >
        {/* Chevron toggle — separate button, stops propagation */}
        {children.length > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
            className="shrink-0 mr-1 text-text-dark-secondary/50 hover:text-text-dark-primary"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ) : (
          <span style={{ width: 14, display: 'inline-block', flexShrink: 0 }} />
        )}

        {item ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill={item.color || '#686764'} className="mr-1.5 shrink-0">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="mr-1.5 shrink-0 opacity-50">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        )}
        <span className="truncate">{item?.name ?? 'Home'}</span>
      </div>

      {expanded && children.map((child) => (
        <FolderRow
          key={child.id}
          item={child}
          depth={depth + 1}
          selected={selected}
          onSelect={onSelect}
          excludeIds={excludeIds}
        />
      ))}
    </div>
  )
}

export default function MoveToModal() {
  const { moveToModal, closeMoveToModal, items, updateItem } = useStore()
  const { open, itemIds } = moveToModal

  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) {
      setSelected(null)
      setSearch('')
    }
  }, [open])

  if (!open) return null

  const movingItems = itemIds.map((id) => items.find((i) => i.id === id)).filter(Boolean) as Item[]
  const movingNames = movingItems.map((i) => `"${i.name}"`).join(', ')

  const rootFolders = items.filter((i) => i.parent_id === null && i.type === 'folder' && !i.is_deleted)
  const allFolders = items.filter((i) => i.type === 'folder' && !i.is_deleted)
  const filteredFolders = search.trim()
    ? allFolders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : null

  async function handleMove() {
    for (const id of itemIds) {
      updateItem(id, { parent_id: selected })
      await supabase.from('items').update({ parent_id: selected }).eq('id', id)
    }
    toast.success(`Moved ${itemIds.length === 1 ? movingItems[0]?.name : `${itemIds.length} items`}`)
    closeMoveToModal()
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[1500] bg-black/30" onClick={closeMoveToModal} />

      <div
        className="fixed z-[1501] left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-background-main border border-divider rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-text-dark-primary">Move to</h2>
            <p className="text-xs text-text-dark-secondary mt-0.5 truncate" style={{ maxWidth: 300 }}>
              {movingNames}
            </p>
          </div>
          <button
            onClick={closeMoveToModal}
            className="p-1.5 rounded-lg hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg border border-divider bg-background-faint">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dark-secondary/50 shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search folders..."
              autoFocus
              className="flex-1 text-sm bg-transparent outline-none text-text-dark-primary placeholder:text-text-dark-secondary/50"
            />
          </div>

          {/* Folder tree */}
          <div
            className="border border-divider rounded-xl overflow-y-auto p-1"
            style={{ maxHeight: 240 }}
          >
            {filteredFolders ? (
              <>
                <FolderRow item={null} depth={0} selected={selected} onSelect={setSelected} excludeIds={itemIds} />
                {filteredFolders.map((f) => (
                  <FolderRow key={f.id} item={f} depth={1} selected={selected} onSelect={setSelected} excludeIds={itemIds} />
                ))}
              </>
            ) : (
              <>
                <FolderRow item={null} depth={0} selected={selected} onSelect={setSelected} excludeIds={itemIds} />
                {rootFolders.map((f) => (
                  <FolderRow key={f.id} item={f} depth={1} selected={selected} onSelect={setSelected} excludeIds={itemIds} />
                ))}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              onClick={closeMoveToModal}
              className="px-4 py-2 text-sm rounded-lg hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              className="px-4 py-2 text-sm rounded-lg font-medium transition-colors"
              style={{ background: '#39624D', color: 'white' }}
            >
              Move here
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
