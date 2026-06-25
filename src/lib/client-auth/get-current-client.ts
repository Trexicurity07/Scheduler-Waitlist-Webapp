import type { SupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import type { Database } from '@/types/database'

export type ClientProfile = {
  user_id: string
  name: string
  email: string
  phone: string
  verified_at: string
}

export async function getCurrentClient(): Promise<{
  supabase: SupabaseClient<Database>
  profile: ClientProfile
}> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/client/login')

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('user_id, name, email, phone, verified_at')
    .eq('user_id', user.id)
    .single()

  if (!profile || !profile.verified_at) redirect('/client/login')

  return { supabase, profile: profile as ClientProfile }
}
