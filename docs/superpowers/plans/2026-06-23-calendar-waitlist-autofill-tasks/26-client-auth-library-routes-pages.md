### Task 26: Client Auth — Library, Routes, and Pages

**Files:**
- Create: `src/lib/client-auth/signup-client.ts`
- Create: `src/lib/client-auth/signup-client.test.ts`
- Create: `src/lib/client-auth/verify-client-email.ts`
- Create: `src/lib/client-auth/verify-client-email.test.ts`
- Create: `src/lib/client-auth/get-current-client.ts`
- Create: `src/app/api/client/signup/route.ts`
- Create: `src/app/api/client/verify-email/route.ts`
- Create: `src/app/api/client/login/route.ts`
- Create: `src/app/api/client/logout/route.ts`
- Create: `src/app/client/signup/page.tsx`
- Create: `src/app/client/login/page.tsx`
- Create: `src/app/client/verify-email/[token]/page.tsx`
- Modify: `src/middleware.ts` (add `/client/*` path matching)

**Interfaces:**
- Consumes: Task 25 schema (`client_profiles`, `clients` with `user_id`). Reuses `nameSchema`, `emailSchema`, `phoneSchema` from `src/lib/waitlist/validate-signup.ts` and `passwordSchema` from `src/lib/auth/validate-password.ts`. Reuses `createServiceRoleClient`, `createServerSupabaseClient` from `src/lib/db/supabase`. Reuses `generateToken` from `src/lib/crypto/token.ts` (check if this already exists; if not, create it — see Step 1). Reuses Resend email utilities from `src/lib/notifications/email.ts`.
- Produces:
  - `signupClient(supabase: SupabaseClient<Database>, input: SignupInput): Promise<{ ok: true } | { ok: false; error: string }>` where `SignupInput = { name: string; email: string; phone: string; password: string }`.
  - `verifyClientEmail(supabase: SupabaseClient<Database>, token: string): Promise<{ ok: true } | { ok: false; error: string }>`.
  - `getCurrentClient(): Promise<{ supabase: SupabaseClient<Database>; profile: ClientProfile }>` — calls `redirect('/client/login')` (Next.js redirect) if not authenticated or not verified.
  - Task 27 (`applyToBusiness`) and Task 30 (dashboard) call `getCurrentClient()`.

---

- [ ] **Step 1: Verify or create `src/lib/crypto/token.ts`**

Check if a token generator already exists. Look for `generateToken` in `src/lib/crypto/`. If not found, create `src/lib/crypto/token.ts`:

```ts
import { randomBytes } from 'crypto'

export function generateToken(length = 32): string {
  return randomBytes(length).toString('hex')
}
```

(Task 20 may have created this already — check before creating.)

- [ ] **Step 2: Write the failing tests for `signupClient`**

Create `src/lib/client-auth/signup-client.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { signupClient } from './signup-client'

describe('signupClient (integration)', () => {
  const createdUserIds: string[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    for (const id of createdUserIds.splice(0)) {
      await supabase.auth.admin.deleteUser(id)
    }
  })

  it('creates an auth user and client_profiles row and returns ok: true', async () => {
    const supabase = createServiceRoleClient()
    const email = `signup-test-${Date.now()}@example.com`
    const result = await signupClient(supabase, {
      name: 'Jane Doe',
      email,
      phone: `1555${Math.floor(1000000 + Math.random() * 8999999)}`,
      password: 'SecurePass1',
    })

    expect(result.ok).toBe(true)

    const { data: profile } = await supabase.from('client_profiles').select('name, verified_at').eq('email', email).single()
    expect(profile?.name).toBe('Jane Doe')
    expect(profile?.verified_at).toBeNull()

    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users.find((u) => u.email === email)
    expect(user).toBeDefined()
    createdUserIds.push(user!.id)
  })

  it('returns error when email is already taken', async () => {
    const supabase = createServiceRoleClient()
    const email = `dup-email-${Date.now()}@example.com`
    const phone1 = `1555${Math.floor(1000000 + Math.random() * 8999999)}`
    const phone2 = `1555${Math.floor(1000000 + Math.random() * 8999999)}`

    const first = await signupClient(supabase, { name: 'Alice', email, phone: phone1, password: 'SecurePass1' })
    expect(first.ok).toBe(true)

    const second = await signupClient(supabase, { name: 'Bob', email, phone: phone2, password: 'SecurePass1' })
    expect(second.ok).toBe(false)
    expect((second as { ok: false; error: string }).error).toMatch(/email/i)

    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users.find((u) => u.email === email)
    if (user) createdUserIds.push(user.id)
  })

  it('returns error when phone is already taken', async () => {
    const supabase = createServiceRoleClient()
    const email1 = `phone-dup-a-${Date.now()}@example.com`
    const email2 = `phone-dup-b-${Date.now()}@example.com`
    const phone = `1555${Math.floor(1000000 + Math.random() * 8999999)}`

    const first = await signupClient(supabase, { name: 'Alice', email: email1, phone, password: 'SecurePass1' })
    expect(first.ok).toBe(true)

    const second = await signupClient(supabase, { name: 'Bob', email: email2, phone, password: 'SecurePass1' })
    expect(second.ok).toBe(false)
    expect((second as { ok: false; error: string }).error).toMatch(/phone/i)

    const { data: users } = await supabase.auth.admin.listUsers()
    const u1 = users.users.find((u) => u.email === email1)
    const u2 = users.users.find((u) => u.email === email2)
    if (u1) createdUserIds.push(u1.id)
    if (u2) createdUserIds.push(u2.id)
  })
})
```

Run: `npx vitest run signup-client.test.ts`
Expected: FAIL with "Cannot find module './signup-client'"

- [ ] **Step 3: Implement `src/lib/client-auth/signup-client.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { generateToken } from '@/lib/crypto/token'
import { sendVerificationEmail } from '@/lib/notifications/email'
import { nameSchema, emailSchema, phoneSchema } from '@/lib/waitlist/validate-signup'
import { passwordSchema } from '@/lib/auth/validate-password'
import { z } from 'zod'

const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
})

export type SignupInput = z.infer<typeof signupSchema>

export async function signupClient(
  supabase: SupabaseClient<Database>,
  rawInput: SignupInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = signupSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }
  const input = parsed.data

  const { data: existingByEmail } = await supabase
    .from('client_profiles')
    .select('user_id')
    .eq('email', input.email)
    .maybeSingle()
  if (existingByEmail) return { ok: false, error: 'An account with this email already exists.' }

  const { data: existingByPhone } = await supabase
    .from('client_profiles')
    .select('user_id')
    .eq('phone', input.phone)
    .maybeSingle()
  if (existingByPhone) return { ok: false, error: 'An account with this phone number already exists.' }

  const { data: userData, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: false,
  })
  if (authError || !userData.user) {
    return { ok: false, error: 'Could not create account. Please try again.' }
  }

  const token = generateToken()

  const { error: profileError } = await supabase.from('client_profiles').insert({
    user_id: userData.user.id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    email_verification_token: token,
  })
  if (profileError) {
    await supabase.auth.admin.deleteUser(userData.user.id)
    return { ok: false, error: 'Could not create profile. Please try again.' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  await sendVerificationEmail(input.email, { verifyUrl: `${baseUrl}/client/verify-email/${token}` })

  return { ok: true }
}
```

Run: `npx vitest run signup-client.test.ts`
Expected: all 3 tests pass.

- [ ] **Step 4: Write the failing tests for `verifyClientEmail`**

Create `src/lib/client-auth/verify-client-email.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { signupClient } from './signup-client'
import { verifyClientEmail } from './verify-client-email'

describe('verifyClientEmail (integration)', () => {
  const createdUserIds: string[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    for (const id of createdUserIds.splice(0)) {
      await supabase.auth.admin.deleteUser(id)
    }
  })

  async function createUnverifiedClient() {
    const supabase = createServiceRoleClient()
    const email = `verify-test-${Date.now()}@example.com`
    await signupClient(supabase, {
      name: 'Verify Me',
      email,
      phone: `1555${Math.floor(1000000 + Math.random() * 8999999)}`,
      password: 'SecurePass1',
    })
    const { data: profile } = await supabase.from('client_profiles').select('user_id, email_verification_token').eq('email', email).single()
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users.find((u) => u.email === email)
    if (user) createdUserIds.push(user.id)
    return { supabase, profile: profile!, email }
  }

  it('sets verified_at and clears token on valid token', async () => {
    const { supabase, profile, email } = await createUnverifiedClient()
    const result = await verifyClientEmail(supabase, profile.email_verification_token!)
    expect(result.ok).toBe(true)
    const { data: updated } = await supabase.from('client_profiles').select('verified_at, email_verification_token').eq('email', email).single()
    expect(updated?.verified_at).not.toBeNull()
    expect(updated?.email_verification_token).toBeNull()
  })

  it('returns error on invalid token', async () => {
    const supabase = createServiceRoleClient()
    const result = await verifyClientEmail(supabase, 'not-a-real-token')
    expect(result.ok).toBe(false)
  })

  it('returns error when token is already used', async () => {
    const { supabase, profile } = await createUnverifiedClient()
    const token = profile.email_verification_token!
    await verifyClientEmail(supabase, token)
    const second = await verifyClientEmail(supabase, token)
    expect(second.ok).toBe(false)
  })
})
```

Run: `npx vitest run verify-client-email.test.ts`
Expected: FAIL with "Cannot find module './verify-client-email'"

- [ ] **Step 5: Implement `src/lib/client-auth/verify-client-email.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function verifyClientEmail(
  supabase: SupabaseClient<Database>,
  token: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: profile } = await supabase
    .from('client_profiles')
    .select('user_id, verified_at')
    .eq('email_verification_token', token)
    .maybeSingle()

  if (!profile) return { ok: false, error: 'Invalid or expired verification link.' }
  if (profile.verified_at) return { ok: false, error: 'Email already verified.' }

  const { error } = await supabase
    .from('client_profiles')
    .update({ verified_at: new Date().toISOString(), email_verification_token: null })
    .eq('email_verification_token', token)

  if (error) return { ok: false, error: 'Could not verify email. Please try again.' }
  return { ok: true }
}
```

Run: `npx vitest run verify-client-email.test.ts`
Expected: all 3 tests pass.

- [ ] **Step 6: Implement `src/lib/client-auth/get-current-client.ts`**

No test needed — this is a Next.js server-side helper that calls `redirect()`, which cannot be tested in vitest without extensive mocking. Manual walkthrough is the verification step (per CLAUDE.md "no automated browser/E2E tests this phase").

```ts
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/db/supabase'

export type ClientProfile = {
  user_id: string
  name: string
  email: string
  phone: string
  verified_at: string
}

export async function getCurrentClient(): Promise<{
  supabase: ReturnType<typeof createServerSupabaseClient>
  profile: ClientProfile
}> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/client/login')

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('user_id, name, email, phone, verified_at')
    .eq('user_id', user.id)
    .single()

  if (!profile || !profile.verified_at) redirect('/client/login')

  return { supabase, profile: profile as ClientProfile }
}
```

- [ ] **Step 7: Update `src/middleware.ts` to refresh sessions for `/client/*`**

Open `src/middleware.ts` and find the `config.matcher` array (or equivalent path-matching logic). Add `/client/:path*` alongside the existing `/dashboard/:path*` or equivalent entry. For example, if the matcher looks like:

```ts
export const config = {
  matcher: ['/dashboard/:path*', '/api/dashboard/:path*', ...],
}
```

Add the client paths:

```ts
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/dashboard/:path*',
    '/client/:path*',
    '/api/client/:path*',
    // ... keep existing entries unchanged
  ],
}
```

If the middleware uses a `shouldRefresh` check rather than a static matcher, add `pathname.startsWith('/client')` alongside the existing `pathname.startsWith('/dashboard')` condition.

- [ ] **Step 8: Create API routes — signup, verify-email, login, logout**

`src/app/api/client/signup/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { signupClient } from '@/lib/client-auth/signup-client'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const result = await signupClient(supabase, body)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

`src/app/api/client/verify-email/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { verifyClientEmail } from '@/lib/client-auth/verify-client-email'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const token: unknown = body?.token
  if (typeof token !== 'string') return NextResponse.json({ error: 'Missing token.' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const result = await verifyClientEmail(supabase, token)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

`src/app/api/client/login/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/db/supabase'
import { emailSchema, phoneSchema } from '@/lib/waitlist/validate-signup'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const { identifier, password } = body ?? {}

  if (typeof identifier !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Missing credentials.' }, { status: 400 })
  }

  let email: string
  const isEmail = emailSchema.safeParse(identifier).success
  const isPhone = phoneSchema.safeParse(identifier).success

  if (isEmail) {
    email = identifier
  } else if (isPhone) {
    const serviceSupabase = createServiceRoleClient()
    const { data: profile } = await serviceSupabase
      .from('client_profiles')
      .select('email')
      .eq('phone', identifier)
      .maybeSingle()
    if (!profile) return NextResponse.json({ error: 'No account found.' }, { status: 400 })
    email = profile.email
  } else {
    return NextResponse.json({ error: 'Enter a valid email or phone number.' }, { status: 400 })
  }

  const serviceSupabase = createServiceRoleClient()
  const { data: profile } = await serviceSupabase
    .from('client_profiles')
    .select('verified_at')
    .eq('email', email)
    .maybeSingle()
  if (!profile) return NextResponse.json({ error: 'No account found.' }, { status: 400 })
  if (!profile.verified_at) {
    return NextResponse.json({ error: 'Please verify your email before logging in.' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.json({ error: 'Incorrect email/phone or password.' }, { status: 400 })

  return NextResponse.json({ ok: true })
}
```

`src/app/api/client/logout/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/db/supabase'

export async function POST() {
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 9: Create pages — signup, login, verify-email**

`src/app/client/signup/page.tsx` (client component):

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ClientSignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const res = await fetch('/api/client/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data: unknown = await res.json()
    if (!res.ok) {
      setError((data as { error?: string }).error ?? 'Signup failed.')
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Check your email</h1>
        <p>We sent a verification link to <strong>{form.email}</strong>. Click the link to activate your account.</p>
      </main>
    )
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Create a client account</h1>
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label>
        <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        <button type="submit">Create account</button>
      </form>
      <p>Already have an account? <a href="/client/login">Log in</a></p>
    </main>
  )
}
```

`src/app/client/login/page.tsx` (client component):

```tsx
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ClientLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const res = await fetch('/api/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data: unknown = await res.json()
    if (!res.ok) {
      setError((data as { error?: string }).error ?? 'Login failed.')
      return
    }
    const next = searchParams.get('next') ?? '/client/dashboard'
    router.push(next)
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Log in to your account</h1>
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <label>Email or phone<input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} required /></label>
        <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        <button type="submit">Log in</button>
      </form>
      <p>No account? <a href="/client/signup">Sign up</a></p>
    </main>
  )
}
```

`src/app/client/verify-email/[token]/page.tsx` (server component):

```tsx
import { createServiceRoleClient } from '@/lib/db/supabase'
import { verifyClientEmail } from '@/lib/client-auth/verify-client-email'
import Link from 'next/link'

export default async function VerifyEmailPage({ params }: { params: { token: string } }) {
  const supabase = createServiceRoleClient()
  const result = await verifyClientEmail(supabase, params.token)

  if (!result.ok) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Verification failed</h1>
        <p>{result.error}</p>
        <Link href="/client/signup">Back to signup</Link>
      </main>
    )
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Email verified</h1>
      <p>Your account is now active.</p>
      <Link href="/client/login">Log in</Link>
    </main>
  )
}
```

- [ ] **Step 10: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass (at minimum: `signup-client.test.ts` 3/3, `verify-client-email.test.ts` 3/3, plus all previously passing tests).

- [ ] **Step 11: Manual walkthrough**

With `npm run dev` and local Supabase running:
1. Navigate to `/client/signup` — fill in name, email, phone, password — submit. Expect "Check your email" confirmation.
2. Find the verification link in Supabase email logs (`supabase status` → studio URL → Auth → Logs, or check Resend test inbox). Click it. Expect "Email verified" page.
3. Navigate to `/client/login` — log in with the email and password. Expect redirect to `/client/dashboard` (will 404 until Task 30 — that's acceptable).
4. Navigate to `/client/login` — log in with the phone number and password. Expect same redirect.
5. Try logging in before verification (create a fresh account, do NOT click verification link). Expect "Please verify your email before logging in." error.

- [ ] **Step 12: Commit**

```bash
git add src/lib/client-auth/ src/lib/crypto/token.ts src/app/api/client/ src/app/client/ src/middleware.ts
git commit -m "feat: add client signup, email verification, and login flows"
```

---
