### Task 11: Slug Generator + Connect-Setup Business Logic

**Files:**
- Create: `src/lib/slug.ts`
- Test: `src/lib/slug.test.ts`
- Create: `src/lib/connect/complete-setup.ts`
- Test: `src/lib/connect/complete-setup.test.ts` (integration — requires local Supabase running)

**Interfaces:**
- Consumes: `CalendarProvider` (Task 9), `encrypt()` (Task 3), `Database` type (Task 2).
- Produces:
  - `slugify(input: string): string`
  - `interface CompleteSetupInput { userId: string; refreshToken: string; calendars: { id: string; summary: string; timezone: string }[]; businessName: string; whatsappNumber: string; createNewCalendar: boolean; calendarId?: string; newCalendarName?: string }`
  - `completeSetup(serviceRole: SupabaseClient<Database>, provider: CalendarProvider, input: CompleteSetupInput): Promise<{ ok: true } | { ok: false; error: string }>`
  - Consumed by Task 12's `/api/connect/complete` route.

- [ ] **Step 1: Write the failing slugify tests**

`src/lib/slug.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('lowercases and hyphenates a business name', () => {
    expect(slugify('Jane Doe Salon')).toBe('jane-doe-salon')
  })

  it('strips punctuation', () => {
    expect(slugify("Jane's Salon & Spa")).toBe('janes-salon-spa')
  })

  it('collapses repeated hyphens and whitespace', () => {
    expect(slugify('Test   --  Salon')).toBe('test-salon')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- slug.test.ts`
Expected: FAIL — `src/lib/slug.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/slug.ts`**

```ts
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- slug.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing integration tests for `completeSetup`**

Prerequisite: local Supabase running.

`src/lib/connect/complete-setup.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import type { CalendarProvider } from '@/lib/calendar/provider'
import { completeSetup } from './complete-setup'

function fakeProvider(overrides: Partial<CalendarProvider> = {}): CalendarProvider {
  return {
    listCalendars: async () => [],
    createCalendar: async (summary) => ({ id: 'new-cal-id', summary, timezone: 'UTC' }),
    getCalendarTimezone: async () => 'America/New_York',
    listChangedEvents: async () => [],
    createEvent: async () => {
      throw new Error('not used in this test')
    },
    ...overrides,
  }
}

describe('completeSetup (integration)', () => {
  let userId: string
  let secondUserId: string | null = null
  let createdBusinessIds: string[] = []

  beforeAll(async () => {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.auth.admin.createUser({
      email: `complete-setup-${Date.now()}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
    })
    if (error || !data.user) throw error
    userId = data.user.id
  })

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    for (const id of createdBusinessIds) {
      await supabase.from('businesses').delete().eq('id', id)
    }
    createdBusinessIds = []
  })

  afterAll(async () => {
    const supabase = createServiceRoleClient()
    await supabase.auth.admin.deleteUser(userId)
    if (secondUserId) await supabase.auth.admin.deleteUser(secondUserId)
  })

  it('creates a business using an existing chosen calendar', async () => {
    const supabase = createServiceRoleClient()
    const result = await completeSetup(supabase, fakeProvider(), {
      userId,
      refreshToken: 'fake-refresh-token',
      calendars: [{ id: 'cal1', summary: 'Bookings', timezone: 'America/New_York' }],
      businessName: 'Jane Doe Salon',
      whatsappNumber: '+15551234567',
      createNewCalendar: false,
      calendarId: 'cal1',
    })
    expect(result.ok).toBe(true)

    const { data } = await supabase.from('businesses').select('*').eq('owner_user_id', userId).single()
    expect(data?.public_slug).toBe('jane-doe-salon')
    expect(data?.dedicated_calendar_id).toBe('cal1')
    expect(data?.timezone).toBe('America/New_York')
    createdBusinessIds.push(data!.id)
  })

  it('creates a new calendar when createNewCalendar is true', async () => {
    const supabase = createServiceRoleClient()
    const result = await completeSetup(supabase, fakeProvider(), {
      userId,
      refreshToken: 'fake-refresh-token',
      calendars: [],
      businessName: 'Jane Doe Salon',
      whatsappNumber: '+15551234567',
      createNewCalendar: true,
      newCalendarName: 'Client Bookings',
    })
    expect(result.ok).toBe(true)

    const { data } = await supabase.from('businesses').select('*').eq('owner_user_id', userId).single()
    expect(data?.dedicated_calendar_id).toBe('new-cal-id')
    createdBusinessIds.push(data!.id)
  })

  it('appends a numeric suffix when the slug is already taken', async () => {
    const supabase = createServiceRoleClient()
    await completeSetup(supabase, fakeProvider(), {
      userId,
      refreshToken: 'fake-refresh-token',
      calendars: [{ id: 'cal1', summary: 'Bookings', timezone: 'America/New_York' }],
      businessName: 'Jane Doe Salon',
      whatsappNumber: '+15551234567',
      createNewCalendar: false,
      calendarId: 'cal1',
    })
    const { data: first } = await supabase.from('businesses').select('id').eq('owner_user_id', userId).single()
    createdBusinessIds.push(first!.id)

    const { data: secondUser } = await supabase.auth.admin.createUser({
      email: `complete-setup-2-${Date.now()}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
    })
    secondUserId = secondUser!.user!.id

    const result = await completeSetup(supabase, fakeProvider(), {
      userId: secondUserId,
      refreshToken: 'fake-refresh-token',
      calendars: [{ id: 'cal2', summary: 'Bookings', timezone: 'America/New_York' }],
      businessName: 'Jane Doe Salon',
      whatsappNumber: '+15551234567',
      createNewCalendar: false,
      calendarId: 'cal2',
    })
    expect(result.ok).toBe(true)

    const { data: second } = await supabase
      .from('businesses')
      .select('id, public_slug')
      .eq('owner_user_id', secondUserId)
      .single()
    expect(second?.public_slug).toBe('jane-doe-salon-2')
    createdBusinessIds.push(second!.id)
  })

  it('returns an error when the chosen calendarId is not in the calendars list', async () => {
    const supabase = createServiceRoleClient()
    const result = await completeSetup(supabase, fakeProvider(), {
      userId,
      refreshToken: 'fake-refresh-token',
      calendars: [{ id: 'cal1', summary: 'Bookings', timezone: 'America/New_York' }],
      businessName: 'Jane Doe Salon',
      whatsappNumber: '+15551234567',
      createNewCalendar: false,
      calendarId: 'does-not-exist',
    })
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- complete-setup.test.ts`
Expected: FAIL — `src/lib/connect/complete-setup.ts` does not exist.

- [ ] **Step 7: Implement `src/lib/connect/complete-setup.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { CalendarProvider } from '@/lib/calendar/provider'
import { encrypt } from '@/lib/crypto/encrypt'
import { slugify } from '@/lib/slug'

export interface CompleteSetupInput {
  userId: string
  refreshToken: string
  calendars: { id: string; summary: string; timezone: string }[]
  businessName: string
  whatsappNumber: string
  createNewCalendar: boolean
  calendarId?: string
  newCalendarName?: string
}

export async function completeSetup(
  serviceRole: SupabaseClient<Database>,
  provider: CalendarProvider,
  input: CompleteSetupInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  let calendarId: string
  let timezone: string

  if (input.createNewCalendar) {
    const created = await provider.createCalendar(input.newCalendarName ?? 'Client Bookings')
    calendarId = created.id
    timezone = created.timezone
  } else {
    const chosen = input.calendars.find((c) => c.id === input.calendarId)
    if (!chosen) {
      return { ok: false, error: 'Selected calendar not found' }
    }
    calendarId = chosen.id
    timezone = await provider.getCalendarTimezone(chosen.id)
  }

  const baseSlug = slugify(input.businessName)
  let candidate = baseSlug
  let attempt = 1
  while (true) {
    const { data } = await serviceRole.from('businesses').select('id').eq('public_slug', candidate).maybeSingle()
    if (!data) break
    attempt += 1
    candidate = `${baseSlug}-${attempt}`
  }

  const { error } = await serviceRole.from('businesses').insert({
    owner_user_id: input.userId,
    name: input.businessName,
    public_slug: candidate,
    whatsapp_number: input.whatsappNumber,
    timezone,
    dedicated_calendar_id: calendarId,
    google_refresh_token_encrypted: encrypt(input.refreshToken),
  })

  if (error) {
    return { ok: false, error: 'Could not save business' }
  }

  return { ok: true }
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- complete-setup.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 9: Commit**

```bash
git add src/lib/slug.ts src/lib/slug.test.ts src/lib/connect
git commit -m "feat: add slug generator and connect-setup business logic"
```

---

