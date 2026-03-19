// ActivityPanel — floating right panel showing workspace activity feed
// Spec: fixed right-side panel, 320px wide, slides in from right, z-[400]
// Empty state: "No activity — Uploads, downloads, and processing tasks will appear here"
// Header has a "–" (minimize/close) button

import { useStore } from '../../store/workspace'

export default function ActivityPanel() {
  const { activityOpen, setActivityOpen } = useStore()

  if (!activityOpen) return null

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        className="fixed inset-0 z-[390]"
        onClick={() => setActivityOpen(false)}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-[400] bg-background-main border-l border-divider shadow-xl flex flex-col"
        style={{ width: 320 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 border-b border-divider shrink-0" style={{ height: 48 }}>
          <span className="text-sm font-semibold text-text-dark-primary">Activity</span>
          {/* Minimize/close button — spec shows "–" icon */}
          <button
            onClick={() => setActivityOpen(false)}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
            title="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Content — empty state (spec exact message) */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-2">
          <div className="w-10 h-10 rounded-full bg-neutral-dark-5 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-dark-secondary">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-text-dark-primary">No activity</p>
          <p className="text-xs text-text-dark-secondary leading-relaxed max-w-[220px]">
            Uploads, downloads, and processing tasks will appear here.
          </p>
        </div>
      </div>
    </>
  )
}
