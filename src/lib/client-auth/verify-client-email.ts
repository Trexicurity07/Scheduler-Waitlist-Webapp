import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function verifyClientEmail(
  supabase: SupabaseClient<Database>,
  token: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: profile } = await supabase
    .from('client_profiles')
    .select('user_id, verified_at')
    .eq('email_verification_token', token)
    .maybeSingle()

  if (!profile) return { ok: false, error: 'Invalid or expired verification link.' }
  if (profile.verified_at) return { ok: false, error: 'Email already verified.' }

  const { error } = await supabase
    .from('client_profiles')
    .update({ verified_at: new Date().toISOString(), email_verification_token: null })
    .eq('email_verification_token', token)

  if (error) return { ok: false, error: 'Could not verify email. Please try again.' }
  return { ok: true }
}
