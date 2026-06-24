import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSend = vi.fn()

vi.mock('resend', () => {
  const Resend = vi.fn(function() {
    return {
      emails: { send: mockSend },
    }
  })
  return { Resend }
})

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
