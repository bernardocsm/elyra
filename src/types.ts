export type ItemType = 'folder' | 'note' | 'canvas' | 'chat' | 'link'
export type CoverType = 'silk' | 'solid' | 'gradient' | 'image'

export interface Workspace {
  id: string
  user_id: string
  name: string
  icon: string
  cover_type: CoverType
  cover_value: string
  created_at: string
}

export interface Item {
  id: string
  workspace_id: string
  parent_id: string | null
  type: ItemType
  name: string
  content: string | null
  color: string
  is_pinned: boolean
  is_deleted: boolean
  deleted_at: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface Recent {
  id: string
  user_id: string
  item_id: string
  accessed_at: string
}

export interface Panel {
  id: string
  type: 'root' | 'folder' | 'note' | 'canvas' | 'trash' | 'chat' | 'link'
  itemId?: string
}

export interface ContextMenuState {
  x: number
  y: number
  itemId: string | null
  isBackground?: boolean
}
