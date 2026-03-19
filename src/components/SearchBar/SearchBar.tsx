// SearchBar — spec:
//   container : h-62px, rounded-full, bg-background-faint, px-6 py-3
//   input     : 18px font, placeholder "Search anything..."
//   lupa icon : 16×16, text-text-dark-secondary, left of input
//   folder chip (scoped search): inline chip with folder icon + name + X
//   tabs      : h-30px, rounded-full, gap 8px
//     "All results" — no icon  — active: green, inactive hover: green
//     "Notes"       — page icon 16×16  — inactive hover: green
//     "Trash"       — trash icon 16×16 — inactive hover: raspberry

interface Props {
  value: string
  onChange: (v: string) => void
  folderName?: string
  onClearFolder?: () => void
  activeTab: 'all' | 'notes' | 'trash'
  onTabChange: (t: 'all' | 'notes' | 'trash') => void
}

export default function SearchBar({
  value, onChange,
  folderName, onClearFolder,
  activeTab, onTabChange,
}: Props) {
  return (
    // Outer wrapper — px-6 py-3 produces the ~14px spacing below banner
    <div className="px-6 py-3 shrink-0">

      {/* ── Search container ───────────────────────────────────────────────
       *  spec: bg-background-faint (#F8F8F8), rounded-full, h-62px, px-6 py-3
       *  width fills the panel content area (panel minus outer px-6 = ~830px at default)
       */}
      <div
        className="relative flex items-center gap-3 px-6 rounded-full bg-background-faint"
        style={{ height: 62 }}
      >
        {/* Magnifier icon — 16×16, text-dark-secondary, left edge */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-text-dark-secondary shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        {/* ── Folder scope chip ──────────────────────────────────────────────
         *  Appears when a folder panel is open and search is scoped to it.
         *  spec: chip with folder icon + folder name + X button
         *        bg-background-primary-selected, border-primary-30, text-accent-eden
         */}
        {folderName && (
          <div
            className="flex items-center gap-1 shrink-0 rounded-md border px-2 py-0.5 text-xs"
            style={{
              background:  'rgb(236,240,237)',  // bg-background-primary-selected
              borderColor: 'rgb(179,191,183)',  // border-primary-30
              color:       'rgb(57,98,77)',      // text-accent-eden
            }}
          >
            {/* Folder icon — small, inherits text-accent-eden */}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>

            <span className="max-w-[140px] truncate">{folderName}</span>

            <button
              onClick={onClearFolder}
              className="ml-0.5 transition-colors hover:text-accent-primary"
              aria-label="Clear folder scope"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Text input ────────────────────────────────────────────────────
         *  spec: font-size 18px, color text-dark-primary
         *        placeholder "Search anything...", bg transparent
         */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search anything..."
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-[18px] text-text-dark-primary placeholder:text-text-dark-secondary/50"
          style={{ height: 28 }}
        />

        {/* Clear ×  button — appears when there is text */}
        {value && (
          <button
            onClick={() => onChange('')}
            className="shrink-0 p-1 rounded-full hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
            aria-label="Clear search"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Filter tabs ───────────────────────────────────────────────────
       *  spec: h-30px, rounded-full, gap 8px, font-size 12px
       *  active (any):   bg rgb(236,240,237)  border rgb(179,191,183) color rgb(57,98,77)
       *  inactive hover:
       *    All / Notes → green  (same as active colours)
       *    Trash       → raspberry bg/text
       */}
      <div className="flex items-center gap-2 mt-3">
        <Tab tab="all"   activeTab={activeTab} onTabChange={onTabChange} />
        <Tab tab="notes" activeTab={activeTab} onTabChange={onTabChange} />
        <Tab tab="trash" activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </div>
  )
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

const TAB_LABELS: Record<string, string> = {
  all:   'All results',
  notes: 'Notes',
  trash: 'Trash',
}

function Tab({
  tab,
  activeTab,
  onTabChange,
}: {
  tab: 'all' | 'notes' | 'trash'
  activeTab: 'all' | 'notes' | 'trash'
  onTabChange: (t: 'all' | 'notes' | 'trash') => void
}) {
  const active = activeTab === tab

  /*
   * Class strategy:
   *   active            → green bg/border/text, no hover change needed
   *   inactive (all/notes) → transparent → hover green
   *   inactive (trash)     → transparent → hover raspberry
   */
  const cls = buildTabClass(tab, active)

  return (
    <button
      onClick={() => onTabChange(tab)}
      className={cls}
      style={{ height: 30 }}
    >
      {tab === 'notes' && <NoteIcon />}
      {tab === 'trash' && <TrashIcon />}
      {TAB_LABELS[tab]}
    </button>
  )
}

function buildTabClass(tab: string, active: boolean): string {
  const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors cursor-pointer'

  if (active) {
    // Active state — same for all tabs
    return [
      base,
      'bg-[rgb(236,240,237)]',
      'border-[rgb(179,191,183)]',
      'text-[rgb(57,98,77)]',
    ].join(' ')
  }

  if (tab === 'trash') {
    // Trash inactive — hover raspberry
    return [
      base,
      'bg-transparent',
      'border-neutral-dark-20',
      'text-text-dark-secondary',
      'hover:bg-accent-raspberry/10',
      'hover:border-accent-raspberry/30',
      'hover:text-accent-raspberry',
    ].join(' ')
  }

  // All results / Notes inactive — hover green
  return [
    base,
    'bg-transparent',
    'border-neutral-dark-20',
    'text-text-dark-secondary',
    'hover:bg-[rgb(236,240,237)]',
    'hover:border-[rgb(179,191,183)]',
    'hover:text-[rgb(57,98,77)]',
  ].join(' ')
}

// ─── Tab icons (16×16 per spec) ──────────────────────────────────────────────

function NoteIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
