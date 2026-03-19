// SidebarItem — spec:
//   item height    : 32px
//   paddingLeft    : 16px base (wrapper px-2 = 8px + item paddingLeft 8px = 16px total)
//   paddingRight   : 8px (pr-2)
//   paddingVertical: 6px (py-1.5)
//   font-size      : 14px (text-sm)
//   color          : rgb(104,103,100) (text-text-dark-secondary)
//   border-radius  : 6px (rounded-md)
//   hover          : bg-neutral-dark-5
//
//   Hover buttons (folders):
//     chevron  > : 12w × 14h px, rotates 90° when expanded
//     open-pane  : 20×20px, p-0.75
//     add child +: 20×20px, p-0.75

import { useStore } from '../../store/workspace'
import type { Item } from '../../types'
import { ChevronRightIcon, FolderIcon, NoteIcon, CanvasIcon, OpenPaneIcon, PlusIcon } from './icons'
import { supabase } from '../../lib/supabase'

interface Props {
  item: Item
  depth?: number
  onOpen: (item: Item) => void
}

function getItemIcon(item: Item) {
  if (item.type === 'folder') return <FolderIcon color={item.color || '#527160'} size={15} />
  if (item.type === 'note')   return <NoteIcon size={14} />
  return <CanvasIcon size={14} />
}

export default function SidebarItem({ item, depth = 0, onOpen }: Props) {
  const {
    expandedFolders, toggleFolder,
    items, openPanel, workspace, addItem,
    setContextMenu,
  } = useStore()

  const isFolder   = item.type === 'folder'
  const isExpanded = expandedFolders.includes(item.id)
  const children   = items
    .filter((i) => i.parent_id === item.id)
    .sort((a, b) => a.position - b.position)

  async function handleAddChild(e: React.MouseEvent) {
    e.stopPropagation()
    if (!workspace) return
    const { data } = await supabase
      .from('items')
      .insert({
        workspace_id: workspace.id,
        parent_id:    item.id,
        type:         'note',
        name:         'Untitled note',
        position:     children.length,
      })
      .select()
      .single()
    if (data) {
      addItem(data as any)
      openPanel({ type: 'note', itemId: data.id })
    }
  }

  function handleOpenInPane(e: React.MouseEvent) {
    e.stopPropagation()
    openPanel({ type: item.type as any, itemId: item.id })
  }

  return (
    <div>
      <div
        className="group/item relative flex items-center rounded-md cursor-pointer hover:bg-neutral-dark-5 transition-colors"
        style={{
          height:       32,
          // spec: pl-4 (16px) base + 16px per depth level for children
          // The parent wrapper adds 8px (px-2), so item paddingLeft 8px gives 16px total at depth=0.
          paddingLeft:  8 + depth * 16,
          paddingRight: 8,
        }}
        onClick={() => onOpen(item)}
        onContextMenu={(e) => {
          e.preventDefault()
          setContextMenu({ x: e.clientX, y: e.clientY, itemId: item.id })
        }}
      >
        {/*
         * Expand chevron — folders only.
         * spec: 12w × 14h px
         *   - hidden (opacity-0)  when not hovering and not expanded
         *   - visible (opacity-1) on group-hover OR when already expanded
         *   - rotates 90° when expanded
         */}
        <div
          className={[
            'shrink-0 flex items-center justify-center mr-0.5 transition-all duration-200',
            !isFolder
              ? 'opacity-0 pointer-events-none'
              : isExpanded
                ? 'opacity-100'
                : 'opacity-0 group-hover/item:opacity-100',
          ].join(' ')}
          style={{
            width:     12,
            height:    14,
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          {isFolder && (
            <button
              className="w-full h-full flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); toggleFolder(item.id) }}
            >
              <ChevronRightIcon size={11} />
            </button>
          )}
        </div>

        {/* Item icon — folder (two-tone), note (green), canvas (purple) */}
        <span className="shrink-0 mr-1.5">{getItemIcon(item)}</span>

        {/* Name — text-sm, text-dark-secondary, truncated */}
        <span className="flex-1 text-sm text-text-dark-secondary truncate leading-none">
          {item.name}
        </span>

        {/*
         * Hover action buttons — appear on group-hover.
         * Folders: open-pane (20×20) + add-child (20×20)
         * Files:   open-pane (20×20) only
         */}
        <div className="hidden group-hover/item:flex items-center gap-0.5 shrink-0">
          {/* Open in new pane — 20×20px, p-0.75 */}
          <button
            onClick={handleOpenInPane}
            className="flex items-center justify-center rounded hover:bg-neutral-dark-5 text-text-dark-secondary hover:text-text-dark-primary transition-colors"
            style={{ width: 20, height: 20, padding: 3 }}   // p-0.75 = 3px
            title="Open in new pane"
          >
            <OpenPaneIcon size={12} />
          </button>

          {/* Add child (folders only) — 20×20px, p-0.75 */}
          {isFolder && (
            <button
              onClick={handleAddChild}
              className="flex items-center justify-center rounded hover:bg-neutral-dark-5 text-text-dark-secondary hover:text-accent-eden transition-colors"
              style={{ width: 20, height: 20, padding: 3 }}  // p-0.75 = 3px
              title="Add item inside"
            >
              <PlusIcon size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Recursive children — indented 16px per depth level */}
      {isFolder && isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <SidebarItem key={child.id} item={child} depth={depth + 1} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}
