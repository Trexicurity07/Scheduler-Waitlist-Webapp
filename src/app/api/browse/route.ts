import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const supabase = createServiceRoleClient()

  const base = supabase
    .from('businesses')
    .select('id, name, business_type, public_slug')
    .limit(20)

  const { data, error } = await (q.trim()
    ? base.ilike('name', `%${q.trim()}%`)
    : base.order('name'))

  if (error) return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
  return NextResponse.json(data ?? [])
}
