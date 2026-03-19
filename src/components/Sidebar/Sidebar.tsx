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
    openPanel, addRecent, setCommandPaletteOpen,
    setContextMenu,
  } = useStore()

  const [userMenuOpen, setUserMenuOpen] = useState(false)

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

  const navItems = [
    { id: 'home',    label: 'Home',     Icon: HomeIcon,    mode: 'workspace' as const },
    { id: 'ai',      label: 'Eden AI',  Icon: SparkleIcon, mode: 'ai' as const },
    { id: 'library', label: 'Library',  Icon: LibraryIcon, mode: 'library' as const },
  ]

  const isNavActive = (mode: 'workspace' | 'ai' | 'library') => sidebarMode === mode

  return (
    <div
      className="absolute select-none left-0 overflow-hidden border-0 flex flex-col z-20 bg-background-page h-full"
      style={{
        width: 250,
        transition: 'transform 500ms cubic-bezier(0.23,1,0.32,1)',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-250px)',
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

      {/* ── Nav icons ── */}
      <div className="flex items-center gap-0.5 px-2 mb-1 shrink-0">
        {navItems.map(({ id, label, Icon, mode }) => {
          const active = isNavActive(mode)
          return (
            <button
              key={id}
              onClick={() => setSidebarMode(mode)}
              className="flex items-center gap-1.5 px-2.5 rounded-full text-xs transition-colors"
              style={{
                height: 30,
                background: active ? 'rgb(227,231,227)' : 'transparent',
                color: active ? 'rgb(9,50,31)' : 'rgb(104,103,100)',
              }}
              title={label}
            >
              <Icon size={14} />
              {id === 'home' && <span>Home</span>}
            </button>
          )
        })}
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
                <p className="px-[17px] py-1 text-[12px]" style={{ color: 'rgba(39,37,35,0.6)' }}>Recents</p>
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
                <p className="px-[17px] py-1 text-[12px]" style={{ color: 'rgba(39,37,35,0.6)' }}>Pinned</p>
                <div className="px-2">
                  {pinnedItems.map((item) => (
                    <SidebarItem key={item.id} item={item} onOpen={handleOpen} />
                  ))}
                </div>
              </section>
            )}

            {/* Workspace */}
            <section>
              <div className="flex items-center justify-between px-[17px] py-1">
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
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-dark-5 text-sm transition-colors">
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
            { Icon: ActivityIcon, title: 'Activity', action: () => {} },
            { Icon: ClockIcon, title: 'Tasks', action: () => {} },
            { Icon: SettingsIcon, title: 'Settings', action: () => {} },
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
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute bottom-12 left-0 z-50 w-56 bg-background-main border border-divider rounded-xl shadow-xl p-1">
                <div className="px-3 py-2 border-b border-divider mb-1">
                  <p className="text-xs font-medium text-text-dark-primary">{user?.email}</p>
                </div>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
