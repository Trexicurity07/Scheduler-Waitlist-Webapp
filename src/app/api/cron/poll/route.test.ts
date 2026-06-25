import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClaimBusinesses = vi.fn()
const mockProcessBusiness = vi.fn()

vi.mock('@/lib/cron/claim-businesses', () => ({
  claimBusinesses: (...args: unknown[]) => mockClaimBusinesses(...args),
}))
vi.mock('@/lib/cron/process-business', () => ({
  processBusiness: (...args: unknown[]) => mockProcessBusiness(...args),
}))
vi.mock('@/lib/db/supabase', () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({}),
}))

import { POST } from './route'

describe('POST /api/cron/poll', () => {
  beforeEach(() => {
    mockClaimBusinesses.mockReset()
    mockProcessBusiness.mockReset()
    process.env.CRON_SECRET = 'test-secret'
  })

  it('rejects requests with a missing or wrong secret', async () => {
    const request = new Request('https://example.com/api/cron/poll', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
    expect(mockClaimBusinesses).not.toHaveBeenCalled()
  })

  it('claims and processes each business when the secret is correct', async () => {
    mockClaimBusinesses.mockResolvedValue([{ id: 'biz-1' }, { id: 'biz-2' }])
    mockProcessBusiness.mockResolvedValue(undefined)

    const request = new Request('https://example.com/api/cron/poll', {
      method: 'POST',
      headers: { authorization: 'Bearer test-secret' },
    })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.processed).toBe(2)
    expect(mockProcessBusiness).toHaveBeenCalledTimes(2)
  })
})
