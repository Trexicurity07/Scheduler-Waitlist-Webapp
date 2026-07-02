import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database } from '@/types/database'
import { createServiceRoleClient } from '@/lib/db/supabase'

type SupabaseServiceClient = ReturnType<typeof createServiceRoleClient>
type OwnerProfile = Database['public']['Tables']['owner_profiles']['Row']
type Business = Database['public']['Tables']['businesses']['Row']

export async function getCurrentBusiness(): Promise<{
  supabase: SupabaseServiceClient
  owner: OwnerProfile
  business: Business | null
}> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('sf_owner_session')?.value
  if (!sessionToken) redirect('/login')

  const supabase = createServiceRoleClient()

  const { data: owner } = await supabase
    .from('owner_profiles')
    .select('*')
    .eq('session_token', sessionToken)
    .gt('session_expires_at', new Date().toISOString())
    .maybeSingle()

  if (!owner) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_user_id', owner.auth_user_id)
    .maybeSingle()

  return { supabase, owner, business: business ?? null }
}
