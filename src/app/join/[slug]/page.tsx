import { getCurrentClient } from '@/lib/client-auth/get-current-client'
import ApplyForm from './apply-form'

export default async function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { supabase, profile } = await getCurrentClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, business_type, whatsapp_number')
    .eq('public_slug', slug)
    .maybeSingle()

  if (!business) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-semibold text-white mb-2">Business not found</h1>
          <p className="text-sm text-slate-400">This waitlist link is no longer active.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0f172a] py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Join the waitlist</h1>
          <p className="text-base font-semibold text-slate-300">{business.name}</p>
          {business.business_type && (
            <p className="text-sm text-slate-500">{business.business_type}</p>
          )}
        </div>

        <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-4 mb-5">
          <p className="text-xs text-slate-500 mb-1">Applying as</p>
          <p className="text-sm text-white font-medium">{profile.name} · {profile.email}</p>
        </div>

        <ApplyForm slug={slug} />
      </div>
    </main>
  )
}
