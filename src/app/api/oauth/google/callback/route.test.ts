import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetToken = vi.fn()
const mockListCalendars = vi.fn()

vi.mock('googleapis', () => ({
  google: {
    auth: {
      // NOTE: `function` (not an arrow) so the mock is constructable under `new`.
      // vitest 4 cannot `new` a mock whose implementation is an arrow function
      // ("X is not a constructor"); a function expression has [[Construct]] and works.
      // Same fix applied in Task 9's google-provider.test.ts. Only deviation from the
      // brief's pinned test; all assertions are unchanged.
      OAuth2: vi.fn().mockImplementation(function () {
        return {
          getToken: mockGetToken,
          setCredentials: vi.fn(),
        }
      }),
    },
    calendar: vi.fn(),
  },
}))

vi.mock('@/lib/calendar/google-provider', () => ({
  // NOTE: `function` (not an arrow) — same vitest 4 arrow-constructor issue as the
  // OAuth2 mock above (`new GoogleCalendarProvider(...)` in the route requires a
  // constructable mock). Only deviation from the brief's pinned test.
  GoogleCalendarProvider: vi.fn().mockImplementation(function () {
    return { listCalendars: mockListCalendars }
  }),
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
