### Task 18: Business Orchestrator + Cron Poll Route

**Files:**
- Create: `src/lib/cron/process-business.ts`
- Create: `src/app/api/cron/poll/route.ts`
- Test: `src/lib/cron/process-business.test.ts` (integration — requires local Supabase running)
- Test: `src/app/api/cron/poll/route.test.ts`

**Interfaces:**
- Consumes: `decrypt` (Task 3), `GoogleCalendarProvider` (Task 9), `claimBusinesses`/`releaseBusiness`/`ClaimedBusiness` (Task 14), `syncAppointments` (Task 15), `resolveStaleOffers`/`expireTimedOutOffers`/`dispatchPendingOffers` (Task 16), `expireWaitlistEntries`/`removeUnverifiedSignups` (Task 17), `sendCalendarDisconnectedEmail` (Task 13).
- Produces:
  - `processBusiness(supabase: SupabaseClient<Database>, business: ClaimedBusiness, now: Date): Promise<void>`
  - `POST` handler at `src/app/api/cron/poll/route.ts`
  - Nothing later consumes these directly — this is the top-level entry point the external scheduler calls.

- [ ] **Step 1: Write the failing tests for `processBusiness`**

`src/lib/cron/process-business.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness } from './test-helpers'
import { encrypt } from '@/lib/crypto/encrypt'
import { randomBytes } from 'node:crypto'
import type { ClaimedBusiness } from './claim-businesses'
import type { CalendarProvider, CalendarEvent, CalendarListEntry, CreateEventInput } from '@/lib/calendar/provider'

const mockSendCalendarDisconnectedEmail = vi.fn()

vi.mock('@/lib/notifications/email', () => ({
  sendCalendarDisconnectedEmail: (...args: unknown[]) => mockSendCalendarDisconnectedEmail(...args),
  sendSlotOfferEmail: vi.fn(),
  sendSlotGoneEmail: vi.fn(),
  sendExpiryEmail: vi.fn(),
}))

vi.mock('@/lib/calendar/google-provider', () => ({
  GoogleCalendarProvider: vi.fn(),
}))

import { GoogleCalendarProvider } from '@/lib/calendar/google-provider'
import { processBusiness } from './process-business'

function stubProvider(overrides: Partial<CalendarProvider> = {}): CalendarProvider {
  return {
    listCalendars: async (): Promise<CalendarListEntry[]> => [],
    createCalendar: async (): Promise<CalendarListEntry> => {
      throw new Error('not implemented')
    },
    getCalendarTimezone: async (): Promise<string> => 'UTC',
    listChangedEvents: async (): Promise<CalendarEvent[]> => [],
    createEvent: async (_calendarId: string, _input: CreateEventInput): Promise<CalendarEvent> => {
      throw new Error('not implemented')
    },
    ...overrides,
  }
}

describe('processBusiness (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  beforeEach(() => {
    mockSendCalendarDisconnectedEmail.mockReset()
    process.env.REFRESH_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64')
  })

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (cleanups.length > 0) {
      const next = cleanups.pop()!
      await cleanupTestBusiness(supabase, next.businessId, next.userId)
    }
  })

  async function setupBusiness() {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase, {
      google_refresh_token_encrypted: encrypt('fake-refresh-token'),
    })
    cleanups.push({ businessId, userId })
    const { data: row } = await supabase.from('businesses').select('*').eq('id', businessId).single()
    return { supabase, business: row as ClaimedBusiness, businessId, userId }
  }

  it('syncs the calendar, runs housekeeping, and releases the lock on success', async () => {
    ;(GoogleCalendarProvider as unknown as Mock).mockImplementation(() => stubProvider())
    const { supabase, business, businessId } = await setupBusiness()

    const now = new Date('2026-06-23T12:00:00Z')
    await processBusiness(supabase, business, now)

    const { data: updated } = await supabase
      .from('businesses')
      .select('processing_started_at, last_checked_at, calendar_status')
      .eq('id', businessId)
      .single()
    expect(updated?.processing_started_at).toBeNull()
    expect(updated?.last_checked_at).toBe(now.toISOString())
    expect(updated?.calendar_status).toBe('connected')
    expect(mockSendCalendarDisconnectedEmail).not.toHaveBeenCalled()
  })

  it('marks the business disconnected and emails the owner when the calendar provider throws an auth error', async () => {
    ;(GoogleCalendarProvider as unknown as Mock).mockImplementation(() =>
      stubProvider({
        listChangedEvents: async () => {
          throw new Error('invalid_grant')
        },
      })
    )
    const { supabase, business, businessId, userId } = await setupBusiness()

    const now = new Date('2026-06-23T12:00:00Z')
    await processBusiness(supabase, business, now)

    const { data: updated } = await supabase
      .from('businesses')
      .select('processing_started_at, calendar_status')
      .eq('id', businessId)
      .single()
    expect(updated?.calendar_status).toBe('disconnected')
    expect(updated?.processing_started_at).toBeNull()

    const { data: ownerUserData } = await supabase.auth.admin.getUserById(userId)
    expect(mockSendCalendarDisconnectedEmail).toHaveBeenCalledWith(
      ownerUserData!.user!.email,
      expect.objectContaining({ businessName: business.name })
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- process-business.test.ts`
Expected: FAIL — `src/lib/cron/process-business.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/cron/process-business.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { decrypt } from '@/lib/crypto/encrypt'
import { GoogleCalendarProvider } from '@/lib/calendar/google-provider'
import { sendCalendarDisconnectedEmail } from '@/lib/notifications/email'
import { releaseBusiness, type ClaimedBusiness } from './claim-businesses'
import { syncAppointments } from './sync-appointments'
import { resolveStaleOffers, expireTimedOutOffers, dispatchPendingOffers } from './dispatch-offers'
import { expireWaitlistEntries, removeUnverifiedSignups } from './waitlist-housekeeping'

function isAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('invalid_grant') || message.includes('401')
}

export async function processBusiness(
  supabase: SupabaseClient<Database>,
  business: ClaimedBusiness,
  now: Date
): Promise<void> {
  try {
    const refreshToken = decrypt(business.google_refresh_token_encrypted)
    const provider = new GoogleCalendarProvider(refreshToken)
    const since = business.last_checked_at ? new Date(business.last_checked_at) : new Date(0)

    await syncAppointments(supabase, business.id, provider, business.dedicated_calendar_id, since)
    await resolveStaleOffers(supabase, business)
    await expireTimedOutOffers(supabase, business, now)
    await dispatchPendingOffers(supabase, business, now)
    await expireWaitlistEntries(supabase, business, now)
    await removeUnverifiedSignups(supabase, business, now)
  } catch (error) {
    if (isAuthError(error)) {
      await supabase.from('businesses').update({ calendar_status: 'disconnected' }).eq('id', business.id)

      const { data: ownerUser } = await supabase.auth.admin.getUserById(business.owner_user_id)
      if (ownerUser?.user?.email) {
        await sendCalendarDisconnectedEmail(ownerUser.user.email, {
          businessName: business.name,
          reconnectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
        })
      }
    }
  } finally {
    await releaseBusiness(supabase, business.id, now)
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- process-business.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing tests for the cron route**

`src/app/api/cron/poll/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClaimBusinesses = vi.fn()
const mockProcessBusiness = vi.fn()

vi.mock('@/lib/cron/claim-businesses', () => ({
  claimBusinesses: (...args: unknown[]) => mockClaimBusinesses(...args),
}))
vi.mock('@/lib/cron/process-business', () => ({
  processBusiness: (...args: unknown[]) => mockProcessBusiness(...args),
}))
vi.mock('@/lib/db/supabase', () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({}),
}))

import { POST } from './route'

describe('POST /api/cron/poll', () => {
  beforeEach(() => {
    mockClaimBusinesses.mockReset()
    mockProcessBusiness.mockReset()
    process.env.CRON_SECRET = 'test-secret'
  })

  it('rejects requests with a missing or wrong secret', async () => {
    const request = new Request('https://example.com/api/cron/poll', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
    expect(mockClaimBusinesses).not.toHaveBeenCalled()
  })

  it('claims and processes each business when the secret is correct', async () => {
    mockClaimBusinesses.mockResolvedValue([{ id: 'biz-1' }, { id: 'biz-2' }])
    mockProcessBusiness.mockResolvedValue(undefined)

    const request = new Request('https://example.com/api/cron/poll', {
      method: 'POST',
      headers: { authorization: 'Bearer test-secret' },
    })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.processed).toBe(2)
    expect(mockProcessBusiness).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- route.test.ts`
Expected: FAIL — `src/app/api/cron/poll/route.ts` does not exist.

- [ ] **Step 7: Implement `src/app/api/cron/poll/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { claimBusinesses } from '@/lib/cron/claim-businesses'
import { processBusiness } from '@/lib/cron/process-business'

export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const now = new Date()
  const claimed = await claimBusinesses(supabase, now)

  for (const business of claimed) {
    await processBusiness(supabase, business, now)
  }

  return NextResponse.json({ processed: claimed.length })
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- route.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Manual walkthrough**

With `supabase start` running and `npm run dev` running locally: configure an external scheduler (or `curl`) to `POST http://localhost:3000/api/cron/poll` with header `Authorization: Bearer <CRON_SECRET from .env.local>` every 5 minutes against a real connected test business; cancel a test appointment in the dedicated Google Calendar and confirm a `slot_offer` email arrives within one polling interval.

- [ ] **Step 10: Commit**

```bash
git add src/lib/cron/process-business.ts src/lib/cron/process-business.test.ts src/app/api/cron/poll/route.ts src/app/api/cron/poll/route.test.ts
git commit -m "feat: add cron orchestrator and poll route"
```

---

