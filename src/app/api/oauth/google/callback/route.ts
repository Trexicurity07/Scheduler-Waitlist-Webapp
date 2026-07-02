import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { encrypt, decrypt } from '@/lib/crypto/encrypt'
import { GoogleCalendarProvider } from '@/lib/calendar/google-provider'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/connect?error=missing_code', request.url))
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  )
  const { tokens } = await oauth2Client.getToken(code)
  if (!tokens.refresh_token) {
    return NextResponse.redirect(new URL('/connect?error=no_refresh_token', request.url))
  }

  const provider = new GoogleCalendarProvider(tokens.refresh_token)
  const calendars = await provider.listCalendars()

  // Read and merge pending_connect_ctx if present
  let ctx: { context?: string; nodeId?: string; waitlistId?: string } = {}
  const ctxCookie = request.cookies.get('pending_connect_ctx')?.value
  if (ctxCookie) {
    try { ctx = JSON.parse(decrypt(ctxCookie)) } catch {}
  }

  const payload = JSON.stringify({ refreshToken: tokens.refresh_token, calendars, ...ctx })
  const encrypted = encrypt(payload)

  // Choose redirect based on context
  let redirectUrl: URL
  if (ctx.context === 'relink' && ctx.waitlistId) {
    redirectUrl = new URL(`/waitlist/${ctx.waitlistId}?calendarConnected=1`, request.url)
  } else if (ctx.context === 'new-waitlist') {
    redirectUrl = new URL('/waitlist?calendarConnected=1', request.url)
  } else {
    redirectUrl = new URL('/connect/setup', request.url)
  }

  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set('pending_connect', encrypted, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  response.cookies.delete('pending_connect_ctx')
  return response
}
