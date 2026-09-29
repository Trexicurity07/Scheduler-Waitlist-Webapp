import { createServiceRoleClient } from '@/lib/db/supabase'
import { getOfferDetails, declineOffer, type OfferFailureReason } from '@/lib/confirm/confirm-offer'
import { ConfirmForm } from './confirm-form'

const REASON_MESSAGES: Record<OfferFailureReason, string> = {
  invalid: 'This link is invalid.',
  already_confirmed: "You've already confirmed this slot.",
  already_declined: "You've already declined this slot.",
  expired: 'This offer has expired.',
  gone: 'This slot is no longer available.',
}

function StatusPage({ icon, iconClass, title, message }: { icon: string; iconClass: string; title: string; message: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-8 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${iconClass}`}>
            <span className="text-xl">{icon}</span>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">{title}</h1>
          <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
        </div>
      </div>
    </main>
  )
}

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ decline?: string }>
}) {
  const { token } = await params
  const { decline } = await searchParams
  const supabase = createServiceRoleClient()

  if (decline === 'true') {
    const result = await declineOffer(supabase, token)
    return (
      <StatusPage
        icon={result.ok ? '✓' : '✕'}
        iconClass={result.ok ? 'bg-slate-500/10 border border-slate-500/20' : 'bg-red-500/10 border border-red-500/20'}
        title={result.ok ? 'Slot declined' : 'Unable to process'}
        message={result.ok
          ? "Thanks for letting us know — we'll offer it to the next person on the list."
          : REASON_MESSAGES[result.reason]}
      />
    )
  }

  const result = await getOfferDetails(supabase, token)
  if (!result.ok) {
    return (
      <StatusPage
        icon="✕"
        iconClass="bg-red-500/10 border border-red-500/20"
        title="Unable to process"
        message={REASON_MESSAGES[result.reason]}
      />
    )
  }

  return <ConfirmForm token={token} details={result.details} />
}
