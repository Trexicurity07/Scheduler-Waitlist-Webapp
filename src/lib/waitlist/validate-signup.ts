import { z } from 'zod'

const NAME_PATTERN = /^(?=.*[\p{L}])[\p{L}\s'.-]+$/u

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(60, 'Name must be at most 60 characters')
  .regex(NAME_PATTERN, 'Name may only contain letters, spaces, hyphens, apostrophes, and periods')

export const emailSchema = z
  .string()
  .trim()
  .max(254, 'Email is too long')
  .email('Invalid email address')
  .transform((value) => value.toLowerCase())

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]+$/, 'Phone may only contain digits and an optional leading +')
  .transform((value) => value.replace(/^\+/, ''))
  .pipe(
    z.string()
      .min(7, 'Phone number is too short (minimum 7 digits)')
      .max(15, 'Phone number is too long (maximum 15 digits)')
  )
