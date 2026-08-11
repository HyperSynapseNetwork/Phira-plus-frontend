import { describe, expect, it } from 'vitest'
import { toApiError } from '~/utils/api/errors'
import { ApiError } from '~/utils/api/types'

describe('toApiError — frozen error envelope (contract §2, P4/P5)', () => {
  it('normalizes the frozen envelope shape and upper-snakes the code', () => {
    const err = toApiError({
      error: {
        code: 'phira_reauth_required',
        message: '需要重新验证 Phira 身份',
        request_id: 'req-123',
        details: { retry: true },
      },
    })
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe('PHIRA_REAUTH_REQUIRED')
    expect(err.message).toBe('需要重新验证 Phira 身份')
    expect(err.requestId).toBe('req-123')
    expect(err.details).toEqual({ retry: true })
  })

  it('accepts UPPER_SNAKE_CASE codes as-is', () => {
    const err = toApiError({ error: { code: 'RATE_LIMIT', message: 'slow down' } })
    expect(err.code).toBe('RATE_LIMIT')
  })

  it('falls back to REQUEST_ID for unknown codes', () => {
    const err = toApiError({ error: { code: 'bogus', message: 'x' } })
    expect(err.code).toBe('REQUEST_ID')
  })

  it('maps 429 to RATE_LIMIT and keeps Retry-After', () => {
    const err = toApiError({
      status: 429,
      retryAfter: '3',
      data: { error: { code: 'RATE_LIMIT', message: 'slow down' } },
    })
    expect(err.code).toBe('RATE_LIMIT')
    expect(err.status).toBe(429)
    expect(err.retryAfterSeconds).toBe(3)
  })

  it('passes through an existing ApiError', () => {
    const original = new ApiError({ code: 'SESSION', message: 'expired' })
    expect(toApiError(original)).toBe(original)
  })

  it('maps network-level failures to network_error (P5 client code)', () => {
    const err = toApiError(new TypeError('Failed to fetch'))
    expect(err.code).toBe('network_error')
  })

  it('falls back to unknown_error for garbage (P5)', () => {
    const err = toApiError('boom')
    expect(err.code).toBe('unknown_error')
  })
})
