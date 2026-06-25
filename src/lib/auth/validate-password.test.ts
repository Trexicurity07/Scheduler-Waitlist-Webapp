import { describe, it, expect } from 'vitest'
import { passwordSchema } from './validate-password'

describe('passwordSchema', () => {
  it('accepts a password with letters and a number', () => {
    expect(passwordSchema.parse('abcd1234')).toBe('abcd1234')
  })

  it('rejects passwords shorter than 8 characters', () => {
    expect(() => passwordSchema.parse('abc123')).toThrow()
  })

  it('rejects passwords longer than 72 characters', () => {
    expect(() => passwordSchema.parse(`a1${'a'.repeat(71)}`)).toThrow()
  })

  it('rejects passwords with no letters', () => {
    expect(() => passwordSchema.parse('12345678')).toThrow()
  })

  it('rejects passwords with no numbers', () => {
    expect(() => passwordSchema.parse('abcdefgh')).toThrow()
  })
})
