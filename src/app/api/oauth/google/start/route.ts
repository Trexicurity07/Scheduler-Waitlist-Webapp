import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { encrypt } from '@/lib/crypto/encrypt'

export async function GET(request: NextRequest) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  )
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  })
  const response = NextResponse.redirect(url)

  const context = request.nextUrl.searchParams.get('context')
  const nodeId = request.nextUrl.searchParams.get('nodeId')
  const waitlistId = request.nextUrl.searchParams.get('waitlistId')

  if (context) {
    const ctx = JSON.stringify({ context, nodeId, waitlistId })
    response.cookies.set('pending_connect_ctx', encrypt(ctx), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })
  }

  return response
}
