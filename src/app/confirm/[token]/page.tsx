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
      <main>
        <h1>{result.ok ? 'Slot declined' : 'Unable to process'}</h1>
        <p>
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
      <main>
        <h1>Unable to process</h1>
        <p>{REASON_MESSAGES[result.reason]}</p>
      </main>
    )
  }

  return <ConfirmForm token={token} details={result.details} />
}
