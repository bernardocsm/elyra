import { useEffect } from 'react'
import { useStore } from '../store/workspace'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import PanelContent from '../components/Panel'
import ContextMenu from '../components/ContextMenu'
import CommandPalette from '../components/CommandPalette'

export default function Workspace() {
  const {
    sidebarOpen, setSidebarOpen,
    panels, activePanelId, setActivePanel,
    workspace, setItems, addItem, updateItem, removeItem,
    setCommandPaletteOpen, commandPaletteOpen,
    clearSelection,
  } = useStore()

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ctrl+D: toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        setSidebarOpen(!sidebarOpen)
      }
      // Ctrl+K: command palette (also handled in CommandPalette, but keep here as fallback)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      // Escape: clear selection
      if (e.key === 'Escape') {
        clearSelection()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sidebarOpen, commandPaletteOpen])

  // ── Supabase Realtime ──
  useEffect(() => {
    if (!workspace) return

    const channel = supabase
      .channel(`workspace-items:${workspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `workspace_id=eq.${workspace.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Only add if not already in store (optimistic update may have added it)
            const exists = useStore.getState().items.some((i) => i.id === (payload.new as any).id)
            if (!exists) addItem(payload.new as any)
          }
          if (payload.eventType === 'UPDATE') {
            updateItem((payload.new as any).id, payload.new as any)
          }
          if (payload.eventType === 'DELETE') {
            removeItem((payload.old as any).id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workspace?.id])

  // Split panels: calculate width for each panel
  const panelCount = panels.length
  const sidebarW = sidebarOpen ? 250 : 0

  return (
    <div
      className="flex h-screen overflow-hidden bg-background-page"
      onClick={() => {
        // Close context menu on any click
        if (useStore.getState().contextMenu) {
          useStore.getState().setContextMenu(null)
        }
      }}
    >
      {/* ── Sidebar ── */}
      <Sidebar />

      {/* ── Collapsed sidebar floating buttons ── */}
      {!sidebarOpen && (
        <div
          className="absolute top-3 left-3 z-30 flex flex-col gap-1"
          style={{ pointerEvents: 'all' }}
        >
          {/* Expand sidebar */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-background-main/90 border border-divider shadow-sm hover:bg-background-main text-text-dark-secondary transition-colors"
            title="Expand sidebar (Ctrl+D)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>

          {/* New item */}
          <button
            onClick={() => {}}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-background-main/90 border border-divider shadow-sm hover:bg-background-main text-text-dark-secondary transition-colors"
            title="New item"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {/* Search */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-background-main/90 border border-divider shadow-sm hover:bg-background-main text-text-dark-secondary transition-colors"
            title="Search (Ctrl+K)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </div>
      )}

      {/* ── Panel area ── */}
      <div
        className="flex flex-1 min-w-0 overflow-hidden"
        style={{
          marginLeft: sidebarW,
          transition: 'margin-left 500ms cubic-bezier(0.23,1,0.32,1)',
        }}
      >
        {panels.map((panel, index) => {
          const isActive = panel.id === activePanelId
          const canClose = panels.length > 1

          return (
            <div
              key={panel.id}
              className="flex flex-col h-full min-w-0 border-r border-divider last:border-r-0 overflow-hidden"
              style={{
                flex: 1,
                // Highlight active panel with subtle indicator when split
                outline: canClose && isActive ? '1px solid rgba(57,98,77,0.15)' : 'none',
                outlineOffset: -1,
              }}
              onClick={() => setActivePanel(panel.id)}
            >
              <PanelContent panel={panel} canClose={canClose} />
            </div>
          )
        })}
      </div>

      {/* ── Global overlays ── */}
      <ContextMenu />
      <CommandPalette />
    </div>
  )
}
