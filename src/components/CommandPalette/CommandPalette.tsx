import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../store/workspace'
import type { Item } from '../../types'

const TYPE_ICON: Record<string, string> = {
  folder: '📁',
  note:   '📄',
  canvas: '⬜',
}
const TYPE_LABEL: Record<string, string> = {
  folder: 'Folder',
  note:   'Note',
  canvas: 'EdenCanvas',
}

export default function CommandPalette() {
  const {
    commandPaletteOpen, setCommandPaletteOpen,
    items, recentIds, openPanel,
  } = useStore()

  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Open/close with Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [commandPaletteOpen])

  // Focus input on open
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setActiveIdx(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [commandPaletteOpen])

  const recentItems = recentIds
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is Item => Boolean(i))

  const searchResults: Item[] = query.trim()
    ? items
        .filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
    : []

  const displayItems = query.trim() ? searchResults : recentItems.slice(0, 5)

  function openItem(item: Item) {
    openPanel({ type: item.type as 'folder' | 'note' | 'canvas', itemId: item.id })
    useStore.getState().addRecent(item.id)
    setCommandPaletteOpen(false)
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, displayItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = displayItems[activeIdx]
      if (item) openItem(item)
    }
  }, [displayItems, activeIdx])

  if (!commandPaletteOpen) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1999] bg-black/20"
        onClick={() => setCommandPaletteOpen(false)}
      />

      {/* Modal */}
      <div
        className="fixed z-[2000] left-1/2 -translate-x-1/2 bg-background-page border border-divider rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ top: 80, width: 896, maxHeight: 509 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-divider shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dark-secondary shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search anything..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-text-dark-primary placeholder:text-text-dark-secondary/60"
          />
          <kbd className="hidden sm:block text-[10px] px-1.5 py-0.5 rounded border border-divider text-text-dark-secondary font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {!query.trim() && (
            <>
              {/* Quick actions */}
              <Section label="⚡ QUICK ACTIONS">
                {[
                  { label: 'Browse Workspace', sub: 'Navigate folder tree' },
                  { label: 'Create Note',      sub: 'In workspace root', icon: '📄' },
                  { label: 'Create Folder',    sub: 'In workspace root', icon: '📁' },
                  { label: 'Create Canvas',    sub: 'In workspace root', icon: '⬜' },
                ].map(({ label, sub, icon }) => (
                  <ResultRow key={label} icon={icon ?? '⚡'} title={label} subtitle={sub} active={false} onClick={() => {}} />
                ))}
              </Section>

              {/* Recents */}
              {recentItems.length > 0 && (
                <Section label="🕐 RECENT">
                  {recentItems.slice(0, 5).map((item, i) => (
                    <ResultRow
                      key={item.id}
                      icon={TYPE_ICON[item.type] ?? '📄'}
                      title={item.name}
                      subtitle={TYPE_LABEL[item.type] ?? item.type}
                      active={activeIdx === i}
                      onClick={() => openItem(item)}
                    />
                  ))}
                </Section>
              )}

              {/* Navigation */}
              <Section label="➡ NAVIGATION">
                {[
                  { label: 'Go to Home',          sub: 'Navigate to workspace home' },
                  { label: 'Settings',             sub: 'Open workspace settings' },
                ].map(({ label, sub }) => (
                  <ResultRow key={label} icon="🔗" title={label} subtitle={sub} active={false} onClick={() => setCommandPaletteOpen(false)} />
                ))}
              </Section>
            </>
          )}

          {query.trim() && (
            <Section label="RESULTS">
              {searchResults.length === 0 ? (
                <p className="px-4 py-6 text-sm text-text-dark-secondary text-center">
                  No results for "{query}"
                </p>
              ) : (
                searchResults.map((item, i) => (
                  <ResultRow
                    key={item.id}
                    icon={TYPE_ICON[item.type] ?? '📄'}
                    title={item.name}
                    subtitle={TYPE_LABEL[item.type] ?? item.type}
                    active={activeIdx === i}
                    onClick={() => openItem(item)}
                  />
                ))
              )}
            </Section>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-divider text-[11px] text-text-dark-secondary shrink-0">
          <span>
            <kbd className="px-1 py-0.5 border border-divider rounded font-mono text-[10px]">↑↓</kbd>
            {' '}navigate
          </span>
          <span>
            <kbd className="px-1 py-0.5 border border-divider rounded font-mono text-[10px]">↵</kbd>
            {' '}open
          </span>
          <span>
            <kbd className="px-1 py-0.5 border border-divider rounded font-mono text-[10px]">Alt+↵</kbd>
            {' '}open in pane
          </span>
        </div>
      </div>
    </>,
    document.body
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-3 pb-1">
      <p className="px-4 pb-1 text-[11px] font-semibold text-text-dark-secondary tracking-wider uppercase">
        {label}
      </p>
      {children}
    </div>
  )
}

function ResultRow({
  icon, title, subtitle, active, onClick,
}: {
  icon: string
  title: string
  subtitle: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 text-left transition-colors"
      style={{
        height: 44,
        background: active ? 'rgb(236,240,237)' : 'transparent',
      }}
    >
      <span className="text-base w-5 text-center shrink-0 select-none">{icon}</span>
      <span className="flex-1 text-sm text-text-dark-primary truncate">{title}</span>
      <span className="text-xs text-text-dark-secondary shrink-0">{subtitle}</span>
    </button>
  )
}
