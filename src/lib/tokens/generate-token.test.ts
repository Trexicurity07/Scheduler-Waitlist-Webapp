import { describe, it, expect } from 'vitest'
import { generateToken } from './generate-token'

describe('generateToken', () => {
  it('returns a base64url string with no padding or unsafe characters', () => {
    const token = generateToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('returns a different value on each call', () => {
    expect(generateToken()).not.toBe(generateToken())
  })

  it('returns at least 32 characters of entropy', () => {
    expect(generateToken().length).toBeGreaterThanOrEqual(32)
  })
})
