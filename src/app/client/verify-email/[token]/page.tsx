import { CheckCircle, XCircle } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/db/supabase'

interface Props {
  params: Promise<{ token: string }>
}

async function verifyToken(token: string): Promise<'success' | 'already_verified' | 'invalid'> {
  const supabase = createServiceRoleClient()

  // Generated DB types are stale — email_verification_token / verified_at exist in schema but not in types yet
  const { data: entry, error } = await supabase
    .from('waitlist_entries')
    .select('id, status')
    // @ts-expect-error stale generated types
    .eq('email_verification_token', token)
    .maybeSingle()

  if (error || !entry) return 'invalid'
  if (entry.status === 'active') return 'already_verified'
  if (entry.status !== 'pending_verification') return 'invalid'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types are stale; verified_at/email_verification_token exist in schema
  const updatePayload: any = {
    status: 'active',
    verified_at: new Date().toISOString(),
    email_verification_token: null,
    updated_at: new Date().toISOString(),
  }
  const { error: updateError } = await supabase
    .from('waitlist_entries')
    .update(updatePayload)
    .eq('id', entry.id)
    .eq('status', 'pending_verification')

  return updateError ? 'invalid' : 'success'
}

export default async function VerifyEmailPage({ params }: Props) {
  const { token } = await params
  const result = await verifyToken(token)
  const isSuccess = result === 'success' || result === 'already_verified'

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-8">
          {isSuccess ? (
            <>
              <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-400" />
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Email Verified</h1>
              <p className="text-sm text-slate-400 mb-6">
                {result === 'already_verified'
                  ? "Your email was already verified. You're on the waitlist!"
                  : "You're on the waitlist! We'll notify you when a slot opens up."}
              </p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7 text-red-400" />
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Invalid Link</h1>
              <p className="text-sm text-slate-400 mb-6">
                This verification link is invalid or has already been used.
              </p>
            </>
          )}
          <a href="/" className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
            Return home
          </a>
        </div>
      </div>
    </main>
  )
}
