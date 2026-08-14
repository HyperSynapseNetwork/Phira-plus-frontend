import { describe, expect, it } from 'vitest'
import { toApiError } from '~/utils/api/errors'
import { ApiError } from '~/utils/api/types'

describe('toApiError — frozen error envelope (contract §2, P4/P5)', () => {
  it('normalizes the frozen envelope shape and upper-snakes the code', () => {
    const err = toApiError({
      status: 400,
      data: {
        error: {
          code: 'phira_reauth_required',
          message: '需要重新验证 Phira 身份',
          request_id: 'req-123',
          details: { params: { retry: true } },
        },
      },
    })
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe('PHIRA_REAUTH_REQUIRED')
    expect(err.message).toBe('需要重新验证 Phira 身份')
    expect(err.requestId).toBe('req-123')
    expect(err.details).toEqual({ params: { retry: true } })
  })

  it('accepts UPPER_SNAKE_CASE codes as-is', () => {
    const err = toApiError({
      status: 429,
      data: { error: { code: 'RATE_LIMIT', message: 'slow down', request_id: 'r1', details: { params: {} } } },
    })
    expect(err.code).toBe('RATE_LIMIT')
  })

  it('keeps unknown future codes verbatim (upper-snaked)', () => {
    const err = toApiError({
      status: 500,
      data: { error: { code: 'bogus', message: 'x', request_id: 'r2', details: { params: {} } } },
    })
    expect(err.code).toBe('BOGUS')
  })

  it('maps 429 to RATE_LIMIT and keeps Retry-After', () => {
    const err = toApiError({
      status: 429,
      retryAfter: '3',
      data: { error: { code: 'RATE_LIMIT', message: 'slow down', request_id: 'r3', details: { params: {} } } },
    })
    expect(err.code).toBe('RATE_LIMIT')
    expect(err.status).toBe(429)
    expect(err.retryAfterSeconds).toBe(3)
  })

  it('passes through an existing ApiError', () => {
    const original = new ApiError({ code: 'SESSION', message: 'expired' })
    expect(toApiError(original)).toBe(original)
  })

  it('maps network-level failures to NETWORK_ERROR (P5 client code)', () => {
    const err = toApiError(new TypeError('Failed to fetch'))
    expect(err.code).toBe('NETWORK_ERROR')
  })

  it('falls back to UNKNOWN_ERROR for garbage (P5)', () => {
    const err = toApiError('boom')
    expect(err.code).toBe('UNKNOWN_ERROR')
  })
})
