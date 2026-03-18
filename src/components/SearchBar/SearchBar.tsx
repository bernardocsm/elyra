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
    <div className="px-6 py-4 shrink-0">
      {/* Search input — h-[62px], rounded-full, bg-background-faint */}
      <div className="relative flex items-center gap-3 px-6 rounded-full bg-background-faint" style={{ height: 62 }}>
        {/* Search icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dark-secondary shrink-0">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>

        {/* Folder scope chip */}
        {folderName && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-background-primary-selected border border-primary-30 text-accent-eden text-xs shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="max-w-[100px] truncate">{folderName}</span>
            <button
              onClick={onClearFolder}
              className="ml-0.5 hover:text-accent-primary transition-colors"
              aria-label="Clear folder scope"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search anything..."
          className="flex-1 bg-transparent border-none outline-none text-[18px] text-text-dark-primary placeholder:text-text-dark-secondary/60"
        />

        {/* Clear button */}
        {value && (
          <button
            onClick={() => onChange('')}
            className="shrink-0 p-1 rounded-full hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mt-3">
        {(['all', 'notes', 'trash'] as const).map((tab) => {
          const active = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
              style={{
                height: 30,
                background: active ? 'rgb(236,240,237)' : 'transparent',
                borderColor: active ? 'rgb(179,191,183)' : 'rgba(39,37,35,0.2)',
                color: active ? 'rgb(57,98,77)' : 'rgb(104,103,100)',
              }}
            >
              {tab === 'notes' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              )}
              {tab === 'trash' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              )}
              {tab === 'all' ? 'All results' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
