### Task 7: Supabase Client Module

**Files:**
- Create: `src/lib/db/supabase.ts`
- Create: `src/lib/db/supabase-browser.ts`
- Test: `src/lib/db/supabase.test.ts` (integration — requires local Supabase running)

**Interfaces:**
- Produces:
  - `createServiceRoleClient(): SupabaseClient<Database>` — bypasses RLS; used by cron (Task 13-16) and public unauthenticated routes (Task 17, 19) where there is no logged-in user.
  - `createServerSupabaseClient(): Promise<SupabaseClient<Database>>` — RLS-enforced, bound to the logged-in owner's session via cookies; used by dashboard pages (Task 22-24).
  - `createBrowserSupabaseClient(): SupabaseClient<Database>` (from `supabase-browser.ts`) — used by client components (Task 8 auth pages).

- [ ] **Step 1: Write the failing integration test**

Prerequisite: local Supabase must be running (`npx supabase start`, from Task 2) and `.env.local` populated.

`src/lib/db/supabase.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServiceRoleClient } from './supabase'

describe('createServiceRoleClient (integration)', () => {
  let businessId: string
  let userId: string

  beforeAll(async () => {
    const supabase = createServiceRoleClient()
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
    })
    if (userError || !userData.user) throw userError
    userId = userData.user.id

    const { data, error } = await supabase
      .from('businesses')
      .insert({
        owner_user_id: userId,
        name: 'Test Salon',
        public_slug: `test-salon-${Date.now()}`,
        whatsapp_number: '15551234567',
        timezone: 'America/New_York',
        google_refresh_token_encrypted: 'encrypted-placeholder',
        dedicated_calendar_id: 'calendar-placeholder',
      })
      .select()
      .single()
    if (error || !data) throw error
    businessId = data.id
  })

  afterAll(async () => {
    const supabase = createServiceRoleClient()
    await supabase.from('businesses').delete().eq('id', businessId)
    await supabase.auth.admin.deleteUser(userId)
  })

  it('inserts and reads back a business row', async () => {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.from('businesses').select('name').eq('id', businessId).single()
    expect(error).toBeNull()
    expect(data?.name).toBe('Test Salon')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- supabase.test.ts`
Expected: FAIL — `src/lib/db/supabase.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/db/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )
}
```

- [ ] **Step 4: Implement `src/lib/db/supabase-browser.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- supabase.test.ts`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add src/lib/db
git commit -m "feat: add Supabase service-role, server, and browser clients"
```

---

