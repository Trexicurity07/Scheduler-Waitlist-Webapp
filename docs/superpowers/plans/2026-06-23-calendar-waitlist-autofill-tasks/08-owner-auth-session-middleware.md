### Task 8: Owner Auth Pages + Session Middleware

**Files:**
- Create: `src/middleware.ts`
- Create: `src/app/signup/page.tsx`
- Create: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `createBrowserSupabaseClient()` from Task 7.
- Produces: a logged-in Supabase Auth session (cookie-based) that Task 22-24's `createServerSupabaseClient()` reads via RLS. No new exported functions — this task is UI + framework wiring; the testing strategy for UI is a manual walkthrough, not Vitest, per the project's testing strategy (no automated browser tests this phase).

- [ ] **Step 1: Add session-refresh middleware**

`src/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: Add the signup page**

`src/app/signup/page.tsx`:

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/db/supabase-browser'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const supabase = createBrowserSupabaseClient()
    const { error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      setError(signUpError.message)
      return
    }
    router.push('/connect/setup')
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Create your account</h1>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Sign up</button>
    </form>
  )
}
```

- [ ] **Step 3: Add the login page**

`src/app/login/page.tsx`:

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/db/supabase-browser'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const supabase = createBrowserSupabaseClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(signInError.message)
      return
    }
    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Log in</h1>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Log in</button>
    </form>
  )
}
```

- [ ] **Step 4: Manual walkthrough**

Run `npm run dev`, visit `/signup`, create an account with a real-looking email/password. Confirm:
- A new row appears under Authentication → Users in `npx supabase status`'s Studio URL.
- The redirect to `/connect/setup` 404s for now (expected — that route is built in Task 11). This confirms signup itself succeeded.
- Visit `/login` with the same credentials, confirm it redirects toward `/dashboard` (also a 404 until Task 20 — same reasoning).

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/app/signup src/app/login
git commit -m "feat: add owner signup/login pages and session middleware"
```

---

