### Task 12: Connect Setup UI

**Files:**
- Create: `src/app/connect/setup/page.tsx`
- Create: `src/app/connect/setup/connect-setup-form.tsx`
- Create: `src/app/api/connect/complete/route.ts`

**Interfaces:**
- Consumes: `completeSetup()` (Task 11), `createServerSupabaseClient()` / `createServiceRoleClient()` (Task 7), `GoogleCalendarProvider` (Task 9), `decrypt()` (Task 3).
- Produces: a `businesses` row fully populated for the logged-in owner — this is the first point in the app where `businesses` rows exist, consumed by every dashboard/cron task from here on.

- [ ] **Step 1: Implement the server component that reads the pending cookie**

`src/app/connect/setup/page.tsx`:

```tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/crypto/encrypt'
import ConnectSetupForm from './connect-setup-form'

export default async function ConnectSetupPage() {
  const cookieStore = await cookies()
  const pending = cookieStore.get('pending_connect')
  if (!pending) {
    redirect('/connect?error=expired')
  }

  const { calendars } = JSON.parse(decrypt(pending.value)) as {
    calendars: { id: string; summary: string; timezone: string }[]
  }

  return <ConnectSetupForm calendars={calendars} />
}
```

- [ ] **Step 2: Implement the client form component**

`src/app/connect/setup/connect-setup-form.tsx`:

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

interface CalendarOption {
  id: string
  summary: string
  timezone: string
}

export default function ConnectSetupForm({ calendars }: { calendars: CalendarOption[] }) {
  const [calendarChoice, setCalendarChoice] = useState<string>(calendars[0]?.id ?? 'new')
  const [newCalendarName, setNewCalendarName] = useState('Client Bookings')
  const [businessName, setBusinessName] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const body =
      calendarChoice === 'new'
        ? { createNewCalendar: true, newCalendarName, businessName, whatsappNumber }
        : { createNewCalendar: false, calendarId: calendarChoice, businessName, whatsappNumber }

    const response = await fetch('/api/connect/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const data = await response.json()
      setError(data.error ?? 'Something went wrong')
      return
    }

    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Connect your calendar</h1>

      <fieldset>
        <legend>Which calendar holds client bookings?</legend>
        {calendars.map((cal) => (
          <label key={cal.id}>
            <input
              type="radio"
              name="calendar"
              value={cal.id}
              checked={calendarChoice === cal.id}
              onChange={() => setCalendarChoice(cal.id)}
            />
            {cal.summary}
          </label>
        ))}
        <label>
          <input
            type="radio"
            name="calendar"
            value="new"
            checked={calendarChoice === 'new'}
            onChange={() => setCalendarChoice('new')}
          />
          Create a new calendar
        </label>
        {calendarChoice === 'new' && (
          <input
            type="text"
            value={newCalendarName}
            onChange={(e) => setNewCalendarName(e.target.value)}
            placeholder="Calendar name"
          />
        )}
      </fieldset>

      <label>
        Business name
        <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
      </label>

      <label>
        WhatsApp number (with country code, e.g. +15551234567)
        <input
          type="tel"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          required
        />
      </label>

      {error && <p role="alert">{error}</p>}
      <button type="submit">Finish setup</button>
    </form>
  )
}
```

- [ ] **Step 3: Implement the completion route**

`src/app/api/connect/complete/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { decrypt } from '@/lib/crypto/encrypt'
import { GoogleCalendarProvider } from '@/lib/calendar/google-provider'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/db/supabase'
import { completeSetup } from '@/lib/connect/complete-setup'

const completeSchema = z.object({
  businessName: z.string().min(1),
  whatsappNumber: z.string().min(1),
  createNewCalendar: z.boolean(),
  calendarId: z.string().optional(),
  newCalendarName: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const parsed = completeSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const pending = cookieStore.get('pending_connect')
  if (!pending) {
    return NextResponse.json({ error: 'Connection expired, please reconnect Google Calendar' }, { status: 400 })
  }
  const { refreshToken, calendars } = JSON.parse(decrypt(pending.value)) as {
    refreshToken: string
    calendars: { id: string; summary: string; timezone: string }[]
  }

  const serverClient = await createServerSupabaseClient()
  const { data: userData, error: userError } = await serverClient.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const provider = new GoogleCalendarProvider(refreshToken)
  const result = await completeSetup(createServiceRoleClient(), provider, {
    userId: userData.user.id,
    refreshToken,
    calendars,
    ...parsed.data,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.delete('pending_connect')
  return response
}
```

- [ ] **Step 4: Manual walkthrough**

With `npm run dev` running and real Google OAuth credentials in `.env.local`: log in, hit `/api/oauth/google/start`, complete Google's consent screen, land on `/connect/setup`, pick or create a calendar, fill in business name + WhatsApp number, submit. Confirm a row appears in the local `businesses` table (via Studio) with `google_refresh_token_encrypted` populated (and not equal to the raw refresh token).

- [ ] **Step 5: Commit**

```bash
git add src/app/connect src/app/api/connect
git commit -m "feat: add connect-setup UI and completion route"
```

---

