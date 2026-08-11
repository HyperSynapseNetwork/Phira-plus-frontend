import type { AnyErrorCode, ApiErrorCode, ApiErrorEnvelope } from './types'
import { ApiError } from './types'

/**
 * Server error codes (P4: UPPER_SNAKE_CASE) + client codes (P5: lowercase).
 * Frontend localizes by code.
 */
const SERVER_CODES = new Set<string>([
  'REQUEST_ID',
  'PAGINATION',
  'VALIDATION',
  'RATE_LIMIT',
  'AUTH',
  'SESSION',
  'PERMISSION_DENIED',
  'PMP_UNAVAILABLE',
  'CAPABILITY_NOT_SUPPORTED',
  'PHIRA_API_UNAVAILABLE',
  'PHIRA_REAUTH_REQUIRED',
  'LONG_JOB_ACCEPTED',
])

/**
 * Normalize a thrown unknown into an `ApiError`.
 * Handles: `ApiError`, `{ error: {...} }` envelope (contract §2/§24.5), fetch errors.
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError)
    return err

  // Network-level failure (P5 client code): TypeError from fetch, or an
  // ofetch FetchError with no HTTP response/data attached.
  if (looksNetworkError(err)) {
    return new ApiError({
      code: 'network_error',
      message: err instanceof Error ? err.message : 'Network error',
      cause: err,
    })
  }

  // Plain garbage (non-object, non-Error) → unknown_error.
  if (typeof err !== 'object' || err === null) {
    return new ApiError({
      code: 'unknown_error',
      message: typeof err === 'string' ? err : 'Unknown error',
      cause: err,
    })
  }

  const errObj = err as Record<string, unknown>
  const status = extractStatus(errObj)
  const retryAfter = parseRetryAfter(errObj)
  const data = (err as { data?: unknown }).data ?? errObj

  const envelope = asEnvelope(data)
  if (envelope) {
    return new ApiError({
      code: envelope.error.code as ApiErrorCode,
      message: envelope.error.message,
      requestId: envelope.error.request_id,
      details: envelope.error.details,
      status,
      retryAfterSeconds: retryAfter,
      cause: err,
    })
  }

  const message = extractMessage(errObj)
  if (message) {
    return new ApiError({
      code: inferCode(status, message),
      message,
      status,
      retryAfterSeconds: retryAfter,
      cause: err,
    })
  }

  return new ApiError({
    code: 'unknown_error',
    message: err instanceof Error ? err.message : 'Unknown error',
    cause: err,
  })
}

/** True for network-level failures (no HTTP response available). */
function looksNetworkError(err: unknown): boolean {
  if (err instanceof TypeError)
    return true
  if (!(err instanceof Error) || typeof err.message !== 'string')
    return false
  if ('response' in err || 'data' in err)
    return false
  return /failed to fetch|network error|load failed|fetch failed|socket/i.test(err.message)
}

function asEnvelope(data: unknown): ApiErrorEnvelope | undefined {
  if (!isRecord(data) || !isRecord(data.error))
    return undefined
  const e = data.error
  if (typeof e.code !== 'string' || typeof e.message !== 'string')
    return undefined
  const code = normalizeCode(e.code)
  return {
    error: {
      code,
      message: e.message,
      request_id: typeof e.request_id === 'string' ? e.request_id : undefined,
      details: isRecord(e.details) ? e.details as Record<string, unknown> : undefined,
    },
  }
}

/** Normalize any casing of a server code to the frozen UPPER_SNAKE_CASE form. */
function normalizeCode(code: string): ApiErrorCode {
  const upper = code.toUpperCase()
  if (SERVER_CODES.has(upper))
    return upper as ApiErrorCode
  // Accept legacy lowercase from older PPB builds.
  const legacy: Record<string, ApiErrorCode> = {
    request_id: 'REQUEST_ID',
    pagination: 'PAGINATION',
    validation: 'VALIDATION',
    rate_limit: 'RATE_LIMIT',
    auth: 'AUTH',
    session: 'SESSION',
    permission_denied: 'PERMISSION_DENIED',
    pmp_unavailable: 'PMP_UNAVAILABLE',
    capability_not_supported: 'CAPABILITY_NOT_SUPPORTED',
    phira_api_unavailable: 'PHIRA_API_UNAVAILABLE',
    phira_reauth_required: 'PHIRA_REAUTH_REQUIRED',
    long_job_accepted: 'LONG_JOB_ACCEPTED',
  }
  return legacy[code.toLowerCase()] ?? 'REQUEST_ID'
}

function extractStatus(err: Record<string, unknown>): number | undefined {
  if (typeof err.status === 'number')
    return err.status
  if (typeof (err as { statusCode?: unknown }).statusCode === 'number')
    return (err as { statusCode: number }).statusCode
  return undefined
}

function extractMessage(err: Record<string, unknown>): string | undefined {
  if (typeof err.message === 'string')
    return err.message
  if (typeof err.error === 'string')
    return err.error
  return undefined
}

function inferCode(status: number | undefined, message: string): AnyErrorCode {
  if (status === 429)
    return 'RATE_LIMIT'
  if (status === 401)
    return 'AUTH'
  if (status === 403)
    return 'PERMISSION_DENIED'
  if (status === 422)
    return 'VALIDATION'
  if (/reauth/i.test(message))
    return 'PHIRA_REAUTH_REQUIRED'
  return 'REQUEST_ID'
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

/** i18n key helper: UPPER_SNAKE_CASE code → lowercase dot key used in messages. */
export function errorMessageKey(code: string): string {
  return `error.${code.toLowerCase()}`
}

/** Localize a code via vue-i18n `t`; falls back to the raw server message. */
export function localizeApiError(t: (key: string, params?: Record<string, unknown>) => string, err: unknown): string {
  const normalized = toApiError(err)
  const key = errorMessageKey(normalized.code)
  const translated = t(key)
  return translated === key ? normalized.message : translated
}
