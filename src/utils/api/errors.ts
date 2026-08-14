import type { AnyErrorCode, ApiErrorCode, ApiErrorEnvelope } from './types'
import { ApiError } from './types'

/**
 * Normalize any thrown value into the REST Error Contract v1.1 model.
 *
 * Classification is intentionally structural:
 * - no HTTP response => NETWORK_ERROR
 * - HTTP response + valid ErrorEnvelope => exact server code (future codes kept)
 * - HTTP response + malformed/legacy body => INVALID_RESPONSE
 * - other client exception => UNKNOWN_ERROR
 *
 * We never infer domain semantics from `message` text.
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError)
    return err

  if (typeof err !== 'object' || err === null) {
    return new ApiError({ code: 'UNKNOWN_ERROR', message: String(err ?? 'Unknown error'), cause: err })
  }

  const raw = err as Record<string, unknown>
  const response = isRecord(raw.response) ? raw.response : undefined
  const status = extractStatus(raw, response)
  const retryAfter = parseRetryAfter(raw, response)
  const hasHttpResponse = status != null || response != null
  const data = raw.data ?? response?._data ?? response?.data

  if (hasHttpResponse) {
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
    return new ApiError({
      code: 'INVALID_RESPONSE',
      message: 'Server returned a response outside the frozen ErrorEnvelope contract',
      status,
      retryAfterSeconds: retryAfter,
      cause: err,
    })
  }

  if (looksNetworkError(err)) {
    return new ApiError({
      code: 'NETWORK_ERROR',
      message: err instanceof Error ? err.message : 'Network error',
      cause: err,
    })
  }

  return new ApiError({
    code: 'UNKNOWN_ERROR',
    message: err instanceof Error ? err.message : 'Unknown error',
    cause: err,
  })
}

function asEnvelope(data: unknown): ApiErrorEnvelope | undefined {
  if (!isRecord(data) || !isRecord(data.error))
    return undefined
  const error = data.error
  if (typeof error.code !== 'string' || !error.code.trim())
    return undefined
  if (typeof error.message !== 'string')
    return undefined
  if (typeof error.request_id !== 'string' || !error.request_id.trim())
    return undefined
  if (!isRecord(error.details) || !isRecord(error.details.params))
    return undefined
  const params: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of Object.entries(error.details.params)) {
    if (value == null || ['string', 'number', 'boolean'].includes(typeof value))
      params[key] = value as string | number | boolean | null
  }
  // Keep unknown future codes verbatim. Only canonicalize casing.
  const code = error.code.trim().toUpperCase()
  return {
    error: {
      code,
      message: error.message,
      request_id: error.request_id,
      details: { params },
    },
  }
}

function extractStatus(raw: Record<string, unknown>, response?: Record<string, unknown>): number | undefined {
  for (const value of [raw.status, raw.statusCode, response?.status, response?.statusCode]) {
    if (typeof value === 'number')
      return value
  }
  return undefined
}

function looksNetworkError(err: unknown): boolean {
  if (err instanceof TypeError)
    return true
  if (!(err instanceof Error))
    return false
  return /failed to fetch|network error|load failed|fetch failed|socket|connection|timed out/i.test(err.message)
}

function parseRetryAfter(raw: Record<string, unknown>, response?: Record<string, unknown>): number | undefined {
  const headers = isRecord(response?.headers) ? response.headers : undefined
  const getter = headers?.get
  let headerValue: unknown
  if (typeof getter === 'function') {
    try {
      headerValue = (getter as (key: string) => unknown)('retry-after')
    }
    catch {
      headerValue = undefined
    }
  }
  const value = raw.retryAfter ?? headerValue
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : undefined
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null
}

export function errorMessageKey(code: string): string {
  if (code === 'NETWORK_ERROR' || code === 'INVALID_RESPONSE' || code === 'UNKNOWN_ERROR')
    return `errors.client.${code}`
  return `errors.api.${code}`
}

/** Safe translation params are the only server-provided values allowed into UI strings. */
export function errorParams(err: unknown): Record<string, string | number> {
  const normalized = toApiError(err)
  const params: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(normalized.details?.params ?? {})) {
    if (typeof value === 'string' || typeof value === 'number')
      params[key] = value
    else if (typeof value === 'boolean')
      params[key] = value ? 'true' : 'false'
  }
  return params
}

/**
 * Localize by code only. Raw server `message` is never a formal UI fallback.
 * Unknown future server codes use UNKNOWN_ERROR and retain request id for support.
 */
export function localizeApiError(
  t: (key: string, params?: Record<string, unknown>) => string,
  err: unknown,
): string {
  const normalized = toApiError(err)
  const key = errorMessageKey(normalized.code)
  const translated = t(key, errorParams(normalized))
  if (translated !== key)
    return translated
  return t('errors.client.UNKNOWN_ERROR')
}

export interface LocalizedApiError {
  code: AnyErrorCode
  message: string
  requestId?: string
  retryAfterSeconds?: number
}

export function describeApiError(
  t: (key: string, params?: Record<string, unknown>) => string,
  err: unknown,
): LocalizedApiError {
  const normalized = toApiError(err)
  return {
    code: normalized.code,
    message: localizeApiError(t, normalized),
    requestId: normalized.requestId,
    retryAfterSeconds: normalized.retryAfterSeconds,
  }
}
