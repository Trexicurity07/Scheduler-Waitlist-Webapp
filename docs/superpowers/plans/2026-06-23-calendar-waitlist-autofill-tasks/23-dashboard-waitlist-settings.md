### Task 23: Dashboard — Waitlist Management + Settings

> ────────────────────────────────────────────────────────────────
> ## ⚠️ SCHEMA AMENDMENT — READ BEFORE IMPLEMENTING
>
> **Reason:** Task 25 migrates `clients` to drop `name`/`email`/`phone` columns. Client
> identity now lives in `client_profiles`. The "add client manually" flow no longer
> creates a client record from scratch — a client must already have a `client_profiles`
> account. If no account is found, return an actionable error. Apply ALL six changes below.
>
> ---
>
> **Change 1 — `AddWaitlistEntryInput` interface**
>
> Remove `name`, `email`, `phone`. Replace with a single `identifier` field (the business
> owner enters an email or phone number to look up the existing client account):
> ```ts
> export interface AddWaitlistEntryInput {
>   identifier: string  // email or phone — looks up client_profiles
>   timeWindows: TimeWindow[]
> }
> ```
>
> **Change 2 — `addWaitlistEntry` implementation**
>
> Replace the entire function body in Step 3 with:
> ```ts
> export async function addWaitlistEntry(
>   supabase: SupabaseClient<Database>,
>   businessId: string,
>   input: AddWaitlistEntryInput
> ): Promise<{ ok: true } | { ok: false; error: string }> {
>   const { data: business } = await supabase
>     .from('businesses')
>     .select('name, whatsapp_number')
>     .eq('id', businessId)
>     .single()
>   if (!business) return { ok: false, error: 'Business not found' }
>
>   // Resolve client_profiles by email or normalised phone
>   const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.identifier)
>   const { data: profile } = await supabase
>     .from('client_profiles')
>     .select('user_id, name, email')
>     .eq(isEmail ? 'email' : 'phone', input.identifier)
>     .maybeSingle()
>
>   if (!profile) {
>     return {
>       ok: false,
>       error: 'No client account found for this email or phone. The client must sign up first.',
>     }
>   }
>
>   // Find or create the per-business clients row
>   const { data: existingClient } = await supabase
>     .from('clients')
>     .select('id')
>     .eq('business_id', businessId)
>     .eq('user_id', profile.user_id)
>     .maybeSingle()
>
>   let clientId: string
>   if (existingClient) {
>     // Check for an already-active entry
>     const { data: activeEntry } = await supabase
>       .from('waitlist_entries')
>       .select('id')
>       .eq('client_id', existingClient.id)
>       .eq('status', 'active')
>       .maybeSingle()
>     if (activeEntry) return { ok: false, error: 'This client already has an active waitlist entry.' }
>     clientId = existingClient.id
>   } else {
>     const { data: newClient, error: clientError } = await supabase
>       .from('clients')
>       .insert({ business_id: businessId, user_id: profile.user_id })
>       .select('id')
>       .single()
>     if (clientError || !newClient) return { ok: false, error: 'Could not create client record.' }
>     clientId = newClient.id
>   }
>
>   const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
>   const { error: entryError } = await supabase.from('waitlist_entries').insert({
>     business_id: businessId,
>     client_id: clientId,
>     time_windows: input.timeWindows as unknown as import('@/types/database').Database['public']['Tables']['waitlist_entries']['Insert']['time_windows'],
>     status: 'active',
>     expires_at: expiresAt,
>   })
>   if (entryError) return { ok: false, error: 'Could not create waitlist entry.' }
>
>   await sendOwnerActivityEmail(profile.email, {
>     businessName: business.name,
>     action: 'added',
>     whatsappLink: ownerWhatsAppLink(business.name, business.whatsapp_number),
>   })
>   return { ok: true }
> }
> ```
>
> **Change 3 — `removeWaitlistEntry` — read email via `client_profiles` join**
>
> In `removeWaitlistEntry`, replace:
> ```ts
> .select('id, business_id, clients(name, email)')
> ```
> With:
> ```ts
> .select('id, business_id, clients(client_profiles(name, email))')
> ```
> And replace:
> ```ts
> if (entry.clients && business) {
>   await sendOwnerActivityEmail(entry.clients.email, {
> ```
> With:
> ```ts
> const clientProfile = (entry.clients as { client_profiles?: { name?: string; email?: string } } | null)?.client_profiles
> if (clientProfile?.email && business) {
>   await sendOwnerActivityEmail(clientProfile.email, {
> ```
>
> **Change 4 — updated test for `addWaitlistEntry`**
>
> The test in Step 1 must be rewritten to first create a `client_profiles` account, then
> call `addWaitlistEntry` with the identifier. Replace the entire `describe('addWaitlistEntry')`
> block with:
> ```ts
> describe('addWaitlistEntry', () => {
>   const clientCleanups: string[] = []
>   afterEach(async () => {
>     const supabase = createServiceRoleClient()
>     for (const id of clientCleanups.splice(0)) await supabase.auth.admin.deleteUser(id)
>   })
>
>   async function createClientAccount(supabase: ReturnType<typeof createServiceRoleClient>, email: string, phone: string) {
>     const { data: userData } = await supabase.auth.admin.createUser({ email, password: 'TestPass1', email_confirm: true })
>     const userId = userData!.user!.id
>     clientCleanups.push(userId)
>     await supabase.from('client_profiles').insert({
>       user_id: userId, name: 'Test Client', email, phone, verified_at: new Date().toISOString(),
>     })
>     return userId
>   }
>
>   it('creates an active entry when the client has an account and notifies them', async () => {
>     const { supabase, businessId } = await setupBusiness()
>     const email = `manual-${Date.now()}@example.com`
>     await createClientAccount(supabase, email, `1555${Math.floor(1000000 + Math.random() * 8999999)}`)
>
>     const result = await addWaitlistEntry(supabase, businessId, {
>       identifier: email,
>       timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
>     })
>     expect(result).toEqual({ ok: true })
>
>     const { data: entries } = await supabase
>       .from('waitlist_entries')
>       .select('status, clients!inner(user_id, client_profiles!inner(email))')
>       .eq('business_id', businessId)
>       .eq('status', 'active')
>     expect(entries?.length).toBe(1)
>     expect(mockSendOwnerActivityEmail).toHaveBeenCalledWith(
>       email,
>       expect.objectContaining({ action: 'added' })
>     )
>   })
>
>   it('returns error when no account exists for the identifier', async () => {
>     const { supabase, businessId } = await setupBusiness()
>     const result = await addWaitlistEntry(supabase, businessId, {
>       identifier: 'nosuchclient@example.com',
>       timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
>     })
>     expect(result.ok).toBe(false)
>     expect((result as { ok: false; error: string }).error).toMatch(/sign up first/i)
>   })
>
>   it('rejects adding a client that already has an active entry', async () => {
>     const { supabase, businessId } = await setupBusiness()
>     const email = `dup-${Date.now()}@example.com`
>     await createClientAccount(supabase, email, `1555${Math.floor(1000000 + Math.random() * 8999999)}`)
>
>     await addWaitlistEntry(supabase, businessId, { identifier: email, timeWindows: [{ days: [1], start: '09:00', end: '17:00' }] })
>     const result = await addWaitlistEntry(supabase, businessId, { identifier: email, timeWindows: [{ days: [2], start: '09:00', end: '17:00' }] })
>     expect(result.ok).toBe(false)
>   })
> })
> ```
>
> **Change 5 — `AddEntryForm` UI — identifier field replaces name/email/phone**
>
> In `src/app/(dashboard)/waitlist/add-entry-form.tsx`, replace the three separate
> `name`/`email`/`phone` inputs with a single identifier input:
> ```tsx
> <label>
>   Client email or phone number
>   <input
>     type="text"
>     value={identifier}
>     onChange={(e) => setIdentifier(e.target.value)}
>     placeholder="email@example.com or 15551234567"
>     required
>   />
> </label>
> ```
> Form state initialises `identifier: ''` instead of `name/email/phone`. The POST body
> sends `{ identifier, timeWindows }` instead of `{ name, email, phone, timeWindows }`.
>
> **Change 6 — `WaitlistPage` query and display**
>
> In `src/app/(dashboard)/waitlist/page.tsx`, replace:
> ```ts
> .select('id, clients(name, email, phone)')
> ```
> With:
> ```ts
> .select('id, clients(client_profiles(name, email, phone))')
> ```
> And replace the list item display:
> ```tsx
> {entry.clients?.name} ({entry.clients?.email}, {entry.clients?.phone})
> ```
> With:
> ```tsx
> {(entry.clients as { client_profiles?: { name?: string; email?: string; phone?: string } } | null)?.client_profiles?.name ?? '—'}{' '}
> ({(entry.clients as { client_profiles?: { email?: string } } | null)?.client_profiles?.email ?? '—'})
> ```
> ────────────────────────────────────────────────────────────────

**Files:**
- Create: `src/lib/dashboard/manage-waitlist.ts`
- Test: `src/lib/dashboard/manage-waitlist.test.ts` (integration — requires local Supabase running)
- Create: `src/app/(dashboard)/waitlist/page.tsx`
- Create: `src/app/(dashboard)/waitlist/add-entry-form.tsx`
- Create: `src/app/(dashboard)/waitlist/settings-form.tsx`
- Create: `src/app/(dashboard)/waitlist/remove-entry-button.tsx`
- Create: `src/app/api/dashboard/waitlist/route.ts`
- Create: `src/app/api/dashboard/waitlist/[id]/route.ts`
- Create: `src/app/api/dashboard/settings/route.ts`

**Interfaces:**
- Consumes: `getCurrentBusiness()` (Task 22), `TimeWindow` (Task 6), `buildWhatsAppLink()` (Task 5), `sendOwnerActivityEmail()` (Task 13), `createServerSupabaseClient()` (Task 7).
- Produces:
  - `interface AddWaitlistEntryInput { name: string; email: string; phone: string; timeWindows: TimeWindow[] }`
  - `addWaitlistEntry(supabase: SupabaseClient<Database>, businessId: string, input: AddWaitlistEntryInput): Promise<{ ok: true } | { ok: false; error: string }>`
  - `removeWaitlistEntry(supabase: SupabaseClient<Database>, businessId: string, entryId: string): Promise<{ ok: true } | { ok: false; error: string }>`
  - `interface BusinessSettingsInput { batchSize: number; batchIntervalMinutes: number; minNoticeHours: number; minConfirmLeadHours: number }`
  - `updateBusinessSettings(supabase: SupabaseClient<Database>, businessId: string, input: BusinessSettingsInput): Promise<{ ok: true } | { ok: false; error: string }>`
  - Nothing later in this plan consumes these directly.

- [ ] **Step 1: Write the failing tests**

`src/lib/dashboard/manage-waitlist.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness } from '@/lib/cron/test-helpers'

const mockSendOwnerActivityEmail = vi.fn()

vi.mock('@/lib/notifications/email', () => ({
  sendOwnerActivityEmail: (...args: unknown[]) => mockSendOwnerActivityEmail(...args),
}))

import { addWaitlistEntry, removeWaitlistEntry, updateBusinessSettings } from './manage-waitlist'

describe('manage-waitlist (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  beforeEach(() => {
    mockSendOwnerActivityEmail.mockReset()
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
    return { supabase, businessId }
  }

  describe('addWaitlistEntry', () => {
    it('creates an active entry and notifies the client', async () => {
      const { supabase, businessId } = await setupBusiness()

      const result = await addWaitlistEntry(supabase, businessId, {
        name: 'Owner-Added Client',
        email: 'manual@example.com',
        phone: '15551230000',
        timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
      })

      expect(result).toEqual({ ok: true })
      const { data: entry } = await supabase
        .from('waitlist_entries')
        .select('status, expires_at, clients!inner(email)')
        .eq('clients.email', 'manual@example.com')
        .single()
      expect(entry?.status).toBe('active')
      expect(entry?.expires_at).toBeTruthy()
      expect(mockSendOwnerActivityEmail).toHaveBeenCalledWith(
        'manual@example.com',
        expect.objectContaining({ action: 'added' })
      )
    })

    it('rejects adding a client that already has an active entry', async () => {
      const { supabase, businessId } = await setupBusiness()
      await addWaitlistEntry(supabase, businessId, {
        name: 'Dup Client',
        email: 'dup@example.com',
        phone: '15559990000',
        timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
      })

      const result = await addWaitlistEntry(supabase, businessId, {
        name: 'Dup Client',
        email: 'dup@example.com',
        phone: '15559990001',
        timeWindows: [{ days: [2], start: '09:00', end: '17:00' }],
      })

      expect(result.ok).toBe(false)
    })
  })

  describe('removeWaitlistEntry', () => {
    it('marks the entry removed and notifies the client', async () => {
      const { supabase, businessId } = await setupBusiness()
      await addWaitlistEntry(supabase, businessId, {
        name: 'Removable Client',
        email: 'removable@example.com',
        phone: '15558880000',
        timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
      })
      const { data: entry } = await supabase
        .from('waitlist_entries')
        .select('id, clients!inner(email)')
        .eq('clients.email', 'removable@example.com')
        .single()

      const result = await removeWaitlistEntry(supabase, businessId, entry!.id)

      expect(result).toEqual({ ok: true })
      const { data: updated } = await supabase
        .from('waitlist_entries')
        .select('status')
        .eq('id', entry!.id)
        .single()
      expect(updated?.status).toBe('removed')
      expect(mockSendOwnerActivityEmail).toHaveBeenCalledWith(
        'removable@example.com',
        expect.objectContaining({ action: 'removed' })
      )
    })

    it('rejects removing an entry that belongs to a different business', async () => {
      const { supabase, businessId } = await setupBusiness()
      const { businessId: otherBusinessId, userId: otherUserId } = await createTestBusiness(supabase)
      cleanups.push({ businessId: otherBusinessId, userId: otherUserId })

      await addWaitlistEntry(supabase, otherBusinessId, {
        name: 'Other Client',
        email: 'other@example.com',
        phone: '15557770000',
        timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
      })
      const { data: entry } = await supabase
        .from('waitlist_entries')
        .select('id, clients!inner(email)')
        .eq('clients.email', 'other@example.com')
        .single()

      const result = await removeWaitlistEntry(supabase, businessId, entry!.id)
      expect(result).toEqual({ ok: false, error: 'Waitlist entry not found' })
    })
  })

  describe('updateBusinessSettings', () => {
    it('updates the configurable thresholds', async () => {
      const { supabase, businessId } = await setupBusiness()

      const result = await updateBusinessSettings(supabase, businessId, {
        batchSize: 5,
        batchIntervalMinutes: 45,
        minNoticeHours: 36,
        minConfirmLeadHours: 18,
      })

      expect(result).toEqual({ ok: true })
      const { data: business } = await supabase
        .from('businesses')
        .select('batch_size, batch_interval_minutes, min_notice_hours, min_confirm_lead_hours')
        .eq('id', businessId)
        .single()
      expect(business).toEqual({
        batch_size: 5,
        batch_interval_minutes: 45,
        min_notice_hours: 36,
        min_confirm_lead_hours: 18,
      })
    })

    it('rejects settings where confirm lead time is not less than notice hours', async () => {
      const { supabase, businessId } = await setupBusiness()

      const result = await updateBusinessSettings(supabase, businessId, {
        batchSize: 3,
        batchIntervalMinutes: 30,
        minNoticeHours: 12,
        minConfirmLeadHours: 12,
      })

      expect(result).toEqual({
        ok: false,
        error: 'Confirmation lead time must be less than the minimum notice period.',
      })
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- manage-waitlist.test.ts`
Expected: FAIL — `src/lib/dashboard/manage-waitlist.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/dashboard/manage-waitlist.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { TimeWindow } from '@/lib/matching/match-waitlist'
import { buildWhatsAppLink } from '@/lib/notifications/whatsapp'
import { sendOwnerActivityEmail } from '@/lib/notifications/email'

export interface AddWaitlistEntryInput {
  name: string
  email: string
  phone: string
  timeWindows: TimeWindow[]
}

export interface BusinessSettingsInput {
  batchSize: number
  batchIntervalMinutes: number
  minNoticeHours: number
  minConfirmLeadHours: number
}

function ownerWhatsAppLink(businessName: string, whatsappNumber: string): string {
  return buildWhatsAppLink(whatsappNumber, `Hi! Just checking in about ${businessName}.`)
}

export async function addWaitlistEntry(
  supabase: SupabaseClient<Database>,
  businessId: string,
  input: AddWaitlistEntryInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: business } = await supabase
    .from('businesses')
    .select('name, whatsapp_number')
    .eq('id', businessId)
    .single()
  if (!business) return { ok: false, error: 'Business not found' }

  const { data: emailMatches } = await supabase
    .from('clients')
    .select('id')
    .eq('business_id', businessId)
    .eq('email', input.email)
  const { data: phoneMatches } = await supabase
    .from('clients')
    .select('id')
    .eq('business_id', businessId)
    .eq('phone', input.phone)

  const matchingClientIds = [...new Set([...(emailMatches ?? []), ...(phoneMatches ?? [])].map((c) => c.id))]

  if (matchingClientIds.length > 0) {
    const { data: activeEntries } = await supabase
      .from('waitlist_entries')
      .select('id')
      .in('client_id', matchingClientIds)
      .eq('status', 'active')
    if (activeEntries && activeEntries.length > 0) {
      return { ok: false, error: 'This client already has an active waitlist entry.' }
    }
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({ business_id: businessId, name: input.name, email: input.email, phone: input.phone })
    .select('id')
    .single()
  if (clientError || !client) return { ok: false, error: 'Could not create client record.' }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { error: entryError } = await supabase.from('waitlist_entries').insert({
    business_id: businessId,
    client_id: client.id,
    time_windows: input.timeWindows,
    status: 'active',
    expires_at: expiresAt,
  })
  if (entryError) return { ok: false, error: 'Could not create waitlist entry.' }

  await sendOwnerActivityEmail(input.email, {
    businessName: business.name,
    action: 'added',
    whatsappLink: ownerWhatsAppLink(business.name, business.whatsapp_number),
  })

  return { ok: true }
}

export async function removeWaitlistEntry(
  supabase: SupabaseClient<Database>,
  businessId: string,
  entryId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: entry } = await supabase
    .from('waitlist_entries')
    .select('id, business_id, clients(name, email)')
    .eq('id', entryId)
    .maybeSingle()

  if (!entry || entry.business_id !== businessId) {
    return { ok: false, error: 'Waitlist entry not found' }
  }

  await supabase.from('waitlist_entries').update({ status: 'removed' }).eq('id', entryId)

  const { data: business } = await supabase
    .from('businesses')
    .select('name, whatsapp_number')
    .eq('id', businessId)
    .single()

  if (entry.clients && business) {
    await sendOwnerActivityEmail(entry.clients.email, {
      businessName: business.name,
      action: 'removed',
      whatsappLink: ownerWhatsAppLink(business.name, business.whatsapp_number),
    })
  }

  return { ok: true }
}

export async function updateBusinessSettings(
  supabase: SupabaseClient<Database>,
  businessId: string,
  input: BusinessSettingsInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.minConfirmLeadHours >= input.minNoticeHours) {
    return { ok: false, error: 'Confirmation lead time must be less than the minimum notice period.' }
  }

  const { error } = await supabase
    .from('businesses')
    .update({
      batch_size: input.batchSize,
      batch_interval_minutes: input.batchIntervalMinutes,
      min_notice_hours: input.minNoticeHours,
      min_confirm_lead_hours: input.minConfirmLeadHours,
    })
    .eq('id', businessId)

  if (error) return { ok: false, error: 'Could not update settings.' }
  return { ok: true }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- manage-waitlist.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Build the waitlist page, forms, and API routes**

`src/app/(dashboard)/waitlist/page.tsx`:

```tsx
import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'
import { AddEntryForm } from './add-entry-form'
import { SettingsForm } from './settings-form'
import { RemoveEntryButton } from './remove-entry-button'

export default async function WaitlistPage() {
  const { supabase, business } = await getCurrentBusiness()

  const { data: entries } = await supabase
    .from('waitlist_entries')
    .select('id, clients(name, email, phone)')
    .eq('business_id', business.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  return (
    <main>
      <h1>Waitlist — {business.name}</h1>

      <section>
        <h2>Active waitlist ({entries?.length ?? 0})</h2>
        {!entries || entries.length === 0 ? (
          <p>No one is on the waitlist yet.</p>
        ) : (
          <ul>
            {entries.map((entry) => (
              <li key={entry.id}>
                {entry.clients?.name} ({entry.clients?.email}, {entry.clients?.phone}){' '}
                <RemoveEntryButton entryId={entry.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Add a client manually</h2>
        <AddEntryForm />
      </section>

      <section>
        <h2>Settings</h2>
        <SettingsForm business={business} />
      </section>
    </main>
  )
}
```

`src/app/(dashboard)/waitlist/remove-entry-button.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RemoveEntryButton({ entryId }: { entryId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleRemove() {
    setPending(true)
    await fetch(`/api/dashboard/waitlist/${entryId}`, { method: 'DELETE' })
    setPending(false)
    router.refresh()
  }

  return (
    <button onClick={handleRemove} disabled={pending}>
      {pending ? 'Removing…' : 'Remove'}
    </button>
  )
}
```

`src/app/(dashboard)/waitlist/add-entry-form.tsx`:

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

export function AddEntryForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('17:00')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [error, setError] = useState('')

  function toggleDay(day: number) {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus('submitting')
    setError('')

    const response = await fetch('/api/dashboard/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, timeWindows: [{ days: selectedDays, start, end }] }),
    })
    const body = await response.json()

    if (!response.ok || !body.ok) {
      setStatus('error')
      setError(body.error ?? 'Something went wrong. Please try again.')
      return
    }

    setName('')
    setEmail('')
    setPhone('')
    setSelectedDays([])
    setStatus('idle')
    router.refresh()
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
        <legend>Days available</legend>
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
        Add to waitlist
      </button>
    </form>
  )
}
```

`src/app/(dashboard)/waitlist/settings-form.tsx`:

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'

type Business = Database['public']['Tables']['businesses']['Row']

export function SettingsForm({ business }: { business: Business }) {
  const router = useRouter()
  const [batchSize, setBatchSize] = useState(business.batch_size)
  const [batchIntervalMinutes, setBatchIntervalMinutes] = useState(business.batch_interval_minutes)
  const [minNoticeHours, setMinNoticeHours] = useState(business.min_notice_hours)
  const [minConfirmLeadHours, setMinConfirmLeadHours] = useState(business.min_confirm_lead_hours)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (minConfirmLeadHours >= minNoticeHours) {
      setError('Confirmation lead time must be less than the minimum notice period.')
      setStatus('error')
      return
    }

    setStatus('submitting')
    const response = await fetch('/api/dashboard/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize, batchIntervalMinutes, minNoticeHours, minConfirmLeadHours }),
    })
    const body = await response.json()

    if (!response.ok || !body.ok) {
      setStatus('error')
      setError(body.error ?? 'Something went wrong. Please try again.')
      return
    }

    setStatus('saved')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Batch size (offers sent per round)
        <input type="number" min={1} value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} required />
      </label>
      <label>
        Batch interval (minutes before the next round)
        <input
          type="number"
          min={1}
          value={batchIntervalMinutes}
          onChange={(e) => setBatchIntervalMinutes(Number(e.target.value))}
          required
        />
      </label>
      <label>
        Minimum notice (hours before a cancelled slot is offered)
        <input
          type="number"
          min={1}
          value={minNoticeHours}
          onChange={(e) => setMinNoticeHours(Number(e.target.value))}
          required
        />
      </label>
      <label>
        Minimum confirmation lead time (hours)
        <input
          type="number"
          min={0}
          value={minConfirmLeadHours}
          onChange={(e) => setMinConfirmLeadHours(Number(e.target.value))}
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Saving…' : 'Save settings'}
      </button>
      {status === 'saved' && <p>Saved.</p>}
    </form>
  )
}
```

`src/app/api/dashboard/waitlist/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import { addWaitlistEntry } from '@/lib/dashboard/manage-waitlist'

const addEntrySchema = z.object({
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
  const parsed = addEntrySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', userData.user.id)
    .single()
  if (!business) {
    return NextResponse.json({ ok: false, error: 'Business not found' }, { status: 404 })
  }

  const result = await addWaitlistEntry(supabase, business.id, parsed.data)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
```

`src/app/api/dashboard/waitlist/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import { removeWaitlistEntry } from '@/lib/dashboard/manage-waitlist'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', userData.user.id)
    .single()
  if (!business) {
    return NextResponse.json({ ok: false, error: 'Business not found' }, { status: 404 })
  }

  const result = await removeWaitlistEntry(supabase, business.id, id)
  return NextResponse.json(result, { status: result.ok ? 200 : 404 })
}
```

`src/app/api/dashboard/settings/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import { updateBusinessSettings } from '@/lib/dashboard/manage-waitlist'

const settingsSchema = z.object({
  batchSize: z.number().int().min(1),
  batchIntervalMinutes: z.number().int().min(1),
  minNoticeHours: z.number().int().min(1),
  minConfirmLeadHours: z.number().int().min(0),
})

export async function PATCH(request: Request): Promise<NextResponse> {
  const parsed = settingsSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', userData.user.id)
    .single()
  if (!business) {
    return NextResponse.json({ ok: false, error: 'Business not found' }, { status: 404 })
  }

  const result = await updateBusinessSettings(supabase, business.id, parsed.data)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
```

- [ ] **Step 6: Manual walkthrough**

With `supabase start` and `npm run dev` running and a logged-in owner: visit `/waitlist`, add a client through the form and confirm it appears in the list and an owner-activity email is sent (check Resend dashboard/logs); click "Remove" on an entry and confirm it disappears from the list and `waitlist_entries.status` flips to `removed` in Studio; change the settings form values and submit, then confirm the `businesses` row reflects the new values. Try setting confirmation lead time equal to minimum notice and confirm the client-side error appears without a network request.

- [ ] **Step 7: Commit**

```bash
git add src/lib/dashboard/manage-waitlist.ts src/lib/dashboard/manage-waitlist.test.ts "src/app/(dashboard)/waitlist" src/app/api/dashboard
git commit -m "feat: add dashboard waitlist management and settings"
```

---

