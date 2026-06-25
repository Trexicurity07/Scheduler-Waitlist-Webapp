### Task 5: WhatsApp Deep Link Builder

**Files:**
- Create: `src/lib/notifications/whatsapp.ts`
- Test: `src/lib/notifications/whatsapp.test.ts`

**Interfaces:**
- Produces: `buildWhatsAppLink(phoneNumber: string, message: string): string` — used by Task 12 (email templates that embed the link) wherever a business's `whatsapp_number` needs to become a clickable `wa.me` link.

- [ ] **Step 1: Write the failing tests**

`src/lib/notifications/whatsapp.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- whatsapp.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/lib/notifications/whatsapp.ts`**

```ts
export function buildWhatsAppLink(phoneNumber: string, message: string): string {
  const digitsOnly = phoneNumber.replace(/\D/g, '')
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- whatsapp.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications/whatsapp.ts src/lib/notifications/whatsapp.test.ts
git commit -m "feat: add wa.me deep link builder"
```

---

