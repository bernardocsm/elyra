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
  if (item.type === 'folder') return <FolderIcon color={item.color} size={15} />
  if (item.type === 'note') return <NoteIcon size={14} />
  return <CanvasIcon size={14} />
}

export default function SidebarItem({ item, depth = 0, onOpen }: Props) {
  const {
    expandedFolders, toggleFolder,
    items, openPanel, workspace, addItem,
    setContextMenu,
  } = useStore()

  const isFolder = item.type === 'folder'
  const isExpanded = expandedFolders.includes(item.id)
  const children = items
    .filter((i) => i.parent_id === item.id)
    .sort((a, b) => a.position - b.position)

  async function handleAddChild(e: React.MouseEvent) {
    e.stopPropagation()
    if (!workspace) return
    const { data } = await supabase.from('items').insert({
      workspace_id: workspace.id,
      parent_id: item.id,
      type: 'note',
      name: 'Untitled note',
      position: children.length,
    }).select().single()
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
          height: 32,
          paddingLeft: 8 + depth * 16,
          paddingRight: 8,
        }}
        onClick={() => onOpen(item)}
        onContextMenu={(e) => {
          e.preventDefault()
          setContextMenu({ x: e.clientX, y: e.clientY, itemId: item.id })
        }}
      >
        {/* Expand chevron — only for folders */}
        <button
          className="shrink-0 flex items-center justify-center transition-transform duration-200 opacity-0 group-hover/item:opacity-100 mr-0.5"
          style={{
            width: 16, height: 16,
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            visibility: isFolder ? 'visible' : 'hidden',
          }}
          onClick={(e) => { e.stopPropagation(); if (isFolder) toggleFolder(item.id) }}
        >
          <ChevronRightIcon size={11} />
        </button>

        {/* Icon */}
        <span className="shrink-0 mr-1.5">{getItemIcon(item)}</span>

        {/* Name */}
        <span className="flex-1 text-sm text-text-dark-secondary truncate leading-none">
          {item.name}
        </span>

        {/* Hover actions */}
        <div className="hidden group-hover/item:flex items-center gap-0.5 shrink-0">
          <button
            onClick={handleOpenInPane}
            className="flex items-center justify-center w-5 h-5 rounded hover:bg-neutral-dark-5 text-text-dark-secondary hover:text-text-dark-primary transition-colors"
            title="Open in new pane"
          >
            <OpenPaneIcon size={12} />
          </button>
          {isFolder && (
            <button
              onClick={handleAddChild}
              className="flex items-center justify-center w-5 h-5 rounded hover:bg-neutral-dark-5 text-text-dark-secondary hover:text-accent-eden transition-colors"
              title="Add item inside"
            >
              <PlusIcon size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Children (recursive) */}
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
