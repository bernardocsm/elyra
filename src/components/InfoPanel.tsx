import { useState } from 'react'
import { useStore } from '../store/workspace'
import { format } from 'date-fns'

const TYPE_LABEL: Record<string, string> = {
  folder: 'Folder',
  note: 'Note',
  canvas: 'Canvas',
  chat: 'AI Chat',
  link: 'Link',
}

export default function InfoPanel() {
  const { infoPanelItemId, setInfoPanelItemId, items, user } = useStore()
  const [newTag, setNewTag] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const item = infoPanelItemId ? items.find((i) => i.id === infoPanelItemId) : null

  if (!item) return null

  // Resolve location (parent folder name or "Home")
  const parent = item.parent_id ? items.find((i) => i.id === item.parent_id) : null
  const location = parent ? parent.name : 'Home'

  // Estimate file size from content
  const contentBytes = item.content ? new Blob([item.content]).size : 0
  const fileSize = contentBytes > 1024
    ? `${(contentBytes / 1024).toFixed(1)} KB`
    : `${contentBytes} B`

  function formatDate(dateStr: string) {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy, h:mm a')
    } catch {
      return dateStr
    }
  }

  function addTag() {
    const t = newTag.trim()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
    }
    setNewTag('')
  }

  function removeTag(t: string) {
    setTags(tags.filter((tag) => tag !== t))
  }

  return (
    <div
      className="flex flex-col border-l border-divider bg-background-page shrink-0 overflow-y-auto"
      style={{ width: 256 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-divider shrink-0">
        <span className="text-xs font-semibold text-text-dark-secondary uppercase tracking-wider">Info</span>
        <button
          onClick={() => setInfoPanelItemId(null)}
          className="p-1 rounded-md hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-0 p-4">
        {/* Metadata rows */}
        <InfoRow label="Type" value={TYPE_LABEL[item.type] ?? item.type} />
        <InfoRow label="Owner" value={user?.email ?? '—'} truncate />
        {item.type !== 'folder' && <InfoRow label="File size" value={fileSize} />}
        <InfoRow label="Name" value={item.name} />
        <InfoRow label="Visible to" value="Workspace members" />
        <InfoRow label="Location" value={location} />
        <InfoRow label="Created" value={formatDate(item.created_at)} />
        <InfoRow label="Updated" value={formatDate(item.updated_at)} />

        <div className="my-3 h-px bg-divider" />

        {/* Tags */}
        <div>
          <p className="text-[11px] font-semibold text-text-dark-secondary uppercase tracking-wider mb-2">Tags</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                style={{ background: '#ECF0ED', color: '#39624D' }}
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="Add tag..."
              className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-divider bg-background-faint outline-none focus:border-accent-eden text-text-dark-primary placeholder:text-text-dark-secondary/50 transition-colors"
            />
            <button
              onClick={addTag}
              disabled={!newTag.trim()}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
              style={{ background: '#39624D', color: 'white' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="my-3 h-px bg-divider" />

        {/* Connections */}
        <div>
          <p className="text-[11px] font-semibold text-text-dark-secondary uppercase tracking-wider mb-2">Connections</p>
          <p className="text-xs text-text-dark-secondary/60 italic">No connections yet</p>
          <button className="mt-2 flex items-center gap-1.5 text-xs text-accent-eden hover:underline transition-colors">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add connection
          </button>
        </div>

        <div className="my-3 h-px bg-divider" />

        {/* Add property */}
        <div>
          <p className="text-[11px] font-semibold text-text-dark-secondary uppercase tracking-wider mb-2">Properties</p>
          <button className="flex items-center gap-1.5 text-xs text-text-dark-secondary hover:text-text-dark-primary transition-colors">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add property
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, truncate = false }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="flex flex-col py-2 border-b border-divider/50 last:border-b-0">
      <span className="text-[10px] font-medium text-text-dark-secondary/70 uppercase tracking-wider mb-0.5">{label}</span>
      <span
        className={`text-xs text-text-dark-primary leading-relaxed ${truncate ? 'truncate' : 'break-words'}`}
        title={truncate ? value : undefined}
      >
        {value}
      </span>
    </div>
  )
}
