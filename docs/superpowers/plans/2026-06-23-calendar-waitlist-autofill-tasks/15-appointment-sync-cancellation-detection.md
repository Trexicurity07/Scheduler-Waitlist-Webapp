### Task 15: Appointment Sync + Cancellation Detection

**Files:**
- Create: `src/lib/cron/sync-appointments.ts`
- Test: `src/lib/cron/sync-appointments.test.ts` (integration — requires local Supabase running)

**Interfaces:**
- Consumes: `CalendarProvider`, `CalendarEvent` (Task 9), `createTestBusiness`/`cleanupTestBusiness` (Task 14).
- Produces:
  - `interface NewlyCancelledAppointment { appointmentId: string; startTime: Date; endTime: Date }`
  - `syncAppointments(supabase: SupabaseClient<Database>, businessId: string, provider: CalendarProvider, calendarId: string, since: Date): Promise<{ newlyCancelled: NewlyCancelledAppointment[] }>`
  - Consumed by Task 18's `processBusiness`, which calls this per claimed business and feeds `newlyCancelled` into Task 16's offer dispatch.

- [ ] **Step 1: Write the failing tests**

`src/lib/cron/sync-appointments.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness } from './test-helpers'
import { syncAppointments } from './sync-appointments'
import type { CalendarProvider, CalendarEvent, CalendarListEntry, CreateEventInput } from '@/lib/calendar/provider'

function fakeProvider(events: CalendarEvent[]): CalendarProvider {
  return {
    listCalendars: async (): Promise<CalendarListEntry[]> => [],
    createCalendar: async (): Promise<CalendarListEntry> => {
      throw new Error('not implemented')
    },
    getCalendarTimezone: async (): Promise<string> => 'UTC',
    listChangedEvents: async (): Promise<CalendarEvent[]> => events,
    createEvent: async (_calendarId: string, _input: CreateEventInput): Promise<CalendarEvent> => {
      throw new Error('not implemented')
    },
  }
}

describe('syncAppointments (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (cleanups.length > 0) {
      const next = cleanups.pop()!
      await cleanupTestBusiness(supabase, next.businessId, next.userId)
    }
  })

  it('flags a cancelled event with no prior synced row as newly cancelled', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const provider = fakeProvider([
      {
        providerEventId: 'evt-1',
        summary: 'Haircut',
        startTime: new Date('2026-07-01T10:00:00Z'),
        endTime: new Date('2026-07-01T11:00:00Z'),
        status: 'cancelled',
      },
    ])

    const result = await syncAppointments(supabase, businessId, provider, 'cal1', new Date('2026-06-01T00:00:00Z'))
    expect(result.newlyCancelled).toHaveLength(1)
    expect(result.newlyCancelled[0].startTime).toEqual(new Date('2026-07-01T10:00:00Z'))
  })

  it('flags an event that transitions from confirmed to cancelled across two syncs', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const confirmedProvider = fakeProvider([
      {
        providerEventId: 'evt-2',
        summary: 'Massage',
        startTime: new Date('2026-07-02T09:00:00Z'),
        endTime: new Date('2026-07-02T10:00:00Z'),
        status: 'confirmed',
      },
    ])
    const firstResult = await syncAppointments(
      supabase,
      businessId,
      confirmedProvider,
      'cal1',
      new Date('2026-06-01T00:00:00Z')
    )
    expect(firstResult.newlyCancelled).toHaveLength(0)

    const cancelledProvider = fakeProvider([
      {
        providerEventId: 'evt-2',
        summary: 'Massage',
        startTime: new Date('2026-07-02T09:00:00Z'),
        endTime: new Date('2026-07-02T10:00:00Z'),
        status: 'cancelled',
      },
    ])
    const secondResult = await syncAppointments(
      supabase,
      businessId,
      cancelledProvider,
      'cal1',
      new Date('2026-06-02T00:00:00Z')
    )
    expect(secondResult.newlyCancelled).toHaveLength(1)
  })

  it('does not re-flag an event that is already cancelled in the database', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const provider = fakeProvider([
      {
        providerEventId: 'evt-3',
        summary: 'Trim',
        startTime: new Date('2026-07-03T09:00:00Z'),
        endTime: new Date('2026-07-03T09:30:00Z'),
        status: 'cancelled',
      },
    ])

    await syncAppointments(supabase, businessId, provider, 'cal1', new Date('2026-06-01T00:00:00Z'))
    const secondResult = await syncAppointments(supabase, businessId, provider, 'cal1', new Date('2026-06-02T00:00:00Z'))
    expect(secondResult.newlyCancelled).toHaveLength(0)
  })

  it('upserts a confirmed event without flagging it as cancelled', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const provider = fakeProvider([
      {
        providerEventId: 'evt-4',
        summary: 'Color',
        startTime: new Date('2026-07-04T13:00:00Z'),
        endTime: new Date('2026-07-04T14:30:00Z'),
        status: 'confirmed',
      },
    ])

    const result = await syncAppointments(supabase, businessId, provider, 'cal1', new Date('2026-06-01T00:00:00Z'))
    expect(result.newlyCancelled).toHaveLength(0)

    const { data } = await supabase
      .from('appointments')
      .select('status')
      .eq('business_id', businessId)
      .eq('google_event_id', 'evt-4')
      .single()
    expect(data?.status).toBe('confirmed')
  })

  it('handles multiple events in one call, flagging only the cancelled one', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const provider = fakeProvider([
      {
        providerEventId: 'evt-5',
        summary: 'Cut',
        startTime: new Date('2026-07-05T09:00:00Z'),
        endTime: new Date('2026-07-05T09:30:00Z'),
        status: 'confirmed',
      },
      {
        providerEventId: 'evt-6',
        summary: 'Beard trim',
        startTime: new Date('2026-07-05T10:00:00Z'),
        endTime: new Date('2026-07-05T10:30:00Z'),
        status: 'cancelled',
      },
    ])

    const result = await syncAppointments(supabase, businessId, provider, 'cal1', new Date('2026-06-01T00:00:00Z'))
    expect(result.newlyCancelled).toHaveLength(1)
    expect(result.newlyCancelled[0].appointmentId).toBeTypeOf('string')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- sync-appointments.test.ts`
Expected: FAIL — `src/lib/cron/sync-appointments.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/cron/sync-appointments.ts`**

> **Amended 2026-06-25** — the original version of this step did one read + one
> upsert per event in a sequential loop (2N round-trips; a thrown error on
> event K discarded already-detected cancellations for events 1..K-1 in the
> same call). Reviewer flagged both as Important findings during Task 15's
> review. Approved fix: batch the read and the write into one query each.
> This also makes the write atomic (the single multi-row upsert statement
> either fully commits or fully rolls back, so there's no more
> partially-applied-batch state) — not full per-event failure isolation,
> which was judged too complex for the value it adds at this scale. The
> read-before-write ordering (existing rows fetched before the upsert) is
> preserved exactly, since that's what makes cancellation-transition
> detection correct. No test changes — this is an internal refactor; all 5
> tests in Step 1 must keep passing unmodified.

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { CalendarProvider } from '@/lib/calendar/provider'

export interface NewlyCancelledAppointment {
  appointmentId: string
  startTime: Date
  endTime: Date
}

export async function syncAppointments(
  supabase: SupabaseClient<Database>,
  businessId: string,
  provider: CalendarProvider,
  calendarId: string,
  since: Date
): Promise<{ newlyCancelled: NewlyCancelledAppointment[] }> {
  const events = await provider.listChangedEvents(calendarId, since)
  if (events.length === 0) return { newlyCancelled: [] }

  const eventIds = events.map((event) => event.providerEventId)

  const { data: existingRows, error: existingError } = await supabase
    .from('appointments')
    .select('google_event_id, status')
    .eq('business_id', businessId)
    .in('google_event_id', eventIds)
  if (existingError) throw existingError

  const priorStatusByEventId = new Map(
    (existingRows ?? []).map((row) => [row.google_event_id, row.status])
  )

  const { data: upserted, error: upsertError } = await supabase
    .from('appointments')
    .upsert(
      events.map((event) => ({
        business_id: businessId,
        google_event_id: event.providerEventId,
        summary: event.summary,
        start_time: event.startTime.toISOString(),
        end_time: event.endTime.toISOString(),
        status: event.status,
        synced_at: new Date().toISOString(),
      })),
      { onConflict: 'business_id,google_event_id' }
    )
    .select('id, google_event_id')
  if (upsertError || !upserted) throw upsertError

  const idByEventId = new Map(upserted.map((row) => [row.google_event_id, row.id]))

  const newlyCancelled: NewlyCancelledAppointment[] = []
  for (const event of events) {
    const wasAlreadyCancelled = priorStatusByEventId.get(event.providerEventId) === 'cancelled'
    const appointmentId = idByEventId.get(event.providerEventId)
    if (event.status === 'cancelled' && !wasAlreadyCancelled && appointmentId) {
      newlyCancelled.push({
        appointmentId,
        startTime: event.startTime,
        endTime: event.endTime,
      })
    }
  }

  return { newlyCancelled }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- sync-appointments.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/cron/sync-appointments.ts src/lib/cron/sync-appointments.test.ts
git commit -m "feat: add appointment sync with cancellation detection"
```

---

