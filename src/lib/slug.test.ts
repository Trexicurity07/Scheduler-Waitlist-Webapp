import { describe, it, expect } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('lowercases and hyphenates a business name', () => {
    expect(slugify('Jane Doe Salon')).toBe('jane-doe-salon')
  })

  it('strips punctuation', () => {
    expect(slugify("Jane's Salon & Spa")).toBe('janes-salon-spa')
  })

  it('collapses repeated hyphens and whitespace', () => {
    expect(slugify('Test   --  Salon')).toBe('test-salon')
  })
})
