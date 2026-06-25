### Task 21: Confirm / Decline Flow

> ────────────────────────────────────────────────────────────────
> ## ⚠️ SCHEMA AMENDMENT — READ BEFORE IMPLEMENTING
>
> **Reason:** Task 25 migrates `clients` to drop `name`/`email`/`phone` columns. Client
> identity now lives in `client_profiles` (joined via `clients.user_id`). Apply ALL five
> changes below in place of the original code wherever it appears.
>
> **Change 1 — test helper import and cleanup**
>
> Add `cleanupTestClient` to the import on line 27:
> ```ts
> import { createTestBusiness, cleanupTestBusiness, createTestClientAndEntry, cleanupTestClient } from '@/lib/cron/test-helpers'
> ```
> Add a `clientCleanups` array alongside `cleanups`:
> ```ts
> const clientCleanups: string[] = []
> ```
> Update `afterEach` to drain it **before** businesses (clients must be deleted first):
> ```ts
> afterEach(async () => {
>   const supabase = createServiceRoleClient()
>   while (clientCleanups.length > 0) await cleanupTestClient(supabase, clientCleanups.pop()!)
>   while (cleanups.length > 0) {
>     const next = cleanups.pop()!
>     await cleanupTestBusiness(supabase, next.businessId, next.userId)
>   }
> })
> ```
>
> **Change 2 — `setupOffer` client row (lines 76-80)**
>
> Replace:
> ```ts
> const { entryId, clientId } = await createTestClientAndEntry(supabase, businessId)
> await supabase
>   .from('clients')
>   .update({ email: 'client@example.com', name: 'Jane Doe', phone: '15559876543' })
>   .eq('id', clientId)
> ```
> With:
> ```ts
> const { entryId, userId: clientUserId } = await createTestClientAndEntry(supabase, businessId)
> clientCleanups.push(clientUserId)
> await supabase
>   .from('client_profiles')
>   .update({ email: 'client@example.com', name: 'Jane Doe', phone: '15559876543' })
>   .eq('user_id', clientUserId)
> ```
>
> **Change 3 — `OfferRow` interface `clients` type**
>
> Replace:
> ```ts
> clients: { name: string; email: string; phone: string } | null
> ```
> With:
> ```ts
> clients: { client_profiles: { name: string; email: string; phone: string } | null } | null
> ```
>
> **Change 4 — `fetchOfferRow` select string**
>
> Replace:
> ```
> waitlist_entries(id, business_id, clients(name, email, phone))
> ```
> With:
> ```
> waitlist_entries(id, business_id, clients(client_profiles(name, email, phone)))
> ```
>
> **Change 5 — `confirmOffer` client access and calendar description**
>
> Replace:
> ```ts
> const client = waitlistEntry?.clients
> if (!appointment || appointment.status !== 'cancelled' || !waitlistEntry || !client) {
> ```
> With:
> ```ts
> const clientProfile = waitlistEntry?.clients?.client_profiles
> if (!appointment || appointment.status !== 'cancelled' || !waitlistEntry || !clientProfile) {
> ```
> And replace the `createEvent` description argument:
> ```ts
> description: `Client: ${client.name}, ${client.email}, ${client.phone}`,
> ```
> With:
> ```ts
> description: `Client: ${clientProfile.name}, ${clientProfile.email}, ${clientProfile.phone}`,
> ```
>
> **Interface note for Task 30:** Task 30's dashboard offer routes need to action offers
> by notification ID + user ownership, not token. Task 30 will add `confirmOfferById` and
> `declineOfferById` variants to this file (or to `manage-own-entries.ts`). The token-based
> functions in this task are unchanged and continue to serve the email-link flow.
> ────────────────────────────────────────────────────────────────

**Files:**
- Create: `src/lib/confirm/confirm-offer.ts`
- Test: `src/lib/confirm/confirm-offer.test.ts` (integration — requires local Supabase running)
- Create: `src/app/confirm/[token]/page.tsx`
- Create: `src/app/confirm/[token]/confirm-form.tsx`
- Create: `src/app/api/confirm/[token]/route.ts`

**Interfaces:**
- Consumes: `CalendarProvider`/`CreateEventInput`/`CalendarEvent` (Task 9), `GoogleCalendarProvider` (Task 9), `decrypt` (Task 3), `createServiceRoleClient` (Task 7), `createTestBusiness`/`cleanupTestBusiness`/`createTestClientAndEntry` (Task 14).
- Produces:
  - `interface OfferDetails { businessName: string; slotDescription: string; startTime: string; endTime: string }`
  - `type OfferFailureReason = 'invalid' | 'already_confirmed' | 'already_declined' | 'expired' | 'gone'`
  - `getOfferDetails(supabase: SupabaseClient<Database>, token: string, now?: Date): Promise<{ ok: true; details: OfferDetails } | { ok: false; reason: OfferFailureReason }>`
  - `confirmOffer(supabase: SupabaseClient<Database>, token: string, provider: CalendarProvider, now?: Date): Promise<{ ok: true } | { ok: false; reason: OfferFailureReason }>`
  - `declineOffer(supabase: SupabaseClient<Database>, token: string, now?: Date): Promise<{ ok: true } | { ok: false; reason: OfferFailureReason }>`
  - Nothing later in this plan consumes these directly — this is the terminal client-facing flow for a slot offer.

- [ ] **Step 1: Write the failing tests**

`src/lib/confirm/confirm-offer.test.ts`:

```ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness, createTestClientAndEntry } from '@/lib/cron/test-helpers'
import { getOfferDetails, confirmOffer, declineOffer } from './confirm-offer'
import type { CalendarProvider, CreateEventInput, CalendarEvent } from '@/lib/calendar/provider'

function fakeProvider(createEventImpl?: CalendarProvider['createEvent']): CalendarProvider {
  return {
    listCalendars: async () => [],
    createCalendar: async () => {
      throw new Error('not used in this test')
    },
    getCalendarTimezone: async () => 'UTC',
    listChangedEvents: async () => [],
    createEvent:
      createEventImpl ??
      (async (_calendarId: string, input: CreateEventInput): Promise<CalendarEvent> => ({
        providerEventId: 'evt-new',
        summary: input.summary,
        startTime: input.startTime,
        endTime: input.endTime,
        status: 'confirmed',
      })),
  }
}

describe('confirm-offer (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (cleanups.length > 0) {
      const next = cleanups.pop()!
      await cleanupTestBusiness(supabase, next.businessId, next.userId)
    }
  })

  async function setupOffer(
    opts: {
      notificationStatus?: string
      appointmentStatus?: string
      startTime?: string
      minConfirmLeadHours?: number
    } = {}
  ) {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase, {
      min_confirm_lead_hours: opts.minConfirmLeadHours ?? 12,
      min_notice_hours: 24,
    })
    cleanups.push({ businessId, userId })
    const { entryId, clientId } = await createTestClientAndEntry(supabase, businessId)
    await supabase
      .from('clients')
      .update({ email: 'client@example.com', name: 'Jane Doe', phone: '15559876543' })
      .eq('id', clientId)

    const { data: appointment } = await supabase
      .from('appointments')
      .insert({
        business_id: businessId,
        google_event_id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        summary: 'Haircut',
        start_time: opts.startTime ?? '2026-08-01T10:00:00Z',
        end_time: '2026-08-01T11:00:00Z',
        status: opts.appointmentStatus ?? 'cancelled',
      })
      .select('id')
      .single()

    const token = `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`
    await supabase.from('notifications').insert({
      waitlist_entry_id: entryId,
      appointment_id: appointment!.id,
      type: 'slot_offer',
      status: opts.notificationStatus ?? 'sent',
      token,
      batch_number: 1,
    })

    return { supabase, businessId, entryId, appointmentId: appointment!.id, token }
  }

  describe('getOfferDetails', () => {
    it('returns slot details for an open, eligible offer', async () => {
      const { supabase, token } = await setupOffer()
      const result = await getOfferDetails(supabase, token, new Date('2026-07-01T00:00:00Z'))
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error('expected ok')
      expect(result.details.businessName).toBe('Test Business')
      expect(result.details.slotDescription).toBe('Haircut')
      expect(new Date(result.details.startTime).toISOString()).toBe('2026-08-01T10:00:00.000Z')
      expect(new Date(result.details.endTime).toISOString()).toBe('2026-08-01T11:00:00.000Z')
    })

    it('returns invalid for an unknown token', async () => {
      const supabase = createServiceRoleClient()
      const result = await getOfferDetails(supabase, 'no-such-token', new Date())
      expect(result).toEqual({ ok: false, reason: 'invalid' })
    })

    it('returns gone when the appointment is no longer cancelled', async () => {
      const { supabase, token } = await setupOffer({ appointmentStatus: 'confirmed' })
      const result = await getOfferDetails(supabase, token, new Date('2026-07-01T00:00:00Z'))
      expect(result).toEqual({ ok: false, reason: 'gone' })
    })

    it('returns gone when fewer than min_confirm_lead_hours remain before the slot', async () => {
      const { supabase, token } = await setupOffer({ startTime: '2026-08-01T10:00:00Z', minConfirmLeadHours: 12 })
      const result = await getOfferDetails(supabase, token, new Date('2026-08-01T01:00:00Z'))
      expect(result).toEqual({ ok: false, reason: 'gone' })
    })

    it.each([
      ['confirmed', 'already_confirmed'],
      ['declined', 'already_declined'],
      ['expired', 'expired'],
      ['superseded', 'gone'],
    ] as const)('maps notification status %s to reason %s', async (notificationStatus, reason) => {
      const { supabase, token } = await setupOffer({ notificationStatus })
      const result = await getOfferDetails(supabase, token, new Date('2026-07-01T00:00:00Z'))
      expect(result).toEqual({ ok: false, reason })
    })
  })

  describe('confirmOffer', () => {
    it('creates the replacement event, fills the entry, and supersedes sibling offers', async () => {
      const { supabase, entryId, appointmentId, token } = await setupOffer()

      const { data: sibling } = await supabase
        .from('notifications')
        .insert({
          waitlist_entry_id: entryId,
          appointment_id: appointmentId,
          type: 'slot_offer',
          status: 'sent',
          token: `${token}-sibling`,
          batch_number: 1,
        })
        .select('id')
        .single()

      const mockCreateEvent = vi.fn(async (_calendarId: string, input: CreateEventInput): Promise<CalendarEvent> => ({
        providerEventId: 'evt-new',
        summary: input.summary,
        startTime: input.startTime,
        endTime: input.endTime,
        status: 'confirmed',
      }))

      const result = await confirmOffer(supabase, token, fakeProvider(mockCreateEvent), new Date('2026-07-01T00:00:00Z'))

      expect(result).toEqual({ ok: true })
      expect(mockCreateEvent).toHaveBeenCalledWith(
        'calendar-placeholder',
        expect.objectContaining({ summary: 'Haircut', description: expect.stringContaining('Jane Doe') })
      )

      const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
      expect(entry?.status).toBe('filled')

      const { data: siblingRow } = await supabase.from('notifications').select('status').eq('id', sibling!.id).single()
      expect(siblingRow?.status).toBe('superseded')
    })

    it('rejects a second confirm attempt on the same notification', async () => {
      const { supabase, token } = await setupOffer()
      const first = await confirmOffer(supabase, token, fakeProvider(), new Date('2026-07-01T00:00:00Z'))
      expect(first).toEqual({ ok: true })

      const second = await confirmOffer(supabase, token, fakeProvider(), new Date('2026-07-01T00:00:00Z'))
      expect(second).toEqual({ ok: false, reason: 'already_confirmed' })
    })

    it('rejects confirm when a sibling notification already confirmed the same appointment', async () => {
      const { supabase, entryId, appointmentId, token } = await setupOffer()
      await supabase.from('notifications').insert({
        waitlist_entry_id: entryId,
        appointment_id: appointmentId,
        type: 'slot_offer',
        status: 'confirmed',
        token: `${token}-sibling-confirmed`,
        batch_number: 1,
      })

      const result = await confirmOffer(supabase, token, fakeProvider(), new Date('2026-07-01T00:00:00Z'))
      expect(result).toEqual({ ok: false, reason: 'gone' })
    })

    it('rejects confirm when fewer than min_confirm_lead_hours remain', async () => {
      const { supabase, token } = await setupOffer({ minConfirmLeadHours: 12 })
      const result = await confirmOffer(supabase, token, fakeProvider(), new Date('2026-08-01T01:00:00Z'))
      expect(result).toEqual({ ok: false, reason: 'gone' })
    })

    it('returns invalid for an unknown token', async () => {
      const supabase = createServiceRoleClient()
      const result = await confirmOffer(supabase, 'no-such-token', fakeProvider(), new Date())
      expect(result).toEqual({ ok: false, reason: 'invalid' })
    })
  })

  describe('declineOffer', () => {
    it('marks the notification declined', async () => {
      const { supabase, token } = await setupOffer()
      const result = await declineOffer(supabase, token, new Date('2026-07-01T00:00:00Z'))
      expect(result).toEqual({ ok: true })

      const { data } = await supabase.from('notifications').select('status, responded_at').eq('token', token).single()
      expect(data?.status).toBe('declined')
      expect(data?.responded_at).toBeTruthy()
    })

    it('rejects declining a notification that was already declined', async () => {
      const { supabase, token } = await setupOffer({ notificationStatus: 'declined' })
      const result = await declineOffer(supabase, token, new Date('2026-07-01T00:00:00Z'))
      expect(result).toEqual({ ok: false, reason: 'already_declined' })
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- confirm-offer.test.ts`
Expected: FAIL — `src/lib/confirm/confirm-offer.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/confirm/confirm-offer.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { CalendarProvider } from '@/lib/calendar/provider'

export interface OfferDetails {
  businessName: string
  slotDescription: string
  startTime: string
  endTime: string
}

export type OfferFailureReason = 'invalid' | 'already_confirmed' | 'already_declined' | 'expired' | 'gone'

interface OfferRow {
  id: string
  status: string
  appointment_id: string | null
  waitlist_entry_id: string
  appointments: { id: string; status: string; summary: string | null; start_time: string; end_time: string } | null
  waitlist_entries: {
    id: string
    business_id: string
    clients: { name: string; email: string; phone: string } | null
  } | null
}

async function fetchOfferRow(supabase: SupabaseClient<Database>, token: string): Promise<OfferRow | null> {
  const { data } = await supabase
    .from('notifications')
    .select(
      'id, status, appointment_id, waitlist_entry_id, appointments(id, status, summary, start_time, end_time), waitlist_entries(id, business_id, clients(name, email, phone))'
    )
    .eq('token', token)
    .eq('type', 'slot_offer')
    .maybeSingle()
  return data as OfferRow | null
}

async function fetchBusiness(supabase: SupabaseClient<Database>, businessId: string) {
  const { data } = await supabase
    .from('businesses')
    .select('id, name, min_confirm_lead_hours, dedicated_calendar_id')
    .eq('id', businessId)
    .single()
  return data!
}

function statusFailure(status: string): OfferFailureReason | null {
  if (status === 'confirmed') return 'already_confirmed'
  if (status === 'declined') return 'already_declined'
  if (status === 'expired') return 'expired'
  if (status === 'superseded') return 'gone'
  return null
}

export async function getOfferDetails(
  supabase: SupabaseClient<Database>,
  token: string,
  now: Date = new Date()
): Promise<{ ok: true; details: OfferDetails } | { ok: false; reason: OfferFailureReason }> {
  const offer = await fetchOfferRow(supabase, token)
  if (!offer) return { ok: false, reason: 'invalid' }

  const statusReason = statusFailure(offer.status)
  if (statusReason) return { ok: false, reason: statusReason }

  const appointment = offer.appointments
  const waitlistEntry = offer.waitlist_entries
  if (!appointment || appointment.status !== 'cancelled' || !waitlistEntry) {
    return { ok: false, reason: 'gone' }
  }

  const business = await fetchBusiness(supabase, waitlistEntry.business_id)
  const hoursUntilStart = (new Date(appointment.start_time).getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursUntilStart < business.min_confirm_lead_hours) {
    return { ok: false, reason: 'gone' }
  }

  return {
    ok: true,
    details: {
      businessName: business.name,
      slotDescription: appointment.summary ?? 'Appointment',
      startTime: appointment.start_time,
      endTime: appointment.end_time,
    },
  }
}

export async function confirmOffer(
  supabase: SupabaseClient<Database>,
  token: string,
  provider: CalendarProvider,
  now: Date = new Date()
): Promise<{ ok: true } | { ok: false; reason: OfferFailureReason }> {
  const offer = await fetchOfferRow(supabase, token)
  if (!offer) return { ok: false, reason: 'invalid' }

  const statusReason = statusFailure(offer.status)
  if (statusReason) return { ok: false, reason: statusReason }

  const appointment = offer.appointments
  const waitlistEntry = offer.waitlist_entries
  const client = waitlistEntry?.clients
  if (!appointment || appointment.status !== 'cancelled' || !waitlistEntry || !client) {
    return { ok: false, reason: 'gone' }
  }

  const business = await fetchBusiness(supabase, waitlistEntry.business_id)
  const hoursUntilStart = (new Date(appointment.start_time).getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursUntilStart < business.min_confirm_lead_hours) {
    return { ok: false, reason: 'gone' }
  }

  const { data: alreadyConfirmed } = await supabase
    .from('notifications')
    .select('id')
    .eq('appointment_id', appointment.id)
    .eq('status', 'confirmed')
    .maybeSingle()
  if (alreadyConfirmed) {
    return { ok: false, reason: 'gone' }
  }

  const { data: claimed } = await supabase
    .from('notifications')
    .update({ status: 'confirmed', responded_at: now.toISOString() })
    .eq('id', offer.id)
    .eq('status', 'sent')
    .select('id')
    .maybeSingle()
  if (!claimed) {
    return { ok: false, reason: 'gone' }
  }

  await provider.createEvent(business.dedicated_calendar_id, {
    summary: appointment.summary ?? 'Appointment',
    description: `Client: ${client.name}, ${client.email}, ${client.phone}`,
    startTime: new Date(appointment.start_time),
    endTime: new Date(appointment.end_time),
  })

  await supabase.from('waitlist_entries').update({ status: 'filled' }).eq('id', waitlistEntry.id)

  await supabase
    .from('notifications')
    .update({ status: 'superseded' })
    .eq('appointment_id', appointment.id)
    .eq('status', 'sent')
    .neq('id', offer.id)

  return { ok: true }
}

export async function declineOffer(
  supabase: SupabaseClient<Database>,
  token: string,
  now: Date = new Date()
): Promise<{ ok: true } | { ok: false; reason: OfferFailureReason }> {
  const offer = await fetchOfferRow(supabase, token)
  if (!offer) return { ok: false, reason: 'invalid' }

  const statusReason = statusFailure(offer.status)
  if (statusReason) return { ok: false, reason: statusReason }

  const { data: claimed } = await supabase
    .from('notifications')
    .update({ status: 'declined', responded_at: now.toISOString() })
    .eq('id', offer.id)
    .eq('status', 'sent')
    .select('id')
    .maybeSingle()
  if (!claimed) {
    return { ok: false, reason: 'gone' }
  }

  return { ok: true }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- confirm-offer.test.ts`
Expected: PASS (15 tests)

- [ ] **Step 5: Build the confirm/decline page, form, and API route**

`src/app/confirm/[token]/page.tsx`:

```tsx
import { createServiceRoleClient } from '@/lib/db/supabase'
import { getOfferDetails, declineOffer, type OfferFailureReason } from '@/lib/confirm/confirm-offer'
import { ConfirmForm } from './confirm-form'

const REASON_MESSAGES: Record<OfferFailureReason, string> = {
  invalid: 'This link is invalid.',
  already_confirmed: "You've already confirmed this slot.",
  already_declined: "You've already declined this slot.",
  expired: 'This offer has expired.',
  gone: 'This slot is no longer available.',
}

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ decline?: string }>
}) {
  const { token } = await params
  const { decline } = await searchParams
  const supabase = createServiceRoleClient()

  if (decline === 'true') {
    const result = await declineOffer(supabase, token)
    return (
      <main>
        <h1>{result.ok ? 'Slot declined' : 'Unable to process'}</h1>
        <p>
          {result.ok
            ? "Thanks for letting us know — we'll offer it to the next person on the list."
            : REASON_MESSAGES[result.reason]}
        </p>
      </main>
    )
  }

  const result = await getOfferDetails(supabase, token)
  if (!result.ok) {
    return (
      <main>
        <h1>Unable to process</h1>
        <p>{REASON_MESSAGES[result.reason]}</p>
      </main>
    )
  }

  return <ConfirmForm token={token} details={result.details} />
}
```

`src/app/confirm/[token]/confirm-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { OfferDetails } from '@/lib/confirm/confirm-offer'

export function ConfirmForm({ token, details }: { token: string; details: OfferDetails }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorReason, setErrorReason] = useState<string | null>(null)

  async function handleConfirm() {
    setState('submitting')
    const res = await fetch(`/api/confirm/${token}`, { method: 'POST' })
    const body = await res.json()
    if (res.ok && body.ok) {
      setState('success')
    } else {
      setState('error')
      setErrorReason(body.reason ?? 'gone')
    }
  }

  if (state === 'success') {
    return (
      <main>
        <h1>You&apos;re all set</h1>
        <p>Your appointment at {details.businessName} is confirmed.</p>
      </main>
    )
  }

  if (state === 'error') {
    return (
      <main>
        <h1>Unable to confirm</h1>
        <p>
          {errorReason === 'already_confirmed'
            ? "You've already confirmed this slot."
            : 'This slot is no longer available — someone else may have already taken it.'}
        </p>
      </main>
    )
  }

  return (
    <main>
      <h1>Confirm your appointment at {details.businessName}</h1>
      <p>
        {new Date(details.startTime).toLocaleString()} – {new Date(details.endTime).toLocaleString()}
      </p>
      <p>{details.slotDescription}</p>
      <button onClick={handleConfirm} disabled={state === 'submitting'}>
        {state === 'submitting' ? 'Confirming…' : 'Confirm this slot'}
      </button>
    </main>
  )
}
```

`src/app/api/confirm/[token]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { decrypt } from '@/lib/crypto/encrypt'
import { GoogleCalendarProvider } from '@/lib/calendar/google-provider'
import { confirmOffer } from '@/lib/confirm/confirm-offer'

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceRoleClient()

  const { data: notification } = await supabase
    .from('notifications')
    .select('waitlist_entries(business_id)')
    .eq('token', token)
    .eq('type', 'slot_offer')
    .maybeSingle()

  const businessId = notification?.waitlist_entries?.business_id
  if (!businessId) {
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 404 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('google_refresh_token_encrypted')
    .eq('id', businessId)
    .single()

  if (!business) {
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 404 })
  }

  const provider = new GoogleCalendarProvider(decrypt(business.google_refresh_token_encrypted))
  const result = await confirmOffer(supabase, token, provider)

  return NextResponse.json(result, { status: result.ok ? 200 : 409 })
}
```

- [ ] **Step 6: Manual walkthrough**

With `supabase start` and `npm run dev` running: use Supabase Studio to insert a `sent` `slot_offer` notification row (with a real `appointment_id` pointing at a `cancelled` appointment at least `min_confirm_lead_hours` away) and copy its `token`. Visit `/confirm/<token>` and confirm the slot details render; click "Confirm this slot" and verify the success message shows, the `waitlist_entries` row flips to `filled` in Studio, and a new event appears on the dedicated Google Calendar. Then take a second `sent` token from a different batch round for the same appointment and visit `/confirm/<token>?decline=true` — confirm it immediately shows "Slot declined" and the row flips to `declined`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/confirm src/app/confirm src/app/api/confirm
git commit -m "feat: add confirm/decline flow for slot offers"
```

---

