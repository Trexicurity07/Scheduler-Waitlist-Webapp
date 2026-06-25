### Task 10: Google OAuth Connect Routes

**Files:**
- Create: `src/app/api/oauth/google/start/route.ts`
- Create: `src/app/api/oauth/google/callback/route.ts`
- Test: `src/app/api/oauth/google/callback/route.test.ts`

**Interfaces:**
- Consumes: `encrypt()` (Task 3), `GoogleCalendarProvider` (Task 9).
- Produces: an httpOnly `pending_connect` cookie containing `encrypt(JSON.stringify({ refreshToken, calendars }))`, valid 10 minutes — consumed by Task 11's `/connect/setup` page and `/api/connect/complete` route. The `businesses` row is **not** created here; it's created once the owner finishes the setup form in Task 11, since required NOT NULL columns (`whatsapp_number`, `dedicated_calendar_id`) aren't known yet.

- [ ] **Step 1: Implement the OAuth start route**

`src/app/api/oauth/google/start/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  )
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  })
  return NextResponse.redirect(url)
}
```

- [ ] **Step 2: Write the failing test for the callback route**

`src/app/api/oauth/google/callback/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetToken = vi.fn()
const mockListCalendars = vi.fn()

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        getToken: mockGetToken,
        setCredentials: vi.fn(),
      })),
    },
    calendar: vi.fn(),
  },
}))

vi.mock('@/lib/calendar/google-provider', () => ({
  GoogleCalendarProvider: vi.fn().mockImplementation(() => ({
    listCalendars: mockListCalendars,
  })),
}))

beforeEach(() => {
  process.env.REFRESH_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
  mockGetToken.mockReset()
  mockListCalendars.mockReset()
})

import { GET } from './route'
import { decrypt } from '@/lib/crypto/encrypt'

describe('GET /api/oauth/google/callback', () => {
  it('redirects to /connect/setup and sets an encrypted pending_connect cookie', async () => {
    mockGetToken.mockResolvedValue({ tokens: { refresh_token: 'fake-refresh-token' } })
    mockListCalendars.mockResolvedValue([{ id: 'cal1', summary: 'Bookings', timezone: 'UTC' }])

    const request = new NextRequest('https://example.com/api/oauth/google/callback?code=abc123')
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/connect/setup')

    const cookie = response.cookies.get('pending_connect')
    expect(cookie).toBeDefined()
    const payload = JSON.parse(decrypt(cookie!.value))
    expect(payload.refreshToken).toBe('fake-refresh-token')
    expect(payload.calendars).toEqual([{ id: 'cal1', summary: 'Bookings', timezone: 'UTC' }])
  })

  it('redirects with an error when no code is present', async () => {
    const request = new NextRequest('https://example.com/api/oauth/google/callback')
    const response = await GET(request)
    expect(response.headers.get('location')).toContain('error=missing_code')
  })

  it('redirects with an error when Google does not return a refresh token', async () => {
    mockGetToken.mockResolvedValue({ tokens: {} })
    const request = new NextRequest('https://example.com/api/oauth/google/callback?code=abc123')
    const response = await GET(request)
    expect(response.headers.get('location')).toContain('error=no_refresh_token')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- callback/route.test.ts`
Expected: FAIL — `src/app/api/oauth/google/callback/route.ts` does not exist.

- [ ] **Step 4: Implement the callback route**

`src/app/api/oauth/google/callback/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { encrypt } from '@/lib/crypto/encrypt'
import { GoogleCalendarProvider } from '@/lib/calendar/google-provider'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/connect?error=missing_code', request.url))
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  )
  const { tokens } = await oauth2Client.getToken(code)
  if (!tokens.refresh_token) {
    return NextResponse.redirect(new URL('/connect?error=no_refresh_token', request.url))
  }

  const provider = new GoogleCalendarProvider(tokens.refresh_token)
  const calendars = await provider.listCalendars()

  const payload = JSON.stringify({ refreshToken: tokens.refresh_token, calendars })
  const encrypted = encrypt(payload)

  const response = NextResponse.redirect(new URL('/connect/setup', request.url))
  response.cookies.set('pending_connect', encrypted, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return response
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- callback/route.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/oauth
git commit -m "feat: add Google OAuth start and callback routes"
```

---

