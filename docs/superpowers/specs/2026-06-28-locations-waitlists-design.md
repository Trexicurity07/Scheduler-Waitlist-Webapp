# Locations & Waitlists — Design Spec
**Date:** 2026-06-28  
**Branch:** feature/calendar-waitlist-autofill  
**Status:** Approved

---

## Overview

Introduces a hierarchical Locations → Folders → Waitlists structure to replace the current single flat waitlist per business. Each waitlist gets its own Google Calendar connection. The owner dashboard gains a recursive tree management page and a persistent collapsible sidebar. Clients gain a search/browse interface to discover businesses and their waitlists.

---

## 1. Database Schema

### New table: `location_nodes`

Recursive self-referencing tree. Stores both top-level locations and nested folders.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| business_id | UUID FK → businesses | CASCADE delete |
| parent_id | UUID FK → location_nodes (nullable) | `null` = top-level location |
| type | text `'location' \| 'folder'` | locations have address; folders don't |
| name | text | max 80 chars enforced in UI |
| address | text nullable | only meaningful for `type='location'` |
| description | text nullable | max 200 chars enforced in UI |
| sort_order | integer | ordering within parent, default 0 |
| created_at | timestamptz | default now() |

### New table: `waitlists`

Leaf nodes. Each waitlist has its own calendar connection and matching config.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| node_id | UUID FK → location_nodes | the folder/location it lives in; CASCADE delete |
| business_id | UUID FK → businesses | denormalized for filtering; CASCADE delete |
| name | text | max 80 chars |
| description | text nullable | max 200 chars |
| google_refresh_token_encrypted | text nullable | per-waitlist OAuth token |
| dedicated_calendar_id | text nullable | |
| calendar_status | text | `'pending' \| 'connected' \| 'disconnected'`, default `'pending'` |
| batch_size | integer | default 3 |
| batch_interval_minutes | integer | default 60 |
| min_notice_hours | integer | default 24 |
| min_confirm_lead_hours | integer | default 2 (must be < min_notice_hours) |
| timezone | text | default `'UTC'` |
| public_slug | text UNIQUE | auto-generated at creation: slugify(name) + random 4-char suffix; used for future client join flow |
| sort_order | integer | ordering within parent node, default 0 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### Altered table: `waitlist_entries`

Add `waitlist_id UUID FK → waitlists` (CASCADE delete). Existing `business_id` column is retained for backward compatibility with the current cron (which processes at business level). New entries populate both columns.

### Unchanged: `businesses`

Business-level calendar fields (`google_refresh_token_encrypted`, `dedicated_calendar_id`, `calendar_status`, batch config) remain on `businesses` for now. Migrating the cron to process per-waitlist is a separate phase. New waitlists use the `waitlists`-level fields.

### Migration

New migration file `0014_locations_waitlists.sql`:
- Creates `location_nodes` and `waitlists` tables
- Adds `waitlist_id` column to `waitlist_entries`
- Updates `src/types/database.ts` to reflect new tables

---

## 2. Dashboard Layout & Sidebar Tree

### DashboardShell (new client component)

`layout.tsx` wraps all dashboard pages in a `DashboardShell` client component that renders a horizontal flex row: sidebar on the left, page content on the right.

```
┌─ OwnerNav (sticky header) ────────────────────────────────────┐
├─ DashboardShell (flex row) ───────────────────────────────────┤
│  ┌─ SidebarTree (220px) ──┐  ┌─ <children> ────────────────┐ │
│  │ [< Hide]               │  │  page content               │ │
│  │                        │  │                             │ │
│  │ 📍 Main Branch         │  │                             │ │
│  │   📁 Dentistry    ›    │  │                             │ │
│  │   📋 Emergency  ⚙     │  │                             │ │
│  └────────────────────────┘  └─────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### Sidebar behavior

- **Present on**: all dashboard pages except the exact `/waitlist` management page (removed from DOM, not hidden).
- **Default state**: shown (`sf_sidebar_open = true` in localStorage).
- **Toggle**: `[< Hide]` button at sidebar top collapses it to a slim `[>]` tab at the left edge. State saved to `localStorage` key `sf_sidebar_open`. Preserved across page navigations.
- **Width**: fixed 220px. When hidden, content takes full width with a smooth CSS transition.

### Sidebar tree item rules

- Folder row: `[chevron] [📁] [name]` — clicking chevron expands/collapses
- Waitlist row: `[📋] [name] [⚙]` — clicking name navigates to `/waitlist/[id]`; clicking ⚙ opens waitlist settings modal
- Indentation: 12px per depth level
- **Name truncation**: always capped at a fixed character width (cap shrinks at deeper nesting to keep ⚙ always visible). Names are truncated with `…` even if they would fit at that cap.
- **Horizontal scroll**: if a row is still too wide for 220px at any nesting depth, the sidebar gains `overflow-x: auto` (rare — requires very deep nesting + long names).
- Folder expand/collapse state saved to `localStorage` key `sf_sidebar_expanded` as a JSON array of expanded node IDs.

### Data loading

`layout.tsx` (server component) fetches the full `location_nodes` + `waitlists` tree for the current business and passes it as props to `SidebarTree`. Data is server-rendered on each navigation (always fresh).

---

## 3. Waitlist Management Page (`/waitlist`)

Replaces the current single-waitlist page. No sidebar tree here.

### Layout

```
Locations & Waitlists                         [+ Add Location]

┌─ 📍 Main Branch — 123 High St ──────────────────── [▼] ─┐
│  [+ Create Waitlist]  [+ Create Folder]                  │
│                                                          │
│  📁 Dentistry                                  [▼]       │
│    [+ Create Waitlist]  [+ Create Folder]                │
│    📁 Dr. Smith                                [▼]       │
│      [+ Create Waitlist]  [+ Create Folder]              │
│      📋 Checkups    connected · 4 entries         [⚙]   │
│      📋 Full Clean  pending                       [⚙]   │
│    📋 General       connected · 12 entries        [⚙]   │
│                                                          │
│  📋 Emergency       disconnected · 1 entry        [⚙]   │
└──────────────────────────────────────────────────────────┘

┌─ 📍 East Branch ──────────────────── [collapsed ▶] ─────┐
└──────────────────────────────────────────────────────────┘
```

### Rules

- Top-level location cards are collapsible (collapsed by default).
- Inside every folder at any depth: `[+ Create Waitlist]` and `[+ Create Folder]` side-by-side, then subfolders (collapsed), then waitlists.
- Subfolders indented 16px per depth level with a left border accent.
- Waitlist row: name, calendar status badge (green/gray/red), active entry count, ⚙ on far right.
- Clicking a waitlist row (not ⚙) navigates to `/waitlist/[id]`.
- ⚙ opens the waitlist settings modal (same popup as creation, pre-filled, with disconnect/reconnect calendar option).
- Names truncated with `…` dynamically (not fixed-cap — more space available here).
- Empty state: "No locations yet. Add your first location to get started." + `[+ Add Location]`.

---

## 4. Location Setup Popup (2 steps)

Large modal overlay, × to close, ← → to navigate steps. Required fields marked `*`. Single hint line at bottom of each step (except review): `* Required fields`. Errors use `<FieldError />` (orange `!` badge tooltip), shown only when a limit is exceeded or required field missing on submit attempt.

### Step 1 — Location Details
- Location name `*` (max 80 chars)
- Address (optional, max 200 chars) — hint text: "Helps clients identify this branch"
- Description (optional, max 200 chars)
- `[→]` Next disabled until name is filled

### Step 2 — Review & Submit
- Read-only summary card of all entered values
- `[←]` Back · `[Submit]` (disabled until name is filled)

---

## 5. Waitlist Setup Popup (4 steps)

Same modal style as location popup.

### Step 1 — Link Calendar *(required for submit)*
- No calendar: "Connect Google Calendar" button → `/api/oauth/google/start` with `waitlistId` in state. On OAuth return, popup re-opens at Step 1 showing calendar as connected.
- Calendar linked: shows connected calendar name/email + `[Remove calendar]` link. Removing unlinks and returns to connect button. A new calendar must be linked before submit.
- `[→]` Next allowed without a calendar (only blocked at final submit).

### Step 2 — Waitlist Details
- Waitlist name `*` (max 80 chars)
- Description (optional, max 200 chars)
- `[←]` / `[→]`

### Step 3 — Configuration
- Batch size — default 3
- Batch interval (minutes) — default 60
- Minimum notice hours — default 24
- Confirm lead hours — default 2 (validated < notice hours, inline error if violated)
- Timezone selector — defaults to business timezone
- `[←]` / `[→]`

### Step 4 — Review & Submit
- Read-only summary of all values
- If calendar not connected: red warning "Calendar not connected — submit is disabled until a calendar is linked."
- `[←]` Back · `[Submit]` disabled until: name filled AND calendar connected

### Waitlist settings modal (⚙)
Same 4-step popup, pre-filled with existing values. Calendar step gains the remove/re-link flow described above.

---

## 6. Per-Waitlist Page (`/waitlist/[id]`)

Dynamic Next.js route — `src/app/(dashboard)/waitlist/[id]/page.tsx`. Sidebar tree is present.

### Layout

```
Waitlist: Checkups
Dr. Smith › Dentistry › Main Branch · connected · 4 active entries

┌─ Active waitlist (4) ──────┐  ┌─ Add client ──────────────┐
│ • Jane D. / jane@...  [×]  │  │ [AddEntryForm]            │
│ • Bob S. / bob@...    [×]  │  │                           │
└────────────────────────────┘  └───────────────────────────┘

┌─ Settings ─────────────────────────────────────────────────┐
│ [SettingsForm — batch size, intervals, timezone]           │
└────────────────────────────────────────────────────────────┘
```

### Rules

- Breadcrumb under title: `WaitlistName › FolderName › … › LocationName`
- Calendar disconnected banner: same red alert as current dashboard, scoped to this waitlist
- `AddEntryForm` and `RemoveEntryButton` adapted to use `waitlistId` instead of `businessId`
- `SettingsForm` adapted to update the `waitlists` record instead of `businesses`
- Not found / wrong business: "Waitlist not found." with link back to `/waitlist`
- Calendar not connected: "Connect your Google Calendar" prompt with button that opens waitlist settings popup at Step 1

---

## 7. Client-Facing Search & Browse

### Search page (`/browse`)

- Search bar at the top, debounced query against `businesses.name`
- Results: business cards showing name + business type
- Clicking a result → `/browse/[slug]`
- Empty (no query): "Search for a business to view their waitlists."
- No results: "No businesses found matching '[query]'."

### Business profile page (`/browse/[slug]`)

```
← Back to search

City Dental
Dental clinic

┌─ 📍 Main Branch — 123 High St ──────── [▼] ─┐
│  📁 Dentistry                    [▼]         │
│    📋 Checkups                               │
│       Routine checkups · ~4 waiting          │
│       [Enter Waitlist]                       │
│    📋 Full Cleaning                          │
│       Deep cleaning · ~1 waiting             │
│       [Enter Waitlist]                       │
│  📋 Emergency · ~2 waiting                   │
│     [Enter Waitlist]                         │
└──────────────────────────────────────────────┘
```

- Business info shown: name, business type. No operational or sensitive data exposed.
- Locations collapsed by default, expandable.
- Subfolders shown with indentation, read-only recursive structure.
- Each waitlist: name, description (if set), approximate queue length, `[Enter Waitlist]` button.
- `[Enter Waitlist]` is a no-op placeholder (renders but does nothing — future join flow).
- Waitlist names truncated with `…` dynamically.
- Business not found: "This business page is not available."

---

## Out of Scope (Deferred)

- **Cron refactor**: migrating `processBusiness` to `processWaitlist` (per-waitlist calendar polling). The existing business-level cron continues to run unchanged until this is addressed separately.
- **Client join flow**: `[Enter Waitlist]` button wiring, client waitlist entry creation from the browse page.
- **Drag-and-drop reordering** of locations/folders/waitlists.
- **Waitlist archiving/deletion** (removal flow).
