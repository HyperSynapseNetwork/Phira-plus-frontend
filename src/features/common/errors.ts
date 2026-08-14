import type { components } from '../../utils/api/generated'

export type KnownApiErrorCode = components['schemas']['ErrorCode']
export type ApiErrorCode = KnownApiErrorCode | (string & {})
export type ClientErrorCode = 'NETWORK_ERROR' | 'UNKNOWN_ERROR' | 'INVALID_RESPONSE'
export type AnyErrorCode = ApiErrorCode | ClientErrorCode

export interface ApiErrorEnvelope {
  error: {
    code: ApiErrorCode
    message: string
    request_id: string
    details: { params: Record<string, string | number | boolean | null> }
  }
}

export class ApiError extends Error {
  readonly code: AnyErrorCode
  readonly requestId?: string
  readonly details?: { params?: Record<string, string | number | boolean | null> }
  readonly status?: number
  readonly retryAfterSeconds?: number

  constructor(opts: {
    code: AnyErrorCode
    message: string
    requestId?: string
    details?: { params?: Record<string, string | number | boolean | null> }
    status?: number
    retryAfterSeconds?: number
    cause?: unknown
  }) {
    super(opts.message)
    this.name = 'ApiError'
    this.code = opts.code
    this.requestId = opts.requestId
    this.details = opts.details
    this.status = opts.status
    this.retryAfterSeconds = opts.retryAfterSeconds
    if (opts.cause)
      this.cause = opts.cause
  }
}
