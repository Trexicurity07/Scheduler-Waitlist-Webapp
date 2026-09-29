import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { encrypt } from '../src/lib/crypto/encrypt'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const OWNER_EMAIL = 'demo@schedulerwaitlist.com'
const CLIENT_EMAIL = 'democlient@schedulerwaitlist.com'
const DEMO_PASSWORD = 'Demo1234!'

async function seed() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── 1. Demo owner (Supabase Auth) ──────────────────────────────────────────
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) throw listErr

  let ownerId: string
  const existingOwner = users.find(u => u.email === OWNER_EMAIL)
  if (existingOwner) {
    console.log('Demo owner already exists:', existingOwner.id)
    ownerId = existingOwner.id
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: OWNER_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    })
    if (error) throw error
    ownerId = data.user.id
    console.log('Created demo owner:', ownerId)
  }

  // ── 2. Demo business ───────────────────────────────────────────────────────
  const placeholderToken = encrypt('placeholder-refresh-token')

  const { data: bizRow, error: bizErr } = await supabase
    .from('businesses')
    .upsert(
      {
        owner_user_id: ownerId,
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
    .select('id')
    .single()
  if (bizErr) throw bizErr
  const businessId = bizRow.id
  console.log('Demo business upserted:', businessId)

  // ── 3. Demo client (custom auth via client_profiles) ───────────────────────
  const { data: existingProfile } = await supabase
    .from('client_profiles')
    .select('user_id')
    .eq('email', CLIENT_EMAIL)
    .maybeSingle()

  let clientProfileId: string
  if (existingProfile) {
    clientProfileId = existingProfile.user_id
    console.log('Demo client profile already exists:', clientProfileId)
  } else {
    clientProfileId = randomUUID()
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
    const { error: profileErr } = await supabase.from('client_profiles').insert({
      user_id: clientProfileId,
      email: CLIENT_EMAIL,
      name: 'Demo Client',
      phone: '+441234567890',
      password_hash: passwordHash,
    })
    if (profileErr) throw profileErr
    console.log('Created demo client profile:', clientProfileId)
  }

  // ── 4. Link client to demo business (clients join table) ───────────────────
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', clientProfileId)
    .eq('business_id', businessId)
    .maybeSingle()

  let clientId: string
  if (existingClient) {
    clientId = existingClient.id
    console.log('Demo client row already exists:', clientId)
  } else {
    const { data: newClient, error: clientErr } = await supabase
      .from('clients')
      .insert({ user_id: clientProfileId, business_id: businessId })
      .select('id')
      .single()
    if (clientErr) throw clientErr
    clientId = newClient.id
    console.log('Created demo client row:', clientId)
  }

  // ── 5. Active waitlist entry (Mon/Wed/Fri mornings) ────────────────────────
  const { data: existingEntry1 } = await supabase
    .from('waitlist_entries')
    .select('id')
    .eq('client_id', clientId)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .maybeSingle()

  let entry1Id: string
  if (existingEntry1) {
    entry1Id = existingEntry1.id
    console.log('Demo waitlist entry 1 already exists:', entry1Id)
  } else {
    const { data: e1, error: e1Err } = await supabase
      .from('waitlist_entries')
      .insert({
        business_id: businessId,
        client_id: clientId,
        time_windows: [
          { day: 'Monday', start: '09:00', end: '12:00' },
          { day: 'Wednesday', start: '10:00', end: '13:00' },
          { day: 'Friday', start: '09:00', end: '12:00' },
        ],
        status: 'active',
        verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()
    if (e1Err) throw e1Err
    entry1Id = e1.id
    console.log('Created demo waitlist entry 1:', entry1Id)
  }

  // ── 6. Second active entry (Tue/Thu afternoons) ────────────────────────────
  const { data: existingEntry2 } = await supabase
    .from('waitlist_entries')
    .select('id')
    .eq('client_id', clientId)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .neq('id', entry1Id)
    .maybeSingle()

  if (!existingEntry2) {
    const { error: e2Err } = await supabase.from('waitlist_entries').insert({
      business_id: businessId,
      client_id: clientId,
      time_windows: [
        { day: 'Tuesday', start: '14:00', end: '17:00' },
        { day: 'Thursday', start: '14:00', end: '18:00' },
      ],
      status: 'active',
      verified_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    })
    if (e2Err) throw e2Err
    console.log('Created demo waitlist entry 2')
  } else {
    console.log('Demo waitlist entry 2 already exists')
  }

  // ── 7. Pending slot offer notification ─────────────────────────────────────
  const { data: existingNotif } = await supabase
    .from('notifications')
    .select('id')
    .eq('waitlist_entry_id', entry1Id)
    .eq('type', 'slot_offer')
    .eq('status', 'sent')
    .maybeSingle()

  if (!existingNotif) {
    const { error: notifErr } = await supabase.from('notifications').insert({
      waitlist_entry_id: entry1Id,
      appointment_id: null,
      type: 'slot_offer',
      channel: 'email',
      status: 'sent',
      token: 'demo-offer-token-' + randomUUID(),
      batch_number: 1,
    })
    if (notifErr) throw notifErr
    console.log('Created demo slot offer notification')
  } else {
    console.log('Demo notification already exists')
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Demo credentials
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Owner  (dashboard):  ${OWNER_EMAIL} / ${DEMO_PASSWORD}
Client (waitlists):  ${CLIENT_EMAIL} / ${DEMO_PASSWORD}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
