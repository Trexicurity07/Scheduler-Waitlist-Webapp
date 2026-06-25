import { createServiceRoleClient } from '@/lib/db/supabase'
import { verifyEmail } from '@/lib/waitlist/verify-email'

const REASON_MESSAGES: Record<'expired' | 'already_used' | 'invalid', string> = {
  expired: 'This verification link has expired. Please sign up again.',
  already_used: 'This verification link has already been used.',
  invalid: 'This verification link is invalid.',
}

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceRoleClient()
  const result = await verifyEmail(supabase, token)

  if (!result.ok) {
    return (
      <main>
        <h1>Verification failed</h1>
        <p>{REASON_MESSAGES[result.reason]}</p>
      </main>
    )
  }

  return (
    <main>
      <h1>You&apos;re on the waitlist for {result.businessName}</h1>
      <p>We&apos;ll email and WhatsApp you the moment a matching slot opens up.</p>
    </main>
  )
}
