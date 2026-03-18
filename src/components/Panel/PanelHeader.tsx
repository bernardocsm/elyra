import { useStore } from '../../store/workspace'
import type { Panel } from '../../types'

interface Props {
  panel: Panel
  canClose: boolean
  onClose: () => void
}

export default function PanelHeader({ panel, canClose, onClose }: Props) {
  const { items, workspace, viewMode, setViewMode, sortBy, setSortBy } = useStore()
  const item = panel.itemId ? items.find((i) => i.id === panel.itemId) : null

  const isGridView = panel.type === 'root' || panel.type === 'folder' || panel.type === 'trash'

  // Build breadcrumb
  const crumbs: string[] = []
  if (workspace) crumbs.push(workspace.name)
  if (item) crumbs.push(item.name)
  if (panel.type === 'trash') crumbs.push('Trash')

  return (
    <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-divider bg-background-main">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-4">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <span className="shrink-0 text-text-dark-secondary/30">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
            )}
            <span
              className={`text-sm truncate ${
                i === crumbs.length - 1
                  ? 'text-text-dark-primary font-medium'
                  : 'text-text-dark-secondary'
              }`}
            >
              {crumb}
            </span>
          </span>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {isGridView && (
          <>
            {/* View toggle */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-neutral-dark-5">
              <button
                onClick={() => setViewMode('grid')}
                className="flex items-center justify-center rounded-md transition-colors"
                style={{
                  width: 28, height: 28,
                  background: viewMode === 'grid' ? 'rgb(227,231,227)' : 'transparent',
                }}
                title="Grid view"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="flex items-center justify-center rounded-md transition-colors"
                style={{
                  width: 28, height: 28,
                  background: viewMode === 'list' ? 'rgb(227,231,227)' : 'transparent',
                }}
                title="List view"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          </>
        )}

        {/* Close button — only show if panel can be closed */}
        {canClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-dark-5 text-text-dark-secondary hover:text-text-dark-primary transition-colors"
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
