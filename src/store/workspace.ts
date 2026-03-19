import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { Workspace, Item, Panel, ContextMenuState } from '../types'

interface WorkspaceStore {
  // Auth
  user: User | null
  setUser: (user: User | null) => void

  // Workspace
  workspace: Workspace | null
  setWorkspace: (w: Workspace | null) => void

  // Items
  items: Item[]
  setItems: (items: Item[]) => void
  addItem: (item: Item) => void
  updateItem: (id: string, updates: Partial<Item>) => void
  removeItem: (id: string) => void

  // Recents (item ids, newest first, max 10)
  recentIds: string[]
  setRecentIds: (ids: string[]) => void
  addRecent: (id: string) => void

  // Layout
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  sidebarMode: 'workspace' | 'ai' | 'library'
  setSidebarMode: (mode: 'workspace' | 'ai' | 'library') => void
  expandedFolders: string[]
  toggleFolder: (id: string) => void

  // Panels (split-pane support)
  panels: Panel[]
  activePanelId: string
  openPanel: (panel: Omit<Panel, 'id'>) => void
  splitPanel: (panel: Omit<Panel, 'id'>) => void
  closePanel: (id: string) => void
  setActivePanel: (id: string) => void
  updatePanel: (id: string, updates: Partial<Panel>) => void

  // Selection
  selectedItems: string[]
  toggleSelectItem: (id: string) => void
  clearSelection: () => void

  // UI
  contextMenu: ContextMenuState | null
  setContextMenu: (menu: ContextMenuState | null) => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  viewMode: 'grid' | 'list' | 'compact'
  setViewMode: (mode: 'grid' | 'list' | 'compact') => void
  sortBy: 'name' | 'modified' | 'created' | 'type'
  setSortBy: (sort: 'name' | 'modified' | 'created' | 'type') => void
  cardSize: 'S' | 'M' | 'L'
  setCardSize: (size: 'S' | 'M' | 'L') => void
  showTitle: boolean
  setShowTitle: (v: boolean) => void
  groupFolders: boolean
  setGroupFolders: (v: boolean) => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  activityOpen: boolean
  setActivityOpen: (open: boolean) => void
}

let panelCounter = 2

export const useStore = create<WorkspaceStore>((set) => ({
  // Auth
  user: null,
  setUser: (user) => set({ user }),

  // Workspace
  workspace: null,
  setWorkspace: (workspace) => set({ workspace }),

  // Items
  items: [],
  setItems: (items) => set({ items }),
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  updateItem: (id, updates) =>
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)) })),
  removeItem: (id) =>
    set((s) => ({
      items: s.items.filter((i) => i.id !== id && i.parent_id !== id),
    })),

  // Recents
  recentIds: [],
  setRecentIds: (recentIds) => set({ recentIds }),
  addRecent: (id) =>
    set((s) => ({
      recentIds: [id, ...s.recentIds.filter((r) => r !== id)].slice(0, 10),
    })),

  // Layout
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  sidebarMode: 'workspace',
  setSidebarMode: (sidebarMode) => set({ sidebarMode }),
  expandedFolders: [],
  toggleFolder: (id) =>
    set((s) => ({
      expandedFolders: s.expandedFolders.includes(id)
        ? s.expandedFolders.filter((f) => f !== id)
        : [...s.expandedFolders, id],
    })),

  // Panels
  panels: [{ id: 'main', type: 'root' }],
  activePanelId: 'main',
  openPanel: (panel) =>
    set((s) => {
      const id = `panel-${panelCounter++}`
      // If only one panel and it's root, replace it
      if (s.panels.length === 1 && s.panels[0].type === 'root' && panel.type !== 'root') {
        return {
          panels: [{ ...panel, id: 'main' }],
          activePanelId: 'main',
        }
      }
      return {
        panels: [...s.panels, { ...panel, id }],
        activePanelId: id,
      }
    }),
  // Always push a new panel (never replaces single root panel)
  splitPanel: (panel) =>
    set((s) => {
      const id = `panel-${panelCounter++}`
      return {
        panels: [...s.panels, { ...panel, id }],
        activePanelId: id,
      }
    }),
  closePanel: (id) =>
    set((s) => {
      const panels = s.panels.filter((p) => p.id !== id)
      const remaining = panels.length > 0 ? panels : [{ id: 'main', type: 'root' as const }]
      return {
        panels: remaining,
        activePanelId: remaining[remaining.length - 1].id,
      }
    }),
  setActivePanel: (activePanelId) => set({ activePanelId }),
  updatePanel: (id, updates) =>
    set((s) => ({ panels: s.panels.map((p) => (p.id === id ? { ...p, ...updates } : p)) })),

  // Selection
  selectedItems: [],
  toggleSelectItem: (id) =>
    set((s) => ({
      selectedItems: s.selectedItems.includes(id)
        ? s.selectedItems.filter((i) => i !== id)
        : [...s.selectedItems, id],
    })),
  clearSelection: () => set({ selectedItems: [] }),

  // UI
  contextMenu: null,
  setContextMenu: (contextMenu) => set({ contextMenu }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  viewMode: 'grid',
  setViewMode: (viewMode) => set({ viewMode }),
  sortBy: 'created',
  setSortBy: (sortBy) => set({ sortBy }),
  cardSize: 'M',
  setCardSize: (cardSize) => set({ cardSize }),
  showTitle: true,
  setShowTitle: (showTitle) => set({ showTitle }),
  groupFolders: true,
  setGroupFolders: (groupFolders) => set({ groupFolders }),
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  activityOpen: false,
  setActivityOpen: (activityOpen) => set({ activityOpen }),
}))
