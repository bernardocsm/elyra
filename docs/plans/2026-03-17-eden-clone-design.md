# Eden Clone — Design Document
**Date:** 2026-03-17
**Stack:** React + Vite + Tailwind CSS + React Router v6 + Zustand + Supabase

---

## Overview

A pixel-perfect, fully functional clone of the Eden workspace UI. Users sign up with email + password, get their own workspace, and can create/edit/delete folders, notes, and canvas items. Data is persisted in Supabase with Row Level Security. The UI matches the Eden specs exactly — including the canvas-rendered banner with Perlin noise, virtualized file grid, split-pane panels, sidebar with recursive folder tree, command palette, and all hover/context menu interactions.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS v3 with custom design tokens |
| Routing | React Router v6 |
| State | Zustand |
| Backend | Supabase (Auth + Postgres + Realtime + Storage) |
| Virtualization | @tanstack/react-virtual |
| Note editor | TipTap (Markdown) |
| Canvas editor | Custom (JSON node graph) |
| Noise | Custom Perlin noise implementation |

---

## Project Structure

```
elyra/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── noise.ts
│   ├── store/
│   │   └── workspace.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useItems.ts
│   │   └── useWorkspace.ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   └── Workspace.tsx
│   └── components/
│       ├── Sidebar/
│       ├── Banner/
│       ├── FileGrid/
│       ├── SearchBar/
│       ├── CommandPalette/
│       ├── ContextMenu/
│       ├── Modals/
│       └── Editor/
├── tailwind.config.ts
├── index.html
└── vite.config.ts
```

---

## Supabase Schema

```sql
-- workspaces: one per user
workspaces (
  id          uuid PK DEFAULT gen_random_uuid(),
  user_id     uuid FK → auth.users UNIQUE,
  name        text DEFAULT 'My Workspace',
  icon        text DEFAULT '🌿',
  cover_type  text DEFAULT 'silk',
  cover_value text DEFAULT '#3A5448',
  created_at  timestamptz DEFAULT now()
)

-- items: folders, notes, canvas — unified
items (
  id           uuid PK DEFAULT gen_random_uuid(),
  workspace_id uuid FK → workspaces ON DELETE CASCADE,
  parent_id    uuid FK → items (nullable = root),
  type         text CHECK (type IN ('folder','note','canvas')),
  name         text NOT NULL,
  content      jsonb,
  color        text DEFAULT '#527160',
  is_pinned    bool DEFAULT false,
  position     int DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
)

-- recents: last accessed items per user
recents (
  id          uuid PK DEFAULT gen_random_uuid(),
  user_id     uuid FK → auth.users ON DELETE CASCADE,
  item_id     uuid FK → items ON DELETE CASCADE,
  accessed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id)
)
```

**RLS policies:** each table is protected so users can only access rows where `workspace.user_id = auth.uid()`.

---

## Zustand Store

```ts
{
  user: User | null,
  workspace: Workspace | null,
  items: Item[],
  recents: Item[],
  pinned: Item[],

  sidebarOpen: boolean,
  sidebarMode: 'workspace' | 'ai' | 'library',
  expandedFolders: string[],

  panels: Panel[],          // [{id, type: 'folder'|'note'|'canvas'|'root', itemId?}]
  activePanelId: string,

  selectedItems: string[],
  contextMenu: { x: number, y: number, itemId: string } | null,
  commandPaletteOpen: boolean,

  viewMode: 'grid' | 'list',
  sortBy: 'name' | 'modified' | 'created' | 'type',
  cardSize: 'S' | 'M' | 'L',
}
```

---

## Tailwind Design Tokens

```ts
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
}
```

---

## Key Component Specs

### BannerCanvas
- `<canvas>` 920×192px, Perlin noise over base color
- 8 silk swatches, 8 solid, 10 gradients
- "Change cover" button appears on hover (top-left, 94.5×26px)
- Cover popover: 288px wide, absolute top:48px left:12px

### FileGrid
- Virtualized via @tanstack/react-virtual
- Absolute positioning: folder cards 150×179px, canvas cards 316×179px
- Gap: 16px between cards
- Hover: checkbox (top:8px left:8px), folder badge
- Right-click: 12-item context menu

### Sidebar
- 250px wide, cubic-bezier(0.23,1,0.32,1) 500ms transition
- 3 sections: Recents, Pinned, Workspace (recursive tree)
- Collapse: translateX(-250px), 3 floating buttons appear top-left
- Hover reveals: chevron, open-in-pane, add-child buttons

### CommandPalette
- Fixed center modal, 896px wide, max-height 509px
- Sections: Quick Actions, Recent, Navigation
- Keyboard: ↑↓ navigate, Enter open, Tab scope to folder, Alt+Enter open in pane
- Trigger: Ctrl+K

### NoteEditor (TipTap)
- Full Markdown support
- Rendered inside right split pane
- Auto-saves to Supabase on debounce (500ms)

---

## Auth Flow

1. `/login` — email + password form
2. On `onAuthStateChange` → if new user, create `workspaces` row
3. Protected routes: redirect to `/login` if no session
4. Session auto-persisted by Supabase JS

---

## Data Flow

- Fetch all workspace items once on load → store flat in Zustand
- Client-side filtering for parent/type/search
- Supabase Realtime subscription on `items` for live sync
- Optimistic updates: update Zustand first, then Supabase
- Recents: upsert on every item open

---

## Routing

| Path | Component |
|---|---|
| `/login` | Login.tsx |
| `/workspace/:workspaceId` | Workspace.tsx (root view) |
| `/workspace/:workspaceId/folder/:folderId` | Workspace.tsx (folder view) |
