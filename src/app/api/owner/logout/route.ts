import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'

export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('sf_owner_session')?.value

  if (sessionToken) {
    const supabase = createServiceRoleClient()
    await supabase
      .from('owner_profiles')
      .update({ session_token: null, session_expires_at: null })
      .eq('session_token', sessionToken)
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('sf_owner_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
