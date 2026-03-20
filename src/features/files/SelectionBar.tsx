import { createPortal } from 'react-dom'
import { useStore } from '../../store/workspace'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function SelectionBar() {
  const {
    selectedItems, clearSelection, items,
    updateItem, softDeleteItem,
    openMoveToModal,
  } = useStore()

  if (selectedItems.length === 0) return null

  const count = selectedItems.length

  async function handlePin() {
    for (const id of selectedItems) {
      const item = items.find((i) => i.id === id)
      if (!item) continue
      updateItem(id, { is_pinned: !item.is_pinned })
      await supabase.from('items').update({ is_pinned: !item.is_pinned }).eq('id', id)
    }
    toast.success(`${count} item${count > 1 ? 's' : ''} pinned`)
    clearSelection()
  }

  async function handleDelete() {
    for (const id of selectedItems) {
      softDeleteItem(id)
      await supabase
        .from('items')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', id)
    }
    toast.success(`${count} item${count > 1 ? 's' : ''} moved to Trash`)
    clearSelection()
  }

  function handleMove() {
    openMoveToModal(selectedItems)
  }

  function handleAskAI() {
    toast('AI chat with selected items coming soon', { icon: '✨' })
  }

  function handleShare() {
    toast('Sharing coming soon', { icon: '🔗' })
  }

  return createPortal(
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1 rounded-2xl border border-divider shadow-2xl px-2 py-1.5"
      style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)' }}
    >
      {/* Count badge */}
      <div
        className="flex items-center justify-center rounded-xl text-xs font-semibold px-2 py-1 mr-1"
        style={{ background: '#ECF0ED', color: '#39624D', minWidth: 28 }}
      >
        {count}
      </div>

      <BarButton onClick={handleMove} label="Move">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/>
          <line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
        </svg>
      </BarButton>

      <BarButton onClick={handlePin} label="Pin">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="17" x2="12" y2="22"/>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
        </svg>
      </BarButton>

      <BarButton onClick={handleAskAI} label="Ask AI">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </BarButton>

      <BarButton onClick={handleShare} label="Share">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      </BarButton>

      <div className="w-px h-5 bg-divider mx-1" />

      <BarButton onClick={handleDelete} label="Delete" danger>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </BarButton>

      <div className="w-px h-5 bg-divider mx-1" />

      {/* Clear selection */}
      <button
        onClick={clearSelection}
        title="Clear selection"
        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>,
    document.body
  )
}

function BarButton({
  children, onClick, label, danger = false,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-neutral-dark-5"
      style={{ color: danger ? '#CC768D' : '#272523' }}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}
