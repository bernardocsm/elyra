# Eden Clone Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a pixel-perfect, fully functional clone of the Eden workspace UI with React + Vite + Tailwind + Supabase.

**Architecture:** Single-page app with React Router v6, Zustand for state, Supabase for auth/data/realtime. All items (folders, notes, canvas) stored in a single unified `items` table with RLS. UI is driven by flat item list in Zustand, filtered client-side.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS v3, React Router v6, Zustand, Supabase JS v2, @tanstack/react-virtual, TipTap, React Hot Toast

---

## Task 1: Scaffold Vite + React + TypeScript project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`

**Step 1: Initialize project**
```bash
cd /c/Users/berna/OneDrive/Desktop/elyra
npm create vite@latest . -- --template react-ts
```
Expected: Vite project files created in current directory.

**Step 2: Install all dependencies**
```bash
npm install
npm install react-router-dom@6 zustand @supabase/supabase-js @tanstack/react-virtual @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-placeholder react-hot-toast date-fns
npm install -D tailwindcss@3 postcss autoprefixer @types/node
npx tailwindcss init -p
```

**Step 3: Configure tailwind.config.ts**
Replace content of `tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'text-dark-primary':   '#272523',
        'text-dark-secondary': '#686764',
        'background-main':     '#FFFFFF',
        'background-page':     '#F6F6F6',
        'background-faint':    '#F8F8F8',
        'accent-eden':         '#39624D',
        'accent-primary':      '#09321F',
        'primary-30':          '#B3BFB7',
        'background-primary-selected': '#ECF0ED',
        'accent-raspberry':    '#CC768D',
        'neutral-dark-5':      'rgba(39,37,35,0.05)',
        'neutral-dark-20':     'rgba(39,37,35,0.2)',
        'divider':             'rgba(39,37,35,0.1)',
        'accent-orange':       '#D97706',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        'sidebar': 'cubic-bezier(0.23,1,0.32,1)',
      },
      transitionDuration: {
        '500': '500ms',
      },
      boxShadow: {
        'sm':  '0 1px 2px 0 rgba(0,0,0,0.05)',
        'xl':  '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        '2xl': '0 25px 50px -12px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
}

export default config
```

**Step 4: Replace `src/index.css`**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }
body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #F6F6F6; }
```

**Step 5: Verify dev server starts**
```bash
npm run dev
```
Expected: `http://localhost:5173` loads default Vite page.

**Step 6: Commit**
```bash
git init
git add .
git commit -m "feat: scaffold vite react ts project with tailwind"
```

---

## Task 2: Supabase schema setup

**Files:**
- Create: `supabase/schema.sql`
- Create: `src/lib/supabase.ts`

**Step 1: Create schema file**
Create `supabase/schema.sql`:
```sql
-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Workspaces: one per user
create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  name        text not null default 'My Workspace',
  icon        text not null default '🌿',
  cover_type  text not null default 'silk',
  cover_value text not null default '#3A5448',
  created_at  timestamptz not null default now()
);

alter table workspaces enable row level security;

create policy "Users can manage own workspace"
  on workspaces for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Items: folders, notes, canvas
create table items (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  parent_id    uuid references items(id) on delete cascade,
  type         text not null check (type in ('folder','note','canvas')),
  name         text not null,
  content      jsonb,
  color        text not null default '#527160',
  is_pinned    bool not null default false,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table items enable row level security;

create policy "Users can manage own items"
  on items for all
  using (
    exists (
      select 1 from workspaces w
      where w.id = workspace_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workspaces w
      where w.id = workspace_id and w.user_id = auth.uid()
    )
  );

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger items_updated_at
  before update on items
  for each row execute procedure update_updated_at();

-- Recents: last accessed items per user
create table recents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  item_id     uuid references items(id) on delete cascade not null,
  accessed_at timestamptz not null default now(),
  unique(user_id, item_id)
);

alter table recents enable row level security;

create policy "Users can manage own recents"
  on recents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

**Step 2: Run schema in Supabase**
- Go to https://supabase.com/dashboard → your project → SQL Editor
- Paste the contents of `supabase/schema.sql` and click Run
- Expected: tables `workspaces`, `items`, `recents` created with RLS enabled

**Step 3: Enable Realtime on items table**
- In Supabase dashboard → Database → Replication
- Enable Realtime for `items` table

**Step 4: Create `src/lib/supabase.ts`**
```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://jcnttuhykknyfkzmmkug.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjbnR0dWh5a2tueWZrem1ta3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTQxNTgsImV4cCI6MjA4OTM3MDE1OH0.tTd_QgJblZOXFrs6rjUT0a8IfDGTFAyNxSqJic-2TDQ'
)
```

**Step 5: Commit**
```bash
git add .
git commit -m "feat: supabase schema and client setup"
```

---

## Task 3: TypeScript types

**Files:**
- Create: `src/types.ts`

**Step 1: Create types**
```ts
// src/types.ts
export type ItemType = 'folder' | 'note' | 'canvas'

export interface Workspace {
  id: string
  user_id: string
  name: string
  icon: string
  cover_type: 'silk' | 'solid' | 'gradient' | 'image'
  cover_value: string
  created_at: string
}

export interface Item {
  id: string
  workspace_id: string
  parent_id: string | null
  type: ItemType
  name: string
  content: any
  color: string
  is_pinned: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface Recent {
  id: string
  user_id: string
  item_id: string
  accessed_at: string
  item?: Item
}

export interface Panel {
  id: string
  type: 'root' | 'folder' | 'note' | 'canvas' | 'trash' | 'library' | 'ai'
  itemId?: string
}
```

**Step 2: Commit**
```bash
git add .
git commit -m "feat: add typescript types"
```

---

## Task 4: Zustand store

**Files:**
- Create: `src/store/workspace.ts`

**Step 1: Create store**
```ts
// src/store/workspace.ts
import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { Workspace, Item, Panel } from '../types'

interface ContextMenu {
  x: number
  y: number
  itemId: string | null
  isBackground?: boolean
}

interface WorkspaceStore {
  // Auth
  user: User | null
  setUser: (user: User | null) => void

  // Workspace
  workspace: Workspace | null
  setWorkspace: (w: Workspace | null) => void

  // Items
  items: Item[]
  setItems: (items: Item[]) => void
  addItem: (item: Item) => void
  updateItem: (id: string, updates: Partial<Item>) => void
  removeItem: (id: string) => void

  // Recents (item ids, newest first)
  recentIds: string[]
  setRecentIds: (ids: string[]) => void
  addRecent: (id: string) => void

  // Layout
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  sidebarMode: 'workspace' | 'ai' | 'library'
  setSidebarMode: (mode: 'workspace' | 'ai' | 'library') => void
  expandedFolders: string[]
  toggleFolder: (id: string) => void

  // Panels
  panels: Panel[]
  activePanelId: string
  openPanel: (panel: Omit<Panel, 'id'>) => void
  closePanel: (id: string) => void
  setActivePanel: (id: string) => void

  // UI state
  selectedItems: string[]
  toggleSelectItem: (id: string) => void
  clearSelection: () => void
  contextMenu: ContextMenu | null
  setContextMenu: (menu: ContextMenu | null) => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
  sortBy: 'name' | 'modified' | 'created' | 'type'
  setSortBy: (sort: 'name' | 'modified' | 'created' | 'type') => void
  cardSize: 'S' | 'M' | 'L'
  setCardSize: (size: 'S' | 'M' | 'L') => void
}

let panelCounter = 1

export const useStore = create<WorkspaceStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  workspace: null,
  setWorkspace: (workspace) => set({ workspace }),

  items: [],
  setItems: (items) => set({ items }),
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  updateItem: (id, updates) =>
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)) })),
  removeItem: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  recentIds: [],
  setRecentIds: (ids) => set({ recentIds: ids }),
  addRecent: (id) =>
    set((s) => ({ recentIds: [id, ...s.recentIds.filter((r) => r !== id)].slice(0, 10) })),

  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  sidebarMode: 'workspace',
  setSidebarMode: (sidebarMode) => set({ sidebarMode }),
  expandedFolders: [],
  toggleFolder: (id) =>
    set((s) => ({
      expandedFolders: s.expandedFolders.includes(id)
        ? s.expandedFolders.filter((f) => f !== id)
        : [...s.expandedFolders, id],
    })),

  panels: [{ id: 'main', type: 'root' }],
  activePanelId: 'main',
  openPanel: (panel) =>
    set((s) => {
      const id = `panel-${panelCounter++}`
      return { panels: [...s.panels, { ...panel, id }], activePanelId: id }
    }),
  closePanel: (id) =>
    set((s) => {
      const panels = s.panels.filter((p) => p.id !== id)
      return {
        panels: panels.length > 0 ? panels : [{ id: 'main', type: 'root' }],
        activePanelId: panels[panels.length - 1]?.id ?? 'main',
      }
    }),
  setActivePanel: (activePanelId) => set({ activePanelId }),

  selectedItems: [],
  toggleSelectItem: (id) =>
    set((s) => ({
      selectedItems: s.selectedItems.includes(id)
        ? s.selectedItems.filter((i) => i !== id)
        : [...s.selectedItems, id],
    })),
  clearSelection: () => set({ selectedItems: [] }),
  contextMenu: null,
  setContextMenu: (contextMenu) => set({ contextMenu }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  viewMode: 'grid',
  setViewMode: (viewMode) => set({ viewMode }),
  sortBy: 'created',
  setSortBy: (sortBy) => set({ sortBy }),
  cardSize: 'M',
  setCardSize: (cardSize) => set({ cardSize }),
}))
```

**Step 2: Commit**
```bash
git add .
git commit -m "feat: zustand store"
```

---

## Task 5: Auth hooks + routing shell

**Files:**
- Create: `src/hooks/useAuth.ts`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

**Step 1: Create useAuth hook**
```ts
// src/hooks/useAuth.ts
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/workspace'

export function useAuth() {
  const { user, setUser, setWorkspace, setItems, setRecentIds } = useStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) {
          await ensureWorkspace(u.id)
        } else {
          setWorkspace(null)
          setItems([])
          setRecentIds([])
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user }
}

async function ensureWorkspace(userId: string) {
  const store = useStore.getState()
  let { data: ws } = await supabase
    .from('workspaces')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!ws) {
    const { data: newWs } = await supabase
      .from('workspaces')
      .insert({ user_id: userId })
      .select()
      .single()
    ws = newWs
  }

  if (ws) {
    store.setWorkspace(ws)
    // Load items
    const { data: items } = await supabase
      .from('items')
      .select('*')
      .eq('workspace_id', ws.id)
      .order('position')
    store.setItems(items ?? [])

    // Load recents
    const { data: recents } = await supabase
      .from('recents')
      .select('item_id')
      .eq('user_id', userId)
      .order('accessed_at', { ascending: false })
      .limit(10)
    store.setRecentIds(recents?.map((r) => r.item_id) ?? [])
  }
}
```

**Step 2: Create App.tsx with routing**
```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { useStore } from './store/workspace'
import Login from './pages/Login'
import Workspace from './pages/Workspace'

function AppRoutes() {
  useAuth()
  const { user, workspace } = useStore()

  if (user === null) return <Login />
  if (!workspace) return <div className="flex items-center justify-center h-screen text-text-dark-secondary">Loading...</div>

  return (
    <Routes>
      <Route path="/login" element={<Navigate to={`/workspace/${workspace.id}`} replace />} />
      <Route path="/workspace/:workspaceId" element={<Workspace />} />
      <Route path="/workspace/:workspaceId/folder/:folderId" element={<Workspace />} />
      <Route path="*" element={<Navigate to={`/workspace/${workspace.id}`} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster position="bottom-right" />
    </BrowserRouter>
  )
}
```

**Step 3: Update main.tsx**
```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Step 4: Commit**
```bash
git add .
git commit -m "feat: auth hooks and routing shell"
```

---

## Task 6: Login page

**Files:**
- Create: `src/pages/Login.tsx`

**Step 1: Create login page**
```tsx
// src/pages/Login.tsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success('Account created! Check your email.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-page flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-semibold text-text-dark-primary">eden</span>
          </div>
          <p className="text-sm text-text-dark-secondary">
            {isSignUp ? 'Create your workspace' : 'Sign in to your workspace'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-background-main rounded-xl border border-divider p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs text-text-dark-secondary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-divider text-sm text-text-dark-primary bg-background-faint focus:outline-none focus:border-accent-eden transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs text-text-dark-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-divider text-sm text-text-dark-primary bg-background-faint focus:outline-none focus:border-accent-eden transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-full bg-accent-eden text-white text-sm font-medium hover:bg-accent-primary transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-text-dark-secondary mt-4">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-accent-eden hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Verify login page renders at `http://localhost:5173`**
```bash
npm run dev
```
Expected: Login form with email + password fields, Eden logo.

**Step 3: Commit**
```bash
git add .
git commit -m "feat: login page with supabase auth"
```

---

## Task 7: Perlin noise utility

**Files:**
- Create: `src/lib/noise.ts`

**Step 1: Create noise utility**
```ts
// src/lib/noise.ts
// Simple value noise for banner texture

function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10) }
function lerp(a: number, b: number, t: number) { return a + t * (b - a) }

function grad(hash: number, x: number, y: number) {
  const h = hash & 3
  const u = h < 2 ? x : y
  const v = h < 2 ? y : x
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v)
}

const p = new Uint8Array(512)
const perm = new Uint8Array(256)
for (let i = 0; i < 256; i++) perm[i] = i
for (let i = 255; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [perm[i], perm[j]] = [perm[j], perm[i]]
}
for (let i = 0; i < 512; i++) p[i] = perm[i & 255]

export function noise2d(x: number, y: number): number {
  const X = Math.floor(x) & 255
  const Y = Math.floor(y) & 255
  x -= Math.floor(x)
  y -= Math.floor(y)
  const u = fade(x)
  const v = fade(y)
  const a = p[X] + Y
  const b = p[X + 1] + Y
  return lerp(
    lerp(grad(p[a], x, y), grad(p[b], x - 1, y), u),
    lerp(grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1), u),
    v
  )
}

export type SilkColor = {
  label: string
  base: [number, number, number]
}

export const SILK_COLORS: SilkColor[] = [
  { label: 'Forest',  base: [58, 84, 72] },
  { label: 'Ocean',   base: [45, 85, 130] },
  { label: 'Lavender',base: [100, 75, 150] },
  { label: 'Rose',    base: [180, 80, 110] },
  { label: 'Copper',  base: [130, 85, 60] },
  { label: 'Rust',    base: [160, 90, 50] },
  { label: 'Gold',    base: [160, 130, 60] },
  { label: 'Slate',   base: [90, 95, 105] },
]

export const SOLID_COLORS = [
  '#CC768D', '#D17866', '#DCAB6F', '#39624D',
  '#5B82B5', '#9C7FC1', '#AC8472', '#383441',
]

export const GRADIENT_COLORS = [
  'linear-gradient(135deg, #5B82B5, #9C7FC1)',
  'linear-gradient(135deg, #CC768D, #D17866)',
  'linear-gradient(135deg, #5BC8C8, #39624D)',
  'linear-gradient(135deg, #39624D, #8BC87A)',
  'linear-gradient(135deg, #CC768D, #DCAB6F)',
  'linear-gradient(135deg, #F5F5F0, #FFFFFF)',
  'linear-gradient(135deg, #9C7FC1, #CC768D)',
  'linear-gradient(135deg, #5B82B5, #5BC8C8)',
  'linear-gradient(135deg, #DCAB6F, #FFFFFF)',
  'linear-gradient(135deg, #AAAAAA, #FFFFFF)',
]

export function drawSilkBanner(
  canvas: HTMLCanvasElement,
  base: [number, number, number]
) {
  const ctx = canvas.getContext('2d')!
  const { width, height } = canvas
  const imageData = ctx.createImageData(width, height)
  const data = imageData.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / width * 4
      const ny = y / height * 4
      const n = noise2d(nx, ny) * 0.5 + 0.5
      const variation = Math.round((n - 0.5) * 30)
      const idx = (y * width + x) * 4
      data[idx]     = Math.max(0, Math.min(255, base[0] + variation))
      data[idx + 1] = Math.max(0, Math.min(255, base[1] + variation))
      data[idx + 2] = Math.max(0, Math.min(255, base[2] + variation))
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(imageData, 0, 0)
}
```

**Step 2: Commit**
```bash
git add .
git commit -m "feat: perlin noise utility for banner"
```

---

## Task 8: Banner component

**Files:**
- Create: `src/components/Banner/Banner.tsx`
- Create: `src/components/Banner/CoverPicker.tsx`
- Create: `src/components/Banner/index.ts`

**Step 1: Create Banner.tsx**
```tsx
// src/components/Banner/Banner.tsx
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/workspace'
import { drawSilkBanner, SILK_COLORS } from '../../lib/noise'
import { supabase } from '../../lib/supabase'
import CoverPicker from './CoverPicker'

export default function Banner() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { workspace, setWorkspace } = useStore()
  const [hovered, setHovered] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    renderBanner()
  }, [workspace?.cover_type, workspace?.cover_value])

  function renderBanner() {
    if (!canvasRef.current || !workspace) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!

    if (workspace.cover_type === 'silk') {
      const silkIdx = SILK_COLORS.findIndex(c => c.label === workspace.cover_value)
      const color = silkIdx >= 0 ? SILK_COLORS[silkIdx].base : SILK_COLORS[0].base
      drawSilkBanner(canvas, color)
    } else if (workspace.cover_type === 'solid') {
      ctx.fillStyle = workspace.cover_value
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else if (workspace.cover_type === 'gradient') {
      const match = workspace.cover_value.match(/linear-gradient\(135deg,\s*([^,]+),\s*([^)]+)\)/)
      if (match) {
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
        grad.addColorStop(0, match[1].trim())
        grad.addColorStop(1, match[2].trim())
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    } else if (workspace.cover_type === 'image') {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      img.src = workspace.cover_value
    }
  }

  async function updateCover(type: string, value: string) {
    if (!workspace) return
    const { data } = await supabase
      .from('workspaces')
      .update({ cover_type: type, cover_value: value })
      .eq('id', workspace.id)
      .select()
      .single()
    if (data) setWorkspace(data)
    setPickerOpen(false)
  }

  async function removeCover() {
    await updateCover('silk', 'Forest')
  }

  return (
    <div
      className="relative w-full h-48 transition-[height] duration-200 shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPickerOpen(false) }}
    >
      <canvas
        ref={canvasRef}
        width={920}
        height={192}
        className="w-full h-full object-cover"
      />

      {/* Change cover button */}
      {hovered && (
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer bg-background-main/90 hover:bg-background-main text-text-dark-secondary hover:text-text-dark-primary text-xs border border-divider shadow-sm transition-colors"
          style={{ height: 26 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          Change cover
        </button>
      )}

      {/* Cover picker */}
      {pickerOpen && (
        <CoverPicker
          current={{ type: workspace?.cover_type ?? 'silk', value: workspace?.cover_value ?? 'Forest' }}
          onSelect={updateCover}
          onRemove={removeCover}
        />
      )}
    </div>
  )
}
```

**Step 2: Create CoverPicker.tsx**
```tsx
// src/components/Banner/CoverPicker.tsx
import { SILK_COLORS, SOLID_COLORS, GRADIENT_COLORS } from '../../lib/noise'
import { useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/workspace'

interface Props {
  current: { type: string; value: string }
  onSelect: (type: string, value: string) => void
  onRemove: () => void
}

export default function CoverPicker({ current, onSelect, onRemove }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const { workspace } = useStore()

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !workspace) return
    const path = `covers/${workspace.id}/${Date.now()}`
    const { data } = await supabase.storage.from('workspace-covers').upload(path, file)
    if (data) {
      const { data: url } = supabase.storage.from('workspace-covers').getPublicUrl(path)
      onSelect('image', url.publicUrl)
    }
  }

  return (
    <div
      className="absolute top-12 left-3 z-[301] w-72 rounded-xl bg-background-main border border-divider shadow-xl p-3"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Silk */}
      <p className="text-[11px] text-text-dark-secondary mb-2 font-medium">Silk</p>
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {SILK_COLORS.map((c) => (
          <SilkSwatch
            key={c.label}
            color={c}
            active={current.type === 'silk' && current.value === c.label}
            onClick={() => onSelect('silk', c.label)}
          />
        ))}
      </div>

      {/* Solid */}
      <p className="text-[11px] text-text-dark-secondary mb-2 font-medium">Solid</p>
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {SOLID_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onSelect('solid', color)}
            className="h-10 rounded-lg border-2 transition-all"
            style={{
              background: color,
              borderColor: current.type === 'solid' && current.value === color ? '#09321F' : 'transparent',
            }}
          />
        ))}
      </div>

      {/* Gradients */}
      <p className="text-[11px] text-text-dark-secondary mb-2 font-medium">Gradients</p>
      <div className="grid grid-cols-5 gap-1.5 mb-3">
        {GRADIENT_COLORS.map((grad) => (
          <button
            key={grad}
            onClick={() => onSelect('gradient', grad)}
            className="h-10 rounded-lg border-2 transition-all"
            style={{
              background: grad,
              borderColor: current.type === 'gradient' && current.value === grad ? '#09321F' : 'transparent',
            }}
          />
        ))}
      </div>

      {/* Actions */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full text-left px-3 py-2 text-sm text-text-dark-secondary hover:bg-neutral-dark-5 rounded-md transition-colors"
      >
        Upload image
      </button>
      <button
        onClick={onRemove}
        className="w-full text-left px-3 py-2 text-sm text-accent-raspberry hover:bg-neutral-dark-5 rounded-md transition-colors"
      >
        Remove cover
      </button>
    </div>
  )
}

function SilkSwatch({ color, active, onClick }: { color: typeof SILK_COLORS[0]; active: boolean; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { drawSilkBanner } = require('../../lib/noise')

  useRef(() => {
    if (canvasRef.current) drawSilkBanner(canvasRef.current, color.base)
  })

  return (
    <button
      onClick={onClick}
      className="relative h-10 rounded-lg overflow-hidden border-2 transition-all"
      style={{ borderColor: active ? '#09321F' : 'transparent' }}
      ref={(el) => {
        if (el) {
          const canvas = el.querySelector('canvas') as HTMLCanvasElement
          if (canvas) {
            import('../../lib/noise').then(({ drawSilkBanner }) => drawSilkBanner(canvas, color.base))
          }
        }
      }}
    >
      <canvas width={60} height={40} className="w-full h-full" ref={canvasRef} />
      {active && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      )}
    </button>
  )
}
```

**Step 3: Create index.ts**
```ts
// src/components/Banner/index.ts
export { default } from './Banner'
```

**Step 4: Commit**
```bash
git add .
git commit -m "feat: banner canvas with perlin noise and cover picker"
```

---

## Task 9: Sidebar component

**Files:**
- Create: `src/components/Sidebar/Sidebar.tsx`
- Create: `src/components/Sidebar/SidebarItem.tsx`
- Create: `src/components/Sidebar/SidebarTree.tsx`
- Create: `src/components/Sidebar/index.ts`

**Step 1: Create SidebarItem.tsx**
```tsx
// src/components/Sidebar/SidebarItem.tsx
import { useState } from 'react'
import { useStore } from '../../store/workspace'
import type { Item } from '../../types'

interface Props {
  item: Item
  depth?: number
  onOpen: (item: Item) => void
}

export default function SidebarItem({ item, depth = 0, onOpen }: Props) {
  const { expandedFolders, toggleFolder, openPanel, items } = useStore()
  const isExpanded = expandedFolders.includes(item.id)
  const children = items.filter((i) => i.parent_id === item.id && i.type === 'folder')
  const hasChildren = children.length > 0

  return (
    <div>
      <div
        className="group/sidebar-item flex items-center gap-2 py-1.5 rounded-md cursor-pointer w-full pr-2 hover:bg-neutral-dark-5 text-sm text-text-dark-secondary transition-colors"
        style={{ paddingLeft: 16 + depth * 16 }}
        onClick={() => onOpen(item)}
        onContextMenu={(e) => {
          e.preventDefault()
          useStore.getState().setContextMenu({ x: e.clientX, y: e.clientY, itemId: item.id })
        }}
      >
        {/* Chevron */}
        {item.type === 'folder' && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleFolder(item.id) }}
            className="opacity-0 group-hover/sidebar-item:opacity-100 flex-shrink-0 transition-opacity p-0.5"
          >
            <svg
              width="12" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="transition-transform duration-200"
              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}

        {/* Folder icon */}
        <FolderIcon color={item.color} size={16} />

        {/* Name */}
        <span className="truncate flex-1 text-sm">{item.name}</span>

        {/* Hover actions */}
        {item.type === 'folder' && (
          <div className="opacity-0 group-hover/sidebar-item:opacity-100 flex items-center gap-0.5 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); openPanel({ type: 'folder', itemId: item.id }) }}
              className="p-0.75 rounded hover:bg-neutral-dark-5 text-text-dark-secondary hover:text-text-dark-primary"
              title="Open in new pane"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {children
            .sort((a, b) => a.position - b.position)
            .map((child) => (
              <SidebarItem key={child.id} item={child} depth={depth + 1} onOpen={onOpen} />
            ))}
        </div>
      )}
    </div>
  )
}

export function FolderIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
```

**Step 2: Create SidebarTree.tsx**
```tsx
// src/components/Sidebar/SidebarTree.tsx
import { useStore } from '../../store/workspace'
import SidebarItem from './SidebarItem'
import type { Item } from '../../types'

interface Props {
  onOpen: (item: Item) => void
}

export default function SidebarTree({ onOpen }: Props) {
  const { items, recentIds, workspace } = useStore()

  const recentItems = recentIds
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean) as Item[]

  const pinnedItems = items.filter((i) => i.is_pinned)
  const rootFolders = items.filter((i) => i.parent_id === null && i.type === 'folder')

  return (
    <div className="flex-1 overflow-y-auto py-2 space-y-1">
      {/* Recents */}
      {recentItems.length > 0 && (
        <section className="mb-1">
          <p className="truncate text-[12px] text-neutral-dark-60 px-[17px] mb-1" style={{ color: 'rgba(39,37,35,0.6)' }}>Recents</p>
          {recentItems.slice(0, 3).map((item) => (
            <SidebarItem key={item.id} item={item} onOpen={onOpen} />
          ))}
        </section>
      )}

      {/* Pinned */}
      {pinnedItems.length > 0 && (
        <section className="mb-1">
          <p className="truncate text-[12px] px-[17px] mb-1" style={{ color: 'rgba(39,37,35,0.6)' }}>Pinned</p>
          {pinnedItems.map((item) => (
            <SidebarItem key={item.id} item={item} onOpen={onOpen} />
          ))}
        </section>
      )}

      {/* Workspace */}
      <section>
        <div className="flex items-center justify-between px-[17px] mb-1">
          <p className="truncate text-[12px]" style={{ color: 'rgba(39,37,35,0.6)' }}>Workspace</p>
          <button
            className="p-0.5 rounded hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
            onClick={() => {/* new item */}}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        {rootFolders
          .sort((a, b) => a.position - b.position)
          .map((item) => (
            <SidebarItem key={item.id} item={item} onOpen={onOpen} />
          ))}
      </section>
    </div>
  )
}
```

**Step 3: Create Sidebar.tsx**
```tsx
// src/components/Sidebar/Sidebar.tsx
import { useStore } from '../../store/workspace'
import SidebarTree from './SidebarTree'
import { supabase } from '../../lib/supabase'
import type { Item } from '../../types'

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'ai', label: 'Eden AI', icon: SparkleIcon },
  { id: 'library', label: 'Library', icon: LibraryIcon },
]

export default function Sidebar() {
  const {
    sidebarOpen, setSidebarOpen,
    sidebarMode, setSidebarMode,
    workspace, user,
    openPanel, setCommandPaletteOpen,
  } = useStore()

  function handleOpen(item: Item) {
    openPanel({ type: item.type as any, itemId: item.id })
    useStore.getState().addRecent(item.id)
    if (user) {
      supabase.from('recents').upsert({ user_id: user.id, item_id: item.id, accessed_at: new Date().toISOString() })
    }
  }

  return (
    <div
      className="absolute select-none left-0 overflow-hidden border flex flex-col z-20 bg-background-page border-transparent h-full rounded-none ml-0"
      style={{
        width: 250,
        transition: 'transform 500ms cubic-bezier(0.23,1,0.32,1)',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-250px)',
      }}
    >
      {/* Top nav */}
      <div className="flex items-center justify-between px-2 py-2 shrink-0">
        {/* Logo + workspace name */}
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-base">{workspace?.icon ?? '🌿'}</span>
          <span className="text-sm font-medium text-text-dark-primary truncate">{workspace?.name ?? 'eden'}</span>
        </div>

        {/* New button + collapse */}
        <div className="flex items-center gap-1">
          <NewButton />
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
            title="Collapse sidebar Ctrl+D"
          >
            <CollapseIcon />
          </button>
        </div>
      </div>

      {/* Nav icons */}
      <div className="flex items-center gap-1 px-2 mb-2 shrink-0">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => id === 'home' ? setSidebarMode('workspace') : setSidebarMode(id as any)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors"
            style={{
              background: (id === 'home' ? sidebarMode === 'workspace' : sidebarMode === id) ? 'rgb(227,231,227)' : 'transparent',
              color: (id === 'home' ? sidebarMode === 'workspace' : sidebarMode === id) ? 'rgb(9,50,31)' : 'rgb(104,103,100)',
            }}
          >
            <Icon size={14} />
            {id === 'home' && <span>Home</span>}
          </button>
        ))}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="ml-auto p-1 rounded-full hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors"
          title="Search Ctrl+K"
        >
          <SearchIcon size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {sidebarMode === 'workspace' && <SidebarTree onOpen={handleOpen} />}
        {sidebarMode === 'ai' && <AISection />}
        {sidebarMode === 'library' && <LibrarySection />}
      </div>

      {/* Footer */}
      <SidebarFooter />
    </div>
  )
}

function NewButton() {
  const [open, setOpen] = useState(false)
  // implement dropdown
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors"
        style={{ background: '#ECF0ED', borderColor: '#B3BFB7', color: '#39624D', height: 26 }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New
      </button>
      {open && <NewDropdown onClose={() => setOpen(false)} />}
    </div>
  )
}

function NewDropdown({ onClose }: { onClose: () => void }) {
  const { workspace, addItem } = useStore()

  async function createItem(type: 'note' | 'folder' | 'canvas', name: string) {
    if (!workspace) return
    const count = useStore.getState().items.filter(i => i.parent_id === null).length
    const { data } = await supabase.from('items').insert({
      workspace_id: workspace.id,
      type,
      name,
      parent_id: null,
      position: count,
    }).select().single()
    if (data) addItem(data)
    onClose()
  }

  const options = [
    { label: 'New Note', type: 'note' as const, color: '#39624D', icon: '📄' },
    { label: 'New Canvas', type: 'canvas' as const, color: '#9C7FC1', icon: '⬜' },
    { label: 'New Folder', type: 'folder' as const, color: '#686764', icon: '📁' },
  ]

  return (
    <div className="absolute left-0 top-8 z-50 w-60 bg-background-main border border-divider rounded-xl shadow-xl p-1">
      {options.map(({ label, type, icon }) => (
        <button
          key={type}
          onClick={() => createItem(type, label.replace('New ', 'Untitled '))}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-text-dark-primary hover:bg-neutral-dark-5 transition-colors"
          style={{ height: 36 }}
        >
          <span>{icon}</span>
          {label}
        </button>
      ))}
    </div>
  )
}

function AISection() {
  return (
    <div className="p-4 text-sm text-text-dark-secondary">
      <p className="font-medium text-text-dark-primary mb-2">Agents</p>
      <button className="w-full text-left px-3 py-2 rounded-md hover:bg-neutral-dark-5 text-sm">New Agent</button>
      <p className="font-medium text-text-dark-primary mt-4 mb-2">Chats</p>
      <button className="w-full text-left px-3 py-2 rounded-md hover:bg-neutral-dark-5 text-sm">New Chat</button>
    </div>
  )
}

function LibrarySection() {
  return (
    <div className="p-4 text-sm text-text-dark-secondary">
      <p className="text-xs leading-relaxed mb-4">
        Library is where items created in a chat, agent, or canvas are saved by default.
      </p>
      <p className="text-xs text-text-dark-secondary italic">No unsorted items</p>
    </div>
  )
}

function SidebarFooter() {
  const { user } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="shrink-0 border-t border-divider p-2">
      {/* Action buttons */}
      <div className="flex items-center gap-1 mb-2">
        {[TrashIcon, ActivityIcon, TaskIcon, SettingsIcon].map((Icon, i) => (
          <button key={i} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors">
            <Icon size={15} />
          </button>
        ))}
      </div>

      {/* User button */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg w-full hover:bg-neutral-dark-5 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-accent-eden flex items-center justify-center text-white text-xs font-medium shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex flex-col items-start min-w-0">
            <span className="text-xs text-text-dark-primary truncate w-full">{user?.email}</span>
            <span className="text-[10px] text-text-dark-secondary">Free plan</span>
          </div>
        </button>
        {menuOpen && (
          <div className="absolute bottom-12 left-0 z-50 w-56 bg-background-main border border-divider rounded-xl shadow-xl p-1">
            <button
              onClick={signOut}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-accent-raspberry hover:bg-neutral-dark-5 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Icon components
function HomeIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function SparkleIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
}
function LibraryIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
}
function SearchIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
}
function CollapseIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
}
function TrashIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
}
function ActivityIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
function TaskIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function SettingsIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}

// Missing React import fix
import { useState } from 'react'
```

**Step 4: Create index.ts**
```ts
export { default } from './Sidebar'
```

**Step 5: Commit**
```bash
git add .
git commit -m "feat: sidebar with tree, nav, new button, footer"
```

---

## Task 10: File grid + cards

**Files:**
- Create: `src/components/FileGrid/FileCard.tsx`
- Create: `src/components/FileGrid/FileGrid.tsx`
- Create: `src/components/FileGrid/index.ts`

**Step 1: Create FileCard.tsx**
```tsx
// src/components/FileGrid/FileCard.tsx
import { useState } from 'react'
import { useStore } from '../../store/workspace'
import type { Item } from '../../types'
import { format } from 'date-fns'

interface Props {
  item: Item
  onOpen: (item: Item) => void
  wide?: boolean
}

export default function FileCard({ item, onOpen, wide = false }: Props) {
  const [hovered, setHovered] = useState(false)
  const { selectedItems, toggleSelectItem, setContextMenu, items } = useStore()
  const isSelected = selectedItems.includes(item.id)
  const childCount = items.filter((i) => i.parent_id === item.id).length

  const w = wide ? 316 : 150
  const THUMB_H = 149

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, itemId: item.id })
  }

  return (
    <div
      className="group relative select-none cursor-pointer"
      style={{ width: w, height: 179 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(item)}
      onContextMenu={handleContextMenu}
    >
      {/* Thumbnail */}
      <div
        className="relative overflow-hidden"
        style={{
          width: w, height: THUMB_H,
          borderRadius: 16,
          border: isSelected ? '2px solid #39624D' : '2px solid rgb(240,240,240)',
          background: 'rgba(39,37,35,0.05)',
        }}
      >
        <ThumbnailContent item={item} />

        {/* Selection checkbox */}
        <div
          className="absolute transition-opacity duration-150"
          style={{ top: 8, left: 8, opacity: hovered || isSelected ? 1 : 0 }}
          onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id) }}
        >
          <div
            style={{
              width: 24, height: 24,
              background: isSelected ? '#39624D' : 'rgba(255,255,255,0.9)',
              border: '2px solid rgba(39,37,35,0.1)',
              borderRadius: 6,
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </div>
        </div>

        {/* Folder badge */}
        {item.type === 'folder' && hovered && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[11px] text-text-dark-secondary bg-background-main/80 border border-divider whitespace-nowrap">
            {childCount} {childCount === 1 ? 'item' : 'items'}
          </div>
        )}
      </div>

      {/* Label */}
      <div className="flex items-baseline justify-between gap-2 px-1 w-full mt-1" style={{ height: 24 }}>
        <span className="text-sm text-text-dark-primary truncate leading-6">{item.name}</span>
        <span className="text-xs text-accent-orange shrink-0 tabular-nums">
          {getRelativeTime(item.updated_at)}
        </span>
      </div>
    </div>
  )
}

function ThumbnailContent({ item }: { item: Item }) {
  if (item.type === 'folder') {
    return (
      <div className="w-full h-full flex items-center justify-center pb-[25%]">
        <svg width="48" height="48" viewBox="0 0 24 24" fill={item.color}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
    )
  }
  if (item.type === 'note') {
    return (
      <div className="w-full h-full p-3 overflow-hidden" style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: '166%', height: '166%' }}>
        <div className="text-[11px] text-text-dark-secondary leading-relaxed whitespace-pre-wrap break-words">
          {typeof item.content === 'string' ? item.content?.slice(0, 300) : ''}
        </div>
      </div>
    )
  }
  if (item.type === 'canvas') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="grid grid-cols-3 gap-1 opacity-30">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="w-4 h-4 rounded bg-text-dark-secondary" />
          ))}
        </div>
      </div>
    )
  }
  return null
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 24) return `${h}h`
  const d = Math.floor(diff / 86400000)
  if (d < 30) return `${d}d`
  return format(new Date(dateStr), 'MMM d')
}
```

**Step 2: Create FileGrid.tsx**
```tsx
// src/components/FileGrid/FileGrid.tsx
import { useMemo } from 'react'
import { useStore } from '../../store/workspace'
import FileCard from './FileCard'
import type { Item } from '../../types'

const CARD_W = 150
const WIDE_W = 316
const CARD_H = 179
const GAP = 16

interface Props {
  parentId: string | null
  search: string
  onOpen: (item: Item) => void
}

export default function FileGrid({ parentId, search, onOpen }: Props) {
  const { items, sortBy, setContextMenu, workspace } = useStore()

  const filtered = useMemo(() => {
    let list = items.filter((i) => {
      if (search) return i.name.toLowerCase().includes(search.toLowerCase())
      return i.parent_id === parentId
    })
    switch (sortBy) {
      case 'name': return list.sort((a, b) => a.name.localeCompare(b.name))
      case 'modified': return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      case 'type': return list.sort((a, b) => a.type.localeCompare(b.type))
      default: return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
  }, [items, parentId, search, sortBy])

  function handleBackgroundContextMenu(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, itemId: null, isBackground: true })
    }
  }

  if (filtered.length === 0 && !search) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-text-dark-secondary text-sm"
        onContextMenu={handleBackgroundContextMenu}
      >
        <div className="text-center">
          <p className="mb-1">No items yet</p>
          <p className="text-xs">Right-click to create something</p>
        </div>
      </div>
    )
  }

  // Calculate layout positions
  const containerWidth = 814 // approx content width
  const colWidth = CARD_W + GAP
  const cols = Math.floor((containerWidth + GAP) / colWidth)

  let x = 0
  let y = 0
  let rowMaxH = 0

  const positioned = filtered.map((item) => {
    const wide = item.type === 'canvas'
    const w = wide ? WIDE_W : CARD_W
    const neededCols = wide ? 2 : 1

    if (x + w > containerWidth && x > 0) {
      x = 0
      y += CARD_H + GAP
    }

    const pos = { item, x, y, wide }
    x += w + GAP
    return pos
  })

  const totalH = y + CARD_H

  return (
    <div
      className="relative flex-1 overflow-y-auto"
      style={{ minHeight: totalH }}
      onContextMenu={handleBackgroundContextMenu}
    >
      {positioned.map(({ item, x, y, wide }) => (
        <div key={item.id} className="absolute" style={{ left: x, top: y }}>
          <FileCard item={item} onOpen={onOpen} wide={wide} />
        </div>
      ))}
    </div>
  )
}
```

**Step 3: Create index.ts**
```ts
export { default } from './FileGrid'
```

**Step 4: Commit**
```bash
git add .
git commit -m "feat: file grid and file cards with hover states"
```

---

## Task 11: Context menu

**Files:**
- Create: `src/components/ContextMenu/ContextMenu.tsx`
- Create: `src/components/ContextMenu/index.ts`

**Step 1: Create ContextMenu.tsx**
```tsx
// src/components/ContextMenu/ContextMenu.tsx
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../store/workspace'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function ContextMenu() {
  const { contextMenu, setContextMenu, items, updateItem, removeItem, addItem, workspace } = useStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!contextMenu) return null

  const item = contextMenu.itemId ? items.find((i) => i.id === contextMenu.itemId) : null

  async function handleDelete() {
    if (!item) return
    await supabase.from('items').delete().eq('id', item.id)
    removeItem(item.id)
    setContextMenu(null)
    toast.success(`"${item.name}" deleted`)
  }

  async function handlePin() {
    if (!item) return
    const { data } = await supabase.from('items').update({ is_pinned: !item.is_pinned }).eq('id', item.id).select().single()
    if (data) updateItem(item.id, { is_pinned: data.is_pinned })
    setContextMenu(null)
  }

  async function handleRename() {
    if (!item) return
    const name = prompt('Rename:', item.name)
    if (!name || name === item.name) return setContextMenu(null)
    const { data } = await supabase.from('items').update({ name }).eq('id', item.id).select().single()
    if (data) updateItem(item.id, { name: data.name })
    setContextMenu(null)
  }

  async function handleDuplicate() {
    if (!item || !workspace) return
    const { data } = await supabase.from('items').insert({
      workspace_id: item.workspace_id,
      parent_id: item.parent_id,
      type: item.type,
      name: `${item.name} copy`,
      content: item.content,
      color: item.color,
      position: item.position + 1,
    }).select().single()
    if (data) addItem(data)
    setContextMenu(null)
  }

  async function handleCreate(type: 'note' | 'folder' | 'canvas') {
    if (!workspace) return
    const count = useStore.getState().items.filter(i => i.parent_id === null).length
    const { data } = await supabase.from('items').insert({
      workspace_id: workspace.id,
      type,
      name: `Untitled ${type}`,
      parent_id: null,
      position: count,
    }).select().single()
    if (data) addItem(data)
    setContextMenu(null)
  }

  const itemActions = [
    { label: 'Open', action: () => { if (item) useStore.getState().openPanel({ type: item.type as any, itemId: item.id }); setContextMenu(null) } },
    { label: 'Open in new pane', action: () => { if (item) useStore.getState().openPanel({ type: item.type as any, itemId: item.id }); setContextMenu(null) } },
    null, // separator
    { label: item?.is_pinned ? 'Unpin' : 'Pin', action: handlePin },
    { label: 'Rename', action: handleRename },
    { label: 'Duplicate', action: handleDuplicate },
    null,
    { label: 'Delete', action: handleDelete, danger: true },
  ]

  const bgActions = [
    { label: 'New Note', action: () => handleCreate('note') },
    { label: 'New Canvas', action: () => handleCreate('canvas') },
    { label: 'New Folder', action: () => handleCreate('folder') },
  ]

  const menuItems = item ? itemActions : bgActions

  // Adjust position to stay in viewport
  const menuW = 200
  const menuH = menuItems.length * 36 + 8
  let { x, y } = contextMenu
  if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 8
  if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[1000] bg-background-main border border-divider rounded-xl shadow-xl p-1 min-w-[200px]"
      style={{ left: x, top: y }}
    >
      {menuItems.map((m, i) =>
        m === null ? (
          <div key={i} className="my-1 border-t border-divider" />
        ) : (
          <button
            key={m.label}
            onClick={m.action}
            className="flex items-center w-full px-3 py-2 rounded-md text-sm transition-colors hover:bg-neutral-dark-5"
            style={{ height: 36, color: m.danger ? '#CC768D' : '#272523' }}
          >
            {m.label}
          </button>
        )
      )}
    </div>,
    document.body
  )
}
```

**Step 2: Create index.ts**
```ts
export { default } from './ContextMenu'
```

**Step 3: Commit**
```bash
git add .
git commit -m "feat: context menu with item actions"
```

---

## Task 12: Search bar + filter tabs

**Files:**
- Create: `src/components/SearchBar/SearchBar.tsx`
- Create: `src/components/SearchBar/index.ts`

**Step 1: Create SearchBar.tsx**
```tsx
// src/components/SearchBar/SearchBar.tsx
import { useState } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  folderName?: string
  onClearFolder?: () => void
  activeTab: 'all' | 'notes' | 'trash'
  onTabChange: (t: 'all' | 'notes' | 'trash') => void
}

export default function SearchBar({ value, onChange, folderName, onClearFolder, activeTab, onTabChange }: Props) {
  return (
    <div className="px-6 py-4 shrink-0">
      {/* Search input */}
      <div
        className="relative flex items-center px-6 py-3 rounded-full bg-background-faint"
        style={{ height: 62 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dark-secondary mr-3 shrink-0">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>

        {/* Folder scope chip */}
        {folderName && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-background-primary-selected border border-primary-30 text-accent-eden text-xs mr-2 shrink-0">
            <span>📁</span>
            <span>{folderName}</span>
            <button onClick={onClearFolder} className="ml-1 hover:text-accent-primary">✕</button>
          </div>
        )}

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search anything..."
          className="flex-1 bg-transparent border-none outline-none text-[18px] text-text-dark-primary placeholder:text-text-dark-secondary"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mt-3">
        {(['all', 'notes', 'trash'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors border"
            style={{
              height: 30,
              background: activeTab === tab ? 'rgb(236,240,237)' : 'transparent',
              borderColor: activeTab === tab ? 'rgb(179,191,183)' : 'rgba(39,37,35,0.2)',
              color: activeTab === tab ? 'rgb(57,98,77)' : 'rgb(104,103,100)',
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
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            )}
            {tab === 'all' ? 'All results' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Create index.ts**
```ts
export { default } from './SearchBar'
```

**Step 3: Commit**
```bash
git add .
git commit -m "feat: search bar with filter tabs"
```

---

## Task 13: Command palette

**Files:**
- Create: `src/components/CommandPalette/CommandPalette.tsx`
- Create: `src/components/CommandPalette/index.ts`

**Step 1: Create CommandPalette.tsx**
```tsx
// src/components/CommandPalette/CommandPalette.tsx
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../store/workspace'
import type { Item } from '../../types'

export default function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, items, recentIds, openPanel } = useStore()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandPaletteOpen])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
      if (e.key === 'Escape') setCommandPaletteOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [commandPaletteOpen])

  if (!commandPaletteOpen) return null

  const recentItems = recentIds.map((id) => items.find((i) => i.id === id)).filter(Boolean) as Item[]
  const searchResults = query
    ? items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : []

  function openItem(item: Item) {
    openPanel({ type: item.type as any, itemId: item.id })
    setCommandPaletteOpen(false)
  }

  const allResults = query ? searchResults : recentItems.slice(0, 5)

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, allResults.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && allResults[activeIdx]) openItem(allResults[activeIdx])
  }

  const typeIcon = { folder: '📁', note: '📄', canvas: '⬜' }
  const typeLabel = { folder: 'Folder', note: 'Note', canvas: 'EdenCanvas' }

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-20 bg-black/20" onClick={() => setCommandPaletteOpen(false)}>
      <div
        className="w-full bg-background-page border border-divider rounded-xl shadow-2xl overflow-hidden"
        style={{ maxWidth: 896, maxHeight: 509 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-divider">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dark-secondary shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search anything..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-text-dark-primary placeholder:text-text-dark-secondary"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-divider text-text-dark-secondary">ESC</kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: 440 }}>
          {!query && (
            <>
              <Section label="⚡ QUICK ACTIONS">
                {[
                  { label: 'Create Note', sub: 'In workspace root' },
                  { label: 'Create Folder', sub: 'In workspace root' },
                  { label: 'Create Canvas', sub: 'In workspace root' },
                ].map(({ label, sub }) => (
                  <ResultRow key={label} icon="⚡" title={label} subtitle={sub} active={false} onClick={() => {}} />
                ))}
              </Section>
              {recentItems.length > 0 && (
                <Section label="🕐 RECENT">
                  {recentItems.slice(0, 5).map((item, i) => (
                    <ResultRow
                      key={item.id}
                      icon={typeIcon[item.type]}
                      title={item.name}
                      subtitle={typeLabel[item.type]}
                      active={activeIdx === i}
                      onClick={() => openItem(item)}
                    />
                  ))}
                </Section>
              )}
            </>
          )}
          {query && (
            <Section label="RESULTS">
              {searchResults.length === 0
                ? <p className="px-4 py-3 text-sm text-text-dark-secondary">No results for "{query}"</p>
                : searchResults.map((item, i) => (
                    <ResultRow
                      key={item.id}
                      icon={typeIcon[item.type]}
                      title={item.name}
                      subtitle={typeLabel[item.type]}
                      active={activeIdx === i}
                      onClick={() => openItem(item)}
                    />
                  ))
              }
            </Section>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-divider text-[11px] text-text-dark-secondary">
          <span><kbd className="px-1 border border-divider rounded">↑↓</kbd> navigate</span>
          <span><kbd className="px-1 border border-divider rounded">↵</kbd> open</span>
          <span><kbd className="px-1 border border-divider rounded">Alt+↵</kbd> open in pane</span>
        </div>
      </div>
    </div>,
    document.body
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-3 pb-1">
      <p className="px-4 pb-1 text-[11px] font-medium text-text-dark-secondary tracking-wide">{label}</p>
      {children}
    </div>
  )
}

function ResultRow({ icon, title, subtitle, active, onClick }: { icon: string; title: string; subtitle: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-2 text-left transition-colors"
      style={{ background: active ? 'rgb(236,240,237)' : 'transparent', height: 44 }}
    >
      <span className="text-base w-5 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-dark-primary truncate">{title}</p>
      </div>
      <span className="text-xs text-text-dark-secondary shrink-0">{subtitle}</span>
    </button>
  )
}
```

**Step 2: Create index.ts**
```ts
export { default } from './CommandPalette'
```

**Step 3: Commit**
```bash
git add .
git commit -m "feat: command palette with keyboard navigation"
```

---

## Task 14: Note editor (TipTap)

**Files:**
- Create: `src/components/Editor/NoteEditor.tsx`
- Create: `src/components/Editor/index.ts`

**Step 1: Create NoteEditor.tsx**
```tsx
// src/components/Editor/NoteEditor.tsx
import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useStore } from '../../store/workspace'
import { supabase } from '../../lib/supabase'

interface Props {
  itemId: string
}

export default function NoteEditor({ itemId }: Props) {
  const { items, updateItem } = useStore()
  const item = items.find((i) => i.id === itemId)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    content: typeof item?.content === 'string' ? item.content : '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none text-text-dark-primary min-h-[400px] p-0',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // Optimistic update
      updateItem(itemId, { content: html, updated_at: new Date().toISOString() })
      // Debounced save
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        await supabase.from('items').update({ content: html }).eq('id', itemId)
      }, 500)
    },
  })

  useEffect(() => {
    return () => clearTimeout(saveTimer.current)
  }, [])

  if (!item) return null

  return (
    <div className="flex flex-col h-full">
      {/* Title */}
      <div className="px-8 pt-8 pb-4">
        <input
          type="text"
          value={item.name}
          onChange={async (e) => {
            updateItem(itemId, { name: e.target.value })
            clearTimeout(saveTimer.current)
            saveTimer.current = setTimeout(async () => {
              await supabase.from('items').update({ name: e.target.value }).eq('id', itemId)
            }, 500)
          }}
          className="w-full text-2xl font-semibold text-text-dark-primary bg-transparent border-none outline-none"
          placeholder="Untitled"
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
```

**Step 2: Add TipTap CSS to `src/index.css`**
```css
/* Append to src/index.css */
.tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}
.prose h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
.prose h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
.prose p { margin-bottom: 0.5rem; line-height: 1.7; }
.prose ul { list-style-type: disc; padding-left: 1.5rem; }
.prose ol { list-style-type: decimal; padding-left: 1.5rem; }
.prose code { background: rgba(39,37,35,0.08); padding: 0.1em 0.3em; border-radius: 4px; font-size: 0.9em; }
.prose blockquote { border-left: 3px solid #B3BFB7; padding-left: 1rem; color: #686764; }
```

**Step 3: Create index.ts**
```ts
export { default } from './NoteEditor'
```

**Step 4: Commit**
```bash
git add .
git commit -m "feat: tiptap note editor with auto-save"
```

---

## Task 15: Panel content renderer

**Files:**
- Create: `src/components/Panel/PanelContent.tsx`
- Create: `src/components/Panel/PanelHeader.tsx`
- Create: `src/components/Panel/index.ts`

**Step 1: Create PanelHeader.tsx**
```tsx
// src/components/Panel/PanelHeader.tsx
import { useStore } from '../../store/workspace'
import type { Panel } from '../../types'

interface Props {
  panel: Panel
  onClose: () => void
}

export default function PanelHeader({ panel, onClose }: Props) {
  const { items, workspace, viewMode, setViewMode, sortBy, setSortBy } = useStore()
  const item = panel.itemId ? items.find((i) => i.id === panel.itemId) : null

  const breadcrumb = item
    ? [workspace?.name ?? 'Workspace', item.name].filter(Boolean)
    : [workspace?.name ?? 'Workspace']

  return (
    <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-divider">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-text-dark-secondary min-w-0">
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-neutral-dark-20">/</span>}
            <span className={i === breadcrumb.length - 1 ? 'text-text-dark-primary font-medium' : ''}>
              {crumb}
            </span>
          </span>
        ))}
      </div>

      {/* Controls (only for grid views) */}
      {(panel.type === 'root' || panel.type === 'folder') && (
        <div className="flex items-center gap-2 shrink-0">
          {/* View toggle */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className="flex items-center justify-center rounded-md transition-colors"
              style={{ width: 30, height: 30, background: viewMode === 'grid' ? 'rgb(227,231,227)' : 'transparent' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center justify-center rounded-md transition-colors"
              style={{ width: 30, height: 30, background: viewMode === 'list' ? 'rgb(227,231,227)' : 'transparent' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs border border-divider rounded-md px-2 py-1 bg-background-faint text-text-dark-secondary outline-none"
          >
            <option value="created">Date created</option>
            <option value="modified">Last modified</option>
            <option value="name">Name</option>
            <option value="type">Type</option>
          </select>
        </div>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        className="p-1 rounded-md hover:bg-neutral-dark-5 text-text-dark-secondary transition-colors ml-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
```

**Step 2: Create PanelContent.tsx**
```tsx
// src/components/Panel/PanelContent.tsx
import { useState } from 'react'
import { useStore } from '../../store/workspace'
import type { Panel, Item } from '../../types'
import { supabase } from '../../lib/supabase'
import Banner from '../Banner'
import SearchBar from '../SearchBar'
import FileGrid from '../FileGrid'
import NoteEditor from '../Editor'
import PanelHeader from './PanelHeader'

interface Props {
  panel: Panel
  canClose: boolean
}

export default function PanelContent({ panel, canClose }: Props) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'notes' | 'trash'>('all')
  const { closePanel, openPanel, addItem, addRecent, workspace, user, items } = useStore()

  const parentItem = panel.itemId ? items.find(i => i.id === panel.itemId) : null
  const parentId = panel.type === 'folder' ? (panel.itemId ?? null) : null

  function handleOpen(item: Item) {
    openPanel({ type: item.type as any, itemId: item.id })
    addRecent(item.id)
    if (user) {
      supabase.from('recents').upsert({ user_id: user.id, item_id: item.id, accessed_at: new Date().toISOString() })
    }
  }

  const filteredParentId = tab === 'notes'
    ? parentId  // further filtered in FileGrid by type
    : parentId

  if (panel.type === 'note' && panel.itemId) {
    return (
      <div className="flex flex-col h-full bg-background-main">
        <PanelHeader panel={panel} onClose={() => canClose && closePanel(panel.id)} />
        <div className="flex-1 overflow-hidden">
          <NoteEditor itemId={panel.itemId} />
        </div>
      </div>
    )
  }

  if (panel.type === 'canvas' && panel.itemId) {
    return (
      <div className="flex flex-col h-full bg-background-main">
        <PanelHeader panel={panel} onClose={() => canClose && closePanel(panel.id)} />
        <div className="flex-1 flex items-center justify-center text-text-dark-secondary text-sm">
          Canvas editor coming soon
        </div>
      </div>
    )
  }

  // Root or folder view
  const filteredItems = useStore.getState().items.filter(i => {
    const inParent = i.parent_id === filteredParentId
    const matchesSearch = search ? i.name.toLowerCase().includes(search.toLowerCase()) : true
    const matchesTab = tab === 'notes' ? i.type === 'note' : true
    return inParent && matchesSearch && matchesTab
  })

  return (
    <div className="flex flex-col h-full bg-background-main">
      {/* Banner only on root */}
      {panel.type === 'root' && <Banner />}

      <PanelHeader panel={panel} onClose={() => canClose && closePanel(panel.id)} />

      <SearchBar
        value={search}
        onChange={setSearch}
        folderName={parentItem?.name}
        onClearFolder={() => openPanel({ type: 'root' })}
        activeTab={tab}
        onTabChange={setTab}
      />

      <div className="flex-1 overflow-y-auto px-6 pt-2 relative">
        <FileGrid
          parentId={filteredParentId}
          search={search}
          onOpen={handleOpen}
        />
      </div>
    </div>
  )
}
```

**Step 3: Create index.ts**
```ts
export { default } from './PanelContent'
```

**Step 4: Commit**
```bash
git add .
git commit -m "feat: panel content with banner, search, grid, editor"
```

---

## Task 16: Workspace shell (main layout)

**Files:**
- Create: `src/pages/Workspace.tsx`

**Step 1: Create Workspace.tsx**
```tsx
// src/pages/Workspace.tsx
import { useEffect, useRef } from 'react'
import { useStore } from '../store/workspace'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import PanelContent from '../components/Panel'
import ContextMenu from '../components/ContextMenu'
import CommandPalette from '../components/CommandPalette'

export default function Workspace() {
  const { sidebarOpen, setSidebarOpen, panels, activePanelId, setActivePanel, workspace, setItems, user } = useStore()

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        setSidebarOpen(!sidebarOpen)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [sidebarOpen])

  // Realtime subscription
  useEffect(() => {
    if (!workspace) return
    const channel = supabase
      .channel(`workspace:${workspace.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'items',
        filter: `workspace_id=eq.${workspace.id}`,
      }, (payload) => {
        const store = useStore.getState()
        if (payload.eventType === 'INSERT') store.addItem(payload.new as any)
        if (payload.eventType === 'UPDATE') store.updateItem(payload.new.id, payload.new as any)
        if (payload.eventType === 'DELETE') store.removeItem(payload.old.id)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [workspace?.id])

  const panelWidth = panels.length > 1
    ? `calc((100% - ${sidebarOpen ? 250 : 0}px) / ${panels.length})`
    : undefined

  return (
    <div className="flex h-screen overflow-hidden bg-background-page relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Collapsed sidebar floating buttons */}
      {!sidebarOpen && (
        <div className="absolute top-3 left-3 z-30 flex flex-col gap-1">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-background-main/90 border border-divider shadow-sm hover:bg-background-main text-text-dark-secondary transition-colors"
            title="Expand sidebar Ctrl+D"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
        </div>
      )}

      {/* Panel area */}
      <div
        className="flex flex-1 overflow-hidden transition-all duration-500"
        style={{
          marginLeft: sidebarOpen ? 250 : 0,
          transition: 'margin-left 500ms cubic-bezier(0.23,1,0.32,1)',
        }}
      >
        {panels.map((panel) => (
          <div
            key={panel.id}
            className="flex flex-col h-full border-r border-divider last:border-r-0 overflow-hidden"
            style={{ width: panelWidth, flex: panels.length > 1 ? 'none' : '1' }}
            onClick={() => setActivePanel(panel.id)}
          >
            <PanelContent panel={panel} canClose={panels.length > 1} />
          </div>
        ))}
      </div>

      {/* Overlays */}
      <ContextMenu />
      <CommandPalette />
    </div>
  )
}
```

**Step 2: Verify the full app works**
```bash
npm run dev
```
Expected: Login page loads. After sign-in: workspace with sidebar, banner, search bar, file grid, command palette (Ctrl+K).

**Step 3: Commit**
```bash
git add .
git commit -m "feat: workspace shell with split panes and keyboard shortcuts"
```

---

## Task 17: Realtime + missing useState imports fix

**Files:**
- Modify: `src/components/Sidebar/Sidebar.tsx` (add missing `useState` import at top)
- Modify: `src/components/Panel/PanelContent.tsx` (fix items filter — move out of render)

**Step 1: Fix Sidebar.tsx imports**
Add at the very top of `src/components/Sidebar/Sidebar.tsx`:
```tsx
import { useState } from 'react'
```
Remove the duplicate `import { useState } from 'react'` at the bottom.

**Step 2: Fix PanelContent.tsx items filter**
In `PanelContent.tsx`, replace the inline `useStore.getState().items.filter(...)` block with a proper `useMemo`:
```tsx
import { useState, useMemo } from 'react'
// ...
const filteredItems = useMemo(() =>
  items.filter(i => {
    const inParent = i.parent_id === filteredParentId
    const matchesSearch = search ? i.name.toLowerCase().includes(search.toLowerCase()) : true
    const matchesTab = tab === 'notes' ? i.type === 'note' : true
    return inParent && matchesSearch && matchesTab
  }),
[items, filteredParentId, search, tab])
```

**Step 3: Commit**
```bash
git add .
git commit -m "fix: imports and memoization in sidebar and panel"
```

---

## Task 18: Build + verify production bundle

**Step 1: Run build**
```bash
npm run build
```
Expected: `dist/` folder created, no TypeScript errors.

**Step 2: Preview production build**
```bash
npm run preview
```
Expected: App loads at `http://localhost:4173`, full functionality works.

**Step 3: Final commit**
```bash
git add .
git commit -m "feat: eden clone complete - pixel-perfect workspace UI"
```

---

## Summary

| Task | What it builds |
|---|---|
| 1 | Vite + React + Tailwind scaffold |
| 2 | Supabase schema (workspaces, items, recents) |
| 3 | TypeScript types |
| 4 | Zustand store |
| 5 | Auth hooks + routing |
| 6 | Login page |
| 7 | Perlin noise utility |
| 8 | Banner canvas + cover picker |
| 9 | Sidebar (tree, nav, footer, new button) |
| 10 | File grid + file cards |
| 11 | Context menu |
| 12 | Search bar + filter tabs |
| 13 | Command palette |
| 14 | TipTap note editor |
| 15 | Panel content renderer |
| 16 | Workspace shell (split panes, shortcuts, realtime) |
| 17 | Bug fixes |
| 18 | Production build |
