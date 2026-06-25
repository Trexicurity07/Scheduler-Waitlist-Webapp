### Task 3: Refresh Token Encryption Module

**Files:**
- Create: `src/lib/crypto/encrypt.ts`
- Test: `src/lib/crypto/encrypt.test.ts`

**Interfaces:**
- Consumes: `process.env.REFRESH_TOKEN_ENCRYPTION_KEY` (32-byte key, base64-encoded).
- Produces: `encrypt(plaintext: string): string`, `decrypt(ciphertext: string): string` — used by the OAuth callback (Task 10) and `GoogleCalendarProvider` construction wherever a stored refresh token is read.

- [ ] **Step 1: Write the failing tests**

`src/lib/crypto/encrypt.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { randomBytes } from 'node:crypto'

beforeAll(() => {
  process.env.REFRESH_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

import { encrypt, decrypt } from './encrypt'

describe('encrypt/decrypt', () => {
  it('round-trips a plaintext string', () => {
    const plaintext = 'super-secret-refresh-token'
    const ciphertext = encrypt(plaintext)
    expect(decrypt(ciphertext)).toBe(plaintext)
  })

  it('produces different ciphertext for the same plaintext on each call', () => {
    const a = encrypt('same-input')
    const b = encrypt('same-input')
    expect(a).not.toBe(b)
  })

  it('throws when ciphertext has been tampered with', () => {
    const ciphertext = encrypt('tamper-test')
    const tampered = ciphertext.slice(0, -4) + 'abcd'
    expect(() => decrypt(tampered)).toThrow()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- encrypt.test.ts`
Expected: FAIL — `src/lib/crypto/encrypt.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/crypto/encrypt.ts`**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function getKey(): Buffer {
  const key = process.env.REFRESH_TOKEN_ENCRYPTION_KEY
  if (!key) {
    throw new Error('REFRESH_TOKEN_ENCRYPTION_KEY is not set')
  }
  const buffer = Buffer.from(key, 'base64')
  if (buffer.length !== 32) {
    throw new Error('REFRESH_TOKEN_ENCRYPTION_KEY must decode to 32 bytes')
  }
  return buffer
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':')
}

export function decrypt(payload: string): string {
  const [ivB64, authTagB64, ciphertextB64] = payload.split(':')
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Malformed encrypted payload')
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ])
  return plaintext.toString('utf8')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- encrypt.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/crypto
git commit -m "feat: add AES-256-GCM refresh token encryption module"
```

---

