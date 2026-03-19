// PanelHeader — spec:
//
// Folder panel top bar:
//   Share button : h-24px, px-2 py-1, rounded-md, text-xs, border-divider
//   AI (sparkle) : 26×26px, p-1, rounded-md
//   More options …: 28×28px, p-1, rounded-md, bg rgba(39,37,35,0.05) when active
//   X close      : p-1.5, rounded-lg (only when canClose)
//
// View toggle (grid views only):
//   Grid / List / Compact — each 30×30px, border-radius: 6px
//   Active: bg rgb(227,231,227)
//
// Sort popover (triggered by sort button):
//   Sort by : Name | Last modified | Date created ✓ | Type
//   Display : Size S/M/L  |  Show title toggle  |  Group folders toggle

import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store/workspace'
import type { Panel } from '../../types'

// ─── Sort label map ───────────────────────────────────────────────────────────
const SORT_LABELS: Record<string, string> = {
  created:  'Date created',
  modified: 'Last modified',
  name:     'Name',
  type:     'Type',
}

const SORT_OPTIONS = [
  { value: 'name',     label: 'Name' },
  { value: 'modified', label: 'Last modified' },
  { value: 'created',  label: 'Date created' },
  { value: 'type',     label: 'Type' },
] as const

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  panel: Panel
  canClose: boolean
  onClose: () => void
}

export default function PanelHeader({ panel, canClose, onClose }: Props) {
  const {
    items, workspace,
    viewMode, setViewMode,
    sortBy, setSortBy,
    cardSize, setCardSize,
    showTitle, setShowTitle,
    groupFolders, setGroupFolders,
    setContextMenu,
  } = useStore()

  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  const item      = panel.itemId ? items.find((i) => i.id === panel.itemId) : null
  const isGridView = ['root', 'folder', 'trash'].includes(panel.type)
  const isFolder   = panel.type === 'folder' && !!item

  // ── Close sort popover on outside click ────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Breadcrumb ────────────────────────────────────────────────────────────
  const crumbs: string[] = []
  if (workspace) crumbs.push(workspace.name)
  if (item)      crumbs.push(item.name)
  if (panel.type === 'trash') crumbs.push('Trash')

  // ── More options → reuse context menu at button position ─────────────────
  function handleMoreOptions(e: React.MouseEvent) {
    if (!item) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setContextMenu({ x: rect.left, y: rect.bottom + 4, itemId: item.id })
  }

  return (
    <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-divider bg-background-main">

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-4">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <span className="shrink-0 opacity-30 text-text-dark-secondary">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            )}
            <span
              className={`text-sm truncate ${
                i === crumbs.length - 1
                  ? 'text-text-dark-primary font-medium'
                  : 'text-text-dark-secondary'
              }`}
            >
              {crumb}
            </span>
          </span>
        ))}
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* ── Folder-only buttons: Share · AI · More options ── */}
        {isFolder && (
          <>
            {/*
             * Share — spec: px-2 py-1 rounded-md text-xs h-24px border-divider
             */}
            <button
              className="flex items-center gap-1 rounded-md text-xs text-text-dark-secondary hover:bg-neutral-dark-5 transition-colors border border-divider"
              style={{ height: 24, padding: '4px 8px' }}
              title="Share"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Share
            </button>

            {/*
             * AI sparkle — spec: 26×26px, p-1, rounded-md
             */}
            <button
              className="flex items-center justify-center rounded-md text-text-dark-secondary hover:bg-neutral-dark-5 transition-colors"
              style={{ width: 26, height: 26, padding: 4 }}
              title="Ask AI"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
            </button>

            {/*
             * More options … — spec: 28×28px, p-1, rounded-md
             * Opens the item context menu at button position.
             */}
            <button
              onClick={handleMoreOptions}
              className="flex items-center justify-center rounded-md text-text-dark-secondary hover:bg-neutral-dark-5 transition-colors"
              style={{ width: 28, height: 28, padding: 4 }}
              title="More options"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="5"  r="1" />
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>
          </>
        )}

        {/* ── View toggle + Sort (grid views) ──────────────────────────────── */}
        {isGridView && (
          <>
            {/*
             * View toggle — spec: each button 30×30px, rounded-md (6px)
             *   Grid active   : bg rgb(227,231,227)
             *   List / Compact: transparent when inactive
             */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-neutral-dark-5">
              <ViewBtn
                active={viewMode === 'grid'}
                title="Grid view"
                onClick={() => setViewMode('grid')}
              >
                {/* 2×2 grid icon */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3"   width="7" height="7" />
                  <rect x="14" y="3"  width="7" height="7" />
                  <rect x="3" y="14"  width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              </ViewBtn>

              <ViewBtn
                active={viewMode === 'list'}
                title="List view"
                onClick={() => setViewMode('list')}
              >
                {/* ≡ list icon */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="8" y1="6"  x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6"  x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </ViewBtn>

              <ViewBtn
                active={viewMode === 'compact'}
                title="Compact list"
                onClick={() => setViewMode('compact')}
              >
                {/* compact = tighter lines icon */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="5"  x2="21" y2="5" />
                  <line x1="3" y1="9"  x2="21" y2="9" />
                  <line x1="3" y1="13" x2="21" y2="13" />
                  <line x1="3" y1="17" x2="21" y2="17" />
                  <line x1="3" y1="21" x2="21" y2="21" />
                </svg>
              </ViewBtn>
            </div>

            {/* ── Sort / Display popover ────────────────────────────────────── */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setSortOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-md text-xs text-text-dark-secondary hover:bg-neutral-dark-5 transition-colors border border-divider"
                style={{ height: 28, padding: '4px 8px' }}
                title="Sort & display options"
              >
                {SORT_LABELS[sortBy] ?? 'Date created'}
                <svg
                  width="10" height="10" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  style={{ transform: sortOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {sortOpen && (
                <SortPopover
                  sortBy={sortBy}       setSortBy={setSortBy}
                  cardSize={cardSize}   setCardSize={setCardSize}
                  showTitle={showTitle} setShowTitle={setShowTitle}
                  groupFolders={groupFolders} setGroupFolders={setGroupFolders}
                />
              )}
            </div>
          </>
        )}

        {/* ── Close pane ─────────────────────────────────────────────────── */}
        {canClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-dark-5 text-text-dark-secondary hover:text-text-dark-primary transition-colors"
            title="Close pane"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── View toggle button ───────────────────────────────────────────────────────
// spec: 30×30px, border-radius 6px (rounded-md)
// active: bg rgb(227,231,227)

function ViewBtn({
  active, title, onClick, children,
}: {
  active: boolean
  title:  string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-md transition-colors text-text-dark-secondary"
      style={{
        width:      30,
        height:     30,
        background: active ? 'rgb(227,231,227)' : 'transparent',
        color:      active ? 'rgb(9,50,31)'     : 'rgb(104,103,100)',
      }}
    >
      {children}
    </button>
  )
}

// ─── Sort / Display popover ───────────────────────────────────────────────────
// spec: opens below sort button, ~220px wide, bg-white, shadow-xl, rounded-xl

interface SortPopoverProps {
  sortBy:       string
  setSortBy:    (v: 'name' | 'modified' | 'created' | 'type') => void
  cardSize:     'S' | 'M' | 'L'
  setCardSize:  (v: 'S' | 'M' | 'L') => void
  showTitle:    boolean
  setShowTitle: (v: boolean) => void
  groupFolders:    boolean
  setGroupFolders: (v: boolean) => void
}

function SortPopover({
  sortBy, setSortBy,
  cardSize, setCardSize,
  showTitle, setShowTitle,
  groupFolders, setGroupFolders,
}: SortPopoverProps) {
  return (
    <div
      className="absolute right-0 z-50 bg-background-main border border-divider shadow-xl rounded-xl p-3"
      style={{ top: 'calc(100% + 4px)', width: 220 }}
    >
      {/* ── Sort by ──────────────────────────────────────────────────────── */}
      <div className="mb-3">
        <p className="text-[11px] uppercase tracking-wider font-medium text-text-dark-secondary mb-1.5">
          Sort by
        </p>
        <div className="space-y-0.5">
          {SORT_OPTIONS.map(({ value, label }) => {
            const active = sortBy === value
            return (
              <button
                key={value}
                onClick={() => setSortBy(value)}
                className="flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm hover:bg-neutral-dark-5 transition-colors"
              >
                <span className={active ? 'text-accent-eden font-medium' : 'text-text-dark-secondary'}>
                  {label}
                </span>
                {active && (
                  // Checkmark
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#39624D" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Display ──────────────────────────────────────────────────────── */}
      <div className="border-t border-divider pt-3 space-y-2.5">
        <p className="text-[11px] uppercase tracking-wider font-medium text-text-dark-secondary">
          Display
        </p>

        {/* Size S / M / L */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-dark-secondary">Size</span>
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-neutral-dark-5">
            {(['S', 'M', 'L'] as const).map((sz) => (
              <button
                key={sz}
                onClick={() => setCardSize(sz)}
                className="flex items-center justify-center rounded-md text-xs transition-colors"
                style={{
                  width:      26,
                  height:     22,
                  background: cardSize === sz ? 'white' : 'transparent',
                  color:      cardSize === sz ? 'rgb(9,50,31)' : 'rgb(104,103,100)',
                  fontWeight: cardSize === sz ? 600 : 400,
                  boxShadow:  cardSize === sz ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Show title toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-dark-secondary">Show title</span>
          <Toggle value={showTitle} onChange={setShowTitle} />
        </div>

        {/* Group folders toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-dark-secondary">Group folders</span>
          <Toggle value={groupFolders} onChange={setGroupFolders} />
        </div>
      </div>
    </div>
  )
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
// spec: Display options use ON/OFF toggles

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative shrink-0 transition-colors duration-200"
      style={{
        width:        32,
        height:       18,
        borderRadius: 9999,
        background:   value ? '#39624D' : 'rgba(39,37,35,0.2)',
      }}
      role="switch"
      aria-checked={value}
    >
      <span
        className="absolute top-0.5 transition-all duration-200"
        style={{
          width:        14,
          height:       14,
          borderRadius: 9999,
          background:   'white',
          boxShadow:    '0 1px 2px rgba(0,0,0,0.25)',
          left:         value ? 16 : 2,
        }}
      />
    </button>
  )
}
