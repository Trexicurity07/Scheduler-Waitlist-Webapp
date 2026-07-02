import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/crypto/encrypt'

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get('pending_connect')?.value
  if (!cookie) {
    return NextResponse.json({ ok: false, error: 'No pending calendar' }, { status: 404 })
  }

  const payload = JSON.parse(decrypt(cookie)) as Record<string, unknown>
  const { refreshToken: _omit, ...safe } = payload
  return NextResponse.json({ ok: true, ...safe })
}
