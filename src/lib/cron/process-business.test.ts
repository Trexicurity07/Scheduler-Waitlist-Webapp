import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness } from './test-helpers'
import { encrypt } from '@/lib/crypto/encrypt'
import { randomBytes } from 'node:crypto'
import type { ClaimedBusiness } from './claim-businesses'
import type { CalendarProvider, CalendarEvent, CalendarListEntry, CreateEventInput } from '@/lib/calendar/provider'

const mockSendCalendarDisconnectedEmail = vi.fn()

vi.mock('@/lib/notifications/email', () => ({
  sendCalendarDisconnectedEmail: (...args: unknown[]) => mockSendCalendarDisconnectedEmail(...args),
  sendSlotOfferEmail: vi.fn(),
  sendSlotGoneEmail: vi.fn(),
  sendExpiryEmail: vi.fn(),
}))

vi.mock('@/lib/calendar/google-provider', () => ({
  GoogleCalendarProvider: vi.fn(),
}))

import { GoogleCalendarProvider } from '@/lib/calendar/google-provider'
import { processBusiness } from './process-business'

function stubProvider(overrides: Partial<CalendarProvider> = {}): CalendarProvider {
  return {
    listCalendars: async (): Promise<CalendarListEntry[]> => [],
    createCalendar: async (): Promise<CalendarListEntry> => {
      throw new Error('not implemented')
    },
    getCalendarTimezone: async (): Promise<string> => 'UTC',
    listChangedEvents: async (): Promise<CalendarEvent[]> => [],
    createEvent: async (_calendarId: string, _input: CreateEventInput): Promise<CalendarEvent> => {
      throw new Error('not implemented')
    },
    ...overrides,
  }
}

describe('processBusiness (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  beforeEach(() => {
    mockSendCalendarDisconnectedEmail.mockReset()
    process.env.REFRESH_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64')
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
    const { businessId, userId } = await createTestBusiness(supabase, {
      google_refresh_token_encrypted: encrypt('fake-refresh-token'),
    })
    cleanups.push({ businessId, userId })
    const { data: row } = await supabase.from('businesses').select('*').eq('id', businessId).single()
    return { supabase, business: row as ClaimedBusiness, businessId, userId }
  }

  it('syncs the calendar, runs housekeeping, and releases the lock on success', async () => {
    ;(GoogleCalendarProvider as unknown as Mock).mockImplementation(() => stubProvider())
    const { supabase, business, businessId } = await setupBusiness()

    const now = new Date('2026-06-23T12:00:00Z')
    await processBusiness(supabase, business, now)

    const { data: updated } = await supabase
      .from('businesses')
      .select('processing_started_at, last_checked_at, calendar_status')
      .eq('id', businessId)
      .single()
    expect(updated?.processing_started_at).toBeNull()
    // Postgres returns timestamptz as `+00:00`; normalize through Date before
    // comparing the instant — matches the codebase convention in
    // claim-businesses.test.ts for this same last_checked_at column.
    expect(new Date(updated?.last_checked_at ?? '').toISOString()).toBe(now.toISOString())
    expect(updated?.calendar_status).toBe('connected')
    expect(mockSendCalendarDisconnectedEmail).not.toHaveBeenCalled()
  })

  it('marks the business disconnected and emails the owner when the calendar provider throws an auth error', async () => {
    ;(GoogleCalendarProvider as unknown as Mock).mockImplementation(() =>
      stubProvider({
        listChangedEvents: async () => {
          throw new Error('invalid_grant')
        },
      })
    )
    const { supabase, business, businessId, userId } = await setupBusiness()

    const now = new Date('2026-06-23T12:00:00Z')
    await processBusiness(supabase, business, now)

    const { data: updated } = await supabase
      .from('businesses')
      .select('processing_started_at, calendar_status')
      .eq('id', businessId)
      .single()
    expect(updated?.calendar_status).toBe('disconnected')
    expect(updated?.processing_started_at).toBeNull()

    const { data: ownerUserData } = await supabase.auth.admin.getUserById(userId)
    expect(mockSendCalendarDisconnectedEmail).toHaveBeenCalledWith(
      ownerUserData!.user!.email,
      expect.objectContaining({ businessName: business.name })
    )
  })
})
