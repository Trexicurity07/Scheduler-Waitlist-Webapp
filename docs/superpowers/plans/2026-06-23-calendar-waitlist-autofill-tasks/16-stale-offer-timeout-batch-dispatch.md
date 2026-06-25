### Task 16: Stale-Offer Resolution, Timeout Expiry, and Batch Dispatch

**Files:**
- Create: `src/lib/cron/dispatch-offers.ts`
- Test: `src/lib/cron/dispatch-offers.test.ts` (integration — requires local Supabase running)

**Interfaces:**
- Consumes: `ClaimedBusiness` (Task 14), `matchWaitlistEntries`/`TimeWindow`/`WaitlistEntryForMatching`/`SlotToMatch` (Task 6), `generateToken` (Task 4), `buildWhatsAppLink` (Task 5), `sendSlotOfferEmail`/`sendSlotGoneEmail` (Task 13), `createTestBusiness`/`cleanupTestBusiness`/`createTestClientAndEntry` (Task 14).
- Produces:
  - `resolveStaleOffers(supabase: SupabaseClient<Database>, business: ClaimedBusiness): Promise<void>`
  - `expireTimedOutOffers(supabase: SupabaseClient<Database>, business: ClaimedBusiness, now: Date): Promise<void>`
  - `dispatchPendingOffers(supabase: SupabaseClient<Database>, business: ClaimedBusiness, now: Date): Promise<void>`
  - Consumed by Task 18's `processBusiness`, which calls these three functions in this order each cron pass, after `syncAppointments` (Task 15).

- [ ] **Step 1: Write the failing tests**

`src/lib/cron/dispatch-offers.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness, createTestClientAndEntry } from './test-helpers'
import type { ClaimedBusiness } from './claim-businesses'

const mockSendSlotOfferEmail = vi.fn()
const mockSendSlotGoneEmail = vi.fn()

vi.mock('@/lib/notifications/email', () => ({
  sendSlotOfferEmail: (...args: unknown[]) => mockSendSlotOfferEmail(...args),
  sendSlotGoneEmail: (...args: unknown[]) => mockSendSlotGoneEmail(...args),
}))

import { resolveStaleOffers, expireTimedOutOffers, dispatchPendingOffers } from './dispatch-offers'

// Amended 2026-06-25: the original parameter type here omitted `owner_user_id`,
// which `ClaimedBusiness` (Task 14) requires — `tsc --noEmit` failed on `return row`.
// `row` always has the field at runtime (it comes from `select('*')` on `businesses`);
// this was a stale hand-written type literal. Added the missing field, no logic change.
function toClaimedBusiness(row: {
  id: string
  owner_user_id: string
  name: string
  public_slug: string
  whatsapp_number: string
  timezone: string
  dedicated_calendar_id: string
  google_refresh_token_encrypted: string
  last_checked_at: string | null
  batch_size: number
  batch_interval_minutes: number
  min_notice_hours: number
  min_confirm_lead_hours: number
}): ClaimedBusiness {
  return row
}

describe('dispatch-offers (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  beforeEach(() => {
    mockSendSlotOfferEmail.mockReset()
    mockSendSlotGoneEmail.mockReset()
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
  })

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (cleanups.length > 0) {
      const next = cleanups.pop()!
      await cleanupTestBusiness(supabase, next.businessId, next.userId)
    }
  })

  async function setupBusiness(overrides: Record<string, unknown> = {}) {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase, overrides)
    cleanups.push({ businessId, userId })
    const { data: row } = await supabase.from('businesses').select('*').eq('id', businessId).single()
    return { supabase, business: toClaimedBusiness(row!), businessId, userId }
  }

  describe('resolveStaleOffers', () => {
    it('supersedes a sent offer and emails the client when the slot is retaken by a confirmed appointment', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const { entryId, clientId } = await createTestClientAndEntry(supabase, businessId)
      await supabase.from('clients').update({ email: 'client@example.com' }).eq('id', clientId)

      const { data: cancelledAppt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-cancelled',
          start_time: '2026-08-01T10:00:00Z',
          end_time: '2026-08-01T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      await supabase.from('appointments').insert({
        business_id: businessId,
        google_event_id: 'evt-rebooked',
        start_time: '2026-08-01T10:00:00Z',
        end_time: '2026-08-01T11:00:00Z',
        status: 'confirmed',
      })

      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          waitlist_entry_id: entryId,
          appointment_id: cancelledAppt!.id,
          type: 'slot_offer',
          status: 'sent',
          token: 'tok-stale-1',
          batch_number: 1,
        })
        .select('id')
        .single()

      await resolveStaleOffers(supabase, business)

      const { data: updated } = await supabase
        .from('notifications')
        .select('status')
        .eq('id', notification!.id)
        .single()
      expect(updated?.status).toBe('superseded')
      expect(mockSendSlotGoneEmail).toHaveBeenCalledWith('client@example.com', expect.objectContaining({ businessName: business.name }))
    })

    it('leaves a sent offer untouched when no overlapping confirmed appointment exists', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const { entryId } = await createTestClientAndEntry(supabase, businessId)

      const { data: cancelledAppt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-cancelled-2',
          start_time: '2026-08-02T10:00:00Z',
          end_time: '2026-08-02T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          waitlist_entry_id: entryId,
          appointment_id: cancelledAppt!.id,
          type: 'slot_offer',
          status: 'sent',
          token: 'tok-stale-2',
          batch_number: 1,
        })
        .select('id')
        .single()

      await resolveStaleOffers(supabase, business)

      const { data: updated } = await supabase
        .from('notifications')
        .select('status')
        .eq('id', notification!.id)
        .single()
      expect(updated?.status).toBe('sent')
      expect(mockSendSlotGoneEmail).not.toHaveBeenCalled()
    })
  })

  describe('expireTimedOutOffers', () => {
    it('expires a sent offer older than batch_interval_minutes', async () => {
      const { supabase, business, businessId } = await setupBusiness({ batch_interval_minutes: 30 })
      const { entryId } = await createTestClientAndEntry(supabase, businessId)
      const { data: appt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-timeout-1',
          start_time: '2026-08-03T10:00:00Z',
          end_time: '2026-08-03T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      const sentAt = new Date('2026-07-01T00:00:00Z')
      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          waitlist_entry_id: entryId,
          appointment_id: appt!.id,
          type: 'slot_offer',
          status: 'sent',
          token: 'tok-timeout-1',
          batch_number: 1,
          sent_at: sentAt.toISOString(),
        })
        .select('id')
        .single()

      const now = new Date(sentAt.getTime() + 31 * 60 * 1000)
      await expireTimedOutOffers(supabase, business, now)

      const { data: updated } = await supabase
        .from('notifications')
        .select('status')
        .eq('id', notification!.id)
        .single()
      expect(updated?.status).toBe('expired')
    })

    it('does not expire a sent offer still within the batch interval', async () => {
      const { supabase, business, businessId } = await setupBusiness({ batch_interval_minutes: 30 })
      const { entryId } = await createTestClientAndEntry(supabase, businessId)
      const { data: appt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-timeout-2',
          start_time: '2026-08-04T10:00:00Z',
          end_time: '2026-08-04T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      const sentAt = new Date('2026-07-01T00:00:00Z')
      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          waitlist_entry_id: entryId,
          appointment_id: appt!.id,
          type: 'slot_offer',
          status: 'sent',
          token: 'tok-timeout-2',
          batch_number: 1,
          sent_at: sentAt.toISOString(),
        })
        .select('id')
        .single()

      const now = new Date(sentAt.getTime() + 10 * 60 * 1000)
      await expireTimedOutOffers(supabase, business, now)

      const { data: updated } = await supabase
        .from('notifications')
        .select('status')
        .eq('id', notification!.id)
        .single()
      expect(updated?.status).toBe('sent')
    })
  })

  describe('dispatchPendingOffers', () => {
    it('sends a batch to the longest-waiting matching candidate, respecting batch_size', async () => {
      const { supabase, business, businessId } = await setupBusiness({ batch_size: 1 })
      const window = [{ days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '23:59' }]
      const older = await createTestClientAndEntry(supabase, businessId, { time_windows: window })
      await supabase.from('clients').update({ email: 'older@example.com' }).eq('id', older.clientId)
      await supabase
        .from('waitlist_entries')
        .update({ created_at: '2026-01-01T00:00:00Z' })
        .eq('id', older.entryId)

      const newer = await createTestClientAndEntry(supabase, businessId, { time_windows: window })
      await supabase.from('clients').update({ email: 'newer@example.com' }).eq('id', newer.clientId)
      await supabase
        .from('waitlist_entries')
        .update({ created_at: '2026-06-01T00:00:00Z' })
        .eq('id', newer.entryId)

      const now = new Date('2026-06-23T00:00:00Z')
      const { data: appt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-dispatch-1',
          start_time: '2026-06-26T10:00:00Z',
          end_time: '2026-06-26T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      await dispatchPendingOffers(supabase, business, now)

      const { data: notifications } = await supabase
        .from('notifications')
        .select('waitlist_entry_id, batch_number, status')
        .eq('appointment_id', appt!.id)
      expect(notifications).toHaveLength(1)
      expect(notifications![0].waitlist_entry_id).toBe(older.entryId)
      expect(notifications![0].batch_number).toBe(1)
      expect(mockSendSlotOfferEmail).toHaveBeenCalledWith('older@example.com', expect.objectContaining({ businessName: business.name }))
    })

    it('does not send a batch when the slot is closer than min_notice_hours', async () => {
      const { supabase, business, businessId } = await setupBusiness({ min_notice_hours: 24 })
      const window = [{ days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '23:59' }]
      await createTestClientAndEntry(supabase, businessId, { time_windows: window })

      const now = new Date('2026-06-23T00:00:00Z')
      const { data: appt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-dispatch-2',
          start_time: '2026-06-23T10:00:00Z',
          end_time: '2026-06-23T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      await dispatchPendingOffers(supabase, business, now)

      const { data: notifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('appointment_id', appt!.id)
      expect(notifications).toHaveLength(0)
      expect(mockSendSlotOfferEmail).not.toHaveBeenCalled()
    })

    it('does not send a new batch while one is already active for the slot', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const window = [{ days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '23:59' }]
      const { entryId } = await createTestClientAndEntry(supabase, businessId, { time_windows: window })

      const now = new Date('2026-06-23T00:00:00Z')
      const { data: appt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-dispatch-3',
          start_time: '2026-06-26T10:00:00Z',
          end_time: '2026-06-26T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      await supabase.from('notifications').insert({
        waitlist_entry_id: entryId,
        appointment_id: appt!.id,
        type: 'slot_offer',
        status: 'sent',
        token: 'tok-active-batch',
        batch_number: 1,
      })

      await dispatchPendingOffers(supabase, business, now)

      const { data: notifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('appointment_id', appt!.id)
      expect(notifications).toHaveLength(1)
      expect(mockSendSlotOfferEmail).not.toHaveBeenCalled()
    })

    it('does not re-notify a candidate from an earlier expired batch, and increments batch_number', async () => {
      const { supabase, business, businessId } = await setupBusiness({ batch_size: 1 })
      const window = [{ days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '23:59' }]
      const first = await createTestClientAndEntry(supabase, businessId, { time_windows: window })
      await supabase.from('clients').update({ email: 'first@example.com' }).eq('id', first.clientId)
      await supabase.from('waitlist_entries').update({ created_at: '2026-01-01T00:00:00Z' }).eq('id', first.entryId)

      const second = await createTestClientAndEntry(supabase, businessId, { time_windows: window })
      await supabase.from('clients').update({ email: 'second@example.com' }).eq('id', second.clientId)
      await supabase.from('waitlist_entries').update({ created_at: '2026-02-01T00:00:00Z' }).eq('id', second.entryId)

      const now = new Date('2026-06-23T00:00:00Z')
      const { data: appt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-dispatch-4',
          start_time: '2026-06-26T10:00:00Z',
          end_time: '2026-06-26T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      await supabase.from('notifications').insert({
        waitlist_entry_id: first.entryId,
        appointment_id: appt!.id,
        type: 'slot_offer',
        status: 'expired',
        token: 'tok-round-1',
        batch_number: 1,
      })

      await dispatchPendingOffers(supabase, business, now)

      const { data: notifications } = await supabase
        .from('notifications')
        .select('waitlist_entry_id, batch_number')
        .eq('appointment_id', appt!.id)
        .eq('status', 'sent')
      expect(notifications).toHaveLength(1)
      expect(notifications![0].waitlist_entry_id).toBe(second.entryId)
      expect(notifications![0].batch_number).toBe(2)
    })

    it('does not send when the slot has already been filled (a confirmed notification exists)', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const window = [{ days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '23:59' }]
      const filledEntry = await createTestClientAndEntry(supabase, businessId, { time_windows: window })
      const otherEntry = await createTestClientAndEntry(supabase, businessId, { time_windows: window })

      const now = new Date('2026-06-23T00:00:00Z')
      const { data: appt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-dispatch-5',
          start_time: '2026-06-26T10:00:00Z',
          end_time: '2026-06-26T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      await supabase.from('notifications').insert({
        waitlist_entry_id: filledEntry.entryId,
        appointment_id: appt!.id,
        type: 'slot_offer',
        status: 'confirmed',
        token: 'tok-confirmed',
        batch_number: 1,
      })

      await dispatchPendingOffers(supabase, business, now)

      const { data: notifications } = await supabase
        .from('notifications')
        .select('waitlist_entry_id')
        .eq('appointment_id', appt!.id)
        .eq('waitlist_entry_id', otherEntry.entryId)
      expect(notifications).toHaveLength(0)
      expect(mockSendSlotOfferEmail).not.toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- dispatch-offers.test.ts`
Expected: FAIL — `src/lib/cron/dispatch-offers.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/cron/dispatch-offers.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { ClaimedBusiness } from './claim-businesses'
import {
  matchWaitlistEntries,
  type TimeWindow,
  type WaitlistEntryForMatching,
  type SlotToMatch,
} from '@/lib/matching/match-waitlist'
import { generateToken } from '@/lib/tokens/generate-token'
import { buildWhatsAppLink } from '@/lib/notifications/whatsapp'
import { sendSlotOfferEmail, sendSlotGoneEmail } from '@/lib/notifications/email'

export async function resolveStaleOffers(
  supabase: SupabaseClient<Database>,
  business: ClaimedBusiness
): Promise<void> {
  const { data: pendingOffers } = await supabase
    .from('notifications')
    .select('id, appointment_id, waitlist_entry_id, waitlist_entries!inner(business_id)')
    .eq('type', 'slot_offer')
    .eq('status', 'sent')
    .eq('waitlist_entries.business_id', business.id)
    .not('appointment_id', 'is', null)

  if (!pendingOffers || pendingOffers.length === 0) return

  const appointmentIds = [...new Set(pendingOffers.map((o) => o.appointment_id as string))]

  for (const appointmentId of appointmentIds) {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, start_time, end_time')
      .eq('id', appointmentId)
      .single()
    if (!appointment) continue

    const { data: overlapping } = await supabase
      .from('appointments')
      .select('id')
      .eq('business_id', business.id)
      .eq('status', 'confirmed')
      .lt('start_time', appointment.end_time)
      .gt('end_time', appointment.start_time)
      .neq('id', appointment.id)
      .limit(1)

    if (!overlapping || overlapping.length === 0) continue

    const offersForThisAppointment = pendingOffers.filter((o) => o.appointment_id === appointmentId)
    for (const offer of offersForThisAppointment) {
      await supabase
        .from('notifications')
        .update({ status: 'superseded', responded_at: new Date().toISOString() })
        .eq('id', offer.id)

      const { data: entry } = await supabase
        .from('waitlist_entries')
        .select('client_id')
        .eq('id', offer.waitlist_entry_id)
        .single()
      if (!entry) continue
      const { data: client } = await supabase.from('clients').select('email').eq('id', entry.client_id).single()
      if (!client) continue

      await sendSlotGoneEmail(client.email, {
        businessName: business.name,
        whatsappLink: buildWhatsAppLink(business.whatsapp_number, `Hi! Just checking in about ${business.name}.`),
      })
    }
  }
}

export async function expireTimedOutOffers(
  supabase: SupabaseClient<Database>,
  business: ClaimedBusiness,
  now: Date
): Promise<void> {
  const cutoff = new Date(now.getTime() - business.batch_interval_minutes * 60 * 1000).toISOString()

  const { data: timedOut } = await supabase
    .from('notifications')
    .select('id, waitlist_entries!inner(business_id)')
    .eq('type', 'slot_offer')
    .eq('status', 'sent')
    .eq('waitlist_entries.business_id', business.id)
    .lt('sent_at', cutoff)

  if (!timedOut || timedOut.length === 0) return

  await supabase
    .from('notifications')
    .update({ status: 'expired' })
    .in('id', timedOut.map((n) => n.id))
}

export async function dispatchPendingOffers(
  supabase: SupabaseClient<Database>,
  business: ClaimedBusiness,
  now: Date
): Promise<void> {
  const { data: cancelledAppointments } = await supabase
    .from('appointments')
    .select('id, start_time, end_time')
    .eq('business_id', business.id)
    .eq('status', 'cancelled')
    .gt('start_time', now.toISOString())

  if (!cancelledAppointments) return

  for (const appointment of cancelledAppointments) {
    await dispatchOfferForAppointment(supabase, business, appointment, now)
  }
}

async function dispatchOfferForAppointment(
  supabase: SupabaseClient<Database>,
  business: ClaimedBusiness,
  appointment: { id: string; start_time: string; end_time: string },
  now: Date
): Promise<void> {
  const startTime = new Date(appointment.start_time)
  const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntilStart < business.min_notice_hours) return
  if (hoursUntilStart < business.min_confirm_lead_hours) return

  const { data: existingNotifications } = await supabase
    .from('notifications')
    .select('id, status, waitlist_entry_id, batch_number')
    .eq('appointment_id', appointment.id)
    .eq('type', 'slot_offer')

  const notifications = existingNotifications ?? []
  if (notifications.some((n) => n.status === 'sent')) return
  if (notifications.some((n) => n.status === 'confirmed')) return

  const alreadyNotifiedEntryIds = new Set(notifications.map((n) => n.waitlist_entry_id))
  const highestBatchNumber = notifications.reduce((max, n) => Math.max(max, n.batch_number ?? 0), 0)

  const { data: activeEntries } = await supabase
    .from('waitlist_entries')
    .select('id, created_at, time_windows, client_id')
    .eq('business_id', business.id)
    .eq('status', 'active')

  const entries = activeEntries ?? []
  const candidates: WaitlistEntryForMatching[] = entries
    .filter((e) => !alreadyNotifiedEntryIds.has(e.id))
    // Amended 2026-06-25: `time_windows` is typed `Json` by the generated Supabase
    // types, which doesn't sufficiently overlap with `TimeWindow[]` for a direct
    // `as` cast — `tsc --noEmit` failed here. Route through `unknown` first, same
    // as any other jsonb-to-typed-interface cast; no runtime change (casts are erased).
    .map((e) => ({ id: e.id, createdAt: new Date(e.created_at), timeWindows: e.time_windows as unknown as TimeWindow[] }))

  const slot: SlotToMatch = { startTime, timezone: business.timezone }
  const matched = matchWaitlistEntries(slot, candidates).slice(0, business.batch_size)
  if (matched.length === 0) return

  const nextBatchNumber = highestBatchNumber + 1
  const slotDescription = startTime.toLocaleString('en-US', {
    timeZone: business.timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  for (const match of matched) {
    const entry = entries.find((e) => e.id === match.id)
    if (!entry) continue
    const { data: client } = await supabase.from('clients').select('email').eq('id', entry.client_id).single()
    if (!client) continue

    const token = generateToken()
    const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/confirm/${token}`
    const declineUrl = `${process.env.NEXT_PUBLIC_APP_URL}/confirm/${token}?decline=true`
    const whatsappLink = buildWhatsAppLink(
      business.whatsapp_number,
      `Hi! I'd like to grab the ${slotDescription} slot with ${business.name}.`
    )

    await supabase.from('notifications').insert({
      waitlist_entry_id: match.id,
      appointment_id: appointment.id,
      type: 'slot_offer',
      channel: 'email',
      status: 'sent',
      token,
      batch_number: nextBatchNumber,
    })

    await sendSlotOfferEmail(client.email, {
      businessName: business.name,
      slotDescription,
      confirmUrl,
      declineUrl,
      whatsappLink,
    })
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- dispatch-offers.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/cron/dispatch-offers.ts src/lib/cron/dispatch-offers.test.ts
git commit -m "feat: add stale-offer resolution, timeout expiry, and batch dispatch"
```

---

