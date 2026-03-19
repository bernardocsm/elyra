// NewItemDropdown — spec:
//   "+ New" button : h-26px, px-1.5 py-1, rounded-full, bg-background-primary-selected,
//                    border-primary-30, text-accent-eden
//   Dropdown       : width 240px, border-radius 8px, shadow-xl, bg-white
//   Items          : px-3 py-2, h-36px, text-sm, rounded-md
//                    hover: rgba(9,50,31,0.1)  ← verde translúcido
//   9 options (separator between group 1 and group 2):
//     Group 1: New Note | New Canvas | New Chat | Paste Link
//     Group 2: New Folder | Upload Files | Upload Folder

import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store/workspace'
import { supabase } from '../../lib/supabase'

export default function NewItemDropdown() {
  const [open, setOpen]               = useState(false)
  const [pasteLinkMode, setPLMode]    = useState(false)
  const [pasteUrl, setPasteUrl]       = useState('')
  const dropRef    = useRef<HTMLDivElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)
  const folderRef  = useRef<HTMLInputElement>(null)

  const { workspace, addItem, openPanel, items, setSidebarMode } = useStore()

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false)
        setPLMode(false)
        setPasteUrl('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Create item in workspace root ──────────────────────────────────────────
  async function create(type: 'note' | 'canvas' | 'folder') {
    if (!workspace) return
    setOpen(false)
    const count = items.filter((i) => i.parent_id === null).length
    const names: Record<string, string> = {
      note:   'Untitled note',
      canvas: 'Untitled canvas',
      folder: 'Untitled folder',
    }
    const { data } = await supabase
      .from('items')
      .insert({
        workspace_id: workspace.id,
        type,
        name:         names[type],
        parent_id:    null,
        position:     count,
      })
      .select()
      .single()
    if (data) {
      addItem(data as any)
      if (type !== 'folder') openPanel({ type, itemId: data.id })
    }
  }

  function handleNewChat() {
    setOpen(false)
    setSidebarMode('ai')  // switch to AI sidebar mode (chat entry point)
  }

  function handleUploadFiles() {
    setOpen(false)
    fileRef.current?.click()
  }

  function handleUploadFolder() {
    setOpen(false)
    folderRef.current?.click()
  }

  return (
    <div className="relative" ref={dropRef}>

      {/* ── "+ New" trigger button ───────────────────────────────────────── */}
      <button
        onClick={() => { setOpen((o) => !o); setPLMode(false); setPasteUrl('') }}
        className="flex items-center gap-1 text-xs font-medium rounded-full border transition-colors"
        style={{
          height:      26,
          padding:     '4px 6px',     // spec: px-1.5 py-1
          background:  'rgb(236,240,237)',  // bg-background-primary-selected
          borderColor: 'rgb(179,191,183)',  // border-primary-30
          color:       'rgb(57,98,77)',      // text-accent-eden
        }}
        aria-label="New item"
        aria-expanded={open}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5"  y1="12" x2="19" y2="12" />
        </svg>
        New
      </button>

      {/* ── Dropdown ────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="absolute left-0 z-50 bg-background-main border border-divider shadow-xl overflow-hidden"
          style={{
            top:          32,        // just below button (8px below h-26)
            width:        240,       // spec: 240px
            borderRadius: 8,         // spec: rounded-lg
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Paste Link URL input (inline mode) ── */}
          {pasteLinkMode ? (
            <div className="p-3 space-y-2">
              <p className="text-xs font-medium text-text-dark-secondary">Paste a link to import</p>
              <input
                autoFocus
                type="url"
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-1.5 text-sm rounded-md border border-divider bg-background-faint outline-none focus:border-accent-eden transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pasteUrl.trim()) {
                    // TODO: trigger URL import handler
                    setOpen(false)
                    setPLMode(false)
                    setPasteUrl('')
                  }
                  if (e.key === 'Escape') {
                    setPLMode(false)
                    setPasteUrl('')
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setPLMode(false); setPasteUrl('') }}
                  className="flex-1 text-xs py-1 rounded-md border border-divider text-text-dark-secondary hover:bg-neutral-dark-5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setOpen(false); setPLMode(false); setPasteUrl('') }}
                  className="flex-1 text-xs py-1 rounded-md bg-accent-eden text-white hover:bg-accent-primary transition-colors"
                  disabled={!pasteUrl.trim()}
                >
                  Import
                </button>
              </div>
            </div>
          ) : (
            <div className="p-1">
              {/* ── Group 1: create ── */}
              <DropItem
                icon={<NoteDropIcon />}
                label="New Note"
                hint="In workspace root"
                onClick={() => create('note')}
              />
              <DropItem
                icon={<CanvasDropIcon />}
                label="New Canvas"
                hint="In workspace root"
                onClick={() => create('canvas')}
              />
              <DropItem
                icon={<ChatDropIcon />}
                label="New Chat"
                hint="Open AI chat"
                onClick={handleNewChat}
              />
              <DropItem
                icon={<LinkDropIcon />}
                label="Paste Link"
                hint="URL · YouTube · Instagram"
                onClick={() => setPLMode(true)}
              />

              {/* ── Separator ── */}
              <div className="my-1 border-t border-divider" />

              {/* ── Group 2: organise & upload ── */}
              <DropItem
                icon={<FolderDropIcon />}
                label="New Folder"
                onClick={() => create('folder')}
              />
              <DropItem
                icon={<UploadFilesIcon />}
                label="Upload Files"
                onClick={handleUploadFiles}
              />
              <DropItem
                icon={<UploadFolderIcon />}
                label="Upload Folder"
                onClick={handleUploadFolder}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Hidden file inputs ─────────────────────────────────────────── */}
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={() => { /* TODO: handle file upload */ }}
      />
      {/* webkitdirectory for folder selection — cast to any to bypass TS */}
      <input
        ref={folderRef}
        type="file"
        className="hidden"
        onChange={() => { /* TODO: handle folder upload */ }}
        {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>}
      />
    </div>
  )
}

// ─── Dropdown item ────────────────────────────────────────────────────────────

function DropItem({
  icon, label, hint, onClick,
}: {
  icon:     React.ReactNode
  label:    string
  hint?:    string
  onClick:  () => void
}) {
  return (
    /*
     * spec: px-3 py-2 rounded-md text-sm height: 36px
     *       hover: rgba(9,50,31,0.1) — verde translúcido (accent-primary/10)
     */
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm text-text-dark-primary hover:bg-accent-primary/10 transition-colors text-left"
      style={{ height: 36 }}
    >
      {/* Icon — fixed 14×14px column */}
      <span className="shrink-0 flex items-center justify-center" style={{ width: 14, height: 14 }}>
        {icon}
      </span>

      {/* Label */}
      <span className="flex-1 truncate">{label}</span>

      {/* Optional hint — right-aligned, xs, muted */}
      {hint && (
        <span className="text-[11px] text-text-dark-secondary shrink-0 opacity-50 truncate max-w-[80px]">
          {hint}
        </span>
      )}
    </button>
  )
}

// ─── Dropdown icons (14×14) ───────────────────────────────────────────────────

function NoteDropIcon() {
  // Page / document — green (text-accent-eden)
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#39624D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function CanvasDropIcon() {
  // 3×3 grid — purple
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9C7FC1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  )
}

function ChatDropIcon() {
  // Sparkle / AI — green
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#39624D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  )
}

function LinkDropIcon() {
  // Chain / link — blue
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B82B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function FolderDropIcon() {
  // Folder outline — neutral gray
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#686764" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function UploadFilesIcon() {
  // Cloud upload arrow — neutral gray
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#686764" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  )
}

function UploadFolderIcon() {
  // Folder with upload arrow — neutral gray
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#686764" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <polyline points="12 11 12 17" />
      <polyline points="9 14 12 11 15 14" />
    </svg>
  )
}
