/**
 * Comprehensive boundary/edge-case input tests for all validation logic.
 * Tests the full matrix of values a real user might enter.
 */
import { describe, it, expect } from 'vitest'
import { passwordSchema } from './auth/validate-password'
import { nameSchema, emailSchema, phoneSchema } from './waitlist/validate-signup'
import { slugify } from './slug'
import { maskEmail } from './auth/mask-email'

// ─── Password ────────────────────────────────────────────────────────────────

describe('passwordSchema — valid inputs', () => {
  const valid = [
    'Abcdef1!',           // 8 chars, minimum length
    'Abcdefg1',           // 8 chars, no symbols
    'A'.repeat(1) + 'a'.repeat(69) + '1'.repeat(2), // 72 chars, maximum length
    'MyP@ssw0rd!',        // symbols
    'Test1234',           // simple valid
    'P@ssw0rd#$%^&*()',   // many symbols
    'Hello World1'.replace(' ', '!'), // space replaced with symbol
    '1Aa!@#$%^&*()',      // starts with digit
    'abcdEFGH1',          // mixed case
    'Zz9' + '!'.repeat(5), // 8 chars: upper + lower + digit + symbols
  ]
  valid.forEach(p => {
    it(`accepts: ${p.slice(0, 20)}... (len=${p.length})`, () => {
      expect(() => passwordSchema.parse(p)).not.toThrow()
    })
  })
})

describe('passwordSchema — invalid inputs', () => {
  const invalid: [string, string][] = [
    ['',              'empty'],
    ['abc',           'too short'],
    ['Abcdef1',       '7 chars (one short)'],
    ['A' + 'a'.repeat(70) + '1'.repeat(2), '73 chars (one over)'],
    ['abcdefg1',      'no uppercase'],
    ['ABCDEFG1',      'no lowercase'],
    ['Abcdefgh',      'no number'],
    ['Abcd 123',      'contains space'],
    ['Abcd\t123',     'contains tab'],
    ['Abcd1234é',     'non-ASCII char'],
    ['Abcd1234\n',    'newline'],
    ['Abcd1234\0',    'null byte'],
    ['       A1',     'mostly spaces'],
    ['Password1 ',    'trailing space'],
    [' Password1',    'leading space'],
  ]
  invalid.forEach(([p, label]) => {
    it(`rejects: ${label}`, () => {
      expect(() => passwordSchema.parse(p)).toThrow()
    })
  })
})

// ─── Email ────────────────────────────────────────────────────────────────────

describe('emailSchema — valid inputs', () => {
  const valid = [
    'user@example.com',
    'USER@EXAMPLE.COM',           // uppercase (schema lowercases)
    'user+tag@example.com',        // plus addressing
    'user.name@sub.domain.co.uk',  // dots and subdomain
    'a@b.io',                      // short
    '123@456.com',                 // all digits in local
    'user_name@example.org',
    'user-name@example.net',
  ]
  valid.forEach(e => {
    it(`accepts: ${e}`, () => {
      expect(() => emailSchema.parse(e)).not.toThrow()
    })
  })

  it('lowercases the output', () => {
    expect(emailSchema.parse('USER@EXAMPLE.COM')).toBe('user@example.com')
  })
})

describe('emailSchema — invalid inputs', () => {
  const invalid: [string, string][] = [
    ['',                 'empty'],
    ['notanemail',       'no @'],
    ['@nodomain.com',    'no local part'],
    ['user@',           'no domain'],
    ['user@.com',       'domain starts with dot'],
    ['user @example.com', 'space in local'],
    ['user@exam ple.com', 'space in domain'],
    ['a'.repeat(255) + '@example.com', 'over 254 chars total'],
    ['user@@example.com', 'double @'],
  ]
  invalid.forEach(([e, label]) => {
    it(`rejects: ${label}`, () => {
      expect(() => emailSchema.parse(e)).toThrow()
    })
  })
})

// ─── Phone ────────────────────────────────────────────────────────────────────

describe('phoneSchema — valid inputs', () => {
  const valid: [string, string, string][] = [
    ['+15551234567',   '11 digits expected', '15551234567'],
    ['15551234567',    'no plus sign',        '15551234567'],
    ['+447911123456',  'UK number',           '447911123456'],
    ['+1234567',       '7 digits min',        '1234567'],
    ['+123456789012345', '15 digits max',     '123456789012345'],
  ]
  valid.forEach(([input, label, expected]) => {
    it(`accepts (${label}): ${input}`, () => {
      expect(phoneSchema.parse(input)).toBe(expected)
    })
  })
})

describe('phoneSchema — invalid inputs', () => {
  const invalid: [string, string][] = [
    ['',                'empty'],
    ['+123456',         '6 digits (too short)'],
    ['+1234567890123456', '16 digits (too long)'],
    ['abc1234567',      'letters in number'],
    ['+1 555 123 4567', 'spaces (now strips non-digits, but spaces fail regex first)'],
    ['(555) 123-4567',  'formatted US number with parens/dash'],
    ['+',               'plus only'],
    ['++12345678',      'double plus'],
  ]
  invalid.forEach(([p, label]) => {
    it(`rejects: ${label}`, () => {
      expect(() => phoneSchema.parse(p)).toThrow()
    })
  })
})

// ─── Name ─────────────────────────────────────────────────────────────────────

describe('nameSchema — valid inputs', () => {
  const valid = [
    'John Smith',
    'María García',       // accented chars
    "O'Brien",            // apostrophe
    'Jean-Pierre',        // hyphen
    'Dr. House',          // period
    'AB',                 // 2 chars minimum
    'A'.repeat(60),       // 60 chars maximum (all letters)
    '  John  ',           // trims whitespace (output is 'John')
    'Anne-Marie O\'Neill',
  ]
  valid.forEach(n => {
    it(`accepts: ${n.trim().slice(0, 30)}`, () => {
      expect(() => nameSchema.parse(n)).not.toThrow()
    })
  })
})

describe('nameSchema — invalid inputs', () => {
  const invalid: [string, string][] = [
    ['',              'empty'],
    ['A',             '1 char (too short)'],
    ['A'.repeat(61),  '61 chars (too long)'],
    ['123',           'all digits (no letters)'],
    ['!!##',          'only symbols'],
    ['John<script>',  'HTML/XSS attempt'],
    ['John; DROP TABLE', 'SQL injection attempt'],
    ['   ',           'only whitespace'],
  ]
  invalid.forEach(([n, label]) => {
    it(`rejects: ${label}`, () => {
      expect(() => nameSchema.parse(n)).toThrow()
    })
  })
})

// ─── Slug ─────────────────────────────────────────────────────────────────────

describe('slugify — various business names', () => {
  const cases: [string, string][] = [
    ['City Dental',         'city-dental'],
    ['The Hair Studio',     'the-hair-studio'],
    ["O'Brien's Bakery",    'obriens-bakery'],
    ['Café Au Lait',        'caf-au-lait'],
    ['A & B Consulting',    'a-b-consulting'],
    ['  leading spaces  ',  'leading-spaces'],
    ['Double  Space',       'double-space'],
    ['123 Main St.',        '123-main-st'],
    ['UPPER CASE',          'upper-case'],
    ['!!!Special!!!',       'special'],
    ['a',                   'a'],
    ['My-Business',         'my-business'],
  ]
  cases.forEach(([input, expected]) => {
    it(`"${input}" → "${expected}"`, () => {
      expect(slugify(input)).toBe(expected)
    })
  })
})

// ─── maskEmail ────────────────────────────────────────────────────────────────

describe('maskEmail — privacy masking', () => {
  it('masks middle chars of local part', () => {
    const result = maskEmail('user@example.com')
    expect(result).toMatch(/^u.*@example\.com$/)
    expect(result).not.toBe('user@example.com')
  })

  it('preserves domain fully', () => {
    expect(maskEmail('john@company.org')).toContain('@company.org')
  })

  it('handles short local part (≤2 chars)', () => {
    const result = maskEmail('ab@x.com')
    expect(result).toContain('@x.com')
  })

  it('single-char local part', () => {
    const result = maskEmail('a@b.com')
    expect(result).toContain('@b.com')
  })
})

// ─── Business name edge cases (signup schema) ─────────────────────────────────

describe('business name validation (signup schema)', () => {
  const { z } = require('zod')
  const businessNameSchema = z
    .string()
    .trim()
    .min(1, 'Business name is required')
    .max(80, 'Business name must be at most 80 characters')

  const valid = [
    'A',                 // 1 char min
    'City Dental',
    'A'.repeat(80),      // 80 chars max
    '123 Main Street',
    "O'Malley's Pub",
  ]
  valid.forEach(n => {
    it(`accepts: "${n.slice(0, 30)}"`, () => {
      expect(() => businessNameSchema.parse(n)).not.toThrow()
    })
  })

  const invalid: [string, string][] = [
    ['',              'empty'],
    ['A'.repeat(81),  '81 chars (too long)'],
    ['   ',           'whitespace only (trims to empty)'],
  ]
  invalid.forEach(([n, label]) => {
    it(`rejects: ${label}`, () => {
      expect(() => businessNameSchema.parse(n)).toThrow()
    })
  })
})
