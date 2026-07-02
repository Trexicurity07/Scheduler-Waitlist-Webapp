import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/crypto/encrypt'
import { createServiceRoleClient } from '@/lib/db/supabase'
import ConnectSetupForm from './connect-setup-form'

export default async function ConnectSetupPage() {
  const cookieStore = await cookies()
  const pending = cookieStore.get('pending_connect')
  if (!pending) {
    redirect('/connect?error=expired')
  }

  const { calendars } = JSON.parse(decrypt(pending.value)) as {
    calendars: { id: string; summary: string; timezone: string }[]
  }

  let defaultBusinessName = ''
  const sessionToken = cookieStore.get('sf_owner_session')?.value
  if (sessionToken) {
    const supabase = createServiceRoleClient()
    const { data: owner } = await supabase
      .from('owner_profiles')
      .select('business_name')
      .eq('session_token', sessionToken)
      .gt('session_expires_at', new Date().toISOString())
      .maybeSingle()
    if (owner) defaultBusinessName = owner.business_name
  }

  return <ConnectSetupForm calendars={calendars} defaultBusinessName={defaultBusinessName} />
}
