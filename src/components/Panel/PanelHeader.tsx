import { useStore } from '../../store/workspace'
import type { Panel } from '../../types'

interface Props {
  panel: Panel
  canClose: boolean
  onClose: () => void
  onNavigate?: (type: 'back' | 'forward') => void
  canGoBack?: boolean
  canGoForward?: boolean
}

export default function PanelHeader({
  panel, canClose, onClose,
  onNavigate, canGoBack = false, canGoForward = false,
}: Props) {
  const {
    items, workspace, viewMode, setViewMode, sortBy, setSortBy,
    groupFolders, setGroupFolders,
    setInfoPanelItemId, infoPanelItemId,
    openPanel, openNewFolderModal,
  } = useStore()
  const item = panel.itemId ? items.find((i) => i.id === panel.itemId) : null

  const isGridView = panel.type === 'root' || panel.type === 'folder' || panel.type === 'trash'
  const isContentView = panel.type === 'note' || panel.type === 'canvas' || panel.type === 'chat'

  // Build breadcrumb with full path
  const crumbs: Array<{ label: string; type?: Panel['type']; itemId?: string }> = []
  if (workspace) crumbs.push({ label: workspace.name, type: 'root' })

  // Walk up parent chain for folder/note/canvas
  if (item) {
    const path: typeof items = []
    let cur = item
    while (cur.parent_id) {
      const parent = items.find((i) => i.id === cur.parent_id)
      if (!parent) break
      path.unshift(parent)
      cur = parent
    }
    for (const p of path) {
      crumbs.push({ label: p.name, type: 'folder', itemId: p.id })
    }
    crumbs.push({ label: item.name, type: panel.type, itemId: item.id })
  }

  if (panel.type === 'trash') crumbs.push({ label: 'Trash', type: 'trash' })

  function handleCrumbClick(crumb: typeof crumbs[number], index: number) {
    if (index === crumbs.length - 1) return // already here
    if (crumb.type === 'root') {
      openPanel({ type: 'root' })
    } else if (crumb.type === 'folder' && crumb.itemId) {
      openPanel({ type: 'folder', itemId: crumb.itemId })
    }
  }

  const infoPanelActive = infoPanelItemId === panel.itemId && panel.itemId !== undefined

  return (
    <div className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b border-divider bg-background-main">
      {/* Left: history + breadcrumb */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-3">
        {/* History arrows */}
        {onNavigate && (
          <div className="flex items-center gap-0.5 shrink-0 mr-1">
            <button
              onClick={() => onNavigate('back')}
              disabled={!canGoBack}
              className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Go back"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button
              onClick={() => onNavigate('forward')}
              disabled={!canGoForward}
              className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Go forward"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0 shrink-0">
              {i > 0 && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dark-secondary/30 shrink-0">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
              <button
                onClick={() => handleCrumbClick(crumb, i)}
                disabled={i === crumbs.length - 1}
                className={`text-sm leading-none truncate transition-colors rounded px-0.5 ${
                  i === crumbs.length - 1
                    ? 'text-text-dark-primary font-medium cursor-default'
                    : 'text-text-dark-secondary hover:text-text-dark-primary hover:bg-neutral-dark-5 cursor-pointer'
                }`}
                style={{ maxWidth: 160 }}
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </div>

        {/* "+" button for folder/root views */}
        {(panel.type === 'root' || panel.type === 'folder') && (
          <button
            onClick={() => openNewFolderModal(panel.itemId ?? null)}
            className="shrink-0 ml-1 flex items-center justify-center w-5 h-5 rounded-md hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
            title="New item"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isGridView && (
          <>
            {/* View toggle */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-neutral-dark-5">
              <button
                onClick={() => setViewMode('grid')}
                className="flex items-center justify-center rounded-md transition-colors"
                style={{
                  width: 26, height: 26,
                  background: viewMode === 'grid' ? 'rgb(227,231,227)' : 'transparent',
                }}
                title="Grid view"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="flex items-center justify-center rounded-md transition-colors"
                style={{
                  width: 26, height: 26,
                  background: viewMode === 'list' ? 'rgb(227,231,227)' : 'transparent',
                }}
                title="List view"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs border border-divider rounded-lg px-2 py-1.5 bg-background-faint text-text-dark-secondary outline-none cursor-pointer hover:border-primary-30 transition-colors"
            >
              <option value="created">Date created</option>
              <option value="modified">Last modified</option>
              <option value="name">Name</option>
              <option value="type">Type</option>
            </select>

            {/* Group folders toggle */}
            <button
              onClick={() => setGroupFolders(!groupFolders)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs border border-divider transition-colors hover:border-primary-30"
              style={{
                background: groupFolders ? 'rgb(236,240,237)' : 'transparent',
                color: groupFolders ? '#09321F' : '#686764',
                borderColor: groupFolders ? '#B3BFB7' : undefined,
              }}
              title="Group folders"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              Folders
            </button>
          </>
        )}

        {/* "i" info button for content views */}
        {isContentView && panel.itemId && (
          <button
            onClick={() => setInfoPanelItemId(infoPanelActive ? null : panel.itemId!)}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
            style={{
              background: infoPanelActive ? 'rgb(236,240,237)' : 'transparent',
              color: infoPanelActive ? '#09321F' : '#686764',
            }}
            title="File info"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </button>
        )}

        {/* Close panel button */}
        {canClose && (
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-neutral-dark-5 text-text-dark-secondary hover:text-text-dark-primary transition-colors"
            title="Close pane"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
