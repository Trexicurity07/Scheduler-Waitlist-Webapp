### Task 17: Waitlist Housekeeping (14-Day Expiry + 48h Unverified Cleanup)

**Files:**
- Create: `src/lib/cron/waitlist-housekeeping.ts`
- Test: `src/lib/cron/waitlist-housekeeping.test.ts` (integration — requires local Supabase running)

**Interfaces:**
- Consumes: `ClaimedBusiness` (Task 14), `sendExpiryEmail` (Task 13), `buildWhatsAppLink` (Task 5), `createTestBusiness`/`cleanupTestBusiness`/`createTestClientAndEntry` (Task 14).
- Produces:
  - `expireWaitlistEntries(supabase: SupabaseClient<Database>, business: ClaimedBusiness, now: Date): Promise<void>`
  - `removeUnverifiedSignups(supabase: SupabaseClient<Database>, business: ClaimedBusiness, now: Date): Promise<void>`
  - Consumed by Task 18's `processBusiness`, called once per claimed business each cron pass.

- [ ] **Step 1: Write the failing tests**

`src/lib/cron/waitlist-housekeeping.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness, createTestClientAndEntry } from './test-helpers'
import type { ClaimedBusiness } from './claim-businesses'

const mockSendExpiryEmail = vi.fn()

vi.mock('@/lib/notifications/email', () => ({
  sendExpiryEmail: (...args: unknown[]) => mockSendExpiryEmail(...args),
}))

import { expireWaitlistEntries, removeUnverifiedSignups } from './waitlist-housekeeping'

describe('waitlist-housekeeping (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  beforeEach(() => {
    mockSendExpiryEmail.mockReset()
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
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })
    const { data: row } = await supabase.from('businesses').select('*').eq('id', businessId).single()
    return { supabase, business: row as ClaimedBusiness, businessId }
  }

  describe('expireWaitlistEntries', () => {
    it('marks an active entry past its expiry date as expired and emails the client', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const { entryId, clientId } = await createTestClientAndEntry(supabase, businessId, {
        status: 'active',
        expires_at: '2026-06-01T00:00:00Z',
      })
      await supabase.from('clients').update({ email: 'expiring@example.com' }).eq('id', clientId)

      await expireWaitlistEntries(supabase, business, new Date('2026-06-23T00:00:00Z'))

      const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
      expect(entry?.status).toBe('expired')
      expect(mockSendExpiryEmail).toHaveBeenCalledWith('expiring@example.com', expect.objectContaining({ businessName: business.name }))
    })

    it('does not touch an active entry that has not yet expired', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const { entryId } = await createTestClientAndEntry(supabase, businessId, {
        status: 'active',
        expires_at: '2026-07-01T00:00:00Z',
      })

      await expireWaitlistEntries(supabase, business, new Date('2026-06-23T00:00:00Z'))

      const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
      expect(entry?.status).toBe('active')
      expect(mockSendExpiryEmail).not.toHaveBeenCalled()
    })
  })

  describe('removeUnverifiedSignups', () => {
    it('marks a pending_verification entry older than 48 hours as removed', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const { entryId } = await createTestClientAndEntry(supabase, businessId, { status: 'pending_verification' })
      await supabase
        .from('waitlist_entries')
        .update({ created_at: '2026-06-20T00:00:00Z' })
        .eq('id', entryId)

      await removeUnverifiedSignups(supabase, business, new Date('2026-06-23T00:00:00Z'))

      const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
      expect(entry?.status).toBe('removed')
    })

    it('does not touch a pending_verification entry created within the last 48 hours', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const { entryId } = await createTestClientAndEntry(supabase, businessId, { status: 'pending_verification' })
      await supabase
        .from('waitlist_entries')
        .update({ created_at: '2026-06-22T12:00:00Z' })
        .eq('id', entryId)

      await removeUnverifiedSignups(supabase, business, new Date('2026-06-23T00:00:00Z'))

      const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
      expect(entry?.status).toBe('pending_verification')
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- waitlist-housekeeping.test.ts`
Expected: FAIL — `src/lib/cron/waitlist-housekeeping.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/cron/waitlist-housekeeping.ts`**

> **Amended 2026-06-25** — the original version of `expireWaitlistEntries` did
> one `update` plus one `clients` `select` per expired entry in a sequential
> loop (same N+1-round-trip pattern flagged as Important on Task 15).
> Reviewer flagged it again here as an Important finding during Task 17's
> review. Approved fix: batch the status update into one `.update(...).in(...)`
> call and the client-email lookup into one `.select(...).in(...)` call,
> keyed by a `Map`; the loop that remains is only for sending the
> per-recipient email (which is not a DB round trip and can't be batched
> across recipients anyway). `removeUnverifiedSignups` is unchanged — it was
> already a single batched `update` with no loop. No test changes — this is
> an internal refactor; all 4 tests in Step 1 must keep passing unmodified.

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { ClaimedBusiness } from './claim-businesses'
import { sendExpiryEmail } from '@/lib/notifications/email'
import { buildWhatsAppLink } from '@/lib/notifications/whatsapp'

export async function expireWaitlistEntries(
  supabase: SupabaseClient<Database>,
  business: ClaimedBusiness,
  now: Date
): Promise<void> {
  const { data: expiredEntries } = await supabase
    .from('waitlist_entries')
    .select('id, client_id')
    .eq('business_id', business.id)
    .eq('status', 'active')
    .lt('expires_at', now.toISOString())

  if (!expiredEntries || expiredEntries.length === 0) return

  const entryIds = expiredEntries.map((entry) => entry.id)
  await supabase.from('waitlist_entries').update({ status: 'expired' }).in('id', entryIds)

  const clientIds = [...new Set(expiredEntries.map((entry) => entry.client_id))]
  const { data: clients } = await supabase.from('clients').select('id, email').in('id', clientIds)
  const emailByClientId = new Map((clients ?? []).map((client) => [client.id, client.email]))

  for (const entry of expiredEntries) {
    const email = emailByClientId.get(entry.client_id)
    if (!email) continue

    await sendExpiryEmail(email, {
      businessName: business.name,
      whatsappLink: buildWhatsAppLink(
        business.whatsapp_number,
        `Hi! I'd like to rejoin the waitlist for ${business.name}.`
      ),
    })
  }
}

export async function removeUnverifiedSignups(
  supabase: SupabaseClient<Database>,
  business: ClaimedBusiness,
  now: Date
): Promise<void> {
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

  await supabase
    .from('waitlist_entries')
    .update({ status: 'removed' })
    .eq('business_id', business.id)
    .eq('status', 'pending_verification')
    .lt('created_at', cutoff)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- waitlist-housekeeping.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/cron/waitlist-housekeeping.ts src/lib/cron/waitlist-housekeeping.test.ts
git commit -m "feat: add 14-day waitlist expiry and 48h unverified signup cleanup"
```

---

