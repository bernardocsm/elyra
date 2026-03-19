// CommandPalette — spec:
//   Modal : 896×max-509px, borderRadius:12, bg-background-page, shadow-2xl, z-[2000]
//   Input : height:56, text-[15px], search icon left, ESC badge right, scope chip
//   Rows  : height:44, px-4, icon 16px, title flex-1, subtitle/shortcut right
//           active: bg rgb(236,240,237)
//   Footer: height:40 · ↑↓ navigate · ↵ open · Alt+↵ new pane · Tab scope
//
//   Keyboard:
//     ↑↓        → move activeIdx, auto-scroll into view
//     Enter     → open in active panel (replace)
//     Alt+Enter → open in new split-pane
//     Tab       → cycle scope filter: All → Notes → Folders → Canvases
//     Escape    → close

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../store/workspace'
import { supabase } from '../../lib/supabase'
import type { Item } from '../../types'

// ── Types ──────────────────────────────────────────────────────────────────────

type Scope = 'all' | 'notes' | 'folders' | 'canvases'
const SCOPES: Scope[] = ['all', 'notes', 'folders', 'canvases']
const SCOPE_LABELS: Record<Scope, string> = {
  all: 'All',
  notes: 'Notes',
  folders: 'Folders',
  canvases: 'Canvases',
}
const SCOPE_TYPE: Partial<Record<Scope, string>> = {
  notes: 'note',
  folders: 'folder',
  canvases: 'canvas',
}

interface Row {
  id: string
  icon: React.ReactNode
  title: string
  subtitle?: string
  shortcut?: string
  onEnter: () => void
  onAltEnter?: () => void
}

// ── Icons (14–16px SVG) ────────────────────────────────────────────────────────

function NoteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#39624D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function CanvasIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9C7FC1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#686764" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#39624D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#686764" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#686764" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#686764" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B07D36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#686764" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

function typeIcon(type: string) {
  if (type === 'note')   return <NoteIcon />
  if (type === 'canvas') return <CanvasIcon />
  if (type === 'folder') return <FolderIcon />
  return <NoteIcon />
}

const TYPE_LABEL: Record<string, string> = {
  folder: 'Folder',
  note: 'Note',
  canvas: 'Canvas',
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CommandPalette() {
  const {
    commandPaletteOpen, setCommandPaletteOpen,
    items, recentIds, openPanel, addRecent,
    workspace, addItem,
    setSettingsOpen,
  } = useStore()

  const [query, setQuery]       = useState('')
  const [scope, setScope]       = useState<Scope>('all')
  const [activeIdx, setActiveIdx] = useState(0)

  const inputRef    = useRef<HTMLInputElement>(null)
  const listRef     = useRef<HTMLDivElement>(null)
  const rowRefs     = useRef<(HTMLButtonElement | null)[]>([])

  // ── Open / reset ────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commandPaletteOpen])

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setScope('all')
      setActiveIdx(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [commandPaletteOpen])

  // ── Quick Actions ────────────────────────────────────────────────────────────
  async function createItem(type: 'note' | 'canvas' | 'folder') {
    if (!workspace) return
    setCommandPaletteOpen(false)
    const count = items.filter((i) => i.parent_id === null).length
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

  // ── Build flat rows ──────────────────────────────────────────────────────────
  const recentItems = useMemo(() =>
    recentIds
      .map((id) => items.find((i) => i.id === id))
      .filter((i): i is Item => Boolean(i))
      .slice(0, 5),
    [recentIds, items]
  )

  // Scoped + filtered items when query active
  const searchResults: Item[] = useMemo(() => {
    if (!query.trim()) return []
    const scopeType = SCOPE_TYPE[scope]
    return items
      .filter((i) => {
        const matchName = i.name.toLowerCase().includes(query.toLowerCase())
        const matchScope = !scopeType || i.type === scopeType
        return matchName && matchScope
      })
      .slice(0, 12)
  }, [query, scope, items])

  function openItem(item: Item, newPane = false) {
    const panelType = item.type as 'folder' | 'note' | 'canvas'
    if (newPane) {
      useStore.getState().splitPanel({ type: panelType, itemId: item.id })
    } else {
      openPanel({ type: panelType, itemId: item.id })
    }
    addRecent(item.id)
    setCommandPaletteOpen(false)
  }

  const rows: Row[] = useMemo(() => {
    if (query.trim()) {
      return searchResults.map((item) => ({
        id: item.id,
        icon: typeIcon(item.type),
        title: item.name,
        subtitle: TYPE_LABEL[item.type] ?? item.type,
        onEnter: () => openItem(item),
        onAltEnter: () => openItem(item, true),
      }))
    }

    // No query: Quick Actions + Recent + Navigation
    const quickActions: Row[] = [
      {
        id: 'qa-browse',
        icon: <HomeIcon />,
        title: 'Browse Workspace',
        subtitle: 'Navigate folder tree',
        onEnter: () => {
          openPanel({ type: 'root' })
          setCommandPaletteOpen(false)
        },
      },
      {
        id: 'qa-note',
        icon: <NoteIcon />,
        title: 'Create Note',
        subtitle: 'In workspace root',
        shortcut: 'N',
        onEnter: () => createItem('note'),
      },
      {
        id: 'qa-folder',
        icon: <FolderIcon />,
        title: 'Create Folder',
        subtitle: 'In workspace root',
        onEnter: () => createItem('folder'),
      },
      {
        id: 'qa-canvas',
        icon: <CanvasIcon />,
        title: 'Create Canvas',
        subtitle: 'In workspace root',
        shortcut: 'C',
        onEnter: () => createItem('canvas'),
      },
    ]

    const recentRows: Row[] = recentItems.map((item) => ({
      id: `recent-${item.id}`,
      icon: typeIcon(item.type),
      title: item.name,
      subtitle: TYPE_LABEL[item.type] ?? item.type,
      onEnter: () => openItem(item),
      onAltEnter: () => openItem(item, true),
    }))

    const navRows: Row[] = [
      {
        id: 'nav-home',
        icon: <HomeIcon />,
        title: 'Go to Home',
        subtitle: 'Navigate to workspace home',
        onEnter: () => {
          openPanel({ type: 'root' })
          setCommandPaletteOpen(false)
        },
      },
      {
        id: 'nav-darkmode',
        icon: <MoonIcon />,
        title: 'Switch to Dark Mode',
        subtitle: 'Currently light',
        onEnter: () => {
          setCommandPaletteOpen(false)
          setSettingsOpen(true)
        },
      },
      {
        id: 'nav-settings',
        icon: <SettingsIcon />,
        title: 'Settings',
        subtitle: 'Open workspace settings',
        onEnter: () => {
          setSettingsOpen(true)
          setCommandPaletteOpen(false)
        },
      },
    ]

    return [...quickActions, ...recentRows, ...navRows]
  }, [query, searchResults, recentItems, workspace])

  // ── Scroll active row into view ──────────────────────────────────────────────
  useEffect(() => {
    rowRefs.current[activeIdx]?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // ── Keyboard handler ─────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, rows.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      // Cycle scope
      setScope((s) => {
        const idx = SCOPES.indexOf(s)
        return SCOPES[(idx + 1) % SCOPES.length]
      })
      setActiveIdx(0)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const row = rows[activeIdx]
      if (!row) return
      if (e.altKey && row.onAltEnter) {
        row.onAltEnter()
      } else {
        row.onEnter()
      }
      return
    }
  }, [rows, activeIdx])

  // Build section boundaries for rendering section headers
  const sections = useMemo(() => {
    if (query.trim()) {
      return [{ label: 'RESULTS', startIdx: 0, count: rows.length }]
    }
    const quickCount  = 4
    const recentCount = recentItems.length
    const navCount    = 3
    const result = []
    result.push({ label: 'QUICK ACTIONS', startIdx: 0, count: quickCount })
    if (recentCount > 0) {
      result.push({ label: 'RECENT', startIdx: quickCount, count: recentCount })
    }
    result.push({
      label: 'NAVIGATION',
      startIdx: quickCount + recentCount,
      count: navCount,
    })
    return result
  }, [query, recentItems.length, rows.length])

  if (!commandPaletteOpen) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1999] bg-black/25"
        onClick={() => setCommandPaletteOpen(false)}
      />

      {/* Modal */}
      <div
        className="fixed z-[2000] left-1/2 -translate-x-1/2 bg-background-page border border-divider shadow-2xl flex flex-col overflow-hidden"
        style={{ top: 80, width: 896, maxHeight: 509, borderRadius: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Search input row ──────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4 border-b border-divider shrink-0"
          style={{ height: 56 }}
        >
          {/* Search icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-dark-secondary shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>

          {/* Scope chip (shown when scope ≠ 'all') */}
          {scope !== 'all' && (
            <button
              onClick={() => { setScope('all'); setActiveIdx(0) }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 transition-colors"
              style={{
                background:  'rgb(236,240,237)',
                border:      '1px solid rgb(179,191,183)',
                color:       'rgb(57,98,77)',
              }}
            >
              {SCOPE_LABELS[scope]}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}

          {/* Input */}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0) }}
            onKeyDown={handleKeyDown}
            placeholder={scope === 'all' ? 'Search or jump to…' : `Search ${SCOPE_LABELS[scope].toLowerCase()}…`}
            className="flex-1 bg-transparent border-none outline-none text-text-dark-primary placeholder:text-text-dark-secondary/50"
            style={{ fontSize: 15 }}
          />

          {/* ESC badge */}
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded border border-divider text-text-dark-secondary font-mono shrink-0 cursor-pointer hover:bg-neutral-dark-5 transition-colors select-none"
            onClick={() => setCommandPaletteOpen(false)}
          >
            ESC
          </kbd>
        </div>

        {/* ── Results list ─────────────────────────────────────────────── */}
        <div ref={listRef} className="flex-1 overflow-y-auto">

          {/* Empty search state */}
          {query.trim() && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dark-secondary/40">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <p className="text-sm text-text-dark-secondary">
                No results for <span className="font-medium text-text-dark-primary">"{query}"</span>
              </p>
              {scope !== 'all' && (
                <button
                  onClick={() => { setScope('all'); setActiveIdx(0) }}
                  className="text-xs text-accent-eden hover:underline"
                >
                  Search all types
                </button>
              )}
            </div>
          )}

          {/* Section-grouped rows */}
          {sections.map((section) => {
            const sectionRows = rows.slice(section.startIdx, section.startIdx + section.count)
            if (sectionRows.length === 0) return null
            return (
              <div key={section.label} className="pt-2 pb-1">
                {/* Section header */}
                <p
                  className="px-4 pb-1 text-[11px] font-semibold tracking-wider uppercase"
                  style={{ color: 'rgba(39,37,35,0.4)', height: 20, display: 'flex', alignItems: 'center' }}
                >
                  {section.label === 'QUICK ACTIONS' && (
                    <span className="mr-1.5" aria-hidden>⚡</span>
                  )}
                  {section.label === 'RECENT' && (
                    <span className="mr-1.5" aria-hidden>🕐</span>
                  )}
                  {section.label === 'NAVIGATION' && (
                    <span className="mr-1.5" aria-hidden>➡</span>
                  )}
                  {section.label}
                </p>

                {/* Rows */}
                {sectionRows.map((row, relIdx) => {
                  const absIdx = section.startIdx + relIdx
                  const isActive = absIdx === activeIdx
                  return (
                    <button
                      key={row.id}
                      ref={(el) => { rowRefs.current[absIdx] = el }}
                      onClick={row.onEnter}
                      onMouseEnter={() => setActiveIdx(absIdx)}
                      className="flex items-center gap-3 w-full px-4 text-left transition-colors"
                      style={{
                        height: 44,
                        background: isActive ? 'rgb(236,240,237)' : 'transparent',
                      }}
                    >
                      {/* Icon */}
                      <span className="shrink-0 flex items-center justify-center" style={{ width: 16, height: 16 }}>
                        {row.icon}
                      </span>

                      {/* Title */}
                      <span
                        className="flex-1 truncate text-text-dark-primary"
                        style={{ fontSize: 14 }}
                      >
                        {row.title}
                      </span>

                      {/* Right: shortcut or subtitle */}
                      {row.shortcut ? (
                        <kbd
                          className="text-[10px] px-1.5 py-0.5 rounded border border-divider font-mono text-text-dark-secondary shrink-0"
                          style={{ background: isActive ? 'rgb(255,255,255)' : 'transparent' }}
                        >
                          {row.shortcut}
                        </kbd>
                      ) : row.subtitle ? (
                        <span className="text-xs text-text-dark-secondary shrink-0 opacity-60 truncate max-w-[140px]">
                          {row.subtitle}
                        </span>
                      ) : null}

                      {/* Alt+Enter hint when active and supported */}
                      {isActive && row.onAltEnter && (
                        <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-divider font-mono text-text-dark-secondary shrink-0 ml-1">
                          Alt+↵
                        </kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-5 px-4 border-t border-divider text-[11px] text-text-dark-secondary shrink-0"
          style={{ height: 40 }}
        >
          <span className="flex items-center gap-1">
            <Kbd>↑↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> open
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Alt+↵</Kbd> new pane
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Tab</Kbd>
            {scope === 'all'
              ? 'scope: All'
              : <span>scope: <span style={{ color: 'rgb(57,98,77)', fontWeight: 500 }}>{SCOPE_LABELS[scope]}</span></span>
            }
          </span>
        </div>
      </div>
    </>,
    document.body
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded border border-divider font-mono text-[10px] text-text-dark-secondary bg-transparent">
      {children}
    </kbd>
  )
}
