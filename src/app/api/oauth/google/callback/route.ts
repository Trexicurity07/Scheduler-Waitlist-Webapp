import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { encrypt } from '@/lib/crypto/encrypt'
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

  const payload = JSON.stringify({ refreshToken: tokens.refresh_token, calendars })
  const encrypted = encrypt(payload)

  const response = NextResponse.redirect(new URL('/connect/setup', request.url))
  response.cookies.set('pending_connect', encrypted, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return response
}
