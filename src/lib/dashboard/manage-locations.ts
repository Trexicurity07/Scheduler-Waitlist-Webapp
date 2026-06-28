import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface CreateLocationInput {
  parentId: string | null // null = top-level location, string = subfolder
  type: 'location' | 'folder'
  name: string // max 80 chars
  address?: string // max 200 chars; only meaningful for type='location'
  description?: string // max 200 chars
}

export interface UpdateLocationInput {
  name?: string
  address?: string
  description?: string
}

function validateName(name: string): string | null {
  if (name.length > 80) return 'Name must be 80 characters or fewer'
  return null
}

function validateAddress(address: string | undefined): string | null {
  if (address !== undefined && address.length > 200) {
    return 'Address must be 200 characters or fewer'
  }
  return null
}

function validateDescription(description: string | undefined): string | null {
  if (description !== undefined && description.length > 200) {
    return 'Description must be 200 characters or fewer'
  }
  return null
}

export async function createLocation(
  supabase: SupabaseClient<Database>,
  businessId: string,
  input: CreateLocationInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const nameError = validateName(input.name)
  if (nameError) return { ok: false, error: nameError }

  const addressError = validateAddress(input.address)
  if (addressError) return { ok: false, error: addressError }

  const descriptionError = validateDescription(input.description)
  if (descriptionError) return { ok: false, error: descriptionError }

  if (input.parentId !== null) {
    const { data: parent } = await supabase
      .from('location_nodes')
      .select('id, business_id')
      .eq('id', input.parentId)
      .maybeSingle()
    if (!parent || parent.business_id !== businessId) {
      return { ok: false, error: 'Parent location not found' }
    }
  }

  const { data, error } = await supabase
    .from('location_nodes')
    .insert({
      business_id: businessId,
      parent_id: input.parentId,
      type: input.type,
      name: input.name,
      address: input.address,
      description: input.description,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: 'Could not create location.' }
  return { ok: true, id: data.id }
}

export async function updateLocation(
  supabase: SupabaseClient<Database>,
  businessId: string,
  nodeId: string,
  input: UpdateLocationInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: node } = await supabase
    .from('location_nodes')
    .select('id, business_id')
    .eq('id', nodeId)
    .maybeSingle()

  if (!node || node.business_id !== businessId) {
    return { ok: false, error: 'Location not found' }
  }

  if (input.name !== undefined) {
    const nameError = validateName(input.name)
    if (nameError) return { ok: false, error: nameError }
  }
  const addressError = validateAddress(input.address)
  if (addressError) return { ok: false, error: addressError }
  const descriptionError = validateDescription(input.description)
  if (descriptionError) return { ok: false, error: descriptionError }

  const update: Database['public']['Tables']['location_nodes']['Update'] = {}
  if (input.name !== undefined) update.name = input.name
  if (input.address !== undefined) update.address = input.address
  if (input.description !== undefined) update.description = input.description

  const { error } = await supabase.from('location_nodes').update(update).eq('id', nodeId)
  if (error) return { ok: false, error: 'Could not update location.' }
  return { ok: true }
}

export async function deleteLocation(
  supabase: SupabaseClient<Database>,
  businessId: string,
  nodeId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: node } = await supabase
    .from('location_nodes')
    .select('id, business_id')
    .eq('id', nodeId)
    .maybeSingle()

  if (!node || node.business_id !== businessId) {
    return { ok: false, error: 'Location not found' }
  }

  const { error } = await supabase.from('location_nodes').delete().eq('id', nodeId)
  if (error) return { ok: false, error: 'Could not delete location.' }
  return { ok: true }
}
