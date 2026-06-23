import { describe, it, expect } from 'vitest'
import { buildWhatsAppLink } from './whatsapp'

describe('buildWhatsAppLink', () => {
  it('builds a wa.me link with digits-only phone number', () => {
    const link = buildWhatsAppLink('+1 (555) 123-4567', 'Hello')
    expect(link).toBe('https://wa.me/15551234567?text=Hello')
  })

  it('url-encodes special characters in the message', () => {
    const link = buildWhatsAppLink('15551234567', 'Slot available: 3pm & 4pm?')
    expect(link).toBe('https://wa.me/15551234567?text=Slot%20available%3A%203pm%20%26%204pm%3F')
  })

  it('strips all non-digit characters from the phone number', () => {
    const link = buildWhatsAppLink('+44 20-7946-0958', 'Hi')
    expect(link.startsWith('https://wa.me/442079460958?')).toBe(true)
  })
})
