import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import { addWaitlistEntry } from '@/lib/dashboard/manage-waitlist'

const addEntrySchema = z.object({
  identifier: z.string().min(1),
  timeWindows: z
    .array(
      z.object({
        days: z.array(z.number().int().min(0).max(6)).min(1),
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
      })
    )
    .min(1),
})

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = addEntrySchema.safeParse(await request.json())
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

  const result = await addWaitlistEntry(supabase, business.id, parsed.data)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
