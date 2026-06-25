### Task 27: Apply Flow Rework

> ⚠️ **THIS TASK SUPERSEDES TASKS 19 AND 20 IN FULL.**
>
> Task 19 built the anonymous public waitlist signup form (`/join/[slug]`). Task 20 built per-entry email verification (`/verify-email/[token]`). Both are retired. The anonymous join flow no longer exists — every waitlist application now requires a client account. Do not look to Task 19 or Task 20 for implementation patterns; this task replaces them from scratch.
>
> For historical context on what was built: Task 19 → `src/lib/waitlist/join-waitlist.ts`, `src/app/api/waitlist/route.ts`, `src/app/join/[slug]/page.tsx`, `src/app/join/[slug]/join-waitlist-form.tsx`. Task 20 → `src/lib/waitlist/verify-email.ts`, `src/app/verify-email/[token]/page.tsx`. All of these are deleted in this task.

**Files:**
- **Delete:** `src/lib/waitlist/join-waitlist.ts`
- **Delete:** `src/lib/waitlist/join-waitlist.test.ts`
- **Delete:** `src/lib/waitlist/verify-email.ts` (if it exists — Task 20)
- **Delete:** `src/lib/waitlist/verify-email.test.ts` (if it exists — Task 20)
- **Delete:** `src/app/api/waitlist/route.ts`
- **Delete:** `src/app/verify-email/[token]/page.tsx` (if it exists — Task 20)
- **Rewrite:** `src/app/join/[slug]/page.tsx` (auth-gated, replaces anonymous form)
- **Delete:** `src/app/join/[slug]/join-waitlist-form.tsx` (replaced by new auth-aware component)
- **Create:** `src/app/join/[slug]/apply-form.tsx`
- **Create:** `src/lib/client-dashboard/apply-to-business.ts`
- **Create:** `src/lib/client-dashboard/apply-to-business.test.ts`
- **Create:** `src/app/api/client/apply/[slug]/route.ts`

**Interfaces:**
- Consumes: Task 25 schema (`clients` with `user_id`, `waitlist_entries` without `pending_verification`). Consumes `getCurrentClient()` from Task 26. Consumes `createServiceRoleClient` from `src/lib/db/supabase`.
- Produces:
  - `applyToBusiness(supabase: SupabaseClient<Database>, userId: string, businessSlug: string, timeWindows: TimeWindow[]): Promise<{ ok: true } | { ok: false; error: string }>` — exported from `src/lib/client-dashboard/apply-to-business.ts`.
  - Task 30 (client dashboard) reuses `applyToBusiness`.

---

- [ ] **Step 1: Delete retired files**

Delete the following files (each was part of the anonymous flow or per-entry verification, now retired):

```bash
rm src/lib/waitlist/join-waitlist.ts
rm src/lib/waitlist/join-waitlist.test.ts
rm src/app/api/waitlist/route.ts
rm src/app/join/[slug]/join-waitlist-form.tsx
```

For Task 20 files — check if they exist first, then delete if present:

```bash
[ -f src/lib/waitlist/verify-email.ts ] && rm src/lib/waitlist/verify-email.ts
[ -f src/lib/waitlist/verify-email.test.ts ] && rm src/lib/waitlist/verify-email.test.ts
[ -f "src/app/verify-email/[token]/page.tsx" ] && rm "src/app/verify-email/[token]/page.tsx"
```

- [ ] **Step 2: Run `tsc --noEmit` to confirm no more stale type errors**

Run: `npx tsc --noEmit`
Expected: 0 errors. (The files referencing retired `clients.email/name/phone` columns no longer exist; the remaining codebase was fixed in Task 25.)

- [ ] **Step 3: Write the failing tests for `applyToBusiness`**

Create `src/lib/client-dashboard/apply-to-business.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness, createTestClientAndEntry, cleanupTestClient } from '@/lib/cron/test-helpers'
import { applyToBusiness } from './apply-to-business'

describe('applyToBusiness (integration)', () => {
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

  it('creates a clients row and waitlist_entries row on first apply', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId: ownerUserId } = await createTestBusiness(supabase)
    businessCleanups.push({ businessId, userId: ownerUserId })

    const slug = (await supabase.from('businesses').select('public_slug').eq('id', businessId).single()).data!.public_slug

    const clientEmail = `apply-test-${Date.now()}@example.com`
    const { data: userData } = await supabase.auth.admin.createUser({ email: clientEmail, password: 'SecurePass1', email_confirm: true })
    const clientUserId = userData!.user!.id
    clientCleanups.push(clientUserId)
    await supabase.from('client_profiles').insert({ user_id: clientUserId, name: 'Applicant', email: clientEmail, phone: `1555${Math.floor(1000000 + Math.random() * 8999999)}`, verified_at: new Date().toISOString() })

    const result = await applyToBusiness(supabase, clientUserId, slug, [{ days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' }])
    expect(result.ok).toBe(true)

    const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('business_id', businessId).single()
    expect(entry?.status).toBe('active')
  })

  it('returns error when client already has an active entry for the same business', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId: ownerUserId } = await createTestBusiness(supabase)
    businessCleanups.push({ businessId, userId: ownerUserId })

    const slug = (await supabase.from('businesses').select('public_slug').eq('id', businessId).single()).data!.public_slug

    const { userId: clientUserId } = await createTestClientAndEntry(supabase, businessId)
    clientCleanups.push(clientUserId)

    const result = await applyToBusiness(supabase, clientUserId, slug, [{ days: [0, 6], start: '10:00', end: '18:00' }])
    expect(result.ok).toBe(false)
    expect((result as { ok: false; error: string }).error).toMatch(/already on the waitlist/i)
  })

  it('returns error when business slug is not found', async () => {
    const supabase = createServiceRoleClient()
    const clientEmail = `apply-notfound-${Date.now()}@example.com`
    const { data: userData } = await supabase.auth.admin.createUser({ email: clientEmail, password: 'SecurePass1', email_confirm: true })
    const clientUserId = userData!.user!.id
    clientCleanups.push(clientUserId)
    await supabase.from('client_profiles').insert({ user_id: clientUserId, name: 'Ghost', email: clientEmail, phone: `1555${Math.floor(1000000 + Math.random() * 8999999)}`, verified_at: new Date().toISOString() })

    const result = await applyToBusiness(supabase, clientUserId, 'no-such-slug-xyz', [{ days: [1], start: '09:00', end: '17:00' }])
    expect(result.ok).toBe(false)
    expect((result as { ok: false; error: string }).error).toMatch(/not found/i)
  })
})
```

Run: `npx vitest run apply-to-business.test.ts`
Expected: FAIL with "Cannot find module './apply-to-business'"

- [ ] **Step 4: Implement `src/lib/client-dashboard/apply-to-business.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

export type TimeWindow = { days: number[]; start: string; end: string }

export async function applyToBusiness(
  supabase: SupabaseClient<Database>,
  userId: string,
  businessSlug: string,
  timeWindows: TimeWindow[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('public_slug', businessSlug)
    .maybeSingle()

  if (!business) return { ok: false, error: 'Business not found.' }

  const businessId = business.id

  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .maybeSingle()

  let clientId: string

  if (existingClient) {
    const { data: activeEntry } = await supabase
      .from('waitlist_entries')
      .select('id')
      .eq('client_id', existingClient.id)
      .eq('status', 'active')
      .maybeSingle()

    if (activeEntry) return { ok: false, error: 'You are already on the waitlist for this business.' }

    clientId = existingClient.id
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({ business_id: businessId, user_id: userId })
      .select('id')
      .single()

    if (clientError || !newClient) return { ok: false, error: 'Could not create client record. Please try again.' }
    clientId = newClient.id
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { error: entryError } = await supabase.from('waitlist_entries').insert({
    business_id: businessId,
    client_id: clientId,
    time_windows: timeWindows as unknown as Json,
    status: 'active',
    expires_at: expiresAt,
  })

  if (entryError) return { ok: false, error: 'Could not create waitlist entry. Please try again.' }
  return { ok: true }
}
```

Run: `npx vitest run apply-to-business.test.ts`
Expected: all 3 tests pass.

- [ ] **Step 5: Create `src/app/api/client/apply/[slug]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import { applyToBusiness } from '@/lib/client-dashboard/apply-to-business'

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const timeWindows: unknown = body?.time_windows
  if (!Array.isArray(timeWindows) || timeWindows.length === 0) {
    return NextResponse.json({ error: 'Please select at least one time window.' }, { status: 400 })
  }

  const result = await applyToBusiness(supabase, user.id, params.slug, timeWindows)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Rewrite `src/app/join/[slug]/page.tsx`**

This page is now a server component that enforces auth before rendering the apply form.

```tsx
import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/db/supabase'
import ApplyForm from './apply-form'

export default async function JoinPage({ params }: { params: { slug: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/client/login?next=/join/${params.slug}`)

  const serviceSupabase = createServiceRoleClient()
  const { data: business } = await serviceSupabase
    .from('businesses')
    .select('id, name, business_type, whatsapp_number')
    .eq('public_slug', params.slug)
    .maybeSingle()

  if (!business) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Business not found</h1>
        <p>This waitlist link is no longer active.</p>
      </main>
    )
  }

  const { data: profile } = await serviceSupabase
    .from('client_profiles')
    .select('name, email, phone')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/client/login')

  return (
    <main style={{ padding: '2rem' }}>
      <h2>Join the waitlist for {business.name}</h2>
      {business.business_type && <p>Type: {business.business_type}</p>}
      {business.whatsapp_number && <p>Contact: {business.whatsapp_number}</p>}
      <p>Applying as: {profile.name} ({profile.email})</p>
      <ApplyForm slug={params.slug} />
    </main>
  )
}
```

- [ ] **Step 7: Create `src/app/join/[slug]/apply-form.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ApplyForm({ slug }: { slug: string }) {
  const router = useRouter()
  const [windows, setWindows] = useState([{ days: [] as number[], start: '09:00', end: '17:00' }])
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function toggleDay(windowIdx: number, day: number) {
    setWindows((prev) => prev.map((w, i) =>
      i !== windowIdx ? w : {
        ...w,
        days: w.days.includes(day) ? w.days.filter((d) => d !== day) : [...w.days, day].sort(),
      }
    ))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (windows.some((w) => w.days.length === 0)) {
      setError('Please select at least one day for each time window.')
      return
    }
    const res = await fetch(`/api/client/apply/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time_windows: windows }),
    })
    const data: unknown = await res.json()
    if (!res.ok) {
      setError((data as { error?: string }).error ?? 'Could not submit application.')
      return
    }
    setSubmitted(true)
    setTimeout(() => router.push('/client/dashboard'), 2000)
  }

  if (submitted) {
    return <p>You have been added to the waitlist. Redirecting to your dashboard…</p>
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {windows.map((w, i) => (
        <fieldset key={i}>
          <legend>Preferred time window {i + 1}</legend>
          <div>
            {DAYS.map((label, day) => (
              <label key={day}>
                <input type="checkbox" checked={w.days.includes(day)} onChange={() => toggleDay(i, day)} />
                {label}
              </label>
            ))}
          </div>
          <label>From <input type="time" value={w.start} onChange={(e) => setWindows((prev) => prev.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} /></label>
          <label>To <input type="time" value={w.end} onChange={(e) => setWindows((prev) => prev.map((x, j) => j === i ? { ...x, end: e.target.value } : x))} /></label>
        </fieldset>
      ))}
      <button type="button" onClick={() => setWindows((prev) => [...prev, { days: [], start: '09:00', end: '17:00' }])}>
        Add another time window
      </button>
      <button type="submit">Join waitlist</button>
    </form>
  )
}
```

- [ ] **Step 8: Run full test suite and type check**

Run: `npx vitest run`
Expected: all tests pass. The two removed files (`join-waitlist.test.ts`, `verify-email.test.ts`) are gone — their test count is subtracted from totals.

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 9: Manual walkthrough**

With `npm run dev` and local Supabase running (logged in as a verified client from Task 26):
1. Open a business's `/join/[slug]` URL while NOT logged in → expect redirect to `/client/login?next=/join/[slug]`.
2. Log in → expect redirect back to `/join/[slug]` showing the apply form with pre-filled client name/email.
3. Fill in a time window and submit → expect "added to waitlist" confirmation and redirect to `/client/dashboard` (will 404 until Task 30).
4. Attempt to submit again for the same business → expect "You are already on the waitlist" error.

- [ ] **Step 10: Commit**

```bash
git add src/lib/client-dashboard/apply-to-business.ts \
        src/lib/client-dashboard/apply-to-business.test.ts \
        src/app/api/client/apply/ \
        src/app/join/
git commit -m "feat: replace anonymous join flow with account-gated apply flow"
```

---
