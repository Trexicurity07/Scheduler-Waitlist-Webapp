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
