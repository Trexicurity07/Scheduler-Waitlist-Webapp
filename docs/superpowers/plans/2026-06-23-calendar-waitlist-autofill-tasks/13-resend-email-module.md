### Task 13: Resend Email Module

**Files:**
- Create: `src/lib/notifications/email.ts`
- Test: `src/lib/notifications/email.test.ts`

**Interfaces:**
- Consumes: `process.env.RESEND_API_KEY`, `process.env.RESEND_FROM_EMAIL`, `buildWhatsAppLink()` (Task 5, called by whichever code builds the `whatsappLink` param before calling these).
- Produces:
  - `sendVerificationEmail(to: string, params: { businessName: string; verifyUrl: string; expiryHours: number }): Promise<void>`
  - `sendSlotOfferEmail(to: string, params: { businessName: string; slotDescription: string; confirmUrl: string; declineUrl: string; whatsappLink: string }): Promise<void>`
  - `sendOwnerActivityEmail(to: string, params: { businessName: string; action: 'added' | 'removed'; whatsappLink: string }): Promise<void>`
  - `sendExpiryEmail(to: string, params: { businessName: string; whatsappLink: string }): Promise<void>`
  - `sendSlotGoneEmail(to: string, params: { businessName: string; whatsappLink: string }): Promise<void>` — courtesy notice when a pending offer is superseded (slot filled another way before the client responded); does not create its own `notifications` row, since the existing `slot_offer` notification's status flip to `superseded` is itself the log entry.
  - `sendCalendarDisconnectedEmail(to: string, params: { businessName: string; reconnectUrl: string }): Promise<void>` — sent to the **business owner** (not a client) when their Google OAuth grant is revoked/expired; has no associated `waitlist_entry_id`, so it is never logged in `notifications` (that table's `waitlist_entry_id` column is `not null`) — it's a standalone account-level email.
  - Consumed by Task 19 (verification email), Task 16 (slot offer batches + stale-offer resolution), Task 23 (owner manual add/remove), Task 17 (expiry housekeeping), Task 18 (`processBusiness` orchestrator, on Google auth failure).

- [ ] **Step 1: Write the failing tests**

`src/lib/notifications/email.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSend = vi.fn()

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

beforeEach(() => {
  mockSend.mockReset()
  process.env.RESEND_API_KEY = 'fake-key'
  process.env.RESEND_FROM_EMAIL = 'notifications@example.com'
})

import {
  sendVerificationEmail,
  sendSlotOfferEmail,
  sendOwnerActivityEmail,
  sendExpiryEmail,
  sendSlotGoneEmail,
  sendCalendarDisconnectedEmail,
} from './email'

describe('email module', () => {
  it('sends a verification email with the verify link and expiry hours', async () => {
    await sendVerificationEmail('client@example.com', {
      businessName: 'Jane Doe Salon',
      verifyUrl: 'https://example.com/verify-email/abc123',
      expiryHours: 48,
    })
    const call = mockSend.mock.calls[0][0]
    expect(call.to).toBe('client@example.com')
    expect(call.from).toBe('notifications@example.com')
    expect(call.html).toContain('https://example.com/verify-email/abc123')
    expect(call.html).toContain('48 hours')
  })

  it('sends a slot offer email with confirm, decline, and whatsapp links', async () => {
    await sendSlotOfferEmail('client@example.com', {
      businessName: 'Jane Doe Salon',
      slotDescription: 'Tuesday June 23 at 2:00 PM',
      confirmUrl: 'https://example.com/confirm/tok1',
      declineUrl: 'https://example.com/confirm/tok1?decline=true',
      whatsappLink: 'https://wa.me/15551234567?text=Hi',
    })
    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('https://example.com/confirm/tok1')
    expect(call.html).toContain('https://wa.me/15551234567?text=Hi')
    expect(call.html).toContain('Tuesday June 23 at 2:00 PM')
  })

  it('sends an owner activity email reflecting the added action', async () => {
    await sendOwnerActivityEmail('client@example.com', {
      businessName: 'Jane Doe Salon',
      action: 'added',
      whatsappLink: 'https://wa.me/15551234567?text=Hi',
    })
    expect(mockSend.mock.calls[0][0].html).toContain('added you to')
  })

  it('sends an owner activity email reflecting the removed action', async () => {
    await sendOwnerActivityEmail('client@example.com', {
      businessName: 'Jane Doe Salon',
      action: 'removed',
      whatsappLink: 'https://wa.me/15551234567?text=Hi',
    })
    expect(mockSend.mock.calls[0][0].html).toContain('removed you from')
  })

  it('sends an expiry email', async () => {
    await sendExpiryEmail('client@example.com', {
      businessName: 'Jane Doe Salon',
      whatsappLink: 'https://wa.me/15551234567?text=Hi',
    })
    expect(mockSend.mock.calls[0][0].subject).toContain('expired')
  })

  it('sends a slot-gone courtesy email', async () => {
    await sendSlotGoneEmail('client@example.com', {
      businessName: 'Jane Doe Salon',
      whatsappLink: 'https://wa.me/15551234567?text=Hi',
    })
    const call = mockSend.mock.calls[0][0]
    expect(call.subject).toContain('no longer available')
    expect(call.html).toContain('https://wa.me/15551234567?text=Hi')
  })

  it('sends a calendar-disconnected email to the owner with a reconnect link', async () => {
    await sendCalendarDisconnectedEmail('owner@example.com', {
      businessName: 'Jane Doe Salon',
      reconnectUrl: 'https://example.com/login',
    })
    const call = mockSend.mock.calls[0][0]
    expect(call.to).toBe('owner@example.com')
    expect(call.html).toContain('https://example.com/login')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- email.test.ts`
Expected: FAIL — `src/lib/notifications/email.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/notifications/email.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- email.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications/email.ts src/lib/notifications/email.test.ts
git commit -m "feat: add Resend email module with all notification templates"
```

---

