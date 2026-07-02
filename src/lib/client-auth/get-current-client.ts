import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/db/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type ClientProfile = {
  user_id: string
  name: string
  email: string
  phone: string
}

export async function getCurrentClient(): Promise<{
  supabase: SupabaseClient<Database>
  profile: ClientProfile
}> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('sf_client_session')?.value

  if (!sessionToken) redirect('/client/login')

  const supabase = createServiceRoleClient()
  const { data: profile } = await supabase
    .from('client_profiles')
    .select('user_id, name, email, phone')
    .eq('session_token', sessionToken)
    .gt('session_expires_at', new Date().toISOString())
    .maybeSingle()

  if (!profile) redirect('/client/login')

  return { supabase, profile: profile as ClientProfile }
}
