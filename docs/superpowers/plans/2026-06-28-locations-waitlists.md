# Locations & Waitlists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a recursive Locations → Folders → Waitlists hierarchy to the owner dashboard, a persistent collapsible sidebar tree, per-waitlist Google Calendar connections, and a client-facing business search/browse page.

**Architecture:** Two new DB tables (`location_nodes` self-referencing tree, `waitlists` leaf nodes with own calendar config). Dashboard layout gains a `DashboardShell` client component rendering a sidebar tree alongside page content. The `/waitlist` route becomes a full management page; `/waitlist/[id]` is a new dynamic per-waitlist view. OAuth is adapted to thread a `waitlistId`/`nodeId` context through the flow via a `pending_connect_ctx` cookie.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL), TypeScript strict, Zod, inline styles following `src/lib/ui/theme.ts` palette.

## Global Constraints

- Dark theme: `#0f172a` bg, `#1e293b` surface, `#f8fafc` text, `#3b82f6` accent — match `src/lib/ui/theme.ts`
- Errors via `<FieldError />` (`src/components/field-error.tsx`) for field-level; `errorAlertStyle` for form-level
- Required fields marked `*`; max-length errors shown only on violation (80 chars names, 200 chars descriptions)
- TDD: write failing test first for every function in `src/lib/**`
- Integration tests need local Supabase running (`supabase start`); use `createServiceRoleClient()`
- No automated E2E tests — manual walkthrough per UI feature
- Pure logic in `src/lib/**`, thin routes in `src/app/api/**`
- `google_refresh_token_encrypted` always encrypted via `src/lib/crypto/encrypt.ts`

---

## File Map

**New migrations**
- `supabase/migrations/0014_locations_waitlists.sql`

**Modified**
- `src/types/database.ts` — add `location_nodes`, `waitlists` table types; add `waitlist_id` to `waitlist_entries`
- `src/app/(dashboard)/layout.tsx` — wrap in `DashboardShell`, fetch + pass tree
- `src/app/(dashboard)/waitlist/page.tsx` — full rewrite → management view
- `src/app/(dashboard)/waitlist/add-entry-form.tsx` — add `waitlistId` prop; POST to `/api/dashboard/waitlists/[id]/entries`
- `src/app/(dashboard)/waitlist/settings-form.tsx` — add `waitlistId` prop; PATCH to `/api/dashboard/waitlists/[id]`
- `src/lib/dashboard/manage-waitlist.ts` — `addWaitlistEntry` populates `waitlist_id`
- `src/app/api/oauth/google/start/route.ts` — read `?context=&nodeId=&waitlistId=`, set `pending_connect_ctx` cookie
- `src/app/api/oauth/google/callback/route.ts` — merge `pending_connect_ctx` into `pending_connect` payload
- `src/app/client/(app)/client-nav.tsx` — add "Browse" nav link

**New lib**
- `src/lib/dashboard/location-tree.ts` + `.test.ts` — `buildTree()` pure fn + `fetchLocationTree()`
- `src/lib/dashboard/manage-locations.ts` + `.test.ts` — `createLocation`, `updateLocation`, `deleteLocation`
- `src/lib/dashboard/manage-waitlists.ts` + `.test.ts` — `createWaitlist`, `updateWaitlistSettings`, `linkWaitlistCalendar`, `unlinkWaitlistCalendar`

**New components**
- `src/components/dashboard-shell.tsx` — client, flex-row layout, sidebar toggle, localStorage `sf_sidebar_open`
- `src/components/sidebar-tree.tsx` — client, recursive tree, localStorage `sf_sidebar_expanded`
- `src/components/location-setup-modal.tsx` — 2-step modal (details → review)
- `src/components/waitlist-setup-modal.tsx` — 4-step modal (calendar → details → config → review)

**New pages**
- `src/app/(dashboard)/waitlist/[id]/page.tsx` — per-waitlist view (breadcrumb, entries, add form, settings)
- `src/app/browse/page.tsx` — client search
- `src/app/browse/[slug]/page.tsx` — business profile

**New API routes**
- `src/app/api/dashboard/locations/route.ts` — POST
- `src/app/api/dashboard/locations/[id]/route.ts` — PATCH, DELETE
- `src/app/api/dashboard/waitlists/route.ts` — POST (create + consume `pending_connect`)
- `src/app/api/dashboard/waitlists/[id]/route.ts` — PATCH settings
- `src/app/api/dashboard/waitlists/[id]/calendar/route.ts` — POST link, DELETE unlink
- `src/app/api/dashboard/waitlists/[id]/entries/route.ts` — POST add entry
- `src/app/api/dashboard/pending-calendar/route.ts` — GET (returns calendars list from cookie, no token)

---

### Task 1: Database migration + types

**Files:**
- Create: `supabase/migrations/0014_locations_waitlists.sql`
- Modify: `src/types/database.ts`

**Interfaces produced:**
- `Database['public']['Tables']['location_nodes']['Row']` — `{ id, business_id, parent_id, type, name, address, description, sort_order, created_at }`
- `Database['public']['Tables']['waitlists']['Row']` — `{ id, node_id, business_id, name, description, google_refresh_token_encrypted, dedicated_calendar_id, calendar_status, batch_size, batch_interval_minutes, min_notice_hours, min_confirm_lead_hours, timezone, public_slug, sort_order, created_at, updated_at }`

- [ ] Write `0014_locations_waitlists.sql`:

```sql
CREATE TABLE public.location_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.location_nodes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('location', 'folder')),
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.location_nodes(business_id);
CREATE INDEX ON public.location_nodes(parent_id);

CREATE TABLE public.waitlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES public.location_nodes(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  google_refresh_token_encrypted TEXT,
  dedicated_calendar_id TEXT,
  calendar_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (calendar_status IN ('pending','connected','disconnected')),
  batch_size INTEGER NOT NULL DEFAULT 3,
  batch_interval_minutes INTEGER NOT NULL DEFAULT 60,
  min_notice_hours INTEGER NOT NULL DEFAULT 24,
  min_confirm_lead_hours INTEGER NOT NULL DEFAULT 2,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  public_slug TEXT UNIQUE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.waitlists(node_id);
CREATE INDEX ON public.waitlists(business_id);

ALTER TABLE public.waitlist_entries
  ADD COLUMN waitlist_id UUID REFERENCES public.waitlists(id) ON DELETE CASCADE;
CREATE INDEX ON public.waitlist_entries(waitlist_id);
```

- [ ] Run: `supabase db reset` (local) to apply
- [ ] Run: `supabase gen types typescript --local > src/types/database.ts` to regenerate types
- [ ] Verify `location_nodes` and `waitlists` appear in `src/types/database.ts` and `waitlist_entries.Row` has `waitlist_id`
- [ ] Commit: `git add supabase/migrations/0014_locations_waitlists.sql src/types/database.ts && git commit -m "feat: add location_nodes and waitlists DB migration"`

---

### Task 2: Location tree lib

**Files:**
- Create: `src/lib/dashboard/location-tree.ts`
- Create: `src/lib/dashboard/location-tree.test.ts`

**Interfaces produced:**
```typescript
export interface WaitlistSummary {
  id: string; name: string; description: string | null
  calendar_status: 'pending' | 'connected' | 'disconnected'
  sort_order: number
}
export interface LocationTreeNode {
  id: string; parent_id: string | null
  type: 'location' | 'folder'
  name: string; address: string | null; description: string | null
  sort_order: number
  children: LocationTreeNode[]
  waitlists: WaitlistSummary[]
}
// buildTree(nodes, waitlists): LocationTreeNode[]  — pure, no I/O
// fetchLocationTree(supabase, businessId): Promise<LocationTreeNode[]>
```

- [ ] Write failing tests in `location-tree.test.ts` covering: empty input, flat list of locations, nested folders, waitlists attached to correct nodes, sort order respected
- [ ] Run tests: `npx jest location-tree --no-coverage` → expect FAIL
- [ ] Implement `buildTree` in `location-tree.ts`:
  - Build a `Map<id, LocationTreeNode>` from flat node rows
  - Attach waitlists to their `node_id` parent
  - Walk the map: `parent_id === null` → push to roots; else push to `parent.children`
  - Recursively sort `children` and `waitlists` by `sort_order` then `name`
- [ ] Implement `fetchLocationTree`:
  ```typescript
  export async function fetchLocationTree(
    supabase: SupabaseClient<Database>,
    businessId: string
  ): Promise<LocationTreeNode[]> {
    const [{ data: nodes }, { data: waitlists }] = await Promise.all([
      supabase.from('location_nodes').select('*').eq('business_id', businessId),
      supabase.from('waitlists')
        .select('id, node_id, name, description, calendar_status, sort_order')
        .eq('business_id', businessId),
    ])
    return buildTree(nodes ?? [], waitlists ?? [])
  }
  ```
- [ ] Run tests → expect PASS
- [ ] Commit: `feat: add location tree lib`

---

### Task 3: Location CRUD

**Files:**
- Create: `src/lib/dashboard/manage-locations.ts`
- Create: `src/lib/dashboard/manage-locations.test.ts`
- Create: `src/app/api/dashboard/locations/route.ts`
- Create: `src/app/api/dashboard/locations/[id]/route.ts`

**Interfaces produced:**
```typescript
// manage-locations.ts
createLocation(supabase, businessId, input: { parentId: string | null; type: 'location'|'folder'; name: string; address?: string; description?: string }): Promise<{ok:true;id:string}|{ok:false;error:string}>
updateLocation(supabase, businessId, nodeId, input: { name?: string; address?: string; description?: string }): Promise<{ok:true}|{ok:false;error:string}>
deleteLocation(supabase, businessId, nodeId): Promise<{ok:true}|{ok:false;error:string}>
```

- [ ] Write failing tests: create location with null parent (top-level), create subfolder, reject name > 80 chars, reject wrong business ownership on update/delete
- [ ] Run tests → FAIL
- [ ] Implement functions. Validation: name max 80 chars, description max 200. `deleteLocation` also cascades via DB; just verify ownership before deleting.
- [ ] Run tests → PASS
- [ ] Write `POST /api/dashboard/locations/route.ts` (Zod: `{ parentId, type, name, address?, description? }`; auth via `getCurrentBusiness`; delegate to `createLocation`; return `{ ok, id }`)
- [ ] Write `PATCH/DELETE /api/dashboard/locations/[id]/route.ts` (Zod validate; auth; delegate)
- [ ] Commit: `feat: add location CRUD lib and routes`

---

### Task 4: Waitlist CRUD lib

**Files:**
- Create: `src/lib/dashboard/manage-waitlists.ts`
- Create: `src/lib/dashboard/manage-waitlists.test.ts`
- Modify: `src/lib/dashboard/manage-waitlist.ts` (add `waitlist_id` to entry insert)

**Interfaces produced:**
```typescript
// manage-waitlists.ts
createWaitlist(supabase, businessId, input: {
  nodeId: string; name: string; description?: string
  refreshToken: string; calendarId: string; calendarTimezone: string
  batchSize?: number; batchIntervalMinutes?: number
  minNoticeHours?: number; minConfirmLeadHours?: number; timezone?: string
}): Promise<{ok:true;id:string}|{ok:false;error:string}>

updateWaitlistSettings(supabase, businessId, waitlistId, input: {
  name?: string; description?: string
  batchSize?: number; batchIntervalMinutes?: number
  minNoticeHours?: number; minConfirmLeadHours?: number; timezone?: string
}): Promise<{ok:true}|{ok:false;error:string}>

linkWaitlistCalendar(supabase, businessId, waitlistId, input: {
  refreshToken: string; calendarId: string; calendarTimezone: string
}): Promise<{ok:true}|{ok:false;error:string}>

unlinkWaitlistCalendar(supabase, businessId, waitlistId): Promise<{ok:true}|{ok:false;error:string}>
```

- [ ] Write failing tests: create waitlist with auto-generated slug collision handling, reject name > 80 chars, reject `minConfirmLeadHours >= minNoticeHours`, verify wrong-business ownership is rejected on update/unlink
- [ ] Run tests → FAIL
- [ ] Implement `createWaitlist`: auto-generate `public_slug` as `slugify(name) + '-' + randomHex(4)` (use existing `src/lib/slug.ts`); encrypt refresh token; insert row
- [ ] Implement remaining functions. `unlinkWaitlistCalendar` nulls out token + calendarId, sets `calendar_status = 'pending'`
- [ ] In `manage-waitlist.ts`, add `waitlist_id` to the `waitlist_entries` insert (accept optional `waitlistId` param):
  ```typescript
  // addWaitlistEntry signature change:
  export async function addWaitlistEntry(
    supabase: SupabaseClient<Database>,
    businessId: string,
    waitlistId: string | null,  // new param
    input: AddWaitlistEntryInput
  )
  // in the insert:
  await supabase.from('waitlist_entries').insert({
    business_id: businessId,
    ...(waitlistId ? { waitlist_id: waitlistId } : {}),
    client_id: clientId,
    time_windows: input.timeWindows as unknown as Json,
    status: 'active',
    expires_at: expiresAt,
  })
  ```
- [ ] Update callers of `addWaitlistEntry` in `src/app/api/dashboard/waitlist/route.ts` to pass `null` for `waitlistId` (existing business-level route stays working)
- [ ] Run tests → PASS
- [ ] Commit: `feat: add waitlist CRUD lib`

---

### Task 5: Waitlist API routes + OAuth adaptation

**Files:**
- Create: `src/app/api/dashboard/waitlists/route.ts`
- Create: `src/app/api/dashboard/waitlists/[id]/route.ts`
- Create: `src/app/api/dashboard/waitlists/[id]/calendar/route.ts`
- Create: `src/app/api/dashboard/waitlists/[id]/entries/route.ts`
- Create: `src/app/api/dashboard/pending-calendar/route.ts`
- Modify: `src/app/api/oauth/google/start/route.ts`
- Modify: `src/app/api/oauth/google/callback/route.ts`

**OAuth context flow:**
1. `GET /api/oauth/google/start?context=new-waitlist&nodeId=NODE_ID` or `?context=relink&waitlistId=WL_ID`
   - Sets `pending_connect_ctx` cookie: encrypted `{ context, nodeId?, waitlistId? }`
   - Redirects to Google OAuth as before
2. `GET /api/oauth/google/callback?code=...`
   - Reads + deletes `pending_connect_ctx`
   - Encrypts `{ refreshToken, calendars, context?, nodeId?, waitlistId? }` into `pending_connect`
   - If context present → redirect to `/waitlist?calendarConnected=1` (new-waitlist) or `/waitlist/[waitlistId]?calendarConnected=1` (relink)
   - If no context → existing redirect to `/connect/setup` unchanged
3. `GET /api/dashboard/pending-calendar`
   - Reads `pending_connect` cookie, decrypts, returns `{ calendars, context, nodeId?, waitlistId? }` (no token)
4. `POST /api/dashboard/waitlists`
   - Body: `{ nodeId, name, description?, calendarId, batchSize?, ... }`
   - Reads `pending_connect` cookie to get `refreshToken` + `calendarTimezone` for chosen `calendarId`
   - Calls `createWaitlist`; on success clears `pending_connect`; returns `{ ok, id }`
5. `POST /api/dashboard/waitlists/[id]/calendar`
   - Body: `{ calendarId }`; reads `pending_connect` for token + timezone
   - Calls `linkWaitlistCalendar`; clears cookie; returns `{ ok }`
6. `DELETE /api/dashboard/waitlists/[id]/calendar`
   - Calls `unlinkWaitlistCalendar`; returns `{ ok }`
7. `PATCH /api/dashboard/waitlists/[id]`
   - Body: settings fields; calls `updateWaitlistSettings`
8. `POST /api/dashboard/waitlists/[id]/entries`
   - Delegates to `addWaitlistEntry(supabase, businessId, waitlistId, input)`

- [ ] Modify `start/route.ts`:
  ```typescript
  export async function GET(request: NextRequest) {
    const ctx = {
      context: request.nextUrl.searchParams.get('context'),
      nodeId: request.nextUrl.searchParams.get('nodeId'),
      waitlistId: request.nextUrl.searchParams.get('waitlistId'),
    }
    const oauth2Client = new google.auth.OAuth2(...)
    const url = oauth2Client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: [...] })
    const response = NextResponse.redirect(url)
    if (ctx.context) {
      response.cookies.set('pending_connect_ctx', encrypt(JSON.stringify(ctx)), {
        httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/',
      })
    }
    return response
  }
  ```
- [ ] Modify `callback/route.ts`: after obtaining `refreshToken` and `calendars`, read+delete `pending_connect_ctx`, merge into `pending_connect` payload, choose redirect URL
- [ ] Implement `GET /api/dashboard/pending-calendar/route.ts`: read + decrypt `pending_connect`, strip `refreshToken`, return rest
- [ ] Implement remaining API routes (thin: parse with Zod, auth with `getCurrentBusiness`, delegate to lib)
- [ ] Manual test: start OAuth with `?context=new-waitlist&nodeId=test`, confirm redirect lands on `/waitlist?calendarConnected=1` and `GET /api/dashboard/pending-calendar` returns calendars
- [ ] Commit: `feat: add waitlist API routes and per-waitlist OAuth flow`

---

### Task 6: Dashboard shell + sidebar tree

**Files:**
- Create: `src/components/dashboard-shell.tsx`
- Create: `src/components/sidebar-tree.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

**DashboardShell** (`'use client'`):
- Props: `{ children, tree: LocationTreeNode[], currentPath: string }`
- Reads `sf_sidebar_open` from localStorage (default `true`)
- On `/waitlist` exact path: renders `<div style={fullWidth}>{children}</div>` (no sidebar)
- Otherwise: renders flex row — `<SidebarTree>` (220px, or collapsed to 28px toggle) + `<div style={flex:1}>{children}</div>`
- Toggle button at sidebar top: `[← Hide]` / `[→]`; state saved to localStorage

**SidebarTree** (`'use client'`):
- Props: `{ tree: LocationTreeNode[] }`
- Reads `sf_sidebar_expanded` from localStorage (default: `[]`)
- Renders recursive tree: location icon + name for top-level; folder icon + chevron for folders; list icon + name + ⚙ for waitlists
- Name cap: `14ch` fixed width, `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- If depth causes overflow → `overflowX: 'auto'` on sidebar container
- Clicking waitlist name → `router.push('/waitlist/' + id)`
- Clicking ⚙ → `router.push('/waitlist/' + id + '?settings=1')`
- Folder chevron click → toggle in localStorage set

**layout.tsx changes:**
```typescript
// becomes async server component
export default async function DashboardLayout({ children }) {
  const { supabase, business } = await getCurrentBusiness()
  const tree = business ? await fetchLocationTree(supabase, business.id) : []
  const headerList = await headers()
  const currentPath = headerList.get('x-pathname') ?? ''
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0f172a' }}>
      <OwnerNav />
      <DashboardShell tree={tree} currentPath={currentPath}>
        {children}
      </DashboardShell>
    </div>
  )
}
```

- [ ] Implement `DashboardShell` with localStorage read in `useEffect` to avoid hydration mismatch (start with `open = true` SSR, read localStorage on mount)
- [ ] Implement `SidebarTree` recursive render
- [ ] Update `layout.tsx`
- [ ] Add `x-pathname` header in `next.config.ts` middleware or via a `middleware.ts` that forwards `pathname` as a header
- [ ] Manual test: sidebar shows/hides, toggle state persists on nav, `/waitlist` has no sidebar
- [ ] Commit: `feat: add dashboard shell and sidebar tree`

---

### Task 7: Waitlist management page (`/waitlist`)

**Files:**
- Modify: `src/app/(dashboard)/waitlist/page.tsx` (full rewrite)
- Create: `src/components/location-setup-modal.tsx`
- Create: `src/components/waitlist-setup-modal.tsx`

**`/waitlist` page** (server component):
- Fetches tree via `fetchLocationTree`
- Passes to a client component `<LocationsView tree={tree} />` (defined in same file or split)
- `LocationsView`: renders each top-level location as a collapsible card
  - Inside expanded card: `[+ Create Waitlist]` `[+ Create Folder]` buttons, then sorted children (folders then waitlists)
  - Waitlist row: name, status badge, entry count, ⚙ button → opens `WaitlistSetupModal` in edit mode
  - Empty state: "No locations yet" + `[+ Add Location]`
- Detects `?calendarConnected=1` in URL → auto-opens `WaitlistSetupModal` at step 1 with connected status (passes `nodeId` from URL param too)

**LocationSetupModal** (2 steps, `'use client'`):
- Step 1: name `*` (max 80), address (max 200), description (max 200); `[→]` disabled until name filled
- Step 2: review summary; `[←]` `[Submit]`
- On submit: `POST /api/dashboard/locations` with `{ parentId, type, name, address, description }`
- On success: `router.refresh()`, close modal

**WaitlistSetupModal** (4 steps, `'use client'`):
- Props: `{ nodeId: string; mode: 'create'|'edit'; waitlist?: WaitlistRow }`
- Step 1 (Calendar): calls `GET /api/dashboard/pending-calendar` on mount to check if a connection is pending. If connected: shows calendar name + `[Remove calendar]` link. If not: `[Connect Google Calendar]` link → navigates to `/api/oauth/google/start?context=new-waitlist&nodeId=...`
- Step 2 (Details): name `*` (max 80), description (max 200)
- Step 3 (Config): batch size, batch interval, notice hours, confirm lead hours (validated), timezone select
- Step 4 (Review): summary + calendar warning if not connected; `[Submit]` disabled until name + calendar
- On create submit: `POST /api/dashboard/waitlists`; on edit submit: `PATCH /api/dashboard/waitlists/[id]`

- [ ] Implement `LocationSetupModal`
- [ ] Implement `WaitlistSetupModal`
- [ ] Rewrite `/waitlist/page.tsx`
- [ ] Manual test: create location → appears in tree; create folder inside location → indented; create waitlist → goes through OAuth and appears
- [ ] Commit: `feat: waitlist management page with location and waitlist modals`

---

### Task 8: Per-waitlist page

**Files:**
- Create: `src/app/(dashboard)/waitlist/[id]/page.tsx`
- Modify: `src/app/(dashboard)/waitlist/add-entry-form.tsx`
- Modify: `src/app/(dashboard)/waitlist/settings-form.tsx`

**`/waitlist/[id]/page.tsx`** (server component):
- `params.id` = waitlist UUID
- Fetch waitlist: `supabase.from('waitlists').select('*, location_nodes(*)').eq('id', id).eq('business_id', business.id).maybeSingle()`
- 404 if not found
- Build breadcrumb by walking `location_nodes` parent chain (recursive fetch or join)
- Fetch active entries: `supabase.from('waitlist_entries').select('id, clients(client_profiles(name, email))').eq('waitlist_id', id).eq('status', 'active')`
- Detects `?settings=1` → passes `defaultSettingsOpen` to client components
- Renders: breadcrumb, calendar status banner if disconnected, 2-col grid (entries list + `<AddEntryForm waitlistId={id} />`), settings section (`<SettingsForm waitlistId={id} waitlist={waitlist} />`)

**AddEntryForm changes:**
- Add `waitlistId: string` prop
- Change POST endpoint to `/api/dashboard/waitlists/${waitlistId}/entries`

**SettingsForm changes:**
- Add `waitlistId: string` prop; accept `waitlist` row instead of `business` row
- Change PATCH endpoint to `/api/dashboard/waitlists/${waitlistId}`

- [ ] Modify `AddEntryForm` to accept and use `waitlistId`
- [ ] Modify `SettingsForm` to accept `waitlistId` and `waitlist` row; update endpoint and field bindings
- [ ] Implement `/waitlist/[id]/page.tsx`
- [ ] Manual test: navigate to a waitlist, add a client, remove a client, save settings
- [ ] Commit: `feat: per-waitlist page`

---

### Task 9: Client browse pages

**Files:**
- Create: `src/app/browse/page.tsx`
- Create: `src/app/browse/[slug]/page.tsx`
- Modify: `src/app/client/(app)/client-nav.tsx`

**`/browse` page** (`'use client'` for search, or hybrid):
- Search bar at top (controlled input, debounced 300ms)
- On each debounced value: `fetch('/api/browse?q='+encodeURIComponent(q))` or direct Supabase query
- Results: business cards with `name`, `business_type`; clicking → `router.push('/browse/' + slug)`
- Empty state and no-results state as per spec

**`/browse/[slug]` page** (server component):
- Fetch business by `public_slug`; 404 if not found
- Fetch `location_nodes` + `waitlists` for that business (public fields only — no tokens, no batch config)
- Build tree with `buildTree`
- Render: business name, type; collapsible location cards (collapsed by default)
- Each waitlist: name, description, `~N waiting` (count from `waitlist_entries` where `waitlist_id=... AND status='active'`), `[Enter Waitlist]` button (renders but `onClick` is no-op)

**Add browse API route** if needed:
- `src/app/api/browse/route.ts` — `GET ?q=`, queries `businesses.name ilike '%q%'`, returns `[{ id, name, business_type, public_slug }]`

**ClientNav**: add `{ href: '/browse', label: 'Browse' }` to `NAV_LINKS`

- [ ] Add browse API route
- [ ] Implement `/browse/page.tsx` with debounced search
- [ ] Implement `/browse/[slug]/page.tsx`
- [ ] Add "Browse" to `ClientNav`
- [ ] Manual test: search "dental", click result, see locations/waitlists, "Enter Waitlist" does nothing
- [ ] Commit: `feat: client browse pages`

---

## Self-Review Checklist

- [x] Spec §1 (DB schema) → Task 1
- [x] Spec §2 (sidebar tree) → Tasks 6
- [x] Spec §3 (management page) → Task 7
- [x] Spec §4 (location popup) → Task 7 (LocationSetupModal)
- [x] Spec §5 (waitlist popup) → Tasks 5 + 7 (OAuth + WaitlistSetupModal)
- [x] Spec §6 (per-waitlist page) → Task 8
- [x] Spec §7 (client browse) → Task 9
- [x] `waitlist_id` populated on new entries → Task 4
- [x] Calendar unlink/re-link flow → Task 5 + 7
- [x] Sidebar absent on `/waitlist` → Task 6 (DashboardShell pathname check)
- [x] localStorage persistence of sidebar state → Task 6
- [x] Horizontal scroll on deep nesting → Task 6 (SidebarTree)
- [x] Fixed name truncation in sidebar (14ch cap) → Task 6
- [x] Dynamic truncation on management + per-waitlist pages → Tasks 7 + 8
- [x] FieldError on max-length violations → Tasks 3, 4, 7
