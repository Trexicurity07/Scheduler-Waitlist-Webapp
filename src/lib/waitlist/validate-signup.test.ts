import { describe, it, expect } from 'vitest'
import { nameSchema, emailSchema, phoneSchema } from './validate-signup'

describe('nameSchema', () => {
  it('accepts a normal name', () => {
    expect(nameSchema.parse('Alice Smith')).toBe('Alice Smith')
  })

  it('accepts names with apostrophes, hyphens, and accents', () => {
    expect(nameSchema.parse("Mary-Jane O'Brien")).toBe("Mary-Jane O'Brien")
    expect(nameSchema.parse('José')).toBe('José')
  })

  it('trims surrounding whitespace', () => {
    expect(nameSchema.parse('  Alice  ')).toBe('Alice')
  })

  it('rejects names shorter than 2 characters', () => {
    expect(() => nameSchema.parse('A')).toThrow()
  })

  it('rejects names longer than 60 characters', () => {
    expect(() => nameSchema.parse('A'.repeat(61))).toThrow()
  })

  it('rejects names with no letters', () => {
    expect(() => nameSchema.parse('12345')).toThrow()
  })

  it('rejects names containing digits or symbols', () => {
    expect(() => nameSchema.parse('Alice123')).toThrow()
    expect(() => nameSchema.parse('Alice@Smith')).toThrow()
  })
})

describe('emailSchema', () => {
  it('accepts a valid email and lowercases it', () => {
    expect(emailSchema.parse('Alice@Example.COM')).toBe('alice@example.com')
  })

  it('rejects an invalid email format', () => {
    expect(() => emailSchema.parse('not-an-email')).toThrow()
  })

  it('rejects emails longer than 254 characters', () => {
    const longEmail = `${'a'.repeat(250)}@example.com`
    expect(() => emailSchema.parse(longEmail)).toThrow()
  })
})

describe('phoneSchema', () => {
  it('accepts a plain digit phone number', () => {
    expect(phoneSchema.parse('15551234567')).toBe('15551234567')
  })

  it('accepts a leading + and normalises to digits only', () => {
    expect(phoneSchema.parse('+15551234567')).toBe('15551234567')
  })

  it('rejects phone numbers with spaces, hyphens, or parentheses', () => {
    expect(() => phoneSchema.parse('+1 (555) 123-4567')).toThrow()
    expect(() => phoneSchema.parse('555-123-4567')).toThrow()
    expect(() => phoneSchema.parse('(555) 1234567')).toThrow()
  })

  it('rejects phone numbers shorter than 7 digits', () => {
    expect(() => phoneSchema.parse('123456')).toThrow()
  })

  it('rejects phone numbers longer than 15 digits', () => {
    expect(() => phoneSchema.parse('1'.repeat(16))).toThrow()
  })

  it('rejects phone numbers containing letters', () => {
    expect(() => phoneSchema.parse('555CALLNOW')).toThrow()
  })

  it('rejects + in any position other than the first character', () => {
    expect(() => phoneSchema.parse('1555+234567')).toThrow()
  })
})
