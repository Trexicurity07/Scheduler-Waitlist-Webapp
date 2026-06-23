import { describe, it, expect } from 'vitest'
import { validateEnv } from './env'

const completeEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  REFRESH_TOKEN_ENCRYPTION_KEY: 'a'.repeat(44),
  GOOGLE_OAUTH_CLIENT_ID: 'client-id',
  GOOGLE_OAUTH_CLIENT_SECRET: 'client-secret',
  GOOGLE_OAUTH_REDIRECT_URI: 'https://example.com/api/oauth/google/callback',
  RESEND_API_KEY: 'resend-key',
  RESEND_FROM_EMAIL: 'notifications@example.com',
  CRON_SECRET: 'cron-secret',
  NEXT_PUBLIC_APP_URL: 'https://example.com',
}

describe('validateEnv', () => {
  it('returns the parsed env when all required vars are present', () => {
    const result = validateEnv(completeEnv)
    expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co')
  })

  it('throws when a required var is missing', () => {
    const { GOOGLE_OAUTH_CLIENT_ID, ...incomplete } = completeEnv
    expect(() => validateEnv(incomplete)).toThrow()
  })

  it('throws when a URL var is not a valid URL', () => {
    expect(() => validateEnv({ ...completeEnv, NEXT_PUBLIC_APP_URL: 'not-a-url' })).toThrow()
  })
})
