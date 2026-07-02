import { Resend } from 'resend'
import nodemailer from 'nodemailer'

interface MailPayload {
  to: string
  subject: string
  html: string
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@slotfill.local'

async function sendHtml({ to, subject, html }: MailPayload): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    const transport = nodemailer.createTransport({ host: 'localhost', port: 54400, secure: false })
    await transport.sendMail({ from: FROM, to, subject, html })
    return
  }
  await new Resend(process.env.RESEND_API_KEY).emails.send({ from: FROM, to, subject, html })
}

export async function sendVerificationEmail(
  to: string,
  params: { businessName: string; verifyUrl: string; expiryHours: number }
): Promise<void> {
  await sendHtml({
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
  await sendHtml({
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
  await sendHtml({
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
  await sendHtml({
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
  await sendHtml({
    to,
    subject: `That slot at ${params.businessName} is no longer available`,
    html: `<p>The slot we offered you at ${params.businessName} was just filled another way. You're still on the waitlist and will be notified of the next opening that matches your preferences.</p>
<p><a href="${params.whatsappLink}">Message ${params.businessName} on WhatsApp</a> if you have questions.</p>`,
  })
}

export async function sendDeclineAckEmail(
  to: string,
  params: { businessName: string }
): Promise<void> {
  await sendHtml({
    to,
    subject: `Your slot decline was received`,
    html: `<p>We've received your decline. The slot has been released back to ${params.businessName}, and you remain on the waitlist for future openings.</p>`,
  })
}

export async function sendSignupCodeEmail(
  to: string,
  params: { code: string }
): Promise<void> {
  await sendHtml({
    to,
    subject: 'Your SlotFill verification code',
    html: `<p>Your verification code is:</p>
<p style="font-size:2em;font-weight:bold;letter-spacing:0.25em">${params.code}</p>
<p>This code expires in 15 minutes. Do not share it with anyone.</p>
<p>If you didn't create a SlotFill account, you can safely ignore this email.</p>`,
  })
}

export async function sendPasswordResetEmail(
  to: string,
  params: { code: string; expiryMinutes: number }
): Promise<void> {
  await sendHtml({
    to,
    subject: 'Your SlotFill password reset code',
    html: `<p>Your password reset code is:</p>
<p style="font-size:2em;font-weight:bold;letter-spacing:0.25em">${params.code}</p>
<p>This code expires in ${params.expiryMinutes} minutes. Do not share it with anyone.</p>
<p>If you did not request a password reset, you can safely ignore this email.</p>`,
  })
}

export async function sendPasswordChangedEmail(to: string): Promise<void> {
  await sendHtml({
    to,
    subject: 'Your SlotFill password was changed',
    html: `<p>Your SlotFill password was just changed. If this wasn't you, please contact us immediately.</p>`,
  })
}

export async function sendCalendarDisconnectedEmail(
  to: string,
  params: { businessName: string; reconnectUrl: string }
): Promise<void> {
  await sendHtml({
    to,
    subject: `Action needed: reconnect your calendar for ${params.businessName}`,
    html: `<p>We lost access to your Google Calendar connection for ${params.businessName}, so cancellation detection and waitlist auto-fill are paused.</p>
<p><a href="${params.reconnectUrl}">Log in and reconnect your calendar</a> to resume.</p>`,
  })
}
