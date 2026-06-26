import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import { updateBusinessSettings } from '@/lib/dashboard/manage-waitlist'

const settingsSchema = z.object({
  batchSize: z.number().int().min(1),
  batchIntervalMinutes: z.number().int().min(1),
  minNoticeHours: z.number().int().min(1),
  minConfirmLeadHours: z.number().int().min(0),
})

export async function PATCH(request: Request): Promise<NextResponse> {
  const parsed = settingsSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', userData.user.id)
    .single()
  if (!business) {
    return NextResponse.json({ ok: false, error: 'Business not found' }, { status: 404 })
  }

  const result = await updateBusinessSettings(supabase, business.id, parsed.data)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
