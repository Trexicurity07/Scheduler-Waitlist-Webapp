import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import { passwordSchema } from '@/lib/auth/validate-password'

const requestSchema = z.object({
  email: z.string().trim().email(),
  password: passwordSchema,
})

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signUp(parsed.data)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
