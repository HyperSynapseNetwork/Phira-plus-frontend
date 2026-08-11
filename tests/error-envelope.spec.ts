import { describe, expect, it } from 'vitest'
import { toApiError } from '~/utils/api/errors'
import { ApiError } from '~/utils/api/types'

describe('toApiError — frozen error envelope (contract §2)', () => {
  it('normalizes the frozen envelope shape', () => {
    const err = toApiError({
      error: {
        code: 'phira_reauth_required',
        message: '需要重新验证 Phira 身份',
        request_id: 'req-123',
        details: { retry: true },
      },
    })
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe('phira_reauth_required')
    expect(err.message).toBe('需要重新验证 Phira 身份')
    expect(err.requestId).toBe('req-123')
    expect(err.details).toEqual({ retry: true })
  })

  it('falls back to request_id for unknown codes', () => {
    const err = toApiError({ error: { code: 'bogus', message: 'x' } })
    expect(err.code).toBe('request_id')
  })

  it('maps 429 to rate_limit and keeps Retry-After', () => {
    const err = toApiError({
      status: 429,
      retryAfter: '3',
      data: { error: { code: 'rate_limit', message: 'slow down' } },
    })
    expect(err.code).toBe('rate_limit')
    expect(err.status).toBe(429)
    expect(err.retryAfterSeconds).toBe(3)
  })

  it('passes through an existing ApiError', () => {
    const original = new ApiError({ code: 'session', message: 'expired' })
    expect(toApiError(original)).toBe(original)
  })

  it('handles non-object errors', () => {
    expect(toApiError('boom').code).toBe('request_id')
    expect(toApiError(undefined).code).toBe('request_id')
  })
})
