import { describe, it, expect, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness } from '@/lib/cron/test-helpers'
import { createLocation, updateLocation, deleteLocation } from './manage-locations'

describe('manage-locations (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (cleanups.length > 0) {
      const next = cleanups.pop()!
      await cleanupTestBusiness(supabase, next.businessId, next.userId)
    }
  })

  async function setupBusiness() {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })
    return { supabase, businessId }
  }

  describe('createLocation', () => {
    it('creates a top-level location', async () => {
      const { supabase, businessId } = await setupBusiness()

      const result = await createLocation(supabase, businessId, {
        parentId: null,
        type: 'location',
        name: 'Main Branch',
        address: '123 Main St',
      })

      expect(result.ok).toBe(true)
      const id = (result as { ok: true; id: string }).id
      const { data: row } = await supabase
        .from('location_nodes')
        .select('*')
        .eq('id', id)
        .single()
      expect(row).toMatchObject({
        business_id: businessId,
        parent_id: null,
        type: 'location',
        name: 'Main Branch',
        address: '123 Main St',
      })
    })

    it('creates a subfolder under an existing node', async () => {
      const { supabase, businessId } = await setupBusiness()

      const parentResult = await createLocation(supabase, businessId, {
        parentId: null,
        type: 'folder',
        name: 'Region',
      })
      expect(parentResult.ok).toBe(true)
      const parentId = (parentResult as { ok: true; id: string }).id

      const childResult = await createLocation(supabase, businessId, {
        parentId,
        type: 'folder',
        name: 'Sub-Region',
      })
      expect(childResult.ok).toBe(true)
      const childId = (childResult as { ok: true; id: string }).id

      const { data: row } = await supabase
        .from('location_nodes')
        .select('parent_id')
        .eq('id', childId)
        .single()
      expect(row?.parent_id).toBe(parentId)
    })

    it('rejects name longer than 80 characters', async () => {
      const { supabase, businessId } = await setupBusiness()

      const result = await createLocation(supabase, businessId, {
        parentId: null,
        type: 'location',
        name: 'a'.repeat(81),
      })

      expect(result).toEqual({ ok: false, error: 'Name must be 80 characters or fewer' })
    })

    it('rejects address longer than 200 characters', async () => {
      const { supabase, businessId } = await setupBusiness()

      const result = await createLocation(supabase, businessId, {
        parentId: null,
        type: 'location',
        name: 'Main Branch',
        address: 'a'.repeat(201),
      })

      expect(result).toEqual({ ok: false, error: 'Address must be 200 characters or fewer' })
    })

    it('rejects description longer than 200 characters', async () => {
      const { supabase, businessId } = await setupBusiness()

      const result = await createLocation(supabase, businessId, {
        parentId: null,
        type: 'location',
        name: 'Main Branch',
        description: 'a'.repeat(201),
      })

      expect(result).toEqual({ ok: false, error: 'Description must be 200 characters or fewer' })
    })
  })

  describe('updateLocation', () => {
    it('updates the name and reflects it in the DB', async () => {
      const { supabase, businessId } = await setupBusiness()
      const created = await createLocation(supabase, businessId, {
        parentId: null,
        type: 'location',
        name: 'Old Name',
      })
      const id = (created as { ok: true; id: string }).id

      const result = await updateLocation(supabase, businessId, id, { name: 'New Name' })
      expect(result).toEqual({ ok: true })

      const { data: row } = await supabase
        .from('location_nodes')
        .select('name')
        .eq('id', id)
        .single()
      expect(row?.name).toBe('New Name')
    })

    it('rejects updates when the node belongs to a different business', async () => {
      const { supabase, businessId } = await setupBusiness()
      const { businessId: otherBusinessId, userId: otherUserId } = await createTestBusiness(supabase)
      cleanups.push({ businessId: otherBusinessId, userId: otherUserId })

      const created = await createLocation(supabase, otherBusinessId, {
        parentId: null,
        type: 'location',
        name: 'Other Business Location',
      })
      const id = (created as { ok: true; id: string }).id

      const result = await updateLocation(supabase, businessId, id, { name: 'Hijacked' })
      expect(result).toEqual({ ok: false, error: 'Location not found' })
    })
  })

  describe('deleteLocation', () => {
    it('deletes the node from the DB', async () => {
      const { supabase, businessId } = await setupBusiness()
      const created = await createLocation(supabase, businessId, {
        parentId: null,
        type: 'location',
        name: 'To Delete',
      })
      const id = (created as { ok: true; id: string }).id

      const result = await deleteLocation(supabase, businessId, id)
      expect(result).toEqual({ ok: true })

      const { data: row } = await supabase
        .from('location_nodes')
        .select('id')
        .eq('id', id)
        .maybeSingle()
      expect(row).toBeNull()
    })

    it('rejects deletes when the node belongs to a different business', async () => {
      const { supabase, businessId } = await setupBusiness()
      const { businessId: otherBusinessId, userId: otherUserId } = await createTestBusiness(supabase)
      cleanups.push({ businessId: otherBusinessId, userId: otherUserId })

      const created = await createLocation(supabase, otherBusinessId, {
        parentId: null,
        type: 'location',
        name: 'Other Business Location',
      })
      const id = (created as { ok: true; id: string }).id

      const result = await deleteLocation(supabase, businessId, id)
      expect(result).toEqual({ ok: false, error: 'Location not found' })
    })
  })
})
