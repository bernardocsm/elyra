// SettingsModal — spec:
//   Fullscreen modal with left sidebar nav + right scrollable content.
//   Tabs: Account | Preferences | Workspace | Billing
//
//   Account tab:
//     Account section : Name, Email, Support access toggle, Open help center
//     Import section  : import data option
//
//   Preferences tab:
//     APPEARANCE → Theme: Light / Dark / System
//     SIDEBAR    → Hover to reveal sidebar (toggle) + Auto-collapse folders (toggle)
//     EDITOR     → Auto-close brackets (toggle)
//     FONTS      → Heading font (Serif/Sans) + Body font (Serif/Sans)
//
//   Workspace tab:
//     Workspace section : Name & Icon, Usage (Storage + AI Credits), Members table
//     + Add member button
//     Snippets / Data sections (stubs)
//
//   Billing tab:
//     Plans (Free highlighted, paid options)

import { useState } from 'react'
import { useStore } from '../../store/workspace'
import { supabase } from '../../lib/supabase'

type Tab = 'account' | 'preferences' | 'workspace' | 'billing'

const NAV: { id: Tab; label: string }[] = [
  { id: 'account',     label: 'Account' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'workspace',   label: 'Workspace' },
  { id: 'billing',     label: 'Billing' },
]

export default function SettingsModal() {
  const { settingsOpen, setSettingsOpen, user, workspace } = useStore()
  const [tab, setTab] = useState<Tab>('account')

  if (!settingsOpen) return null

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[500] bg-black/20 backdrop-blur-[2px] flex items-center justify-center"
      onClick={() => setSettingsOpen(false)}
    >
      {/* Modal */}
      <div
        className="relative flex bg-background-main rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: 800, height: 580, maxWidth: '95vw', maxHeight: '92vh', minHeight: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Left nav ───────────────────────────────────────────────────── */}
        <nav
          className="shrink-0 flex flex-col py-6 px-3 border-r border-divider bg-background-page overflow-y-auto min-h-0"
          style={{ width: 200 }}
        >
          <p className="px-3 mb-4 text-xs font-semibold text-text-dark-secondary uppercase tracking-wider">
            Settings
          </p>
          {NAV.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-0.5',
                tab === id
                  ? 'bg-background-primary-selected text-accent-eden font-medium'
                  : 'text-text-dark-secondary hover:bg-neutral-dark-5',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* ── Right content ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-10 py-8 min-w-0">
          {/* Close button */}
          <button
            onClick={() => setSettingsOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
            title="Close settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {tab === 'account'     && <AccountTab     user={user} />}
          {tab === 'preferences' && <PreferencesTab />}
          {tab === 'workspace'   && <WorkspaceTab   workspace={workspace} user={user} />}
          {tab === 'billing'     && <BillingTab />}
        </div>
      </div>
    </div>
  )
}

// ─── Section heading helper ───────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dark-secondary mb-4">
      {children}
    </p>
  )
}

function Row({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-divider last:border-b-0">
      <div className="min-w-0 mr-6">
        <p className="text-sm text-text-dark-primary">{label}</p>
        {sublabel && <p className="text-xs text-text-dark-secondary mt-0.5">{sublabel}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ─── Toggle helper (same as PanelHeader's Toggle) ─────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative shrink-0 transition-colors duration-200"
      style={{ width: 32, height: 18, borderRadius: 9999, background: value ? '#39624D' : 'rgba(39,37,35,0.2)' }}
      role="switch"
      aria-checked={value}
    >
      <span
        className="absolute top-0.5 transition-all duration-200"
        style={{
          width: 14, height: 14, borderRadius: 9999,
          background: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
          left: value ? 16 : 2,
        }}
      />
    </button>
  )
}

// ─── Account tab ─────────────────────────────────────────────────────────────

function AccountTab({ user }: { user: any }) {
  const [supportAccess, setSupportAccess] = useState(false)

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-dark-primary mb-6">Account</h2>

      {/* Account section */}
      <div className="mb-8">
        <SectionHeading>Account</SectionHeading>
        <div className="rounded-xl border border-divider overflow-hidden">
          <Row label="Name">
            <span className="text-sm text-text-dark-secondary">{user?.user_metadata?.name ?? '—'}</span>
          </Row>
          <Row label="Email">
            <span className="text-sm text-text-dark-secondary">{user?.email ?? '—'}</span>
          </Row>
          <Row
            label="Support access"
            sublabel="Allow the Eden team to access your workspace to help debug issues."
          >
            <Toggle value={supportAccess} onChange={setSupportAccess} />
          </Row>
          <Row label="Help center" sublabel="Documentation and guides">
            <button className="text-xs px-3 py-1.5 rounded-lg border border-divider hover:bg-neutral-dark-5 transition-colors text-text-dark-secondary">
              Open help center
            </button>
          </Row>
        </div>
      </div>

      {/* Import section */}
      <div className="mb-8">
        <SectionHeading>Import</SectionHeading>
        <div className="rounded-xl border border-divider overflow-hidden">
          <Row label="Import data" sublabel="Bring in content from Notion, Markdown files, and more">
            <button className="text-xs px-3 py-1.5 rounded-lg border border-divider hover:bg-neutral-dark-5 transition-colors text-text-dark-secondary">
              Import
            </button>
          </Row>
        </div>
      </div>

      {/* Danger zone */}
      <div>
        <SectionHeading>Danger zone</SectionHeading>
        <div className="rounded-xl border border-divider overflow-hidden">
          <Row label="Sign out" sublabel="Sign out of your account on this device">
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-xs px-3 py-1.5 rounded-lg border border-accent-raspberry/40 hover:bg-accent-raspberry/10 transition-colors text-accent-raspberry"
            >
              Sign out
            </button>
          </Row>
        </div>
      </div>
    </div>
  )
}

// ─── Preferences tab ──────────────────────────────────────────────────────────

function PreferencesTab() {
  const [theme, setTheme]               = useState<'light'|'dark'|'system'>('light')
  const [hoverReveal, setHoverReveal]   = useState(true)
  const [autoCollapse, setAutoCollapse] = useState(true)
  const [autoBrackets, setAutoBrackets] = useState(true)
  const [headingFont, setHeadingFont]   = useState<'serif'|'sans'>('sans')
  const [bodyFont, setBodyFont]         = useState<'serif'|'sans'>('sans')

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-dark-primary mb-6">Preferences</h2>

      {/* Appearance */}
      <div className="mb-8">
        <SectionHeading>Appearance</SectionHeading>
        <div className="rounded-xl border border-divider overflow-hidden">
          <Row label="Theme" sublabel="Choose how Eden looks to you">
            <div className="flex gap-1.5">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="px-3 py-1 rounded-lg text-xs transition-colors border"
                  style={{
                    background:  theme === t ? 'rgb(236,240,237)' : 'transparent',
                    borderColor: theme === t ? 'rgb(179,191,183)' : 'rgba(39,37,35,0.2)',
                    color:       theme === t ? 'rgb(57,98,77)' : 'rgb(104,103,100)',
                    fontWeight:  theme === t ? 500 : 400,
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </Row>
        </div>
      </div>

      {/* Sidebar */}
      <div className="mb-8">
        <SectionHeading>Sidebar</SectionHeading>
        <div className="rounded-xl border border-divider overflow-hidden">
          <Row label="Hover to reveal sidebar" sublabel="Move cursor to left edge to temporarily show sidebar">
            <Toggle value={hoverReveal} onChange={setHoverReveal} />
          </Row>
          <Row label="Auto-collapse folders" sublabel="Collapse folder tree when switching to another folder">
            <Toggle value={autoCollapse} onChange={setAutoCollapse} />
          </Row>
        </div>
      </div>

      {/* Editor */}
      <div className="mb-8">
        <SectionHeading>Editor</SectionHeading>
        <div className="rounded-xl border border-divider overflow-hidden">
          <Row label="Auto-close brackets" sublabel="Automatically insert closing bracket, quote, or parenthesis">
            <Toggle value={autoBrackets} onChange={setAutoBrackets} />
          </Row>
        </div>
      </div>

      {/* Fonts */}
      <div className="mb-8">
        <SectionHeading>Fonts</SectionHeading>
        <div className="rounded-xl border border-divider overflow-hidden">
          <Row label="Heading font">
            <FontPicker value={headingFont} onChange={setHeadingFont} />
          </Row>
          <Row label="Body font">
            <FontPicker value={bodyFont} onChange={setBodyFont} />
          </Row>
        </div>
      </div>
    </div>
  )
}

function FontPicker({ value, onChange }: { value: 'serif'|'sans'; onChange: (v: 'serif'|'sans') => void }) {
  return (
    <div className="flex gap-1.5">
      {(['sans', 'serif'] as const).map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className="px-3 py-1 rounded-lg text-xs border transition-colors"
          style={{
            background:  value === f ? 'rgb(236,240,237)' : 'transparent',
            borderColor: value === f ? 'rgb(179,191,183)' : 'rgba(39,37,35,0.2)',
            color:       value === f ? 'rgb(57,98,77)' : 'rgb(104,103,100)',
            fontFamily:  f === 'serif' ? 'Georgia, serif' : 'inherit',
          }}
        >
          {f === 'sans' ? 'Sans Serif' : 'Serif'}
        </button>
      ))}
    </div>
  )
}

// ─── Workspace tab ────────────────────────────────────────────────────────────

function WorkspaceTab({ workspace, user }: { workspace: any; user: any }) {
  const [workspaceName, setWorkspaceName] = useState(workspace?.name ?? '')

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-dark-primary mb-6">Workspace</h2>

      {/* Workspace identity */}
      <div className="mb-8">
        <SectionHeading>Workspace</SectionHeading>
        <div className="rounded-xl border border-divider overflow-hidden">
          <Row label="Name & Icon">
            <div className="flex items-center gap-2">
              <span className="text-lg">{workspace?.icon ?? '🌿'}</span>
              <input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="text-sm border border-divider rounded-lg px-2.5 py-1.5 bg-background-faint outline-none focus:border-accent-eden transition-colors"
                style={{ width: 160 }}
              />
            </div>
          </Row>
        </div>
      </div>

      {/* Usage */}
      <div className="mb-8">
        <SectionHeading>Usage</SectionHeading>
        <div className="rounded-xl border border-divider overflow-hidden">
          <Row label="Storage used">
            <div className="text-right">
              <p className="text-sm text-text-dark-primary">0 MB</p>
              <p className="text-xs text-text-dark-secondary">of 5 GB free</p>
            </div>
          </Row>
          <Row label="AI Credits">
            <div className="text-right">
              <p className="text-sm text-text-dark-primary">—</p>
              <p className="text-xs text-text-dark-secondary">Free plan</p>
            </div>
          </Row>
        </div>
      </div>

      {/* Members */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <SectionHeading>Members</SectionHeading>
          <button className="text-xs px-3 py-1.5 rounded-lg bg-accent-eden text-white hover:bg-accent-primary transition-colors">
            + Add member
          </button>
        </div>
        <div className="rounded-xl border border-divider overflow-hidden">
          {/* Table header */}
          <div className="grid px-4 py-2 bg-background-page border-b border-divider text-[11px] uppercase tracking-wider text-text-dark-secondary font-medium"
            style={{ gridTemplateColumns: '1fr 80px 1fr 100px 80px' }}>
            <span>User</span><span>Role</span><span>Email</span><span>Joined</span><span></span>
          </div>
          {/* Current user row */}
          <div className="grid items-center px-4 py-3 text-sm"
            style={{ gridTemplateColumns: '1fr 80px 1fr 100px 80px' }}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-accent-eden flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                {user?.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="truncate text-text-dark-primary">{user?.user_metadata?.name ?? 'You'}</span>
            </div>
            <span className="text-text-dark-secondary text-xs">Owner</span>
            <span className="text-text-dark-secondary truncate text-xs">{user?.email}</span>
            <span className="text-text-dark-secondary text-xs">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            </span>
            <span className="text-xs text-text-dark-secondary">—</span>
          </div>
        </div>
      </div>

      {/* Snippets */}
      <div className="mb-8">
        <SectionHeading>Snippets</SectionHeading>
        <div className="rounded-xl border border-divider p-8 text-center text-sm text-text-dark-secondary">
          No snippets yet. Snippets let you insert reusable text with a short keyword.
        </div>
      </div>

      {/* Data */}
      <div className="mb-8">
        <SectionHeading>Data</SectionHeading>
        <div className="rounded-xl border border-divider overflow-hidden">
          <Row label="Export workspace" sublabel="Download all your data as a zip archive">
            <button className="text-xs px-3 py-1.5 rounded-lg border border-divider hover:bg-neutral-dark-5 transition-colors text-text-dark-secondary">
              Export
            </button>
          </Row>
        </div>
      </div>
    </div>
  )
}

// ─── Billing tab ──────────────────────────────────────────────────────────────

function BillingTab() {
  const plans = [
    { name: 'Free',       price: '$0',  period: '/month', features: ['5 GB storage', 'Basic AI credits', '1 workspace'],     current: true },
    { name: 'Pro',        price: '$12', period: '/month', features: ['50 GB storage', 'Unlimited AI credits', '5 workspaces'], current: false },
    { name: 'Team',       price: '$20', period: '/user/month', features: ['200 GB storage', 'Team AI credits', 'Unlimited workspaces'], current: false },
  ]

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-dark-primary mb-6">Billing</h2>

      <div className="mb-6">
        <SectionHeading>Current plan</SectionHeading>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="rounded-xl border p-4"
              style={{
                borderColor: plan.current ? 'rgb(57,98,77)' : 'rgba(39,37,35,0.15)',
                background:  plan.current ? 'rgb(236,240,237)' : 'white',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm text-text-dark-primary">{plan.name}</p>
                {plan.current && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-eden text-white font-medium">
                    Current
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-text-dark-primary mb-1">
                {plan.price}
                <span className="text-xs font-normal text-text-dark-secondary">{plan.period}</span>
              </p>
              <ul className="space-y-1 mt-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-text-dark-secondary">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#39624D" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              {!plan.current && (
                <button className="mt-4 w-full py-1.5 rounded-lg text-xs bg-accent-eden text-white hover:bg-accent-primary transition-colors">
                  Upgrade
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
