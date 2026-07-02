import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { encrypt } from '@/lib/crypto/encrypt'

export interface CreateWaitlistInput {
  nodeId: string
  name: string
  description?: string
  refreshToken: string
  calendarId: string
  calendarTimezone: string
  batchSize?: number
  batchIntervalMinutes?: number
  minNoticeHours?: number
  minConfirmLeadHours?: number
  timezone?: string
}

export interface UpdateWaitlistSettingsInput {
  name?: string
  description?: string
  batchSize?: number
  batchIntervalMinutes?: number
  minNoticeHours?: number
  minConfirmLeadHours?: number
  timezone?: string
}

export interface LinkCalendarInput {
  refreshToken: string
  calendarId: string
  calendarTimezone: string
}

function slugifyName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function randomHex4(): string {
  return Math.random().toString(16).slice(2, 6)
}

function validateName(name: string): string | null {
  if (name.length > 80) return 'Name must be 80 characters or fewer'
  return null
}

function validateDescription(description: string | undefined): string | null {
  if (description !== undefined && description.length > 200)
    return 'Description must be 200 characters or fewer'
  return null
}

export async function createWaitlist(
  supabase: SupabaseClient<Database>,
  businessId: string,
  input: CreateWaitlistInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const nameError = validateName(input.name)
  if (nameError) return { ok: false, error: nameError }

  const descError = validateDescription(input.description)
  if (descError) return { ok: false, error: descError }

  const minNoticeHours = input.minNoticeHours ?? 24
  const minConfirmLeadHours = input.minConfirmLeadHours ?? 2
  if (minConfirmLeadHours >= minNoticeHours) {
    return { ok: false, error: 'Confirm lead hours must be less than notice hours' }
  }

  const publicSlug = `${slugifyName(input.name)}-${randomHex4()}`
  const encryptedToken = encrypt(input.refreshToken)

  const { data, error } = await supabase
    .from('waitlists')
    .insert({
      business_id: businessId,
      node_id: input.nodeId,
      name: input.name,
      description: input.description ?? null,
      public_slug: publicSlug,
      google_refresh_token_encrypted: encryptedToken,
      dedicated_calendar_id: input.calendarId,
      calendar_status: 'connected',
      timezone: input.calendarTimezone,
      batch_size: input.batchSize ?? 3,
      batch_interval_minutes: input.batchIntervalMinutes ?? 60,
      min_notice_hours: minNoticeHours,
      min_confirm_lead_hours: minConfirmLeadHours,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: 'Could not create waitlist.' }
  return { ok: true, id: data.id }
}

export async function updateWaitlistSettings(
  supabase: SupabaseClient<Database>,
  businessId: string,
  waitlistId: string,
  input: UpdateWaitlistSettingsInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing } = await supabase
    .from('waitlists')
    .select('business_id, name, description, min_notice_hours, min_confirm_lead_hours')
    .eq('id', waitlistId)
    .maybeSingle()

  if (!existing || existing.business_id !== businessId) {
    return { ok: false, error: 'Waitlist not found' }
  }

  if (input.name !== undefined) {
    const nameError = validateName(input.name)
    if (nameError) return { ok: false, error: nameError }
  }

  if (input.description !== undefined) {
    const descError = validateDescription(input.description)
    if (descError) return { ok: false, error: descError }
  }

  const mergedMinNoticeHours = input.minNoticeHours ?? existing.min_notice_hours
  const mergedMinConfirmLeadHours = input.minConfirmLeadHours ?? existing.min_confirm_lead_hours
  if (mergedMinConfirmLeadHours >= mergedMinNoticeHours) {
    return { ok: false, error: 'Confirm lead hours must be less than notice hours' }
  }

  const { error } = await supabase
    .from('waitlists')
    .update({
      updated_at: new Date().toISOString(),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.batchSize !== undefined ? { batch_size: input.batchSize } : {}),
      ...(input.batchIntervalMinutes !== undefined ? { batch_interval_minutes: input.batchIntervalMinutes } : {}),
      ...(input.minNoticeHours !== undefined ? { min_notice_hours: input.minNoticeHours } : {}),
      ...(input.minConfirmLeadHours !== undefined ? { min_confirm_lead_hours: input.minConfirmLeadHours } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
    })
    .eq('id', waitlistId)
  if (error) return { ok: false, error: 'Could not update waitlist settings.' }
  return { ok: true }
}

export async function linkWaitlistCalendar(
  supabase: SupabaseClient<Database>,
  businessId: string,
  waitlistId: string,
  input: LinkCalendarInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing } = await supabase
    .from('waitlists')
    .select('business_id')
    .eq('id', waitlistId)
    .maybeSingle()

  if (!existing || existing.business_id !== businessId) {
    return { ok: false, error: 'Waitlist not found' }
  }

  const encryptedToken = encrypt(input.refreshToken)

  const { error } = await supabase
    .from('waitlists')
    .update({
      google_refresh_token_encrypted: encryptedToken,
      dedicated_calendar_id: input.calendarId,
      timezone: input.calendarTimezone,
      calendar_status: 'connected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', waitlistId)

  if (error) return { ok: false, error: 'Could not link calendar.' }
  return { ok: true }
}

export async function unlinkWaitlistCalendar(
  supabase: SupabaseClient<Database>,
  businessId: string,
  waitlistId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing } = await supabase
    .from('waitlists')
    .select('business_id')
    .eq('id', waitlistId)
    .maybeSingle()

  if (!existing || existing.business_id !== businessId) {
    return { ok: false, error: 'Waitlist not found' }
  }

  const { error } = await supabase
    .from('waitlists')
    .update({
      google_refresh_token_encrypted: null,
      dedicated_calendar_id: null,
      calendar_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', waitlistId)

  if (error) return { ok: false, error: 'Could not unlink calendar.' }
  return { ok: true }
}
