import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'
import { createLocation } from '@/lib/dashboard/manage-locations'

const createLocationSchema = z.object({
  parentId: z.string().nullable(),
  type: z.enum(['location', 'folder']),
  name: z.string().min(1),
  address: z.string().optional(),
  description: z.string().optional(),
})

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = createLocationSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 })
  }

  const { supabase, business } = await getCurrentBusiness()
  if (!business) {
    return NextResponse.json({ ok: false, error: 'Business not found' }, { status: 401 })
  }

  const result = await createLocation(supabase, business.id, parsed.data)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
