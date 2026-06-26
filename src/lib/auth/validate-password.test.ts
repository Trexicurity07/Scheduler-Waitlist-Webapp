import { describe, it, expect } from 'vitest'
import { passwordSchema } from './validate-password'

describe('passwordSchema', () => {
  it('accepts a valid password with upper, lower, and number', () => {
    expect(passwordSchema.parse('Abcd1234')).toBe('Abcd1234')
  })

  it('accepts a password with allowed symbols', () => {
    expect(passwordSchema.parse('Abcd1!@#')).toBe('Abcd1!@#')
  })

  it('rejects passwords shorter than 8 characters', () => {
    expect(() => passwordSchema.parse('Abc123')).toThrow()
  })

  it('rejects passwords longer than 72 characters', () => {
    expect(() => passwordSchema.parse(`A1${'a'.repeat(71)}`)).toThrow()
  })

  it('rejects passwords with no uppercase letter', () => {
    expect(() => passwordSchema.parse('abcd1234')).toThrow()
  })

  it('rejects passwords with no lowercase letter', () => {
    expect(() => passwordSchema.parse('ABCD1234')).toThrow()
  })

  it('rejects passwords with no numbers', () => {
    expect(() => passwordSchema.parse('Abcdefgh')).toThrow()
  })

  it('rejects passwords with spaces', () => {
    expect(() => passwordSchema.parse('Abcd 123')).toThrow()
  })

  it('rejects passwords with non-ASCII characters', () => {
    expect(() => passwordSchema.parse('Abcd123é')).toThrow()
  })
})
