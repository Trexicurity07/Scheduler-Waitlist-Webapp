import { z } from 'zod'

const NAME_PATTERN = /^(?=.*[\p{L}])[\p{L}\s'.-]+$/u
const PHONE_PATTERN = /^\+?\d{7,15}$/

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters')
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
  .transform((value) => value.replace(/[\s().-]/g, ''))
  .pipe(z.string().regex(PHONE_PATTERN, 'Invalid phone number'))
