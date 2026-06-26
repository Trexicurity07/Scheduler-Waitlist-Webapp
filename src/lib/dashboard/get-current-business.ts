import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createServerSupabaseClient } from '@/lib/db/supabase'

export async function getCurrentBusiness(): Promise<{
  supabase: SupabaseClient<Database>
  business: Database['public']['Tables']['businesses']['Row']
}> {
  const supabase = await createServerSupabaseClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    redirect('/login')
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_user_id', userData.user.id)
    .single()

  if (!business) {
    redirect('/connect')
  }

  return { supabase, business }
}
