import { randomUUID } from 'crypto'
import { describe, it, expect, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness } from '@/lib/cron/test-helpers'
import {
  createWaitlist,
  updateWaitlistSettings,
  linkWaitlistCalendar,
  unlinkWaitlistCalendar,
} from './manage-waitlists'
import { addWaitlistEntry } from './manage-waitlist'

describe('manage-waitlists (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []
  const nodeCleanups: string[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    for (const nodeId of nodeCleanups.splice(0)) {
      await supabase.from('location_nodes').delete().eq('id', nodeId)
    }
    while (cleanups.length > 0) {
      const next = cleanups.pop()!
      await cleanupTestBusiness(supabase, next.businessId, next.userId)
    }
  })

  async function setupBusinessWithLocation() {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const { data: node, error } = await supabase
      .from('location_nodes')
      .insert({
        business_id: businessId,
        parent_id: null,
        type: 'location',
        name: 'Test Location',
      })
      .select('id')
      .single()
    if (error || !node) throw error
    nodeCleanups.push(node.id)

    return { supabase, businessId, nodeId: node.id }
  }

  describe('createWaitlist', () => {
    it('creates a waitlist and returns ok+id with calendar_status connected', async () => {
      const { supabase, businessId, nodeId } = await setupBusinessWithLocation()

      const result = await createWaitlist(supabase, businessId, {
        nodeId,
        name: 'Front Desk',
        refreshToken: 'raw-refresh-token',
        calendarId: 'calendar-123',
        calendarTimezone: 'America/New_York',
      })

      expect(result.ok).toBe(true)
      const id = (result as { ok: true; id: string }).id
      expect(id).toBeTruthy()

      const { data: row } = await supabase
        .from('waitlists')
        .select('*')
        .eq('id', id)
        .single()

      expect(row).not.toBeNull()
      expect(row!.calendar_status).toBe('connected')
      expect(row!.name).toBe('Front Desk')
      expect(row!.node_id).toBe(nodeId)
      expect(row!.business_id).toBe(businessId)
      expect(row!.timezone).toBe('America/New_York')
      // refresh token must never be stored raw
      expect(row!.google_refresh_token_encrypted).not.toBe('raw-refresh-token')
      expect(row!.google_refresh_token_encrypted).toBeTruthy()
    })

    it('sets a non-empty auto-generated public_slug on the row', async () => {
      const { supabase, businessId, nodeId } = await setupBusinessWithLocation()

      const result = await createWaitlist(supabase, businessId, {
        nodeId,
        name: 'Back Office',
        refreshToken: 'raw-refresh-token',
        calendarId: 'calendar-456',
        calendarTimezone: 'UTC',
      })

      expect(result.ok).toBe(true)
      const id = (result as { ok: true; id: string }).id
      const { data: row } = await supabase
        .from('waitlists')
        .select('public_slug')
        .eq('id', id)
        .single()

      expect(row!.public_slug).toBeTruthy()
      expect(row!.public_slug.length).toBeGreaterThan(0)
    })

    it('rejects a name longer than 80 characters', async () => {
      const { supabase, businessId, nodeId } = await setupBusinessWithLocation()

      const result = await createWaitlist(supabase, businessId, {
        nodeId,
        name: 'A'.repeat(81),
        refreshToken: 'raw-refresh-token',
        calendarId: 'calendar-789',
        calendarTimezone: 'UTC',
      })

      expect(result).toEqual({ ok: false, error: 'Name must be 80 characters or fewer' })
    })

    it('rejects when minConfirmLeadHours is not less than minNoticeHours', async () => {
      const { supabase, businessId, nodeId } = await setupBusinessWithLocation()

      const result = await createWaitlist(supabase, businessId, {
        nodeId,
        name: 'Bad Settings',
        refreshToken: 'raw-refresh-token',
        calendarId: 'calendar-bad',
        calendarTimezone: 'UTC',
        minNoticeHours: 2,
        minConfirmLeadHours: 2,
      })

      expect(result).toEqual({
        ok: false,
        error: 'Confirm lead hours must be less than notice hours',
      })
    })
  })

  describe('updateWaitlistSettings', () => {
    async function createTestWaitlist(
      supabase: ReturnType<typeof createServiceRoleClient>,
      businessId: string,
      nodeId: string
    ) {
      const result = await createWaitlist(supabase, businessId, {
        nodeId,
        name: 'Original Name',
        refreshToken: 'raw-refresh-token',
        calendarId: 'calendar-update',
        calendarTimezone: 'UTC',
      })
      if (!result.ok) throw new Error(result.error)
      return result.id
    }

    it('updates the name and the DB row reflects the change', async () => {
      const { supabase, businessId, nodeId } = await setupBusinessWithLocation()
      const waitlistId = await createTestWaitlist(supabase, businessId, nodeId)

      const result = await updateWaitlistSettings(supabase, businessId, waitlistId, {
        name: 'Updated Name',
      })

      expect(result).toEqual({ ok: true })
      const { data: row } = await supabase
        .from('waitlists')
        .select('name')
        .eq('id', waitlistId)
        .single()
      expect(row!.name).toBe('Updated Name')
    })

    it('rejects when the waitlist belongs to a different business', async () => {
      const { supabase, businessId, nodeId } = await setupBusinessWithLocation()
      const waitlistId = await createTestWaitlist(supabase, businessId, nodeId)

      const { businessId: otherBusinessId, userId: otherUserId } = await createTestBusiness(supabase)
      cleanups.push({ businessId: otherBusinessId, userId: otherUserId })

      const result = await updateWaitlistSettings(supabase, otherBusinessId, waitlistId, {
        name: 'Hijacked',
      })

      expect(result).toEqual({ ok: false, error: 'Waitlist not found' })
    })
  })

  describe('linkWaitlistCalendar', () => {
    it('updates calendar fields and sets calendar_status to connected', async () => {
      const { supabase, businessId, nodeId } = await setupBusinessWithLocation()
      const createResult = await createWaitlist(supabase, businessId, {
        nodeId,
        name: 'Linkable',
        refreshToken: 'raw-refresh-token',
        calendarId: 'calendar-original',
        calendarTimezone: 'UTC',
      })
      if (!createResult.ok) throw new Error(createResult.error)
      const waitlistId = createResult.id

      // unlink first to simulate a pending calendar
      await unlinkWaitlistCalendar(supabase, businessId, waitlistId)

      const result = await linkWaitlistCalendar(supabase, businessId, waitlistId, {
        refreshToken: 'new-raw-refresh-token',
        calendarId: 'calendar-new',
        calendarTimezone: 'Europe/London',
      })

      expect(result).toEqual({ ok: true })
      const { data: row } = await supabase
        .from('waitlists')
        .select('*')
        .eq('id', waitlistId)
        .single()

      expect(row!.calendar_status).toBe('connected')
      expect(row!.dedicated_calendar_id).toBe('calendar-new')
      expect(row!.timezone).toBe('Europe/London')
      expect(row!.google_refresh_token_encrypted).not.toBe('new-raw-refresh-token')
      expect(row!.google_refresh_token_encrypted).toBeTruthy()
    })
  })

  describe('unlinkWaitlistCalendar', () => {
    it('nulls the token and calendar id and sets status to pending', async () => {
      const { supabase, businessId, nodeId } = await setupBusinessWithLocation()
      const createResult = await createWaitlist(supabase, businessId, {
        nodeId,
        name: 'Unlinkable',
        refreshToken: 'raw-refresh-token',
        calendarId: 'calendar-to-remove',
        calendarTimezone: 'UTC',
      })
      if (!createResult.ok) throw new Error(createResult.error)
      const waitlistId = createResult.id

      const result = await unlinkWaitlistCalendar(supabase, businessId, waitlistId)

      expect(result).toEqual({ ok: true })
      const { data: row } = await supabase
        .from('waitlists')
        .select('*')
        .eq('id', waitlistId)
        .single()

      expect(row!.calendar_status).toBe('pending')
      expect(row!.google_refresh_token_encrypted).toBeNull()
      expect(row!.dedicated_calendar_id).toBeNull()
    })

    it('rejects when the waitlist belongs to a different business', async () => {
      const { supabase, businessId, nodeId } = await setupBusinessWithLocation()
      const createResult = await createWaitlist(supabase, businessId, {
        nodeId,
        name: 'Protected',
        refreshToken: 'raw-refresh-token',
        calendarId: 'calendar-protected',
        calendarTimezone: 'UTC',
      })
      if (!createResult.ok) throw new Error(createResult.error)
      const waitlistId = createResult.id

      const { businessId: otherBusinessId, userId: otherUserId } = await createTestBusiness(supabase)
      cleanups.push({ businessId: otherBusinessId, userId: otherUserId })

      const result = await unlinkWaitlistCalendar(supabase, otherBusinessId, waitlistId)
      expect(result).toEqual({ ok: false, error: 'Waitlist not found' })
    })
  })

  describe('addWaitlistEntry with waitlistId', () => {
    const clientCleanups: string[] = []
    afterEach(async () => {
      const supabase = createServiceRoleClient()
      for (const id of clientCleanups.splice(0)) {
        await supabase.from('client_profiles').delete().eq('user_id', id)
      }
    })

    async function createClientAccount(supabase: ReturnType<typeof createServiceRoleClient>, email: string, phone: string) {
      const userId = randomUUID()
      clientCleanups.push(userId)
      await supabase.from('client_profiles').insert({
        user_id: userId, name: 'Test Client', email, phone,
      })
      return userId
    }

    it('creates an entry without waitlist_id when waitlistId is null (legacy behavior)', async () => {
      const { supabase, businessId } = await setupBusinessWithLocation()
      const email = `legacy-${Date.now()}@example.com`
      await createClientAccount(supabase, email, `1555${Math.floor(1000000 + Math.random() * 8999999)}`)

      const result = await addWaitlistEntry(supabase, businessId, null, {
        identifier: email,
        timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
      })
      expect(result).toEqual({ ok: true })

      const { data: entry } = await supabase
        .from('waitlist_entries')
        .select('waitlist_id')
        .eq('business_id', businessId)
        .eq('status', 'active')
        .single()
      expect(entry!.waitlist_id).toBeNull()
    })

    it('creates an entry with waitlist_id set when a real waitlistId is provided', async () => {
      const { supabase, businessId, nodeId } = await setupBusinessWithLocation()
      const createResult = await createWaitlist(supabase, businessId, {
        nodeId,
        name: 'Entry Target',
        refreshToken: 'raw-refresh-token',
        calendarId: 'calendar-entry',
        calendarTimezone: 'UTC',
      })
      if (!createResult.ok) throw new Error(createResult.error)
      const waitlistId = createResult.id

      const email = `withwaitlist-${Date.now()}@example.com`
      await createClientAccount(supabase, email, `1555${Math.floor(1000000 + Math.random() * 8999999)}`)

      const result = await addWaitlistEntry(supabase, businessId, waitlistId, {
        identifier: email,
        timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
      })
      expect(result).toEqual({ ok: true })

      const { data: entry } = await supabase
        .from('waitlist_entries')
        .select('waitlist_id')
        .eq('business_id', businessId)
        .eq('status', 'active')
        .single()
      expect(entry!.waitlist_id).toBe(waitlistId)
    })
  })
})
