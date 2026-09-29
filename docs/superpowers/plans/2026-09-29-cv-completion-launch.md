# CV Completion & Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the scheduler waitlist app to CV-demo quality — fix three outstanding gaps, overhaul every page to a premium shadcn/ui + Tailwind dark theme, deploy to Vercel with a seeded live demo.

**Architecture:** Next.js App Router on Vercel, Supabase Postgres (hosted), shadcn/ui components over a dark Tailwind v4 theme. The cron pipeline is complete; this plan adds missing UI pieces, reskins all pages, wires Vercel deployment, seeds demo data, and cleans up AI tooling artifacts.

**Tech Stack:** Next.js (App Router), TypeScript strict, Supabase (`@supabase/ssr`), Tailwind CSS v4, shadcn/ui (Radix + CVA), Inter via `next/font/google`, Vercel (hosting + cron), Resend (email), `tsx` for seed script.

## Global Constraints

- TypeScript strict; no `any` without justification
- No automated browser/E2E tests; manual walkthrough per UI feature
- All API routes on Node.js runtime (never Edge)
- Dark theme: bg `#0f172a`, surface `#1e293b`, accent `#3b82f6`
- Never commit `.env.local`; demo credentials go in README only
- `google_refresh_token` only ever lives AES-256-GCM encrypted in DB

---

## File Map

**New files:**
- `src/middleware.ts` — Supabase session cookie refresh
- `src/app/client/verify-email/[token]/page.tsx` — email verification landing page
- `src/app/api/health/route.ts` — Supabase keep-alive ping endpoint
- `src/components/ui/` — shadcn/ui generated components
- `src/lib/utils.ts` — `cn()` Tailwind merge utility (shadcn standard)
- `vercel.json` — cron schedule config
- `scripts/seed-demo.ts` — demo data seeder
- `README.md` — project README
- `docs/DEPLOYMENT.md` — deployment guide

**Modified files:**
- `src/app/globals.css` — Tailwind v4 import + custom theme tokens
- `src/app/layout.tsx` — Inter font, remove Arial
- `postcss.config.mjs` — Tailwind postcss plugin
- All page/component `.tsx` files — replace `theme.ts` inline CSSProperties with Tailwind + shadcn

**Deleted files:**
- `src/lib/ui/theme.ts` — replaced by Tailwind classes
- `docs/superpowers/` — AI tooling artifacts
- `.claude/` — Claude Code settings

---

### Task 1: Supabase Session Middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Verify**

Run: `npm run dev`
Expected: app starts, no errors, auth still works on dashboard routes.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add Supabase session refresh middleware"
```

---

### Task 2: Client Email Verification Page

**Files:**
- Create: `src/app/client/verify-email/[token]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/client/verify?token=<token>` (exists at `src/app/api/client/verify/route.ts`)

- [ ] **Step 1: Create the page**

```tsx
// src/app/client/verify-email/[token]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(`/api/client/verify?token=${token}`)
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setStatus('success')
          setTimeout(() => router.push('/client/login'), 2000)
        } else {
          setStatus('error')
          setMessage(data.error ?? 'Verification failed.')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Network error. Please try again.')
      })
  }, [token, router])

  return (
    <div style={{ maxWidth: 400, margin: '8rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      {status === 'loading' && <p>Verifying your email…</p>}
      {status === 'success' && (
        <>
          <h1 style={{ marginBottom: '0.5rem' }}>Email verified!</h1>
          <p>Redirecting you to login…</p>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 style={{ marginBottom: '0.5rem' }}>Verification failed</h1>
          <p>{message}</p>
          <a href="/client/signup" style={{ color: '#3b82f6', marginTop: '1rem', display: 'block' }}>
            Back to signup
          </a>
        </>
      )}
    </div>
  )
}
```

Note: inline styles here are temporary — Task 8 replaces them with Tailwind.

- [ ] **Step 2: Commit**

```bash
git add src/app/client/verify-email/
git commit -m "feat: add client email verification landing page"
```

---

### Task 3: Remove Dead Cron Code

**Files:**
- Modify: `src/lib/cron/waitlist-housekeeping.ts`
- Modify: `src/app/api/cron/poll/route.ts`

- [ ] **Step 1: Remove dead function from waitlist-housekeeping.ts**

Open `src/lib/cron/waitlist-housekeeping.ts`. Delete any function that references `pending_verification` status (likely named `removeUnverifiedSignups` or similar). Keep `expireWaitlistEntries`.

- [ ] **Step 2: Remove dead cleanup call from cron/poll route**

Open `src/app/api/cron/poll/route.ts`. Remove the import and call to `cleanupExpiredPendingSignups` (from `src/lib/cron/pending-signup-cleanup.ts`). Delete `src/lib/cron/pending-signup-cleanup.ts`.

After editing, `route.ts` should look like:

```typescript
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { claimBusinesses } from '@/lib/cron/claim-businesses'
import { processBusiness } from '@/lib/cron/process-business'

export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const now = new Date()
  const claimed = await claimBusinesses(supabase, now)
  for (const business of claimed) {
    await processBusiness(supabase, business, now)
  }
  return NextResponse.json({ processed: claimed.length })
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — expected: clean
Run: `npx vitest run` — expected: all pass

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove dead pending_verification cron branch"
```

---

### Task 4: UI Foundation — Tailwind v4 + shadcn/ui + Inter Font

**Files:**
- Modify: `package.json`, `src/app/globals.css`, `src/app/layout.tsx`
- Create: `postcss.config.mjs`, `src/lib/utils.ts`
- Create: `src/components/ui/` (shadcn generated)
- Delete: `src/lib/ui/theme.ts`

- [ ] **Step 1: Install Tailwind v4**

```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

- [ ] **Step 2: Create postcss config**

```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

- [ ] **Step 3: Replace globals.css entirely**

```css
@import "tailwindcss";

@theme {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-surface-hover: #263449;
  --color-border: rgba(255,255,255,0.08);
  --color-input-border: rgba(255,255,255,0.12);
  --color-primary: #f8fafc;
  --color-label: #cbd5e1;
  --color-secondary: #94a3b8;
  --color-muted: #64748b;
  --color-accent: #3b82f6;
  --color-accent-hover: #2563eb;
  --color-accent-sky: #0ea5e9;
  --color-error-bg: rgba(239,68,68,0.1);
  --color-error-border: rgba(239,68,68,0.25);
  --color-error-text: #fca5a5;
  --color-success: #10b981;
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
}

html { height: 100%; color-scheme: dark; }
html, body { max-width: 100vw; overflow-x: hidden; }
body {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg);
  color: var(--color-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
* { box-sizing: border-box; padding: 0; margin: 0; }
a { color: inherit; text-decoration: none; }
button { font-family: inherit; }
h1, h2, h3, h4, h5, h6 { color: var(--color-primary); }
table { border-collapse: collapse; width: 100%; }
fieldset { border: 1px solid var(--color-input-border); border-radius: 8px; padding: 1rem; }
legend { color: var(--color-label); font-size: 0.875rem; font-weight: 500; padding: 0 0.25rem; }

input, textarea, select {
  background-color: var(--color-bg);
  color: var(--color-primary);
  border: 1px solid var(--color-input-border);
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  box-sizing: border-box;
}
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: rgba(255,255,255,0.28);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
}
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px #0f172a inset !important;
  -webkit-text-fill-color: #f8fafc !important;
  border-color: rgba(255,255,255,0.12) !important;
  caret-color: #f8fafc;
}
```

- [ ] **Step 4: Update layout.tsx — Inter font**

At the top of `src/app/layout.tsx` add:
```tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
```
On the `<body>` element, add `className={inter.className}`. Remove any `fontFamily: 'Arial'` style prop.

- [ ] **Step 5: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted: Style = Default, Base color = Slate, CSS variables = Yes, dark mode = class.

After init, confirm `src/lib/utils.ts` exists with:
```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 6: Add core shadcn components**

```bash
npx shadcn@latest add button card input label badge separator alert dialog sheet tabs select table dropdown-menu avatar
```

- [ ] **Step 7: Verify build**

Run: `npm run dev` — expected: app loads, no CSS errors
Run: `npx tsc --noEmit` — expected: clean (theme.ts import errors are expected and fixed in Tasks 5–9)

- [ ] **Step 8: Delete theme.ts**

```bash
git rm src/lib/ui/theme.ts
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Tailwind v4 + shadcn/ui + Inter font foundation"
```

---

### Task 5: UI — Marketing Pages

**Files:** `src/app/page.tsx`, `src/components/marketing-nav.tsx`, `src/components/marketing-layout.tsx`, `src/app/about/page.tsx`, `src/app/pricing/page.tsx`, `src/app/browse/page.tsx`, `src/app/browse/[slug]/page.tsx`, `src/app/browse/[slug]/business-profile-view.tsx`

**Design rules:**
- All inline `style={{}}` props removed; replaced with Tailwind utility classes
- Tailwind color tokens: `bg-bg`, `bg-surface`, `text-primary`, `text-secondary`, `text-muted`, `text-accent`, `border-white/8`, `border-white/12`
- Cards: `rounded-xl border border-white/8 bg-surface p-6`
- Buttons: shadcn `<Button>` with `className="bg-accent hover:bg-accent-hover text-white"` for primary, `variant="outline"` with `className="border-white/20"` for ghost

- [ ] **Step 1: Rewrite homepage `src/app/page.tsx`**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import MarketingLayout from '@/components/marketing-layout'

export default function HomePage() {
  return (
    <MarketingLayout>
      <section className="flex flex-col items-center text-center px-6 pt-24 pb-20">
        <Badge variant="outline" className="mb-6 border-white/20 text-muted text-xs tracking-widest uppercase">
          Automated Waitlist Management
        </Badge>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight max-w-3xl mb-6 bg-gradient-to-br from-white to-secondary bg-clip-text text-transparent">
          Fill cancelled appointments automatically
        </h1>
        <p className="text-lg text-secondary max-w-xl mb-10 leading-relaxed">
          Connect your Google Calendar. We detect cancellations and notify your waitlist — clients confirm in one click.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Button asChild size="lg" className="bg-accent hover:bg-accent-hover text-white">
            <Link href="/login">Get started free</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-white/20 text-label hover:bg-surface">
            <Link href="/browse">Browse businesses</Link>
          </Button>
        </div>
      </section>

      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-12 text-primary">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: '01', title: 'Connect your calendar', body: 'Link your Google Calendar in under a minute. We only ever read your dedicated bookings calendar — never your personal events.' },
            { n: '02', title: 'Build your waitlist', body: 'Clients join your public waitlist and set their availability. No manual admin work needed.' },
            { n: '03', title: 'Automatic fill', body: 'When a slot cancels, we notify the best-matched clients by email. First to confirm gets the appointment.' },
          ].map(({ n, title, body }) => (
            <div key={n} className="rounded-xl border border-white/8 bg-surface p-6">
              <span className="text-xs font-mono text-accent mb-3 block">{n}</span>
              <h3 className="font-semibold text-primary mb-2">{title}</h3>
              <p className="text-sm text-secondary leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingLayout>
  )
}
```

- [ ] **Step 2: Rewrite marketing-nav.tsx**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function MarketingNav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-white/8 bg-bg/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight text-primary">
          Scheduler
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-secondary">
          <Link href="/about" className="hover:text-primary transition-colors">About</Link>
          <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
          <Link href="/browse" className="hover:text-primary transition-colors">Browse</Link>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-secondary hover:text-primary">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-accent hover:bg-accent-hover text-white">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Update about, pricing, browse pages**

For each file, remove all imports from `@/lib/ui/theme` and replace inline `style={{}}` objects with Tailwind classes using these mappings:
- `style={{ backgroundColor: colors.surface }}` → `className="bg-surface"`
- `style={{ color: colors.textMuted }}` → `className="text-muted"`
- `style={{ color: colors.textSecondary }}` → `className="text-secondary"`
- `style={{ border: '1px solid rgba(255,255,255,0.08)' }}` → `className="border border-white/8"`
- `style={{ borderRadius: '10px', padding: '1.25rem' }}` → `className="rounded-xl p-5"`
- `style={{ borderRadius: '12px', padding: '1.5rem' }}` → `className="rounded-xl p-6"`
- `style={{ fontWeight: 600 }}` → `className="font-semibold"`
- `style={{ fontSize: '0.875rem' }}` → `className="text-sm"`
- `style={{ display: 'flex', gap: '1rem' }}` → `className="flex gap-4"`

Use shadcn `<Card>` for pricing plan cards. Use shadcn `<Badge>` for labels.

- [ ] **Step 4: Manual walkthrough**

Visit `/`, `/about`, `/pricing`, `/browse`. No console errors, Inter font rendering, dark theme consistent.

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: overhaul marketing pages with Tailwind + shadcn/ui"
```

---

### Task 6: UI — Owner Auth & Connect Pages

**Files:** `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/forgot-password/page.tsx`, `src/app/connect/page.tsx`, `src/app/connect/setup/page.tsx`, `src/app/connect/setup/connect-setup-form.tsx`

**Auth card pattern** (use for every auth page):
```tsx
<div className="min-h-screen flex items-center justify-center px-4 bg-bg">
  <div className="w-full max-w-sm">
    <div className="mb-8 text-center">
      <h1 className="text-2xl font-bold text-primary">Page title</h1>
      <p className="text-muted text-sm mt-1">Subtitle</p>
    </div>
    <div className="bg-surface border border-white/8 rounded-2xl p-8 shadow-2xl">
      {/* form */}
    </div>
  </div>
</div>
```

- [ ] **Step 1: Rewrite login page**

Remove `@/lib/ui/theme` import. Apply the auth card pattern. Replace:
- `<input>` → `<Input>` from `@/components/ui/input`
- `<button type="submit">` → `<Button type="submit" className="w-full bg-accent hover:bg-accent-hover text-white">`
- Error div → `<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>`
- `<label>` → `<Label>` from `@/components/ui/label`

Keep all fetch/state/router logic identical.

- [ ] **Step 2: Apply same pattern to signup, forgot-password**

Same treatment. Keep business logic untouched, only replace styling.

- [ ] **Step 3: Rewrite connect setup pages**

In `connect-setup-form.tsx`, replace inline styles with Tailwind. Use shadcn `<Label>` + `<Input>` + `<Select>` for each field. Apply card pattern to the container.

- [ ] **Step 4: Manual walkthrough**

Visit `/login`, `/signup`, `/connect/setup`. Confirm forms render cleanly and submission still works.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: overhaul owner auth and connect pages with shadcn/ui"
```

---

### Task 7: UI — Owner Dashboard

**Files:** `src/app/(dashboard)/layout.tsx`, `src/app/(dashboard)/owner-nav.tsx`, `src/components/dashboard-shell.tsx`, `src/components/sidebar-tree.tsx`, `src/app/(dashboard)/dashboard/page.tsx`, `src/app/(dashboard)/waitlist/page.tsx`, `src/app/(dashboard)/waitlist/locations-view.tsx`, `src/app/(dashboard)/waitlist/[id]/waitlist-detail-view.tsx`, `src/app/(dashboard)/waitlist/add-entry-form.tsx`, `src/app/(dashboard)/waitlist/settings-form.tsx`, `src/app/(dashboard)/notifications/page.tsx`, `src/components/waitlist-setup-modal.tsx`, `src/components/location-setup-modal.tsx`, `src/components/calendar-setup-modal.tsx`

- [ ] **Step 1: Rewrite dashboard shell + sidebar**

Target layout for `dashboard-shell.tsx` / `(dashboard)/layout.tsx`:
```tsx
<div className="flex min-h-screen bg-bg">
  <aside className="w-64 bg-surface border-r border-white/8 flex flex-col shrink-0">
    <div className="px-6 py-5 border-b border-white/8">
      <span className="font-bold text-lg text-primary">Scheduler</span>
    </div>
    <nav className="flex-1 px-3 py-4 space-y-1">
      {/* nav links */}
    </nav>
  </aside>
  <main className="flex-1 overflow-auto p-8">{children}</main>
</div>
```

Nav link active/inactive classes:
- Active: `"flex items-center gap-3 px-3 py-2 rounded-lg bg-white/8 text-primary text-sm font-medium"`
- Inactive: `"flex items-center gap-3 px-3 py-2 rounded-lg text-secondary text-sm hover:bg-white/5 hover:text-primary transition-colors"`

- [ ] **Step 2: Rewrite dashboard home stat cards**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card className="bg-surface border-white/8">
  <CardHeader className="pb-2">
    <CardTitle className="text-sm font-medium text-muted">Active entries</CardTitle>
  </CardHeader>
  <CardContent>
    <span className="text-3xl font-bold text-primary">{count}</span>
  </CardContent>
</Card>
```

- [ ] **Step 3: Replace entry tables with shadcn Table**

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

<Table>
  <TableHeader>
    <TableRow className="border-white/8 hover:bg-transparent">
      <TableHead className="text-muted">Name</TableHead>
      <TableHead className="text-muted">Status</TableHead>
      <TableHead className="text-muted">Joined</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {entries.map(entry => (
      <TableRow key={entry.id} className="border-white/8 hover:bg-white/4">
        <TableCell className="text-primary">{entry.name}</TableCell>
        <TableCell>
          <Badge
            variant={entry.status === 'active' ? 'default' : 'secondary'}
            className={entry.status === 'active' ? 'bg-accent/20 text-accent border-accent/30' : ''}
          >
            {entry.status}
          </Badge>
        </TableCell>
        <TableCell className="text-muted text-sm">{new Date(entry.created_at).toLocaleDateString()}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

- [ ] **Step 4: Convert modals to shadcn Dialog**

For `waitlist-setup-modal.tsx`, `location-setup-modal.tsx`, `calendar-setup-modal.tsx` — replace custom overlay divs:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

<Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
  <DialogContent className="bg-surface border-white/8 sm:max-w-lg">
    <DialogHeader>
      <DialogTitle className="text-primary">Modal Title</DialogTitle>
    </DialogHeader>
    {/* form fields using shadcn Input + Label */}
  </DialogContent>
</Dialog>
```

- [ ] **Step 5: Manual walkthrough**

Log in as demo user, visit dashboard, open a waitlist, open a modal. Confirm sidebar renders, table renders, modal opens/closes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: overhaul owner dashboard with shadcn/ui components"
```

---

### Task 8: UI — Client-Facing Pages

**Files:** `src/app/join/[slug]/page.tsx`, `src/app/join/[slug]/apply-form.tsx`, `src/app/confirm/[token]/page.tsx`, `src/app/confirm/[token]/confirm-form.tsx`, `src/app/client/signup/page.tsx`, `src/app/client/login/page.tsx`, `src/app/client/forgot-password/page.tsx`, `src/app/client/verify-email/[token]/page.tsx`, `src/app/client/(app)/layout.tsx`, `src/app/client/(app)/client-nav.tsx`, `src/app/client/(app)/dashboard/page.tsx`, `src/app/client/(app)/dashboard/active-entries-section.tsx`, `src/app/client/(app)/dashboard/pending-offers-section.tsx`, `src/app/client/(app)/dashboard/past-entries-section.tsx`

- [ ] **Step 1: Rewrite join/apply pages**

```tsx
// Structure for src/app/join/[slug]/page.tsx
<div className="min-h-screen bg-bg px-4 py-12">
  <div className="max-w-lg mx-auto">
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-primary">{business.name}</h1>
      <p className="text-muted mt-1">Join the waitlist to be notified of available slots.</p>
    </div>
    <div className="bg-surface border border-white/8 rounded-2xl p-8">
      <ApplyForm slug={slug} />
    </div>
  </div>
</div>
```

In `apply-form.tsx`: replace inline styles with Tailwind + shadcn `<Input>`, `<Label>`, `<Button>`.

- [ ] **Step 2: Rewrite confirm-form.tsx (most important client page)**

```tsx
import { CalendarIcon, CheckCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Slot details card + action buttons:
<div className="min-h-screen bg-bg flex items-center justify-center px-4">
  <div className="w-full max-w-md">
    <div className="bg-surface border border-white/8 rounded-2xl p-8 mb-5 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
          <CalendarIcon className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">Slot available</p>
          <p className="font-semibold text-primary">{details.businessName}</p>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Date & time</span>
          <span className="font-medium text-primary">{formatDate(details.startTime)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Appointment</span>
          <span className="font-medium text-primary">{details.slotDescription}</span>
        </div>
      </div>
    </div>
    <div className="flex flex-col gap-3">
      <Button
        onClick={handleConfirm}
        disabled={submitting}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12 text-base font-semibold"
      >
        {submitting ? 'Confirming…' : 'Confirm appointment'}
      </Button>
      <Button
        variant="outline"
        onClick={handleDecline}
        disabled={submitting}
        className="w-full border-white/20 text-secondary hover:bg-surface h-12"
      >
        Decline
      </Button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Rewrite client auth pages**

Apply the same auth card pattern from Task 6 to client signup, login, forgot-password, and verify-email pages.

- [ ] **Step 4: Rewrite client dashboard with Tabs**

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

<div className="min-h-screen bg-bg">
  {/* client nav */}
  <main className="max-w-4xl mx-auto px-6 py-8">
    <h1 className="text-2xl font-bold text-primary mb-6">My appointments</h1>
    <Tabs defaultValue="active">
      <TabsList className="bg-surface border border-white/8 mb-6">
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="offers">Offers</TabsTrigger>
        <TabsTrigger value="past">Past</TabsTrigger>
      </TabsList>
      <TabsContent value="active"><ActiveEntriesSection /></TabsContent>
      <TabsContent value="offers"><PendingOffersSection /></TabsContent>
      <TabsContent value="past"><PastEntriesSection /></TabsContent>
    </Tabs>
  </main>
</div>
```

Each section (`ActiveEntriesSection`, `PendingOffersSection`, `PastEntriesSection`) — replace inline styles with Tailwind classes. Use `<Card>` for entry cards, `<Badge>` for status chips.

- [ ] **Step 5: Final type check + test run**

Run: `npx tsc --noEmit` — expected: clean (no more `theme.ts` imports anywhere)
Run: `npx vitest run` — expected: all pass

Manually visit `/join/sunflower-hair-studio`, `/confirm/demo-confirm-token-abc123`, `/client/login`, client dashboard. Confirm premium look.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: overhaul client-facing pages with shadcn/ui"
```

---

### Task 9: Deploy Prep

**Files:**
- Create: `vercel.json`
- Create: `src/app/api/health/route.ts`
- Modify: `.env.example`

- [ ] **Step 1: Create keep-alive health endpoint**

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createServiceRoleClient()
    await supabase.from('businesses').select('id').limit(1)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/poll",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/health",
      "schedule": "0 12 */3 * *"
    }
  ]
}
```

`/api/cron/poll` already checks `Authorization: Bearer ${CRON_SECRET}`. Vercel sends this header automatically when `CRON_SECRET` is set as an environment variable in the Vercel project.

`/api/health` runs every 3 days to prevent Supabase free tier pausing.

- [ ] **Step 3: Update .env.example**

```bash
# Supabase — Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL — use your Vercel deployment URL in production
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AES-256-GCM key for Google refresh token encryption (32 bytes base64)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
REFRESH_TOKEN_ENCRYPTION_KEY=

# Google OAuth app credentials (Google Cloud Console → OAuth 2.0 Client IDs)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Resend API key (resend.com)
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Cron secret — any random string; set the same value in Vercel env vars
CRON_SECRET=
```

- [ ] **Step 4: Commit**

```bash
git add vercel.json src/app/api/health/ .env.example
git commit -m "feat: add Vercel cron config and Supabase keep-alive endpoint"
```

---

### Task 10: Demo Seed Data

**Files:**
- Create: `scripts/seed-demo.ts`
- Modify: `package.json` (add `seed:demo` script)

**Demo scenario:** Business "Sunflower Hair Studio", login `demo@schedulerwaitlist.com` / `Demo1234!`, 6 clients, 3 appointments (1 cancelled = open slot), 1 pending offer the reviewer can confirm at `/confirm/demo-confirm-token-abc123`.

- [ ] **Step 1: Install tsx if not present**

```bash
npm install -D tsx
```

- [ ] **Step 2: Create seed script**

```typescript
// scripts/seed-demo.ts
import { createClient } from '@supabase/supabase-js'
import { encrypt } from '../src/lib/crypto/encrypt'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function seed() {
  console.log('Seeding demo data…')

  // Owner auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'demo@schedulerwaitlist.com',
    password: 'Demo1234!',
    email_confirm: true,
  })
  if (authError && !authError.message.includes('already registered')) throw authError

  const ownerUserId = authData?.user?.id ?? (
    (await supabase.auth.admin.listUsers()).data.users
      .find(u => u.email === 'demo@schedulerwaitlist.com')!.id
  )

  // Business
  const { data: biz, error: bizError } = await supabase
    .from('businesses')
    .upsert({
      owner_user_id: ownerUserId,
      name: 'Sunflower Hair Studio',
      public_slug: 'sunflower-hair-studio',
      whatsapp_number: '+12125550100',
      timezone: 'America/New_York',
      google_refresh_token_encrypted: encrypt('demo_placeholder_refresh_token'),
      dedicated_calendar_id: 'demo_calendar_id',
      calendar_status: 'connected',
      batch_size: 3,
      batch_interval_minutes: 30,
      min_notice_hours: 24,
      min_confirm_lead_hours: 12,
    }, { onConflict: 'owner_user_id' })
    .select('id')
    .single()
  if (bizError) throw bizError
  const businessId = biz.id

  // Clients
  const demoClients = [
    { name: 'Alex Johnson', email: 'alex@example.com', phone: '+12125550101' },
    { name: 'Sam Rivera', email: 'sam@example.com', phone: '+12125550102' },
    { name: 'Jordan Lee', email: 'jordan@example.com', phone: '+12125550103' },
    { name: 'Taylor Kim', email: 'taylor@example.com', phone: '+12125550104' },
    { name: 'Morgan Chen', email: 'morgan@example.com', phone: '+12125550105' },
    { name: 'Casey Park', email: 'casey@example.com', phone: '+12125550106' },
  ]
  const clientIds: string[] = []
  for (const c of demoClients) {
    const { data } = await supabase
      .from('clients')
      .upsert({ business_id: businessId, ...c }, { onConflict: 'business_id,email' })
      .select('id').single()
    clientIds.push(data!.id)
  }

  // Appointments
  const now = new Date()
  const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const dayAfter = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000)
  const hr = (d: Date) => new Date(d.getTime() + 60 * 60 * 1000)

  const { data: apts } = await supabase
    .from('appointments')
    .upsert([
      { business_id: businessId, google_event_id: 'demo_evt_1', summary: 'Haircut & Style', start_time: nextWeek.toISOString(), end_time: hr(nextWeek).toISOString(), status: 'confirmed' },
      { business_id: businessId, google_event_id: 'demo_evt_2', summary: 'Colour Treatment', start_time: dayAfter.toISOString(), end_time: hr(dayAfter).toISOString(), status: 'confirmed' },
      { business_id: businessId, google_event_id: 'demo_evt_3', summary: 'Trim & Blowdry', start_time: inTwoDays.toISOString(), end_time: hr(inTwoDays).toISOString(), status: 'cancelled' },
    ], { onConflict: 'business_id,google_event_id' })
    .select('id, google_event_id')
  const cancelledId = apts!.find(a => a.google_event_id === 'demo_evt_3')!.id

  // Waitlist entries
  const windows = JSON.stringify([{ day: 'any', startHour: 9, endHour: 18 }])
  const expires = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const statuses = ['active', 'active', 'active', 'filled', 'expired', 'active']
  const entryIds: string[] = []
  for (let i = 0; i < clientIds.length; i++) {
    const { data } = await supabase
      .from('waitlist_entries')
      .insert({ business_id: businessId, client_id: clientIds[i], time_windows: windows, status: statuses[i], expires_at: expires })
      .select('id').single()
    entryIds.push(data!.id)
  }

  // Pending slot offer (fixed token so confirm URL is stable in README)
  const token = 'demo-confirm-token-abc123'
  await supabase.from('notifications').upsert({
    waitlist_entry_id: entryIds[0],
    appointment_id: cancelledId,
    type: 'slot_offer',
    channel: 'email',
    status: 'sent',
    token,
    batch_number: 1,
  }, { onConflict: 'token' })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  console.log('✓ Demo seeded.')
  console.log(`  Owner login:  demo@schedulerwaitlist.com / Demo1234!`)
  console.log(`  Confirm flow: ${appUrl}/confirm/${token}`)
}

seed().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 3: Add script to package.json**

In the `"scripts"` section of `package.json`, add:
```json
"seed:demo": "tsx scripts/seed-demo.ts"
```

- [ ] **Step 4: Test locally**

```bash
supabase start
npm run seed:demo
```
Expected output: `✓ Demo seeded.` with login and confirm URLs.

Log in at `http://localhost:3000/login` with `demo@schedulerwaitlist.com` / `Demo1234!`. Confirm dashboard shows Sunflower Hair Studio with waitlist entries.

- [ ] **Step 5: Commit**

```bash
git add scripts/ package.json
git commit -m "feat: add demo data seed script"
```

---

### Task 11: README

**Files:**
- Create: `README.md`
- Create: `docs/DEPLOYMENT.md`

- [ ] **Step 1: Write README.md**

```markdown
# Scheduler Waitlist

Automated appointment waitlist SaaS. When a booking cancels, the system detects it via Google Calendar polling and notifies matched clients — they confirm in one click.

## Live Demo

**[→ Try the live demo](https://your-app.vercel.app)**

| Role | Email | Password |
|------|-------|----------|
| Business owner | demo@schedulerwaitlist.com | Demo1234! |
| Confirm a slot | Visit `/confirm/demo-confirm-token-abc123` | — |

## How It Works

1. Business owner signs up and connects Google Calendar via OAuth
2. Clients join the public waitlist, setting their availability windows
3. Every 5 minutes, a cron job polls each calendar for cancellations
4. Newly cancelled slots are matched against active waitlist entries (interval-overlap algorithm)
5. Matched clients receive a slot offer email with a single-use confirmation token
6. First client to confirm gets the appointment; others are notified the slot is gone

## Architecture

```
Vercel Cron (every 5 min)
  → POST /api/cron/poll
    → claimBusinesses()        pessimistic lock to prevent concurrent runs
    → syncAppointments()       Google Calendar incremental sync (updatedMin)
    → resolveStaleOffers()     interval-overlap check: suppress superseded offers
    → expireTimedOutOffers()   clean up unresponded offers past batch window
    → dispatchPendingOffers()  match waitlist entries → generate tokens → send emails
    → releaseBusiness()        unlock for next cycle
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), shadcn/ui, Tailwind CSS v4 |
| Backend | Next.js API routes (Node runtime) |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (owners) + custom JWT (clients) |
| Calendar | Google Calendar API via OAuth 2.0 |
| Email | Resend |
| Hosting | Vercel (Hobby tier, 24/7) |
| Security | AES-256-GCM encryption for Google refresh tokens at rest |

## Local Development

### Prerequisites
- Node.js 20+, [Supabase CLI](https://supabase.com/docs/guides/cli)
- Google Cloud project with Calendar API + OAuth 2.0 credentials

### Setup

```bash
git clone https://github.com/Trexicurity07/Scheduler-Waitlist-Webapp
cd Scheduler-Waitlist-Webapp
npm install
cp .env.example .env.local   # fill in values — see .env.example for guidance
supabase start
supabase db push
npm run seed:demo             # optional: populate demo business + waitlist data
npm run dev
```

### Tests

```bash
npx vitest run
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for step-by-step production setup.
```

- [ ] **Step 2: Write docs/DEPLOYMENT.md**

```markdown
# Deployment Guide

## Prerequisites

- Vercel account (free Hobby tier)
- Supabase account (free tier)
- Google Cloud project with Calendar API enabled
- Resend account (free tier)
- Domain with verified email (for Resend) — or use Resend's sandbox

## Steps

### 1. Supabase hosted project

1. Create a new project at supabase.com
2. Note your Project URL and anon key (Settings → API)
3. Note your service role key (Settings → API → service_role)
4. Run migrations: `supabase db push --db-url postgresql://postgres:<password>@<host>:5432/postgres`

### 2. Generate encryption key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Save this value — it will be your `REFRESH_TOKEN_ENCRYPTION_KEY`.

### 3. Google OAuth app

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID
2. Application type: Web application
3. Authorised redirect URI: `https://your-app.vercel.app/api/oauth/google/callback`
4. Note Client ID and Client Secret

### 4. Vercel deployment

1. Push code to GitHub
2. Import repo at vercel.com/new
3. Add environment variables (all variables from `.env.example`):
   - Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL (e.g. `https://scheduler-waitlist.vercel.app`)
   - Set `CRON_SECRET` to any random string (e.g. `openssl rand -hex 32`)
4. Deploy

### 5. Seed demo data

After first deployment, run the seed script against the hosted DB:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app \
REFRESH_TOKEN_ENCRYPTION_KEY=your-key \
npm run seed:demo
```

### 6. Verify cron

In the Vercel dashboard → your project → Cron Jobs, confirm both jobs are listed. Trigger `/api/cron/poll` manually once to verify it returns `{"processed": 0}`.
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/DEPLOYMENT.md
git commit -m "docs: add README and deployment guide"
```

---

### Task 12: Repo Cleanup

- [ ] **Step 1: Remove AI tooling directories**

```bash
git rm -r docs/superpowers/
git rm -r .claude/
```

- [ ] **Step 2: Handle CLAUDE.md**

Open `CLAUDE.md`. If it contains useful project conventions (test locations, TypeScript rules), rename:
```bash
git mv CLAUDE.md CONTRIBUTING.md
```
If it only contains AI assistant instructions, delete:
```bash
git rm CLAUDE.md
```

- [ ] **Step 3: Clean up page.module.css if empty**

Check `src/app/page.module.css`. If it's unused after the Tailwind migration, delete it:
```bash
git rm src/app/page.module.css
```
Run `npx tsc --noEmit` to confirm no imports break.

- [ ] **Step 4: Final checks**

```bash
npx tsc --noEmit   # must be clean
npx vitest run     # must pass
npm run build      # must succeed
```

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "chore: remove AI tooling artifacts, final cleanup"
git push origin master
```

---

## Post-Plan: Go Live

After all tasks complete:

1. Import repo to Vercel, add env vars, deploy
2. Run `npm run seed:demo` against hosted DB
3. Update `README.md` with the real Vercel URL
4. Push: `git push origin master`
5. Click your CV link — confirm the demo loads instantly
