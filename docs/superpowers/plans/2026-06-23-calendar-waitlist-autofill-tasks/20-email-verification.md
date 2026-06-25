### Task 20: Email Verification

**Files:**
- Create: `src/lib/waitlist/verify-email.ts`
- Create: `src/app/verify-email/[token]/page.tsx`
- Test: `src/lib/waitlist/verify-email.test.ts` (integration — requires local Supabase running)

**Interfaces:**
- Consumes: `createServiceRoleClient` (Task 7).
- Produces:
  - `verifyEmail(supabase: SupabaseClient<Database>, token: string): Promise<{ ok: true; businessName: string } | { ok: false; reason: 'expired' | 'already_used' | 'invalid' }>`
  - Nothing later consumes this directly — it's rendered straight into the result page.

- [ ] **Step 1: Write the failing tests**

`src/lib/waitlist/verify-email.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness } from '@/lib/cron/test-helpers'
import { verifyEmail } from './verify-email'

describe('verifyEmail (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (cleanups.length > 0) {
      const next = cleanups.pop()!
      await cleanupTestBusiness(supabase, next.businessId, next.userId)
    }
  })

  async function setupEntry(overrides: { status?: string; created_at?: string } = {}) {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const { data: client } = await supabase
      .from('clients')
      .insert({ business_id: businessId, name: 'Test Client', email: 'verify@example.com', phone: '15551234567' })
      .select('id')
      .single()

    const { data: entry } = await supabase
      .from('waitlist_entries')
      .insert({
        business_id: businessId,
        client_id: client!.id,
        time_windows: [{ days: [1], start: '09:00', end: '17:00' }],
        status: overrides.status ?? 'pending_verification',
        email_verification_token: 'verify-token-1',
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    if (overrides.created_at) {
      await supabase.from('waitlist_entries').update({ created_at: overrides.created_at }).eq('id', entry!.id)
    }

    return { supabase, businessId, entryId: entry!.id }
  }

  it('verifies a pending entry and flips it to active', async () => {
    const { supabase, entryId } = await setupEntry()
    const result = await verifyEmail(supabase, 'verify-token-1')
    expect(result.ok).toBe(true)
    const { data: entry } = await supabase
      .from('waitlist_entries')
      .select('status, verified_at')
      .eq('id', entryId)
      .single()
    expect(entry?.status).toBe('active')
    expect(entry?.verified_at).toBeTruthy()
  })

  it('returns invalid for an unknown token', async () => {
    const supabase = createServiceRoleClient()
    const result = await verifyEmail(supabase, 'no-such-token')
    expect(result).toEqual({ ok: false, reason: 'invalid' })
  })

  it('returns already_used for an entry that is no longer pending_verification', async () => {
    const { supabase } = await setupEntry({ status: 'active' })
    const result = await verifyEmail(supabase, 'verify-token-1')
    expect(result).toEqual({ ok: false, reason: 'already_used' })
  })

  it('returns expired and removes the entry when older than 48 hours', async () => {
    const { supabase, entryId } = await setupEntry({ created_at: '2026-01-01T00:00:00Z' })
    const result = await verifyEmail(supabase, 'verify-token-1')
    expect(result).toEqual({ ok: false, reason: 'expired' })
    const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
    expect(entry?.status).toBe('removed')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- verify-email.test.ts`
Expected: FAIL — `src/lib/waitlist/verify-email.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/waitlist/verify-email.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function verifyEmail(
  supabase: SupabaseClient<Database>,
  token: string
): Promise<{ ok: true; businessName: string } | { ok: false; reason: 'expired' | 'already_used' | 'invalid' }> {
  const { data: entry } = await supabase
    .from('waitlist_entries')
    .select('id, status, created_at, businesses(name)')
    .eq('email_verification_token', token)
    .maybeSingle()

  if (!entry) return { ok: false, reason: 'invalid' }
  if (entry.status !== 'pending_verification') return { ok: false, reason: 'already_used' }

  const ageHours = (Date.now() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60)
  if (ageHours > 48) {
    await supabase.from('waitlist_entries').update({ status: 'removed' }).eq('id', entry.id)
    return { ok: false, reason: 'expired' }
  }

  await supabase
    .from('waitlist_entries')
    .update({ status: 'active', verified_at: new Date().toISOString() })
    .eq('id', entry.id)

  const businessName = entry.businesses?.name ?? 'the business'
  return { ok: true, businessName }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- verify-email.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Build the verification result page**

`src/app/verify-email/[token]/page.tsx`:

```tsx
import { createServiceRoleClient } from '@/lib/db/supabase'
import { verifyEmail } from '@/lib/waitlist/verify-email'

const REASON_MESSAGES: Record<'expired' | 'already_used' | 'invalid', string> = {
  expired: 'This verification link has expired. Please sign up again.',
  already_used: 'This verification link has already been used.',
  invalid: 'This verification link is invalid.',
}

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceRoleClient()
  const result = await verifyEmail(supabase, token)

  if (!result.ok) {
    return (
      <main>
        <h1>Verification failed</h1>
        <p>{REASON_MESSAGES[result.reason]}</p>
      </main>
    )
  }

  return (
    <main>
      <h1>You&apos;re on the waitlist for {result.businessName}</h1>
      <p>We&apos;ll email and WhatsApp you the moment a matching slot opens up.</p>
    </main>
  )
}
```

- [ ] **Step 6: Manual walkthrough**

With `supabase start` and `npm run dev` running: sign up via `/join/<slug>` from Task 19, copy the verification token logged/sent by Resend, visit `/verify-email/<token>` and confirm the success message renders and the entry flips to `active` in Supabase Studio. Then visit the same URL again and confirm it now shows "already been used."

- [ ] **Step 7: Commit**

```bash
git add src/lib/waitlist/verify-email.ts src/lib/waitlist/verify-email.test.ts src/app/verify-email
git commit -m "feat: add email verification flow"
```

---

