import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store/workspace'
import { supabase } from '../lib/supabase'
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

interface FolderTreeItemProps {
  itemId: string | null // null = Home (root)
  label: string
  depth: number
  selected: boolean
  onSelect: (id: string | null) => void
}

function FolderTreeItem({ itemId, label, depth, selected, onSelect }: FolderTreeItemProps) {
  const { items } = useStore()
  const [expanded, setExpanded] = useState(depth === 0)
  const children = items.filter((i) => i.parent_id === itemId && i.type === 'folder' && !i.is_deleted)

  return (
    <div>
      <button
        onClick={() => onSelect(itemId)}
        className="flex items-center w-full rounded-lg px-2 py-1.5 text-sm text-left transition-colors hover:bg-neutral-dark-5"
        style={{
          paddingLeft: 8 + depth * 16,
          background: selected ? 'rgb(236,240,237)' : 'transparent',
          color: selected ? '#09321F' : '#272523',
        }}
      >
        {children.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
            className="shrink-0 mr-1 text-text-dark-secondary/50 hover:text-text-dark-secondary"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
        {children.length === 0 && <span style={{ width: 14, display: 'inline-block' }} />}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="mr-1.5 shrink-0 opacity-60">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span className="truncate">{label}</span>
      </button>
      {expanded && children.map((child) => (
        <FolderTreeItem
          key={child.id}
          itemId={child.id}
          label={child.name}
          depth={depth + 1}
          selected={selected && false /* child selection handled separately */}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

export default function NewFolderModal() {
  const { newFolderModal, closeNewFolderModal, workspace, addItem, items } = useStore()
  const { open, parentId: initialParentId } = newFolderModal

  const [name, setName] = useState('Untitled folder')
  const [color, setColor] = useState(FOLDER_COLORS[0].hex)
  const [saveTo, setSaveTo] = useState<string | null>(initialParentId ?? null)
  const [folderSearch, setFolderSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName('Untitled folder')
      setColor(FOLDER_COLORS[0].hex)
      setSaveTo(initialParentId ?? null)
      setFolderSearch('')
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [open, initialParentId])

  if (!open) return null

  async function handleCreate() {
    if (!workspace || !name.trim()) return
    closeNewFolderModal()
    const count = items.filter((i) => i.parent_id === saveTo).length
    const { data } = await supabase
      .from('items')
      .insert({
        workspace_id: workspace.id,
        parent_id: saveTo,
        type: 'folder',
        name: name.trim(),
        color,
        position: count,
      })
      .select()
      .single()
    if (data) {
      addItem(data as any)
      toast.success(`Folder "${name.trim()}" created`)
    }
  }

  // Flat folder list for search
  const allFolders = items.filter((i) => i.type === 'folder' && !i.is_deleted)
  const filteredFolders = folderSearch.trim()
    ? allFolders.filter((f) => f.name.toLowerCase().includes(folderSearch.toLowerCase()))
    : null

  const rootFolders = items.filter((i) => i.parent_id === null && i.type === 'folder' && !i.is_deleted)

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[1500] bg-black/30" onClick={closeNewFolderModal} />

      {/* Modal */}
      <div
        className="fixed z-[1501] left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-background-main border border-divider rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-sm font-semibold text-text-dark-primary">New Folder</h2>
          <button
            onClick={closeNewFolderModal}
            className="p-1.5 rounded-lg hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Name field */}
          <div>
            <label className="block text-xs font-medium text-text-dark-secondary mb-1.5">Name</label>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full px-3 py-2 text-sm rounded-lg border border-divider bg-background-faint text-text-dark-primary outline-none focus:border-accent-eden transition-colors"
              placeholder="Folder name"
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-medium text-text-dark-secondary mb-2">Color</label>
            <div className="grid grid-cols-8 gap-2">
              {FOLDER_COLORS.map(({ hex, name: colorName }) => (
                <button
                  key={hex}
                  title={colorName}
                  onClick={() => setColor(hex)}
                  className="relative flex flex-col items-center gap-1 group"
                >
                  <div
                    className="transition-all rounded-lg"
                    style={{
                      width: 32, height: 32,
                      background: hex,
                      outline: color === hex ? `2.5px solid ${hex}` : '2.5px solid transparent',
                      outlineOffset: 2,
                      transform: color === hex ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                  <span className="text-[9px] text-text-dark-secondary/70 leading-none whitespace-nowrap hidden group-hover:block absolute -bottom-4 bg-background-main border border-divider rounded px-1 py-0.5 z-10 pointer-events-none">
                    {colorName}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Save to */}
          <div>
            <label className="block text-xs font-medium text-text-dark-secondary mb-1.5">Save to</label>
            <div
              className="border border-divider rounded-xl overflow-hidden"
              style={{ maxHeight: 200 }}
            >
              {/* Search */}
              <div className="px-3 py-2 border-b border-divider">
                <div className="flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dark-secondary/50 shrink-0">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    value={folderSearch}
                    onChange={(e) => setFolderSearch(e.target.value)}
                    placeholder="Search folders..."
                    className="flex-1 text-xs bg-transparent outline-none text-text-dark-primary placeholder:text-text-dark-secondary/50"
                  />
                </div>
              </div>

              {/* Tree */}
              <div className="overflow-y-auto p-1" style={{ maxHeight: 148 }}>
                {filteredFolders ? (
                  // Search results (flat list)
                  <>
                    <button
                      onClick={() => setSaveTo(null)}
                      className="flex items-center w-full px-2 py-1.5 rounded-lg text-sm text-left transition-colors hover:bg-neutral-dark-5"
                      style={{ background: saveTo === null ? 'rgb(236,240,237)' : 'transparent', color: saveTo === null ? '#09321F' : '#272523' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="mr-1.5 shrink-0 opacity-60">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                      Home
                    </button>
                    {filteredFolders.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setSaveTo(f.id)}
                        className="flex items-center w-full px-2 py-1.5 rounded-lg text-sm text-left transition-colors hover:bg-neutral-dark-5"
                        style={{ background: saveTo === f.id ? 'rgb(236,240,237)' : 'transparent', color: saveTo === f.id ? '#09321F' : '#272523' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={f.color} className="mr-1.5 shrink-0">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                        {f.name}
                      </button>
                    ))}
                  </>
                ) : (
                  // Tree view
                  <>
                    {/* Home */}
                    <button
                      onClick={() => setSaveTo(null)}
                      className="flex items-center w-full px-2 py-1.5 rounded-lg text-sm text-left transition-colors hover:bg-neutral-dark-5"
                      style={{ background: saveTo === null ? 'rgb(236,240,237)' : 'transparent', color: saveTo === null ? '#09321F' : '#272523' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="mr-1.5 shrink-0 opacity-60">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                      Home
                    </button>
                    {rootFolders.map((f) => (
                      <FolderTreeItem
                        key={f.id}
                        itemId={f.id}
                        label={f.name}
                        depth={1}
                        selected={saveTo === f.id}
                        onSelect={setSaveTo}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={closeNewFolderModal}
              className="px-4 py-2 text-sm rounded-lg hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-40"
              style={{ background: '#39624D', color: 'white' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Create folder
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
