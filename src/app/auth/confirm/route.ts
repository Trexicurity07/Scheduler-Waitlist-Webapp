import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/db/supabase'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/?error=missing_code', request.url))
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/?error=verification_failed', request.url))
  }

  // Sign the user out immediately — they should log in manually from the home page
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/', request.url))
}
