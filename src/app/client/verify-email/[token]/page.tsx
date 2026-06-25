import { createServiceRoleClient } from '@/lib/db/supabase'
import { verifyClientEmail } from '@/lib/client-auth/verify-client-email'
import Link from 'next/link'

export default async function ClientVerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceRoleClient()
  const result = await verifyClientEmail(supabase, token)

  if (!result.ok) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Verification failed</h1>
        <p>{result.error}</p>
        <Link href="/client/signup">Back to signup</Link>
      </main>
    )
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Email verified</h1>
      <p>Your account is now active.</p>
      <Link href="/client/login">Log in</Link>
    </main>
  )
}
