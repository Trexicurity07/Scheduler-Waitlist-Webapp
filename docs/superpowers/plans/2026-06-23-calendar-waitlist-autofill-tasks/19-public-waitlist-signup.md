### Task 19: Public Waitlist Signup (Business Logic + Form + Route)

> ██████████████████████████████████████████████████████████████
> ## ⛔ THIS TASK HAS BEEN SUPERSEDED BY TASK 27
>
> The anonymous join flow built here (`join-waitlist.ts`, `src/app/api/waitlist/route.ts`,
> `/join/[slug]`) is fully replaced by an account-gated apply flow. Every waitlist
> application now requires a client account (see spec:
> `docs/superpowers/specs/2026-06-25-client-accounts-unified-apply-flow-design.md`).
>
> **Task 27** (`27-apply-flow-rework.md`) deletes all files produced here and replaces
> them. Do not implement Task 19 if it has not already been done. If it HAS already been
> done, proceed directly to Task 27 which handles the deletion and replacement.
> ██████████████████████████████████████████████████████████████

**Files:**
- Create: `src/lib/waitlist/join-waitlist.ts`
- Create: `src/app/join/[slug]/page.tsx`
- Create: `src/app/join/[slug]/join-waitlist-form.tsx`
- Create: `src/app/api/waitlist/route.ts`
- Test: `src/lib/waitlist/join-waitlist.test.ts` (integration — requires local Supabase running)

**Interfaces:**
- Consumes: `generateToken` (Task 4), `sendVerificationEmail` (Task 13), `TimeWindow` (Task 6), `createServiceRoleClient` (Task 7).
- Produces:
  - `interface JoinWaitlistInput { businessSlug: string; name: string; email: string; phone: string; timeWindows: TimeWindow[] }`
  - `joinWaitlist(supabase: SupabaseClient<Database>, input: JoinWaitlistInput): Promise<{ ok: true } | { ok: false; error: string }>`
  - Consumed by `POST /api/waitlist`'s route handler. Nothing later depends on the page/form components directly.

- [ ] **Step 1: Write the failing tests**

`src/lib/waitlist/join-waitlist.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness } from '@/lib/cron/test-helpers'

const mockSendVerificationEmail = vi.fn()

vi.mock('@/lib/notifications/email', () => ({
  sendVerificationEmail: (...args: unknown[]) => mockSendVerificationEmail(...args),
}))

import { joinWaitlist } from './join-waitlist'

describe('joinWaitlist (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  beforeEach(() => {
    mockSendVerificationEmail.mockReset()
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
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
    const { data: business } = await supabase.from('businesses').select('public_slug').eq('id', businessId).single()
    return { supabase, businessId, slug: business!.public_slug }
  }

  it('creates a pending_verification entry and sends a verification email', async () => {
    const { supabase, slug } = await setupBusiness()

    const result = await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Alice Client',
      email: 'alice@example.com',
      phone: '15551112222',
      timeWindows: [{ days: [1, 3], start: '09:00', end: '17:00' }],
    })

    expect(result).toEqual({ ok: true })
    const { data: entry } = await supabase
      .from('waitlist_entries')
      .select('status, email_verification_token, clients(email)')
      .eq('client_id', (await supabase.from('clients').select('id').eq('email', 'alice@example.com').single()).data!.id)
      .single()
    expect(entry?.status).toBe('pending_verification')
    expect(entry?.email_verification_token).toBeTruthy()
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      'alice@example.com',
      expect.objectContaining({ verifyUrl: expect.stringContaining(entry!.email_verification_token!) })
    )
  })

  it('rejects a signup when the email already has an active entry at that business', async () => {
    const { supabase, slug } = await setupBusiness()
    await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Bob Client',
      email: 'bob@example.com',
      phone: '15553334444',
      timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
    })
    await supabase.from('waitlist_entries').update({ status: 'active' }).eq(
      'client_id',
      (await supabase.from('clients').select('id').eq('email', 'bob@example.com').single()).data!.id
    )

    const result = await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Bob Client',
      email: 'bob@example.com',
      phone: '15559998888',
      timeWindows: [{ days: [2], start: '09:00', end: '17:00' }],
    })

    expect(result.ok).toBe(false)
  })

  it('rejects a signup when the phone already has an active entry at that business', async () => {
    const { supabase, slug } = await setupBusiness()
    await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Carol Client',
      email: 'carol@example.com',
      phone: '15550001111',
      timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
    })
    await supabase.from('waitlist_entries').update({ status: 'active' }).eq(
      'client_id',
      (await supabase.from('clients').select('id').eq('email', 'carol@example.com').single()).data!.id
    )

    const result = await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Carol Client',
      email: 'carol-other@example.com',
      phone: '15550001111',
      timeWindows: [{ days: [2], start: '09:00', end: '17:00' }],
    })

    expect(result.ok).toBe(false)
  })

  it('returns an error when the business slug does not exist', async () => {
    const supabase = createServiceRoleClient()
    const result = await joinWaitlist(supabase, {
      businessSlug: 'no-such-business',
      name: 'Dana Client',
      email: 'dana@example.com',
      phone: '15557776666',
      timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
    })
    expect(result).toEqual({ ok: false, error: 'Business not found' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- join-waitlist.test.ts`
Expected: FAIL — `src/lib/waitlist/join-waitlist.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/waitlist/join-waitlist.ts`**

> **Amended 2026-06-25:** the original version below assigns `input.timeWindows`
> (typed `TimeWindow[]`) directly to the `waitlist_entries` insert's `time_windows`
> column, which the generated Supabase types declare as `Json` — `tsc --noEmit`
> fails because `TimeWindow` has no index signature satisfying `Json`'s object
> branch. This is the same family of issue as Task 16's `Json`-vs-`TimeWindow[]`
> mismatch, just in the opposite direction (writing instead of reading). Fixed by
> routing the value through `unknown` first, same convention as Task 16's fix —
> zero runtime change, casts are erased at compile time. Added a `Json` import
> from `@/types/database` to name the target type.

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import type { TimeWindow } from '@/lib/matching/match-waitlist'
import { generateToken } from '@/lib/tokens/generate-token'
import { sendVerificationEmail } from '@/lib/notifications/email'

export interface JoinWaitlistInput {
  businessSlug: string
  name: string
  email: string
  phone: string
  timeWindows: TimeWindow[]
}

export async function joinWaitlist(
  supabase: SupabaseClient<Database>,
  input: JoinWaitlistInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('public_slug', input.businessSlug)
    .maybeSingle()
  if (!business) return { ok: false, error: 'Business not found' }

  const { data: emailMatches } = await supabase
    .from('clients')
    .select('id')
    .eq('business_id', business.id)
    .eq('email', input.email)
  const { data: phoneMatches } = await supabase
    .from('clients')
    .select('id')
    .eq('business_id', business.id)
    .eq('phone', input.phone)

  const matchingClientIds = [...new Set([...(emailMatches ?? []), ...(phoneMatches ?? [])].map((c) => c.id))]

  if (matchingClientIds.length > 0) {
    const { data: activeEntries } = await supabase
      .from('waitlist_entries')
      .select('id')
      .in('client_id', matchingClientIds)
      .eq('status', 'active')
    if (activeEntries && activeEntries.length > 0) {
      return { ok: false, error: 'You are already on the waitlist for this business.' }
    }
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({ business_id: business.id, name: input.name, email: input.email, phone: input.phone })
    .select('id')
    .single()
  if (clientError || !client) return { ok: false, error: 'Could not create client record.' }

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { error: entryError } = await supabase.from('waitlist_entries').insert({
    business_id: business.id,
    client_id: client.id,
    time_windows: input.timeWindows as unknown as Json,
    status: 'pending_verification',
    email_verification_token: token,
    expires_at: expiresAt,
  })
  if (entryError) return { ok: false, error: 'Could not create waitlist entry.' }

  await sendVerificationEmail(input.email, {
    businessName: business.name,
    verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/verify-email/${token}`,
    expiryHours: 48,
  })

  return { ok: true }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- join-waitlist.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Implement the API route**

`src/app/api/waitlist/route.ts`:

> **Amended 2026-06-25:** the original version below called `await request.json()`
> with no `try/catch`. This route is public and unauthenticated, so it will see
> malformed bodies in normal operation (not just attacks) — without the
> `try/catch`, a non-JSON body throws before `safeParse` ever runs, producing a
> framework default 500 instead of this route's controlled 400. Wrapped the parse
> in `try/catch` so malformed JSON gets the same `{ ok: false, error: 'Invalid
> input' }` / 400 response as a schema-shape failure. No other behavior changes.

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { joinWaitlist } from '@/lib/waitlist/join-waitlist'

const requestSchema = z.object({
  businessSlug: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
  timeWindows: z
    .array(
      z.object({
        days: z.array(z.number().int().min(0).max(6)).min(1),
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
      })
    )
    .min(1),
})

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const result = await joinWaitlist(supabase, parsed.data)

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Build the public join page**

`src/app/join/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { JoinWaitlistForm } from './join-waitlist-form'

export default async function JoinWaitlistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServiceRoleClient()
  const { data: business } = await supabase
    .from('businesses')
    .select('name, public_slug')
    .eq('public_slug', slug)
    .maybeSingle()

  if (!business) {
    notFound()
  }

  return (
    <main>
      <h1>Join the waitlist for {business.name}</h1>
      <p>
        Tell us when you&apos;re usually available. If a matching slot opens up, we&apos;ll email and WhatsApp you
        right away. Signups are automatically removed after 14 days.
      </p>
      <JoinWaitlistForm businessSlug={business.public_slug} />
    </main>
  )
}
```

`src/app/join/[slug]/join-waitlist-form.tsx`:

```tsx
'use client'

import { useState, type FormEvent } from 'react'

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

export function JoinWaitlistForm({ businessSlug }: { businessSlug: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('17:00')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  function toggleDay(day: number) {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus('submitting')
    setError('')

    const response = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessSlug,
        name,
        email,
        phone,
        timeWindows: [{ days: selectedDays, start, end }],
      }),
    })
    const body = await response.json()

    if (!response.ok || !body.ok) {
      setStatus('error')
      setError(body.error ?? 'Something went wrong. Please try again.')
      return
    }
    setStatus('success')
  }

  if (status === 'success') {
    return <p>Check your email to confirm your spot on the waitlist.</p>
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Mobile number
        <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </label>
      <fieldset>
        <legend>Days you&apos;re available</legend>
        {DAYS.map((day) => (
          <label key={day.value}>
            <input type="checkbox" checked={selectedDays.includes(day.value)} onChange={() => toggleDay(day.value)} />
            {day.label}
          </label>
        ))}
      </fieldset>
      <label>
        From
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
      </label>
      <label>
        To
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={status === 'submitting' || selectedDays.length === 0}>
        Join waitlist
      </button>
    </form>
  )
}
```

- [ ] **Step 7: Manual walkthrough**

With `supabase start` and `npm run dev` running: visit `/join/<a real business slug>`, submit the form, confirm a verification email arrives (check the Resend dashboard or local log if using a test API key), and confirm a `pending_verification` row appears in `waitlist_entries` via Supabase Studio.

- [ ] **Step 8: Commit**

```bash
git add src/lib/waitlist/join-waitlist.ts src/lib/waitlist/join-waitlist.test.ts src/app/join src/app/api/waitlist
git commit -m "feat: add public waitlist signup flow"
```

---

