import { createClient } from '@supabase/supabase-js'
import { encrypt } from '../src/lib/crypto/encrypt'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const DEMO_EMAIL = 'demo@schedulerwaitlist.com'
const DEMO_PASSWORD = 'Demo1234!'

async function seed() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Create or find the demo auth user
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) throw listErr

  let userId: string
  const existing = users.find(u => u.email === DEMO_EMAIL)

  if (existing) {
    console.log('Demo user already exists:', existing.id)
    userId = existing.id
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    })
    if (error) throw error
    userId = data.user.id
    console.log('Created demo user:', userId)
  }

  // 2. Upsert the businesses row
  const placeholderToken = encrypt('placeholder-refresh-token')

  const { error: bizErr } = await supabase.from('businesses').upsert(
    {
      owner_user_id: userId,
      name: 'Demo Wellness Studio',
      public_slug: 'demo-wellness',
      whatsapp_number: '+1234567890',
      timezone: 'Europe/London',
      calendar_provider: 'google',
      google_refresh_token_encrypted: placeholderToken,
      dedicated_calendar_id: 'demo_calendar_id',
      calendar_status: 'disconnected',
      batch_size: 3,
      batch_interval_minutes: 30,
      min_notice_hours: 24,
      min_confirm_lead_hours: 12,
    },
    { onConflict: 'owner_user_id' }
  )
  if (bizErr) throw bizErr

  console.log('Demo business upserted.')
  console.log(`\nDemo credentials:\n  Email:    ${DEMO_EMAIL}\n  Password: ${DEMO_PASSWORD}`)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
