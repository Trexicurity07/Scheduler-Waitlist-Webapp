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

const pageStyle = { maxWidth: '480px', margin: '6rem auto', padding: '0 1.5rem' }
const headingStyle = { fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.5rem' }
const textStyle = { color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6 as const, margin: 0 }

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
      <main style={pageStyle}>
        <h1 style={headingStyle}>{result.ok ? 'Slot declined' : 'Unable to process'}</h1>
        <p style={textStyle}>
          {result.ok
            ? "Thanks for letting us know — we'll offer it to the next person on the list."
            : REASON_MESSAGES[result.reason]}
        </p>
      </main>
    )
  }

  const result = await getOfferDetails(supabase, token)
  if (!result.ok) {
    return (
      <main style={pageStyle}>
        <h1 style={headingStyle}>Unable to process</h1>
        <p style={textStyle}>{REASON_MESSAGES[result.reason]}</p>
      </main>
    )
  }

  return <ConfirmForm token={token} details={result.details} />
}
