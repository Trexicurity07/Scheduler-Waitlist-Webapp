import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/db/supabase'

export async function POST() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('sf_client_session')?.value

  if (sessionToken) {
    await createServiceRoleClient()
      .from('client_profiles')
      .update({ session_token: null, session_expires_at: null })
      .eq('session_token', sessionToken)
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('sf_client_session', '', { maxAge: 0, path: '/' })
  return response
}
