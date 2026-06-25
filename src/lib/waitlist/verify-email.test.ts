import { describe, it, expect, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness } from '@/lib/cron/test-helpers'
import { verifyEmail } from './verify-email'

describe('verifyEmail (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (cleanups.length > 0) {
      const next = cleanups.pop()!
      await cleanupTestBusiness(supabase, next.businessId, next.userId)
    }
  })

  async function setupEntry(overrides: { status?: string; created_at?: string } = {}) {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const { data: client } = await supabase
      .from('clients')
      .insert({ business_id: businessId, name: 'Test Client', email: 'verify@example.com', phone: '15551234567' })
      .select('id')
      .single()

    const { data: entry } = await supabase
      .from('waitlist_entries')
      .insert({
        business_id: businessId,
        client_id: client!.id,
        time_windows: [{ days: [1], start: '09:00', end: '17:00' }],
        status: overrides.status ?? 'pending_verification',
        email_verification_token: 'verify-token-1',
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    if (overrides.created_at) {
      await supabase.from('waitlist_entries').update({ created_at: overrides.created_at }).eq('id', entry!.id)
    }

    return { supabase, businessId, entryId: entry!.id }
  }

  it('verifies a pending entry and flips it to active', async () => {
    const { supabase, entryId } = await setupEntry()
    const result = await verifyEmail(supabase, 'verify-token-1')
    expect(result.ok).toBe(true)
    const { data: entry } = await supabase
      .from('waitlist_entries')
      .select('status, verified_at')
      .eq('id', entryId)
      .single()
    expect(entry?.status).toBe('active')
    expect(entry?.verified_at).toBeTruthy()
  })

  it('returns invalid for an unknown token', async () => {
    const supabase = createServiceRoleClient()
    const result = await verifyEmail(supabase, 'no-such-token')
    expect(result).toEqual({ ok: false, reason: 'invalid' })
  })

  it('returns already_used for an entry that is no longer pending_verification', async () => {
    const { supabase } = await setupEntry({ status: 'active' })
    const result = await verifyEmail(supabase, 'verify-token-1')
    expect(result).toEqual({ ok: false, reason: 'already_used' })
  })

  it('returns expired and removes the entry when older than 48 hours', async () => {
    const { supabase, entryId } = await setupEntry({ created_at: '2026-01-01T00:00:00Z' })
    const result = await verifyEmail(supabase, 'verify-token-1')
    expect(result).toEqual({ ok: false, reason: 'expired' })
    const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
    expect(entry?.status).toBe('removed')
  })
})
