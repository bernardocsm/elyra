# Eden Clone — Full Feature Implementation Design
**Date:** 2026-03-18
**Status:** Approved
**Scope:** All remaining features to complete the Eden clone

---

## Overview

The project is ~80-85% complete. This document covers the design for all remaining features, organized into 4 batches grouped by type to maximize code reuse.

**AI Chat decision:** UI-only for now. Full interface built, real API integrated in a later phase.

---

## Batch 1 — Overlays & Panels

### Shared SlidePanel Component
A reusable `<SlidePanel>` component used by Settings, Info Panel, and Comments Panel.
- Props: `title`, `onClose`, `children`, `side` ('left' | 'right')
- Slides in with `cubic-bezier(0.23,1,0.32,1)` transition (500ms)
- Backdrop overlay closes on click
- Used by: Settings (left), Info Panel (right), Comments Panel (right)

### Settings Panel
Triggered by gear icon at bottom of sidebar. Slides in over the left sidebar.

**Two groups, 8 pages:**

Account group:
- **Account** — name, email display, support access toggle, "Open help center" button
- **Import** — static placeholder ("Import from other tools coming soon")
- **Integrations** — grid of 17 service cards: Telegram, GitHub, Google Calendar, Notion, Google Sheets, Slack, Outlook, Twitter/X, Google Drive, Google Docs, HubSpot, Linear, Airtable, YouTube, Figma, Reddit — each with a "Connect" button (UI only)
- **Preferences** — Theme (Light/Dark/System radio), Hover to reveal sidebar (toggle), Auto-collapse folders (toggle), Auto-close brackets (toggle), Heading font (Serif/Sans Serif), Body font (Serif/Sans Serif)

Workspace group:
- **Workspace** — workspace name + icon editor, Free plan badge + Manage plan button, storage progress bar, AI credits count (300), members table (avatar, name, role, email) + "Add member" button (upgrade required badge)
- **Snippets** — empty state "No snippets yet", New snippet button, New group button
- **Data** — Current Data Region (US East, Virginia), Storage Used (0.00 GB), Replication Zones section, Clear URL Cache button, Migrate to Different Region option
- **Billing** — Plan (Free) + Manage plan button, Storage capacity + Manage storage button

State: active settings page stored in Zustand (`settingsPage`). Settings open state: `settingsOpen` boolean.

### Activity Panel
- Floating panel anchored bottom-right (fixed position, above footer)
- Triggered by activity icon (branching tree) at bottom of sidebar
- Not a page — overlay only
- Empty state: "No activity" with subtle icon
- When populated: rows showing icon + label + progress bar + timestamp
- State: `activityOpen` boolean in Zustand

### Comments Panel
- Slides in from right inside note view (same SlidePanel component)
- Triggered by chat bubble icon in note toolbar
- Empty state: chat bubble icon + "Select text and add a comment to start a discussion"
- Future: inline comment threads tied to text selection ranges
- State: `commentsPanelOpen` boolean in Zustand

### Info Panel Polish
Existing `InfoPanel.tsx` needs:
- **Tags** — chip input: type a tag name + Enter to add, × to remove. Saved to `items` metadata (jsonb field or separate tags column)
- **Connections** — searchable dropdown showing all workspace items. Select an item to link it. Shows linked items as chips with icon + name. Clicking a connection opens that item.

---

## Batch 2 — Pages

### Tasks Page (`/tasks`)
Full page at route `/tasks`. Triggered by clock icon at bottom of sidebar.

Layout:
- Header: "Tasks" title + "New Task" button (top right)
- Two tabs: Scheduled | Triggered
- Empty state: lightning bolt icon + "No tasks yet" + "Create one to run prompts automatically"
- Tasks list: rows with name, schedule/trigger description, last run timestamp, status badge (Active/Paused), three-dot menu (Edit, Pause, Delete)

New Task modal:
- Toggle: Scheduled / Triggered
- Task name field
- Instructions textarea — hint: "Use / for commands and @ to mention files"
- How often? field (plain English) — shown for Scheduled only
- Trigger type dropdown — shown for Triggered only
- Run limit field (optional, leave empty for indefinite)
- Retry settings — collapsible section
- Create task / Cancel buttons

Storage: tasks stored in Zustand only for now (no Supabase table yet). Tasks persist in localStorage via Zustand persist middleware.

### Library Mode
Triggered by bookshelf icon in sidebar top row. Sets `sidebarMode` to `'library'`.

Main content area shows:
- "Library" heading
- Same search bar, filter tabs, view toggle, sort button as workspace home
- Flat list of ALL non-deleted items across the entire workspace (all folders and files)
- Same grid/list view, same context menus
- Clicking a folder navigates into it; clicking a file opens it

### Trash Improvements
- Red banner at top: "Items in trash will be permanently deleted after 30 days"
- Items grouped by date section headers: Today / Yesterday / Last 7 days / Older
- Empty Trash button (top right) — confirmation dialog before permanent delete
- Context menu on each item: Restore | Delete permanently
- Empty state when trash is empty: bin icon + "Trash is empty"

---

## Batch 3 — Editors & Rich UI

### AI Chat UI (UI-only, no real API)

**Sidebar AI mode** (when `sidebarMode === 'ai'`):
- Agents section header with lock icon badge ("Requires upgrade")
  - "New Agent" item (disabled, shows upgrade tooltip)
- Chats section header
  - "New Chat" item (creates new chat)
  - List of past chat sessions (name, timestamp)
  - Three-dot menu on each: Rename, Delete

**Chat panel** (opens in main pane or split pane):
- Top bar: back arrow, chat title + down-arrow (rename dropdown), + new chat, X close
- Body: greeting "What are we tackling, [email]?" centered when empty
- Quick prompt buttons (5): Develop Ideas | Plan & Work | Research | Organize Files | Create Prompt — clicking any starts a chat with that prompt
- Messages: user messages right-aligned (green bubble), AI messages left-aligned (white bubble)
- Mock AI response: typing indicator (3 animated dots, 800ms) then static response "AI responses coming soon. This interface will be connected to Claude in the next phase."
- Input area:
  - Textarea: placeholder "Plan, @ for context, / for commands"
  - Toolbar below input: paperclip icon, @ icon, lightning bolt icon, "Auto" model dropdown (Auto, Claude 3.5 Sonnet, Claude 3 Haiku — UI only), send button (green arrow, disabled when empty)
  - @ typing: shows workspace item picker dropdown
  - Attached context shown as chips above input

State: chat sessions stored in Zustand (`chats: Chat[]`). Each chat has id, name, messages array, createdAt. Not persisted to Supabase yet.

### Canvas Editor
Opens when a canvas-type item is clicked. Full-screen editor replacing the "Coming soon" placeholder.

**Core interactions:**
- Pan: drag on empty space (cursor: grab)
- Zoom: scroll wheel, pinch gesture. Range: 20%–400%. Zoom indicator shown bottom-right.
- Zoom controls: + / − buttons + percentage display

**Toolbar (left side, vertical):**
- Select (V) — default tool, drag to select multiple
- Text card (T) — click to place, double-click to edit
- Sticky note (S) — colored sticky note card
- Rectangle / Circle / Diamond shapes
- Arrow connector — drag from card edge to card edge
- Image — opens file picker

**Cards:**
- Draggable (drag handle or any part when in Select mode)
- Resizable (8-point resize handles on selection)
- Double-click to edit text inline
- Right-click for card context menu: Edit, Duplicate, Change Color, Delete
- Selection: click to select one, shift+click or drag-select for multiple

**Connections (arrows):**
- Drawn by hovering a card edge (port dot appears) then dragging to another card
- Arrow style: straight with arrowhead. Future: curved/elbow styles
- Clicking an arrow selects it (shows delete option)

**Persistence:**
- Canvas state (cards, connections, positions) saved as JSON in `items.content`
- Auto-save on change with 1000ms debounce

### Version History
Triggered by "Version History" in file's `...` menu. Slide-in panel from right.

**Panel layout:**
- Header: "Version History" + X close
- List of snapshots: timestamp (e.g., "Today at 2:34 PM") + "Auto-save" label
- Clicking a snapshot: shows read-only preview of content below the list
- "Restore this version" button — replaces current content, creates a new snapshot of the pre-restore state

**Supabase:**
- New `versions` table: `id`, `item_id` (FK → items), `content` (jsonb), `created_at`
- RLS: users can only access versions of items in their workspace
- Auto-snapshot triggered on note save (debounced, max 50 versions per file — oldest deleted when cap reached)

---

## Batch 4 — Content Creation

### Upload Files
- Triggered by "Upload Files" in + New menu
- Opens `<input type="file" multiple>` file picker
- Each file uploaded to Supabase Storage: `workspace-files/{workspace_id}/{file_id}/{filename}`
- Item row created per file: `type: 'link'`, name = filename, content = `{ url, size, mimeType }`
- Upload progress shown in Activity panel
- Files appear in workspace immediately (optimistic)

### Upload Folder
- `<input type="file" webkitdirectory>` — preserves folder structure
- Recursively creates folder items and file items matching the structure
- Same storage + item creation logic as Upload Files

### Paste Link
- Triggered by "Paste Link" in + New menu
- Modal: URL input field + "Save" button + Cancel
- On save: creates item with `type: 'link'`, `content: { url, title, favicon, description }`
- Open Graph metadata fetched via a simple proxy or client-side attempt
- Displays as link card: favicon + title + domain badge
- Clicking opens URL in new browser tab

### Empty Folder State
Shown when a folder has zero non-deleted children.
- Large folder icon with "+" inside
- "Drop files here" heading
- "Or create a new item in this folder" subtitle
- Three quick-action buttons: New Note | New Canvas | Paste Link
- Drag-and-drop: files dragged from OS desktop trigger Upload Files flow

### Ctrl+K Global Search Improvements
Command palette gets three labeled sections:

**Quick Actions:**
- Browse Workspace → navigates to workspace home
- Create Note → creates note at current location
- Create Folder → opens New Folder modal
- Create Canvas → creates canvas at current location

**Recent** (last 5 accessed items):
- Shows item icon (type-based) + name + type label

**Navigation:**
- Go to Home
- Switch to Dark Mode / Switch to Light Mode (toggles)
- Settings → opens Settings panel

---

## Database Changes Required

```sql
-- Version history table
CREATE TABLE versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  content jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own versions" ON versions
  FOR ALL USING (
    item_id IN (
      SELECT id FROM items WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE user_id = auth.uid()
      )
    )
  );

-- Storage bucket for files
INSERT INTO storage.buckets (id, name, public) VALUES ('workspace-files', 'workspace-files', false);
```

---

## Zustand Store Additions

```typescript
// Settings
settingsOpen: boolean
settingsPage: string  // 'account' | 'integrations' | 'preferences' | etc.
openSettings: (page?: string) => void
closeSettings: () => void

// Activity
activityOpen: boolean
setActivityOpen: (open: boolean) => void
activities: Activity[]
addActivity: (activity: Activity) => void

// Comments
commentsPanelOpen: boolean
setCommentsPanelOpen: (open: boolean) => void

// AI Chats
chats: Chat[]
activeChatId: string | null
createChat: () => void
deleteChat: (id: string) => void
renameChat: (id: string, name: string) => void
addMessage: (chatId: string, message: Message) => void

// Tasks
tasks: Task[]
addTask: (task: Task) => void
updateTask: (id: string, updates: Partial<Task>) => void
deleteTask: (id: string) => void

// Version History
versionHistoryItemId: string | null
setVersionHistoryItemId: (id: string | null) => void
```

---

## Implementation Order (within each batch)

### Batch 1
1. Build `SlidePanel` shared component
2. Settings panel (all 8 pages)
3. Activity floating panel
4. Comments panel (empty state)
5. Info panel — Tags chip input + Connections dropdown

### Batch 2
1. Trash improvements (banner, grouping, empty state)
2. Tasks page + New Task modal
3. Library mode

### Batch 3
1. AI Chat UI (sidebar mode + chat panel + mock responses)
2. Canvas editor (pan/zoom + cards + connections + save)
3. Version History (Supabase table + panel + snapshots)

### Batch 4
1. Empty folder state
2. Ctrl+K improvements (3 sections)
3. Paste Link modal
4. Upload Files / Upload Folder
