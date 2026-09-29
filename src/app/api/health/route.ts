import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from('businesses').select('id').limit(1)
    if (error) throw error
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
