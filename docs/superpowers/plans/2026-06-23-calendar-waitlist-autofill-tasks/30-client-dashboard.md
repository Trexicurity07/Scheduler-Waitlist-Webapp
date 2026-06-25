### Task 30: Client Dashboard — Active Entries, Offers, Past History, Edit, Cancel

**Files:**
- Create: `src/lib/client-dashboard/manage-own-entries.ts`
- Create: `src/lib/client-dashboard/manage-own-entries.test.ts`
- Create: `src/app/client/dashboard/page.tsx`
- Create: `src/app/api/client/entries/[id]/route.ts` (PATCH to edit, DELETE to cancel)
- Create: `src/app/api/client/offers/[id]/confirm/route.ts`
- Create: `src/app/api/client/offers/[id]/decline/route.ts`

**Interfaces:**
- Consumes: `getCurrentClient()` from Task 26 (`src/lib/client-auth/get-current-client.ts`). Consumes Task 21's `confirmOffer(supabase, offerId, userId)` and `declineOffer(supabase, offerId, userId)` from `src/lib/offers/confirm-decline-offer.ts` (or wherever Task 21 puts them — verify path). Consumes `createServerSupabaseClient` from `src/lib/db/supabase`.
- Produces:
  - `getMyEntries(supabase, userId): Promise<ActiveEntry[]>`
  - `getMyOffers(supabase, userId): Promise<PendingOffer[]>`
  - `getPastEntries(supabase, userId): Promise<PastEntry[]>` (capped at 20)
  - `editPendingEntry(supabase, entryId, userId, timeWindows): Promise<{ ok: true } | { ok: false; error: string }>`
  - `removeOwnEntry(supabase, entryId, userId): Promise<{ ok: true } | { ok: false; error: string }>`

---

- [ ] **Step 1: Write the failing tests for `manage-own-entries.ts`**

Create `src/lib/client-dashboard/manage-own-entries.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness, createTestClientAndEntry, cleanupTestClient } from '@/lib/cron/test-helpers'
import { getMyEntries, getMyOffers, getPastEntries, editPendingEntry, removeOwnEntry } from './manage-own-entries'

describe('manage-own-entries (integration)', () => {
  const businessCleanups: { businessId: string; userId: string }[] = []
  const clientCleanups: string[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (clientCleanups.length > 0) await cleanupTestClient(supabase, clientCleanups.pop()!)
    while (businessCleanups.length > 0) {
      const next = businessCleanups.pop()!
      await cleanupTestBusiness(supabase, next.businessId, next.userId)
    }
  })

  async function setup() {
    const supabase = createServiceRoleClient()
    const { businessId, userId: ownerUserId } = await createTestBusiness(supabase)
    businessCleanups.push({ businessId, userId: ownerUserId })
    const { clientId, entryId, userId: clientUserId } = await createTestClientAndEntry(supabase, businessId)
    clientCleanups.push(clientUserId)
    return { supabase, businessId, clientId, entryId, clientUserId }
  }

  describe('getMyEntries', () => {
    it('returns active entries for the client user', async () => {
      const { supabase, entryId, clientUserId } = await setup()
      const entries = await getMyEntries(supabase, clientUserId)
      expect(entries.some((e) => e.entry_id === entryId)).toBe(true)
      expect(entries[0]).toHaveProperty('business_name')
      expect(entries[0]).toHaveProperty('business_type')
      expect(entries[0]).toHaveProperty('time_windows')
    })

    it('does not return entries for a different user', async () => {
      const { supabase, clientUserId } = await setup()
      const otherSupabase = createServiceRoleClient()
      const { businessId: b2Id, userId: b2UserId } = await createTestBusiness(otherSupabase)
      businessCleanups.push({ businessId: b2Id, userId: b2UserId })
      const { userId: otherClientUserId } = await createTestClientAndEntry(otherSupabase, b2Id)
      clientCleanups.push(otherClientUserId)

      const entries = await getMyEntries(supabase, clientUserId)
      expect(entries.every((e) => e.client_user_id === clientUserId)).toBe(true)
    })
  })

  describe('getPastEntries', () => {
    it('returns filled/expired/removed entries capped at 20', async () => {
      const { supabase, businessId, clientUserId } = await setup()
      // Mark the setup entry as expired
      const { data: client } = await supabase.from('clients').select('id').eq('user_id', clientUserId).eq('business_id', businessId).single()
      await supabase.from('waitlist_entries').update({ status: 'expired' }).eq('client_id', client!.id)

      const past = await getPastEntries(supabase, clientUserId)
      expect(past.length).toBeGreaterThan(0)
      expect(past.every((e) => ['filled', 'expired', 'removed'].includes(e.status))).toBe(true)
      expect(past.length).toBeLessThanOrEqual(20)
    })
  })

  describe('editPendingEntry', () => {
    it('updates time_windows when the entry is active and belongs to the user', async () => {
      const { supabase, entryId, clientUserId } = await setup()
      const newWindows = [{ days: [1, 3, 5], start: '14:00', end: '18:00' }]
      const result = await editPendingEntry(supabase, entryId, clientUserId, newWindows)
      expect(result.ok).toBe(true)

      const { data: entry } = await supabase.from('waitlist_entries').select('time_windows').eq('id', entryId).single()
      expect(entry?.time_windows).toEqual(newWindows)
    })

    it('returns error when the entry does not belong to the user', async () => {
      const { supabase, entryId } = await setup()
      const result = await editPendingEntry(supabase, entryId, 'wrong-user-id-000', [{ days: [1], start: '09:00', end: '17:00' }])
      expect(result.ok).toBe(false)
    })
  })

  describe('removeOwnEntry', () => {
    it('sets status to removed when entry is active and belongs to the user', async () => {
      const { supabase, entryId, clientUserId } = await setup()
      const result = await removeOwnEntry(supabase, entryId, clientUserId)
      expect(result.ok).toBe(true)

      const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
      expect(entry?.status).toBe('removed')
    })

    it('returns error when the entry does not belong to the user', async () => {
      const { supabase, entryId } = await setup()
      const result = await removeOwnEntry(supabase, entryId, 'wrong-user-id-000')
      expect(result.ok).toBe(false)
    })
  })
})
```

Run: `npx vitest run manage-own-entries.test.ts`
Expected: FAIL with "Cannot find module './manage-own-entries'"

- [ ] **Step 2: Implement `src/lib/client-dashboard/manage-own-entries.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

export type TimeWindow = { days: number[]; start: string; end: string }

export type ActiveEntry = {
  entry_id: string
  client_user_id: string
  business_name: string
  business_type: string
  whatsapp_number: string | null
  time_windows: TimeWindow[]
  status: string
  expires_at: string | null
}

export type PendingOffer = {
  notification_id: string
  entry_id: string
  business_name: string
  business_type: string
  slot_start: string | null
  slot_end: string | null
  offer_expires_at: string | null
}

export type PastEntry = {
  entry_id: string
  business_name: string
  status: string
  created_at: string | null
  expires_at: string | null
}

export async function getMyEntries(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ActiveEntry[]> {
  const { data } = await supabase
    .from('waitlist_entries')
    .select('id, status, time_windows, expires_at, clients!inner(user_id, businesses!inner(name, business_type, whatsapp_number))')
    .eq('clients.user_id', userId)
    .eq('status', 'active')

  return (data ?? []).map((row) => {
    const client = row.clients as { user_id: string; businesses: { name: string; business_type: string; whatsapp_number: string | null } }
    return {
      entry_id: row.id,
      client_user_id: client.user_id,
      business_name: client.businesses.name,
      business_type: client.businesses.business_type,
      whatsapp_number: client.businesses.whatsapp_number,
      time_windows: row.time_windows as unknown as TimeWindow[],
      status: row.status ?? 'active',
      expires_at: row.expires_at,
    }
  })
}

export async function getMyOffers(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<PendingOffer[]> {
  const { data } = await supabase
    .from('notifications')
    .select('id, status, metadata, waitlist_entries!inner(id, clients!inner(user_id, businesses!inner(name, business_type)))')
    .eq('type', 'slot_offer')
    .eq('status', 'sent')
    .eq('waitlist_entries.clients.user_id', userId)

  return (data ?? []).map((row) => {
    const entry = row.waitlist_entries as { id: string; clients: { user_id: string; businesses: { name: string; business_type: string } } }
    const meta = (row.metadata ?? {}) as Record<string, unknown>
    return {
      notification_id: row.id,
      entry_id: entry.id,
      business_name: entry.clients.businesses.name,
      business_type: entry.clients.businesses.business_type,
      slot_start: (meta.slot_start as string) ?? null,
      slot_end: (meta.slot_end as string) ?? null,
      offer_expires_at: (meta.expires_at as string) ?? null,
    }
  })
}

export async function getPastEntries(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<PastEntry[]> {
  const { data } = await supabase
    .from('waitlist_entries')
    .select('id, status, created_at, expires_at, clients!inner(user_id, businesses!inner(name))')
    .eq('clients.user_id', userId)
    .in('status', ['filled', 'expired', 'removed'])
    .order('created_at', { ascending: false })
    .limit(20)

  return (data ?? []).map((row) => {
    const client = row.clients as { user_id: string; businesses: { name: string } }
    return {
      entry_id: row.id,
      business_name: client.businesses.name,
      status: row.status ?? 'expired',
      created_at: row.created_at,
      expires_at: row.expires_at,
    }
  })
}

export async function editPendingEntry(
  supabase: SupabaseClient<Database>,
  entryId: string,
  userId: string,
  timeWindows: TimeWindow[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: entry } = await supabase
    .from('waitlist_entries')
    .select('id, status, clients!inner(user_id)')
    .eq('id', entryId)
    .eq('clients.user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (!entry) return { ok: false, error: 'Entry not found or cannot be edited.' }

  const { error } = await supabase
    .from('waitlist_entries')
    .update({ time_windows: timeWindows as unknown as Json })
    .eq('id', entryId)

  if (error) return { ok: false, error: 'Could not update entry.' }
  return { ok: true }
}

export async function removeOwnEntry(
  supabase: SupabaseClient<Database>,
  entryId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: entry } = await supabase
    .from('waitlist_entries')
    .select('id, status, clients!inner(user_id)')
    .eq('id', entryId)
    .eq('clients.user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (!entry) return { ok: false, error: 'Entry not found or already removed.' }

  const { error } = await supabase
    .from('waitlist_entries')
    .update({ status: 'removed' })
    .eq('id', entryId)

  if (error) return { ok: false, error: 'Could not remove entry.' }
  return { ok: true }
}
```

Run: `npx vitest run manage-own-entries.test.ts`
Expected: all tests pass.

- [ ] **Step 3: Create `src/app/api/client/entries/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import { editPendingEntry, removeOwnEntry } from '@/lib/client-dashboard/manage-own-entries'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const timeWindows: unknown = body?.time_windows
  if (!Array.isArray(timeWindows) || timeWindows.length === 0) {
    return NextResponse.json({ error: 'Please provide at least one time window.' }, { status: 400 })
  }

  const result = await editPendingEntry(supabase, params.id, user.id, timeWindows)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const result = await removeOwnEntry(supabase, params.id, user.id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Create offer confirm/decline routes**

Verify Task 21's function names and file path before writing these routes. Search for the exports Task 21 created:

```bash
grep -r "export.*confirmOffer\|export.*declineOffer" src/
```

Use the actual file path and function names found. The routes below assume `src/lib/offers/confirm-decline-offer.ts` — **adjust the import path to match what Task 21 actually created.**

`src/app/api/client/offers/[id]/confirm/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import { confirmOffer } from '@/lib/offers/confirm-decline-offer' // VERIFY PATH

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const result = await confirmOffer(supabase, params.id, user.id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

`src/app/api/client/offers/[id]/decline/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import { declineOffer } from '@/lib/offers/confirm-decline-offer' // VERIFY PATH

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const result = await declineOffer(supabase, params.id, user.id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

> Note: If `confirmOffer` and `declineOffer` do not accept a `userId` argument (Task 21 may only use a token), use the token-based approach instead for the email-link routes and create separate dashboard-action versions in `manage-own-entries.ts` that verify ownership via `user_id`. Check Task 21's interface before implementing.

- [ ] **Step 5: Create `src/app/client/dashboard/page.tsx`**

Server component — fetches all three data sets and renders them.

```tsx
import { getCurrentClient } from '@/lib/client-auth/get-current-client'
import { getMyEntries, getMyOffers, getPastEntries } from '@/lib/client-dashboard/manage-own-entries'
import ActiveEntriesSection from './active-entries-section'
import PendingOffersSection from './pending-offers-section'
import PastEntriesSection from './past-entries-section'

export default async function ClientDashboardPage() {
  const { supabase, profile } = await getCurrentClient()

  const [entries, offers, past] = await Promise.all([
    getMyEntries(supabase, profile.user_id),
    getMyOffers(supabase, profile.user_id),
    getPastEntries(supabase, profile.user_id),
  ])

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Welcome, {profile.name}</h1>

      <section>
        <h2>Pending slot offers</h2>
        <PendingOffersSection offers={offers} />
      </section>

      <section>
        <h2>Your active waitlists</h2>
        <ActiveEntriesSection entries={entries} />
      </section>

      <section>
        <h2>Past waitlists</h2>
        <PastEntriesSection entries={past} />
      </section>
    </main>
  )
}
```

- [ ] **Step 6: Create dashboard sub-components**

Create `src/app/client/dashboard/active-entries-section.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { ActiveEntry, TimeWindow } from '@/lib/client-dashboard/manage-own-entries'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ActiveEntriesSection({ entries }: { entries: ActiveEntry[] }) {
  const [localEntries, setLocalEntries] = useState(entries)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWindows, setEditWindows] = useState<TimeWindow[]>([])
  const [error, setError] = useState<string | null>(null)

  if (localEntries.length === 0) return <p>You are not on any waitlists.</p>

  async function handleCancel(entryId: string) {
    if (!confirm('Are you sure you want to cancel this waitlist entry?')) return
    const res = await fetch(`/api/client/entries/${entryId}`, { method: 'DELETE' })
    if (res.ok) setLocalEntries((prev) => prev.filter((e) => e.entry_id !== entryId))
    else {
      const data: unknown = await res.json()
      setError((data as { error?: string }).error ?? 'Could not cancel entry.')
    }
  }

  async function handleEditSave(entryId: string) {
    const res = await fetch(`/api/client/entries/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time_windows: editWindows }),
    })
    if (res.ok) {
      setLocalEntries((prev) => prev.map((e) => e.entry_id === entryId ? { ...e, time_windows: editWindows } : e))
      setEditingId(null)
    } else {
      const data: unknown = await res.json()
      setError((data as { error?: string }).error ?? 'Could not save changes.')
    }
  }

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {localEntries.map((entry) => (
        <div key={entry.entry_id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
          <strong>{entry.business_name}</strong>
          {entry.business_type && <span> · {entry.business_type}</span>}
          {entry.whatsapp_number && <span> · <a href={`https://wa.me/${entry.whatsapp_number}`}>Contact</a></span>}
          <p>Expires: {entry.expires_at ? new Date(entry.expires_at).toLocaleDateString() : 'N/A'}</p>

          {editingId === entry.entry_id ? (
            <div>
              {editWindows.map((w, i) => (
                <div key={i}>
                  {DAYS.map((label, day) => (
                    <label key={day}>
                      <input
                        type="checkbox"
                        checked={w.days.includes(day)}
                        onChange={() => setEditWindows((prev) => prev.map((x, j) =>
                          j !== i ? x : { ...x, days: x.days.includes(day) ? x.days.filter((d) => d !== day) : [...x.days, day].sort() }
                        ))}
                      />
                      {label}
                    </label>
                  ))}
                  <input type="time" value={w.start} onChange={(e) => setEditWindows((prev) => prev.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} />
                  <input type="time" value={w.end} onChange={(e) => setEditWindows((prev) => prev.map((x, j) => j === i ? { ...x, end: e.target.value } : x))} />
                </div>
              ))}
              <button onClick={() => handleEditSave(entry.entry_id)}>Save</button>
              <button onClick={() => setEditingId(null)}>Cancel edit</button>
            </div>
          ) : (
            <div>
              <button onClick={() => { setEditingId(entry.entry_id); setEditWindows(entry.time_windows) }}>Edit time windows</button>
              <button onClick={() => handleCancel(entry.entry_id)}>Cancel waitlist</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

Create `src/app/client/dashboard/pending-offers-section.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { PendingOffer } from '@/lib/client-dashboard/manage-own-entries'

export default function PendingOffersSection({ offers }: { offers: PendingOffer[] }) {
  const [localOffers, setLocalOffers] = useState(offers)
  const [error, setError] = useState<string | null>(null)

  if (localOffers.length === 0) return <p>No pending slot offers.</p>

  async function respond(notificationId: string, action: 'confirm' | 'decline') {
    const res = await fetch(`/api/client/offers/${notificationId}/${action}`, { method: 'POST' })
    if (res.ok) setLocalOffers((prev) => prev.filter((o) => o.notification_id !== notificationId))
    else {
      const data: unknown = await res.json()
      setError((data as { error?: string }).error ?? `Could not ${action} offer.`)
    }
  }

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {localOffers.map((offer) => (
        <div key={offer.notification_id} style={{ border: '1px solid #ffa', padding: '1rem', marginBottom: '1rem' }}>
          <strong>{offer.business_name}</strong>
          {offer.business_type && <span> · {offer.business_type}</span>}
          {offer.slot_start && <p>Slot: {new Date(offer.slot_start).toLocaleString()}{offer.slot_end ? ` – ${new Date(offer.slot_end).toLocaleTimeString()}` : ''}</p>}
          {offer.offer_expires_at && <p>Offer expires: {new Date(offer.offer_expires_at).toLocaleString()}</p>}
          <button onClick={() => respond(offer.notification_id, 'confirm')}>Confirm</button>
          <button onClick={() => respond(offer.notification_id, 'decline')}>Decline</button>
        </div>
      ))}
    </div>
  )
}
```

Create `src/app/client/dashboard/past-entries-section.tsx`:

```tsx
import type { PastEntry } from '@/lib/client-dashboard/manage-own-entries'

export default function PastEntriesSection({ entries }: { entries: PastEntry[] }) {
  if (entries.length === 0) return <p>No past waitlist history.</p>
  return (
    <table>
      <thead>
        <tr><th>Business</th><th>Status</th><th>Date</th></tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.entry_id}>
            <td>{e.business_name}</td>
            <td style={{ textTransform: 'capitalize' }}>{e.status}</td>
            <td>{e.expires_at ? new Date(e.expires_at).toLocaleDateString() : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the new `manage-own-entries` tests.

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 8: Manual walkthrough**

With `npm run dev` and local Supabase running (logged in as a verified client with at least one waitlist entry):
1. Navigate to `/client/dashboard` → expect active entries, offers (if any), and past entries sections.
2. Click "Edit time windows" on an active entry → edit and save → verify the update persists on refresh.
3. Click "Cancel waitlist" → confirm the prompt → entry disappears from the active list and appears in Past (status: removed) on next visit.
4. If Task 21 is complete: trigger a slot offer via the business dashboard and verify it appears in the "Pending slot offers" section. Click Confirm or Decline from the dashboard.
5. Unauthenticated access to `/client/dashboard` → expect redirect to `/client/login`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/client-dashboard/manage-own-entries.ts \
        src/lib/client-dashboard/manage-own-entries.test.ts \
        src/app/api/client/entries/ \
        src/app/api/client/offers/ \
        src/app/client/dashboard/
git commit -m "feat: add client dashboard with active entries, slot offers, and past history"
```

---
