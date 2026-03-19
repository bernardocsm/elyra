import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store/workspace'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function NewItemDropdown({ parentId = null }: { parentId?: string | null }) {
  const [open, setOpen] = useState(false)
  const [pasteModal, setPasteModal] = useState(false)
  const [pasteUrl, setPasteUrl] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { workspace, addItem, openPanel, items, openNewFolderModal } = useStore()

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function create(type: 'note' | 'canvas' | 'chat') {
    if (!workspace) return
    setOpen(false)
    const count = items.filter((i) => i.parent_id === parentId).length
    const names = { note: 'Untitled note', canvas: 'Untitled canvas', chat: 'New chat' }
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

  async function handlePasteLink() {
    if (!workspace || !pasteUrl.trim()) return
    setPasteModal(false)
    setOpen(false)
    const url = pasteUrl.trim()
    let name = url
    try {
      const u = new URL(url)
      name = u.hostname + (u.pathname !== '/' ? u.pathname : '')
    } catch { /* keep url as name */ }
    const count = items.filter((i) => i.parent_id === parentId).length
    const { data } = await supabase.from('items').insert({
      workspace_id: workspace.id,
      type: 'link',
      name,
      content: url,
      parent_id: parentId,
      position: count,
    }).select().single()
    if (data) {
      addItem(data as any)
      toast.success('Link saved')
    }
    setPasteUrl('')
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!workspace || !e.target.files) return
    setOpen(false)
    const files = Array.from(e.target.files)
    let count = items.filter((i) => i.parent_id === parentId).length
    for (const file of files) {
      const type = file.name.endsWith('.md') ? 'note' : 'note'
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const content = ev.target?.result as string ?? null
        const { data } = await supabase.from('items').insert({
          workspace_id: workspace.id,
          type,
          name: file.name.replace(/\.[^.]+$/, ''),
          content,
          parent_id: parentId,
          position: count++,
        }).select().single()
        if (data) {
          addItem(data as any)
          toast.success(`Uploaded "${file.name}"`)
        }
      }
      reader.readAsText(file)
    }
    // Reset input
    e.target.value = ''
  }

  const sections = [
    {
      items: [
        { type: 'note' as const, label: 'New Note', icon: NoteIcon, action: () => create('note') },
        { type: 'canvas' as const, label: 'New Canvas', icon: CanvasIcon, action: () => create('canvas') },
        { type: 'chat' as const, label: 'New Chat', icon: ChatIcon, action: () => create('chat') },
        { label: 'Paste Link', icon: LinkIcon, action: () => { setPasteModal(true); setOpen(false) } },
      ],
    },
    {
      items: [
        { label: 'New Folder', icon: FolderIcon, action: () => { openNewFolderModal(parentId); setOpen(false) } },
        { label: 'Upload Files', icon: UploadIcon, action: () => { fileInputRef.current?.click(); setOpen(false) } },
        { label: 'Upload Folder', icon: UploadFolderIcon, action: () => {
          if (fileInputRef.current) {
            fileInputRef.current.setAttribute('webkitdirectory', '')
            fileInputRef.current.click()
          }
          setOpen(false)
        }},
      ],
    },
  ]

  return (
    <>
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
          <div className="absolute left-0 top-8 z-50 w-56 bg-background-main border border-divider rounded-xl shadow-xl overflow-hidden">
            {sections.map((section, si) => (
              <div key={si}>
                {si > 0 && <div className="my-1 h-px bg-divider mx-1" />}
                <div className="p-1">
                  {section.items.map(({ label, icon: Icon, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-text-dark-primary hover:bg-neutral-dark-5 transition-colors text-left"
                      style={{ height: 36 }}
                    >
                      <span className="shrink-0 text-text-dark-secondary"><Icon /></span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Paste Link modal */}
      {pasteModal && (
        <div className="fixed inset-0 z-[1500] bg-black/30 flex items-center justify-center" onClick={() => setPasteModal(false)}>
          <div
            className="bg-background-main border border-divider rounded-2xl shadow-2xl p-5 w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-semibold text-text-dark-primary mb-3">Paste Link</h2>
            <input
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasteLink()}
              placeholder="https://..."
              autoFocus
              className="w-full px-3 py-2 text-sm rounded-lg border border-divider bg-background-faint text-text-dark-primary outline-none focus:border-accent-eden mb-4 transition-colors"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setPasteModal(false); setPasteUrl('') }}
                className="px-4 py-2 text-sm rounded-lg hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasteLink}
                disabled={!pasteUrl.trim()}
                className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-40 transition-colors"
                style={{ background: '#39624D', color: 'white' }}
              >
                Save link
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Small SVG icons
function NoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function CanvasIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}

function UploadFolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      <polyline points="12 11 12 17"/>
      <polyline points="9 14 12 11 15 14"/>
    </svg>
  )
}
