import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'
import { updateLocation, deleteLocation } from '@/lib/dashboard/manage-locations'

const updateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  description: z.string().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const parsed = updateLocationSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 })
  }

  const { id } = await params
  const { supabase, business } = await getCurrentBusiness()
  if (!business) {
    return NextResponse.json({ ok: false, error: 'Business not found' }, { status: 401 })
  }

  const result = await updateLocation(supabase, business.id, id, parsed.data)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params
  const { supabase, business } = await getCurrentBusiness()
  if (!business) {
    return NextResponse.json({ ok: false, error: 'Business not found' }, { status: 401 })
  }

  const result = await deleteLocation(supabase, business.id, id)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
