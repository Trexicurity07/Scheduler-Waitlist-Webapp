### Task 22: Dashboard — Upcoming Appointments

**Files:**
- Create: `src/lib/dashboard/get-current-business.ts`
- Create: `src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `createServerSupabaseClient()` (Task 7).
- Produces: `getCurrentBusiness(): Promise<{ supabase: SupabaseClient<Database>; business: Database['public']['Tables']['businesses']['Row'] }>` — redirects to `/login` if unauthenticated, `/connect` if the owner has no `businesses` row yet. Consumed by Task 23 and Task 24 so the same owner/business resolution + redirect logic isn't repeated across all three dashboard pages.

This task has no Vitest test step: it's authentication/redirect glue around the already-tested `createServerSupabaseClient()` (Task 7) and RLS policies (Task 2), in line with this plan's pattern of validating thin page-level glue via manual walkthrough rather than unit tests (see Task 11/12).

- [ ] **Step 1: Implement the shared business-lookup helper**

`src/lib/dashboard/get-current-business.ts`:

```ts
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createServerSupabaseClient } from '@/lib/db/supabase'

export async function getCurrentBusiness(): Promise<{
  supabase: SupabaseClient<Database>
  business: Database['public']['Tables']['businesses']['Row']
}> {
  const supabase = await createServerSupabaseClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    redirect('/login')
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_user_id', userData.user.id)
    .single()

  if (!business) {
    redirect('/connect')
  }

  return { supabase, business }
}
```

- [ ] **Step 2: Implement the upcoming-appointments page**

`src/app/(dashboard)/dashboard/page.tsx`:

```tsx
import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'

export default async function DashboardPage() {
  const { supabase, business } = await getCurrentBusiness()

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, summary, start_time, end_time')
    .eq('business_id', business.id)
    .eq('status', 'confirmed')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })

  return (
    <main>
      <h1>Upcoming appointments — {business.name}</h1>
      {business.calendar_status === 'disconnected' && (
        <p role="alert">
          Your Google Calendar connection has expired. <a href="/connect">Reconnect it</a> to keep
          auto-filling cancellations.
        </p>
      )}
      {!appointments || appointments.length === 0 ? (
        <p>No upcoming appointments.</p>
      ) : (
        <ul>
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              {new Date(appointment.start_time).toLocaleString()} –{' '}
              {new Date(appointment.end_time).toLocaleString()}
              {appointment.summary ? ` — ${appointment.summary}` : ''}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Manual walkthrough**

With `supabase start` and `npm run dev` running and a logged-in owner who has completed `/connect/setup`: insert a couple of `confirmed` appointment rows (one past, one future) for that business via Supabase Studio, visit `/dashboard`, and confirm only the future one renders, sorted earliest-first. Then set that business's `calendar_status` to `'disconnected'` in Studio, reload, and confirm the reconnect banner appears.

- [ ] **Step 4: Commit**

```bash
git add src/lib/dashboard/get-current-business.ts "src/app/(dashboard)/dashboard"
git commit -m "feat: add dashboard upcoming appointments page"
```

---

