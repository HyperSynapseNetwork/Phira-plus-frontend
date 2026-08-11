import type { ApiErrorEnvelope } from './types'
import { ApiError } from './types'

const KNOWN_CODES = new Set([
  'request_id',
  'pagination',
  'validation',
  'rate_limit',
  'auth',
  'session',
  'permission_denied',
  'pmp_unavailable',
  'capability_not_supported',
  'phira_api_unavailable',
  'phira_reauth_required',
  'long_job_accepted',
])

/**
 * Normalize a thrown unknown into an `ApiError`.
 * Handles: `ApiError`, `{ error: {...} }` envelope (contract §2), fetch errors.
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError)
    return err

  // ofetch / $fetch error shape: { data, response, statusCode, ... }
  if (isRecord(err)) {
    const status = typeof err.status === 'number'
      ? err.status
      : typeof (err as { statusCode?: unknown }).statusCode === 'number'
        ? (err as { statusCode: number }).statusCode
        : undefined

    const retryAfter = parseRetryAfter(err)

    // Envelope: { error: { code, message, ... } }
    const data = (err as { data?: unknown }).data ?? err
    const envelope = asEnvelope(data)
    if (envelope) {
      return new ApiError({
        code: envelope.error.code,
        message: envelope.error.message,
        requestId: envelope.error.request_id,
        details: envelope.error.details,
        status,
        retryAfterSeconds: retryAfter,
        cause: err,
      })
    }

    // Plain error string (Phira API legacy shape, proxied by PPB)
    const message = extractMessage(err)
    if (message) {
      return new ApiError({
        code: inferCode(status, message),
        message,
        status,
        retryAfterSeconds: retryAfter,
        cause: err,
      })
    }
  }

  return new ApiError({
    code: 'request_id',
    message: err instanceof Error ? err.message : 'Network or unknown error',
    cause: err,
  })
}

function asEnvelope(data: unknown): ApiErrorEnvelope | undefined {
  if (!isRecord(data) || !isRecord(data.error))
    return undefined
  const e = data.error
  if (typeof e.code !== 'string' || typeof e.message !== 'string')
    return undefined
  const code = KNOWN_CODES.has(e.code) ? e.code as ApiErrorEnvelope['error']['code'] : 'request_id'
  return {
    error: {
      code,
      message: e.message,
      request_id: typeof e.request_id === 'string' ? e.request_id : undefined,
      details: isRecord(e.details) ? e.details as Record<string, unknown> : undefined,
    },
  }
}

function extractMessage(err: Record<string, unknown>): string | undefined {
  if (typeof err.message === 'string')
    return err.message
  if (typeof err.error === 'string')
    return err.error
  return undefined
}

function inferCode(status: number | undefined, message: string): ApiErrorEnvelope['error']['code'] {
  if (status === 429)
    return 'rate_limit'
  if (status === 401)
    return 'auth'
  if (status === 403)
    return 'permission_denied'
  if (status === 422)
    return 'validation'
  if (/reauth/i.test(message))
    return 'phira_reauth_required'
  return 'request_id'
}

function parseRetryAfter(err: Record<string, unknown>): number | undefined {
  const resp = (err as { response?: { headers?: { get?: (key: string) => string | null } } }).response
  const v = err.retryAfter ?? resp?.headers?.get?.('retry-after')
  if (typeof v === 'number' && Number.isFinite(v))
    return Math.max(0, Math.round(v))
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : undefined
  }
  return undefined
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}
