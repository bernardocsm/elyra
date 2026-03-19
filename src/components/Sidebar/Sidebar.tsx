import { useState } from 'react'
import { useStore } from '../../store/workspace'
import { supabase } from '../../lib/supabase'
import SidebarItem from './SidebarItem'
import NewItemDropdown from './NewItemDropdown'
import {
  HomeIcon, SparkleIcon, LibraryIcon, SearchIcon, CollapseIcon,
  PlusIcon, TrashIcon, ActivityIcon, ClockIcon, SettingsIcon, SignOutIcon,
  FolderIcon,
} from './icons'
import type { Item } from '../../types'

export default function Sidebar() {
  const {
    sidebarOpen, setSidebarOpen,
    sidebarMode, setSidebarMode,
    workspace, user, items, recentIds,
    openPanel, addItem, addRecent, setCommandPaletteOpen,
    setContextMenu, setSettingsOpen, setActivityOpen,
  } = useStore()

  const [userMenuOpen, setUserMenuOpen] = useState(false)

  async function createNewChat() {
    if (!workspace) return
    const count = items.filter((i) => i.parent_id === null).length
    const { data } = await supabase
      .from('items')
      .insert({ workspace_id: workspace.id, type: 'chat', name: 'New Chat', parent_id: null, position: count })
      .select().single()
    if (data) {
      addItem(data as any)
      openPanel({ type: 'chat', itemId: data.id })
    }
  }

  function handleOpen(item: Item) {
    openPanel({ type: item.type as any, itemId: item.id })
    addRecent(item.id)
    if (user) {
      supabase.from('recents')
        .upsert({ user_id: user.id, item_id: item.id, accessed_at: new Date().toISOString() })
        .then(() => {})
    }
  }

  const recentItems = recentIds
    .map((id) => items.find((i) => i.id === id && !i.is_deleted))
    .filter((i): i is Item => Boolean(i))
    .slice(0, 3)

  const pinnedItems = items.filter((i) => i.is_pinned && !i.is_deleted)

  const rootFolders = items
    .filter((i) => i.parent_id === null && i.type === 'folder' && !i.is_deleted)
    .sort((a, b) => a.position - b.position)

  const rootNotes = items
    .filter((i) => i.parent_id === null && i.type !== 'folder' && !i.is_deleted)
    .sort((a, b) => a.position - b.position)

  // Nav item definitions with tooltip and x2 (secondary) action
  // spec tooltip format: "Label · ×2 Secondary action description"
  const navItems = [
    {
      id:      'home',
      label:   'Home',
      Icon:    HomeIcon,
      mode:    'workspace' as const,
      tooltip: 'Home \u00b7 \u00d72 Go to Home',
      // x2: clicking when already on Home → navigate to workspace root
      onX2:    () => openPanel({ type: 'root' }),
    },
    {
      id:      'ai',
      label:   'Eden AI',
      Icon:    SparkleIcon,
      mode:    'ai' as const,
      tooltip: 'Eden AI \u00b7 \u00d72 New Chat',
      // x2: clicking when already on AI → create and open a new chat
      onX2:    () => { createNewChat() },
    },
    {
      id:      'library',
      label:   'Library',
      Icon:    LibraryIcon,
      mode:    'library' as const,
      tooltip: 'Library \u00b7 \u00d72 Go to Library',
      onX2:    () => openPanel({ type: 'root' }),
    },
  ]

  const isNavActive = (mode: 'workspace' | 'ai' | 'library') => sidebarMode === mode

  function handleNavClick(
    mode: 'workspace' | 'ai' | 'library',
    onX2: () => void,
  ) {
    if (sidebarMode === mode) {
      // Already active → trigger secondary (x2) action
      onX2()
    } else {
      setSidebarMode(mode)
    }
  }

  // Sidebar container — spec: absolute, 250px, bg-background-page, border transparent,
  // transition 500ms cubic-bezier(0.23,1,0.32,1), overflow hidden, z-20, rounded-none
  return (
    <div
      className="absolute select-none left-0 overflow-hidden border border-transparent flex flex-col z-20 bg-background-page h-full rounded-none ml-0 my-0"
      style={{
        width:     250,
        transition: 'transform 500ms cubic-bezier(0.23,1,0.32,1)',
        transform:  sidebarOpen ? 'translateX(0)' : 'translateX(-250px)',
      }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-2 pt-3 pb-1.5 shrink-0">
        <div className="flex items-center gap-1.5 px-1 min-w-0">
          <span className="text-lg leading-none select-none">{workspace?.icon ?? '🌿'}</span>
          <span className="text-sm font-semibold text-text-dark-primary truncate">
            {workspace?.name ?? 'My Workspace'}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <NewItemDropdown />
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
            title="Collapse sidebar (Ctrl+D)"
          >
            <CollapseIcon size={15} />
          </button>
        </div>
      </div>

      {/* ── Nav icons ─────────────────────────────────────────────────────
       *  spec: h-30px, rounded-full, gap-0.5
       *  active  : bg rgb(227,231,227) + color rgb(9,50,31)
       *  inactive: transparent + color rgb(104,103,100) + hover:bg-neutral-dark-5
       *  Home    : always shows "Home" text (~72px width when active)
       *  x2      : clicking an already-active tab triggers secondary action
       */}
      <div className="flex items-center gap-0.5 px-2 mb-1 shrink-0">
        {navItems.map(({ id, Icon, mode, tooltip, onX2 }) => {
          const active = isNavActive(mode)
          return (
            <button
              key={id}
              onClick={() => handleNavClick(mode, onX2)}
              className={[
                'flex items-center gap-1.5 px-2.5 rounded-full text-xs transition-colors',
                active ? '' : 'hover:bg-neutral-dark-5',
              ].join(' ')}
              style={{
                height:     30,
                background: active ? 'rgb(227,231,227)' : 'transparent',
                color:      active ? 'rgb(9,50,31)'     : 'rgb(104,103,100)',
              }}
              title={tooltip}
            >
              <Icon size={14} />
              {/* Home always shows label; active state gives ~72px width */}
              {id === 'home' && <span>Home</span>}
            </button>
          )
        })}

        {/* Search — opens Command Palette (Ctrl+K) */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="ml-auto p-1.5 rounded-full hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
          title="Search (Ctrl+K)"
        >
          <SearchIcon size={14} />
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {sidebarMode === 'workspace' && (
          <div className="py-1 space-y-0.5">
            {/* Recents */}
            {recentItems.length > 0 && (
              <section>
                {/*
                 * Section header — spec: 12px, rgba(39,37,35,0.6), pl-[17px], height 17-18px
                 * Using height:18 + flex items-center instead of py-1 (~20px) for exactness.
                 */}
                <p
                  className="flex items-center text-[12px] px-[17px] mb-1"
                  style={{ height: 18, color: 'rgba(39,37,35,0.6)' }}
                >
                  Recents
                </p>
                <div className="px-2">
                  {recentItems.map((item) => (
                    <SidebarItem key={item.id} item={item} onOpen={handleOpen} />
                  ))}
                </div>
              </section>
            )}

            {/* Pinned */}
            {pinnedItems.length > 0 && (
              <section>
                <p
                  className="flex items-center text-[12px] px-[17px] mb-1"
                  style={{ height: 18, color: 'rgba(39,37,35,0.6)' }}
                >
                  Pinned
                </p>
                <div className="px-2">
                  {pinnedItems.map((item) => (
                    <SidebarItem key={item.id} item={item} onOpen={handleOpen} />
                  ))}
                </div>
              </section>
            )}

            {/* Workspace */}
            <section>
              <div className="flex items-center justify-between px-[17px] mb-1" style={{ height: 18 }}>
                <p className="text-[12px]" style={{ color: 'rgba(39,37,35,0.6)' }}>Workspace</p>
              </div>
              <div className="px-2">
                {[...rootFolders, ...rootNotes].map((item) => (
                  <SidebarItem key={item.id} item={item} onOpen={handleOpen} />
                ))}
                {rootFolders.length === 0 && rootNotes.length === 0 && (
                  <p className="px-4 py-2 text-xs text-text-dark-secondary/60 italic">No items yet</p>
                )}
              </div>
            </section>
          </div>
        )}

        {sidebarMode === 'ai' && (
          <div className="p-4 text-sm text-text-dark-secondary space-y-4">
            <div>
              <p className="font-semibold text-text-dark-primary text-xs uppercase tracking-wider mb-2">Agents</p>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-dark-5 text-sm transition-colors">
                New Agent
              </button>
            </div>
            <div>
              <p className="font-semibold text-text-dark-primary text-xs uppercase tracking-wider mb-2">Chats</p>
              <button
                onClick={createNewChat}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-dark-5 text-sm transition-colors"
              >
                New Chat
              </button>
            </div>
          </div>
        )}

        {sidebarMode === 'library' && (
          <div className="p-4 text-sm text-text-dark-secondary">
            <p className="text-xs leading-relaxed mb-4">
              Library is where items created in a chat, agent, or canvas are saved by default.
              You can also treat it as a place to save items — like links or quick notes — without cluttering your workspace!
            </p>
            <p className="text-xs italic opacity-60">No unsorted items</p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 border-t border-divider px-2 py-2">
        {/* Action icons */}
        <div className="flex items-center gap-0.5 mb-2">
          {[
            { Icon: TrashIcon, title: 'Trash', action: () => openPanel({ type: 'trash' }) },
            { Icon: ActivityIcon, title: 'Activity', action: () => setActivityOpen(true) },
            { Icon: ClockIcon, title: 'Tasks', action: () => {} },
            { Icon: SettingsIcon, title: 'Settings', action: () => setSettingsOpen(true) },
          ].map(({ Icon, title, action }) => (
            <button
              key={title}
              onClick={action}
              title={title}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        {/* User button */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg w-full hover:bg-neutral-dark-5 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-accent-eden flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-xs text-text-dark-primary font-medium truncate w-full">
                {user?.email ?? 'User'}
              </span>
              <span className="text-[10px] text-text-dark-secondary">Free plan</span>
            </div>
          </button>

          {userMenuOpen && (
            <>
              {/* Backdrop — z-[600] so it's above action icon row (z-20 sidebar) but below popup */}
              <div className="fixed inset-0 z-[600]" onClick={() => setUserMenuOpen(false)} />

              {/* Popup — positioned ABOVE user button via bottom-full, z-[601] above backdrop */}
              <div
                className="absolute left-0 z-[601] w-56 bg-background-main border border-divider rounded-xl shadow-xl overflow-hidden"
                style={{ bottom: 'calc(100% + 6px)' }}
              >
                {/* Header: avatar + name + email */}
                <div className="flex items-center gap-2.5 px-3 py-3 border-b border-divider">
                  <div className="w-8 h-8 rounded-full bg-accent-eden flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {user?.email?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-dark-primary truncate">
                      {user?.email?.split('@')[0] ?? 'User'}
                    </p>
                    <p className="text-[10px] text-text-dark-secondary truncate">{user?.email ?? ''}</p>
                  </div>
                </div>

                {/* Menu items */}
                <div className="p-1">
                  {[
                    { label: 'Notifications', hasArrow: true },
                    { label: 'Workspace Invites', hasArrow: true },
                    { label: 'Switch Workspace', hasArrow: true, sub: workspace?.name },
                  ].map(({ label, hasArrow, sub }) => (
                    <button
                      key={label}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-text-dark-secondary hover:bg-neutral-dark-5 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        {label === 'Switch Workspace' && (
                          <span className="w-4 h-4 rounded bg-accent-eden/20 text-accent-eden text-[9px] font-bold flex items-center justify-center shrink-0">
                            {workspace?.name?.[0]?.toUpperCase() ?? 'N'}
                          </span>
                        )}
                        {label}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-text-dark-secondary/60">
                        {sub && <span className="truncate max-w-[60px]">{sub}</span>}
                        {hasArrow && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        )}
                      </span>
                    </button>
                  ))}

                  {/* Divider */}
                  <div className="my-1 border-t border-divider" />

                  <button
                    onClick={async () => {
                      setUserMenuOpen(false)
                      await supabase.auth.signOut()
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-accent-raspberry hover:bg-neutral-dark-5 transition-colors"
                  >
                    <SignOutIcon size={13} />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
