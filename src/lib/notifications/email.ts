import { Resend } from 'resend'

function getClient(): Resend {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendVerificationEmail(
  to: string,
  params: { businessName: string; verifyUrl: string; expiryHours: number }
): Promise<void> {
  await getClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Confirm your spot on ${params.businessName}'s waitlist`,
    html: `<p>Click below to confirm your email and join the waitlist for ${params.businessName}.</p>
<p><a href="${params.verifyUrl}">Confirm my email</a></p>
<p>This link expires in ${params.expiryHours} hours. If you don't confirm, your signup will be removed automatically.</p>`,
  })
}

export async function sendSlotOfferEmail(
  to: string,
  params: {
    businessName: string
    slotDescription: string
    confirmUrl: string
    declineUrl: string
    whatsappLink: string
  }
): Promise<void> {
  await getClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `A spot opened up at ${params.businessName}`,
    html: `<p>A slot just opened up: <strong>${params.slotDescription}</strong>.</p>
<p><a href="${params.confirmUrl}">Confirm this slot</a> | <a href="${params.declineUrl}">Decline</a></p>
<p>Prefer WhatsApp? <a href="${params.whatsappLink}">Message ${params.businessName} directly</a>.</p>`,
  })
}

export async function sendOwnerActivityEmail(
  to: string,
  params: { businessName: string; action: 'added' | 'removed'; whatsappLink: string }
): Promise<void> {
  const actionText = params.action === 'added' ? 'added you to' : 'removed you from'
  await getClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Update from ${params.businessName}`,
    html: `<p>${params.businessName} has ${actionText} their waitlist.</p>
<p>Questions? <a href="${params.whatsappLink}">Message them on WhatsApp</a>.</p>`,
  })
}

export async function sendExpiryEmail(
  to: string,
  params: { businessName: string; whatsappLink: string }
): Promise<void> {
  await getClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Your waitlist spot with ${params.businessName} has expired`,
    html: `<p>Your 14-day waitlist spot with ${params.businessName} has expired. You can sign up again any time.</p>
<p><a href="${params.whatsappLink}">Message ${params.businessName} on WhatsApp</a> if you have questions.</p>`,
  })
}

export async function sendSlotGoneEmail(
  to: string,
  params: { businessName: string; whatsappLink: string }
): Promise<void> {
  await getClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `That slot at ${params.businessName} is no longer available`,
    html: `<p>The slot we offered you at ${params.businessName} was just filled another way. You're still on the waitlist and will be notified of the next opening that matches your preferences.</p>
<p><a href="${params.whatsappLink}">Message ${params.businessName} on WhatsApp</a> if you have questions.</p>`,
  })
}

export async function sendCalendarDisconnectedEmail(
  to: string,
  params: { businessName: string; reconnectUrl: string }
): Promise<void> {
  await getClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Action needed: reconnect your calendar for ${params.businessName}`,
    html: `<p>We lost access to your Google Calendar connection for ${params.businessName}, so cancellation detection and waitlist auto-fill are paused.</p>
<p><a href="${params.reconnectUrl}">Log in and reconnect your calendar</a> to resume.</p>`,
  })
}
