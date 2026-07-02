import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { claimBusinesses } from '@/lib/cron/claim-businesses'
import { processBusiness } from '@/lib/cron/process-business'
import { cleanupExpiredPendingSignups } from '@/lib/cron/pending-signup-cleanup'

export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const now = new Date()

  await cleanupExpiredPendingSignups(supabase)

  const claimed = await claimBusinesses(supabase, now)

  for (const business of claimed) {
    await processBusiness(supabase, business, now)
  }

  return NextResponse.json({ processed: claimed.length })
}
