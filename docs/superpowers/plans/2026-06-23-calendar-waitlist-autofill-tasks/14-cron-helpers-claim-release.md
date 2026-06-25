### Task 14: Cron Test Helpers + Business Claim/Release

**Files:**
- Create: `src/lib/cron/test-helpers.ts`
- Create: `src/lib/cron/claim-businesses.ts`
- Test: `src/lib/cron/claim-businesses.test.ts` (integration — requires local Supabase running)

**Interfaces:**
- Produces:
  - `createTestBusiness(supabase, overrides?): Promise<{ businessId: string; userId: string }>`
  - `cleanupTestBusiness(supabase, businessId, userId): Promise<void>`
  - `createTestClientAndEntry(supabase, businessId, overrides?): Promise<{ clientId: string; entryId: string }>`
    — all three consumed by Task 15-17's integration tests.
  - `interface ClaimedBusiness { id: string; owner_user_id: string; name: string; public_slug: string; whatsapp_number: string; timezone: string; dedicated_calendar_id: string; google_refresh_token_encrypted: string; last_checked_at: string | null; batch_size: number; batch_interval_minutes: number; min_notice_hours: number; min_confirm_lead_hours: number }`
  - `claimBusinesses(supabase: SupabaseClient<Database>, now: Date): Promise<ClaimedBusiness[]>`
  - `releaseBusiness(supabase: SupabaseClient<Database>, businessId: string, checkedAt: Date): Promise<void>`
  - Consumed by Task 18's `processBusiness`/cron route, which claims, processes, then releases each business per cycle.

- [ ] **Step 1: Write the shared test helpers**

`src/lib/cron/test-helpers.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function createTestBusiness(
  supabase: SupabaseClient<Database>,
  overrides: Record<string, unknown> = {}
): Promise<{ businessId: string; userId: string }> {
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: `cron-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'test-password-123',
    email_confirm: true,
  })
  if (userError || !userData.user) throw userError

  const { data, error } = await supabase
    .from('businesses')
    .insert({
      owner_user_id: userData.user.id,
      name: 'Test Business',
      public_slug: `test-business-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      whatsapp_number: '15551234567',
      timezone: 'UTC',
      google_refresh_token_encrypted: 'encrypted-placeholder',
      dedicated_calendar_id: 'calendar-placeholder',
      ...overrides,
    })
    .select('id')
    .single()
  if (error || !data) throw error

  return { businessId: data.id, userId: userData.user.id }
}

export async function cleanupTestBusiness(
  supabase: SupabaseClient<Database>,
  businessId: string,
  userId: string
): Promise<void> {
  await supabase.from('businesses').delete().eq('id', businessId)
  await supabase.auth.admin.deleteUser(userId)
}

export async function createTestClientAndEntry(
  supabase: SupabaseClient<Database>,
  businessId: string,
  overrides: { time_windows?: { days: number[]; start: string; end: string }[]; status?: string; expires_at?: string } = {}
): Promise<{ clientId: string; entryId: string }> {
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      business_id: businessId,
      name: 'Test Client',
      email: `client-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      phone: '15559876543',
    })
    .select('id')
    .single()
  if (clientError || !client) throw clientError

  const expiresAt = overrides.expires_at ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: entry, error: entryError } = await supabase
    .from('waitlist_entries')
    .insert({
      business_id: businessId,
      client_id: client.id,
      time_windows: overrides.time_windows ?? [{ days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '23:59' }],
      status: overrides.status ?? 'active',
      expires_at: expiresAt,
    })
    .select('id')
    .single()
  if (entryError || !entry) throw entryError

  return { clientId: client.id, entryId: entry.id }
}
```

- [ ] **Step 2: Write the failing tests for claim/release**

`src/lib/cron/claim-businesses.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness } from './test-helpers'
import { claimBusinesses, releaseBusiness } from './claim-businesses'

describe('claimBusinesses / releaseBusiness (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (cleanups.length > 0) {
      const next = cleanups.pop()!
      await cleanupTestBusiness(supabase, next.businessId, next.userId)
    }
  })

  it('claims a business with no existing lock', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const claimed = await claimBusinesses(supabase, new Date())
    expect(claimed.map((b) => b.id)).toContain(businessId)
  })

  it('does not claim a business with a fresh lock', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase, {
      processing_started_at: new Date().toISOString(),
    })
    cleanups.push({ businessId, userId })

    const claimed = await claimBusinesses(supabase, new Date())
    expect(claimed.map((b) => b.id)).not.toContain(businessId)
  })

  it('claims a business with a stale lock (older than 4 minutes)', async () => {
    const supabase = createServiceRoleClient()
    const staleLock = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { businessId, userId } = await createTestBusiness(supabase, { processing_started_at: staleLock })
    cleanups.push({ businessId, userId })

    const claimed = await claimBusinesses(supabase, new Date())
    expect(claimed.map((b) => b.id)).toContain(businessId)
  })

  it('does not claim a disconnected business', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase, { calendar_status: 'disconnected' })
    cleanups.push({ businessId, userId })

    const claimed = await claimBusinesses(supabase, new Date())
    expect(claimed.map((b) => b.id)).not.toContain(businessId)
  })

  it('releaseBusiness clears the lock and sets last_checked_at', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const checkedAt = new Date()
    await claimBusinesses(supabase, new Date())
    await releaseBusiness(supabase, businessId, checkedAt)

    const { data } = await supabase
      .from('businesses')
      .select('processing_started_at, last_checked_at')
      .eq('id', businessId)
      .single()
    expect(data?.processing_started_at).toBeNull()
    expect(data?.last_checked_at).toBe(checkedAt.toISOString())
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- claim-businesses.test.ts`
Expected: FAIL — `src/lib/cron/claim-businesses.ts` does not exist.

- [ ] **Step 4: Implement `src/lib/cron/claim-businesses.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const STALE_THRESHOLD_MINUTES = 4

export interface ClaimedBusiness {
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
}

export async function claimBusinesses(
  supabase: SupabaseClient<Database>,
  now: Date
): Promise<ClaimedBusiness[]> {
  const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString()
  const lockFilter = `processing_started_at.is.null,processing_started_at.lt.${staleThreshold}`

  const { data: candidates } = await supabase
    .from('businesses')
    .select('id')
    .eq('calendar_status', 'connected')
    .or(lockFilter)

  if (!candidates || candidates.length === 0) return []

  const claimed: ClaimedBusiness[] = []
  for (const candidate of candidates) {
    const { data } = await supabase
      .from('businesses')
      .update({ processing_started_at: now.toISOString() })
      .eq('id', candidate.id)
      .or(lockFilter)
      .select(
        'id, owner_user_id, name, public_slug, whatsapp_number, timezone, dedicated_calendar_id, google_refresh_token_encrypted, last_checked_at, batch_size, batch_interval_minutes, min_notice_hours, min_confirm_lead_hours'
      )
      .maybeSingle()

    if (data) claimed.push(data)
  }

  return claimed
}

export async function releaseBusiness(
  supabase: SupabaseClient<Database>,
  businessId: string,
  checkedAt: Date
): Promise<void> {
  await supabase
    .from('businesses')
    .update({ processing_started_at: null, last_checked_at: checkedAt.toISOString() })
    .eq('id', businessId)
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- claim-businesses.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/cron/test-helpers.ts src/lib/cron/claim-businesses.ts src/lib/cron/claim-businesses.test.ts
git commit -m "feat: add cron business claim/release locking"
```

---

