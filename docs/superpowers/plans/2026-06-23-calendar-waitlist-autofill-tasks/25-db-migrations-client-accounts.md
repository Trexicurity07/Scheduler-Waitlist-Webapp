### Task 25: DB Schema Migrations for Client Accounts

**Files:**
- Create: `supabase/migrations/0004_client_profiles.sql`
- Create: `supabase/migrations/0005_alter_schema_client_accounts.sql`
- Create: `supabase/migrations/0006_businesses_business_type.sql`
- Modify: `src/lib/cron/test-helpers.ts`
- Modify: `src/lib/cron/dispatch-offers.ts`
- Modify: `src/lib/cron/waitlist-housekeeping.ts`
- Modify: `src/lib/cron/waitlist-housekeeping.test.ts`
- Modify: `src/lib/cron/dispatch-offers.test.ts`
- Modify: `src/types/database.ts` (regenerated)

**Interfaces:**
- Consumes: existing `createTestBusiness`/`cleanupTestBusiness` (Task 14).
- Produces:
  - `createTestClientAndEntry(supabase, businessId, overrides?): Promise<{ clientId: string; entryId: string; userId: string }>` — now also returns the test client's auth `userId` for cleanup.
  - `cleanupTestClient(supabase: SupabaseClient<Database>, userId: string): Promise<void>` — new export; deletes the auth user created by `createTestClientAndEntry`.
  - Task 26 (`signupClient`) and Task 27 (`applyToBusiness`) consume the new schema.

> **⚠️ Note on TypeScript after this task:** Regenerating types will cause `tsc --noEmit` to report errors in files that reference retired `clients.email/name/phone` columns — specifically `src/lib/waitlist/join-waitlist.ts`, `src/lib/waitlist/join-waitlist.test.ts`, and `src/app/api/waitlist/route.ts`. Do NOT fix those files here. Task 27 deletes them. Run `npx vitest run` (not `tsc --noEmit`) to verify correctness after this task.

---

- [ ] **Step 1: Write migration 0004 — `client_profiles` table**

`supabase/migrations/0004_client_profiles.sql`:

```sql
create table client_profiles (
  user_id     uuid        primary key references auth.users(id) on delete cascade,
  name        text        not null,
  email       text        not null unique,
  phone       text        not null unique,
  email_verification_token text,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table client_profiles enable row level security;

create policy "Clients can read their own profile"
  on client_profiles for select using (user_id = auth.uid());

create policy "Clients can update their own profile"
  on client_profiles for update using (user_id = auth.uid());
```

- [ ] **Step 2: Write migration 0005 — alter `clients` and `waitlist_entries`**

`supabase/migrations/0005_alter_schema_client_accounts.sql`:

```sql
-- Pre-launch: no real production data — wipe before altering.
-- Cascade removes waitlist_entries and notifications automatically.
truncate clients cascade;

-- Move identity columns to client_profiles.
-- Dropping email and phone automatically drops the two unique indexes
-- added in migration 0003 (clients_business_id_email_idx and
-- clients_business_id_phone_idx), since those indexes include these columns.
alter table clients drop column name;
alter table clients drop column email;
alter table clients drop column phone;

-- Link each clients row to a platform-level account.
alter table clients
  add column user_id uuid not null
  references client_profiles(user_id) on delete cascade;

-- One client record per (business, account).
create unique index clients_business_id_user_id_idx on clients(business_id, user_id);

-- Clients can view their own per-business records.
create policy "Clients can view their own client records"
  on clients for select using (user_id = auth.uid());

-- Per-entry email verification is retired; account-level verification
-- (client_profiles.verified_at) replaces it.
alter table waitlist_entries drop column email_verification_token;
alter table waitlist_entries drop column verified_at;

alter table waitlist_entries drop constraint waitlist_status_valid;
alter table waitlist_entries add constraint waitlist_status_valid check (
  status in ('active', 'filled', 'expired', 'removed')
);
```

- [ ] **Step 3: Write migration 0006 — `business_type` column**

`supabase/migrations/0006_businesses_business_type.sql`:

```sql
-- Collected at connect-setup going forward; empty string for existing rows.
alter table businesses add column business_type text not null default '';
```

- [ ] **Step 4: Apply migrations**

Run: `npx supabase migration up`
Expected output contains: `Applying migration 0004_client_profiles.sql...`, `Applying migration 0005_alter_schema_client_accounts.sql...`, `Applying migration 0006_businesses_business_type.sql...`, `Local database is up to date.`

- [ ] **Step 5: Regenerate TypeScript types**

Run: `npx supabase gen types typescript --local > src/types/database.ts`
Expected: `src/types/database.ts` is overwritten. `client_profiles` table now appears; `clients` table no longer has `name`/`email`/`phone` columns; `waitlist_entries` no longer has `email_verification_token`/`verified_at`; `businesses` now has `business_type`.

- [ ] **Step 6: Rewrite `src/lib/cron/test-helpers.ts`**

Replace the entire file with:

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
      business_type: 'Test',
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

export async function cleanupTestClient(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  await supabase.auth.admin.deleteUser(userId)
}

export async function createTestClientAndEntry(
  supabase: SupabaseClient<Database>,
  businessId: string,
  overrides: { time_windows?: { days: number[]; start: string; end: string }[]; status?: string; expires_at?: string } = {}
): Promise<{ clientId: string; entryId: string; userId: string }> {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const email = `client-${uniqueSuffix}@example.com`
  const phone = `1555${Math.floor(1000000 + Math.random() * 8999999)}`

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true,
  })
  if (userError || !userData.user) throw userError

  const { error: profileError } = await supabase.from('client_profiles').insert({
    user_id: userData.user.id,
    name: 'Test Client',
    email,
    phone,
    verified_at: new Date().toISOString(),
  })
  if (profileError) throw profileError

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({ business_id: businessId, user_id: userData.user.id })
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

  return { clientId: client.id, entryId: entry.id, userId: userData.user.id }
}
```

- [ ] **Step 7: Update `src/lib/cron/dispatch-offers.ts` — two email lookups**

The file fetches `clients.email` in two places. After the schema change, email lives on `client_profiles`. Apply both edits:

**Edit 1** — the `sendSlotGoneEmail` path (around line 63):

```ts
// REMOVE:
const { data: client } = await supabase.from('clients').select('email').eq('id', entry.client_id).single()
if (!client) continue
await sendSlotGoneEmail(client.email, {

// REPLACE WITH:
const { data: clientRow } = await supabase.from('clients').select('client_profiles(email)').eq('id', entry.client_id).single()
const clientEmail = (clientRow?.client_profiles as { email: string } | null)?.email
if (!clientEmail) continue
await sendSlotGoneEmail(clientEmail, {
```

**Edit 2** — the `sendSlotOfferEmail` path (around line 169):

```ts
// REMOVE:
const { data: client } = await supabase.from('clients').select('email').eq('id', entry.client_id).single()
if (!client) continue
// ... (keep the token/url/whatsapp lines unchanged)
await sendSlotOfferEmail(client.email, {

// REPLACE WITH:
const { data: clientRow } = await supabase.from('clients').select('client_profiles(email)').eq('id', entry.client_id).single()
const clientEmail = (clientRow?.client_profiles as { email: string } | null)?.email
if (!clientEmail) continue
// ... (keep the token/url/whatsapp lines unchanged)
await sendSlotOfferEmail(clientEmail, {
```

- [ ] **Step 8: Update `src/lib/cron/waitlist-housekeeping.ts` — batch email lookup**

The file fetches `clients.email` in a batch. After the schema change, email lives on `client_profiles`. Find the block (around lines 24–26):

```ts
// REMOVE:
const clientIds = [...new Set(expiredEntries.map((entry) => entry.client_id))]
const { data: clients } = await supabase.from('clients').select('id, email').in('id', clientIds)
const emailByClientId = new Map((clients ?? []).map((client) => [client.id, client.email]))

// REPLACE WITH:
const clientIds = [...new Set(expiredEntries.map((entry) => entry.client_id))]
const { data: clients } = await supabase.from('clients').select('id, client_profiles(email)').in('id', clientIds)
const emailByClientId = new Map(
  (clients ?? []).map((c) => [c.id, (c.client_profiles as { email: string } | null)?.email ?? null])
)
```

- [ ] **Step 9: Rewrite `src/lib/cron/waitlist-housekeeping.test.ts`**

Replace the entire file with (removes the `removeUnverifiedSignups` describe block since `pending_verification` status is no longer valid, and updates client cleanup):

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness, createTestClientAndEntry, cleanupTestClient } from './test-helpers'
import type { ClaimedBusiness } from './claim-businesses'

const mockSendExpiryEmail = vi.fn()

vi.mock('@/lib/notifications/email', () => ({
  sendExpiryEmail: (...args: unknown[]) => mockSendExpiryEmail(...args),
}))

import { expireWaitlistEntries } from './waitlist-housekeeping'

describe('waitlist-housekeeping (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []
  const clientCleanups: string[] = []

  beforeEach(() => {
    mockSendExpiryEmail.mockReset()
  })

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (clientCleanups.length > 0) {
      await cleanupTestClient(supabase, clientCleanups.pop()!)
    }
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
      const { entryId, userId: clientUserId } = await createTestClientAndEntry(supabase, businessId, {
        status: 'active',
        expires_at: '2026-06-01T00:00:00Z',
      })
      clientCleanups.push(clientUserId)
      await supabase.from('client_profiles').update({ email: 'expiring@example.com' }).eq('user_id', clientUserId)

      await expireWaitlistEntries(supabase, business, new Date('2026-06-23T00:00:00Z'))

      const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
      expect(entry?.status).toBe('expired')
      expect(mockSendExpiryEmail).toHaveBeenCalledWith('expiring@example.com', expect.objectContaining({ businessName: business.name }))
    })

    it('does not touch an active entry that has not yet expired', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const { entryId, userId: clientUserId } = await createTestClientAndEntry(supabase, businessId, {
        status: 'active',
        expires_at: '2026-07-01T00:00:00Z',
      })
      clientCleanups.push(clientUserId)

      await expireWaitlistEntries(supabase, business, new Date('2026-06-23T00:00:00Z'))

      const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
      expect(entry?.status).toBe('active')
      expect(mockSendExpiryEmail).not.toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 10: Update `src/lib/cron/dispatch-offers.test.ts` — client cleanup**

The import at line 3 needs `cleanupTestClient`:

```ts
// CHANGE:
import { createTestBusiness, cleanupTestBusiness, createTestClientAndEntry } from './test-helpers'
// TO:
import { createTestBusiness, cleanupTestBusiness, createTestClientAndEntry, cleanupTestClient } from './test-helpers'
```

Add a `const clientCleanups: string[] = []` alongside the existing `const cleanups` array.

Update `afterEach` to also clean up client users (clean clients BEFORE businesses since cascade from business cleanup will try to delete clients rows):

```ts
afterEach(async () => {
  const supabase = createServiceRoleClient()
  while (clientCleanups.length > 0) {
    await cleanupTestClient(supabase, clientCleanups.pop()!)
  }
  while (cleanups.length > 0) {
    const next = cleanups.pop()!
    await cleanupTestBusiness(supabase, next.businessId, next.userId)
  }
})
```

For every call to `createTestClientAndEntry` in the file, capture the returned `userId` and push it to `clientCleanups`. The specific call sites (by line number in the current file) and required changes:

- **Line 62:** `const { entryId, clientId } = await createTestClientAndEntry(...)` → add `userId: clientUserId` to destructuring, then `clientCleanups.push(clientUserId)`
- **Lines 111, 153, 194, 280, 308:** `const { entryId } = await createTestClientAndEntry(...)` → add `userId: clientUserId` to destructuring, then `clientCleanups.push(clientUserId)`
- **Lines 238, 245:** `const older = await createTestClientAndEntry(...)` and `const newer = await createTestClientAndEntry(...)` → add `clientCleanups.push(older.userId)` and `clientCleanups.push(newer.userId)` after each
- **Lines 345, 349:** `const first = await createTestClientAndEntry(...)` and `const second = await createTestClientAndEntry(...)` → add `clientCleanups.push(first.userId)` and `clientCleanups.push(second.userId)` after each
- **Lines 390, 391:** `const filledEntry = await createTestClientAndEntry(...)` and `const otherEntry = await createTestClientAndEntry(...)` → add `clientCleanups.push(filledEntry.userId)` and `clientCleanups.push(otherEntry.userId)` after each

- [ ] **Step 11: Run tests to verify all pass**

Run: `npx vitest run`
Expected: All tests pass. The two `removeUnverifiedSignups` tests are gone; all `expireWaitlistEntries` and all `dispatch-offers` tests still pass.

- [ ] **Step 12: Commit**

```bash
git add supabase/migrations/0004_client_profiles.sql \
        supabase/migrations/0005_alter_schema_client_accounts.sql \
        supabase/migrations/0006_businesses_business_type.sql \
        src/types/database.ts \
        src/lib/cron/test-helpers.ts \
        src/lib/cron/dispatch-offers.ts \
        src/lib/cron/waitlist-housekeeping.ts \
        src/lib/cron/waitlist-housekeeping.test.ts \
        src/lib/cron/dispatch-offers.test.ts
git commit -m "feat: add client_profiles schema and update codebase for account-based identity"
```

---
