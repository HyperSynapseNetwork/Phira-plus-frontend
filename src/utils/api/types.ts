/**
 * Typed API client infrastructure for the frozen PPB REST contract.
 * Source of truth: contracts/README.md (Contract-Freeze v0) §1-2.
 *
 * The PPF client talks ONLY to PPB (`api-phira.htadiy.com`) with credentialed
 * CORS. It NEVER receives Phira tokens — auth is delegated to the PPB auth
 * gateway (see /login).
 */

/** Unified error codes (contract §2). Frontend localizes by `code`. */
export type ApiErrorCode
  = | 'request_id'
    | 'pagination'
    | 'validation'
    | 'rate_limit'
    | 'auth'
    | 'session'
    | 'permission_denied'
    | 'pmp_unavailable'
    | 'capability_not_supported'
    | 'phira_api_unavailable'
    | 'phira_reauth_required'
    | 'long_job_accepted'

/** Frozen error envelope (contract §2). */
export interface ApiErrorEnvelope {
  error: {
    code: ApiErrorCode
    message: string
    request_id?: string
    details?: Record<string, unknown>
  }
}

/** A request carried a payload that violates the contract. */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly requestId?: string
  readonly details?: Record<string, unknown>
  readonly status?: number
  readonly retryAfterSeconds?: number

  constructor(opts: {
    code: ApiErrorCode
    message: string
    requestId?: string
    details?: Record<string, unknown>
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

/** Unified pagination (contract §2): request `page, pageNum(≤100)`. */
export interface PaginationParams {
  page?: number
  /** Page size, maximum 100. */
  pageNum?: number
}

/** Unified paginated response (contract §2). */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageNum: number
}

/** `GET /api/v1/public/meta` (contract §9). */
export interface PublicMeta {
  version: string
  api_version: number
  capabilities: string[]
  pmp: {
    connected: boolean
    version: string
    capabilities: string[]
  }
}

/** Public content types (contract §1). Kept minimal for Phase A. */
export interface PublicAnnouncement {
  id: string
  title: string
  body: string
  published_at: string
}

export interface PublicNode {
  /** External node source id. V3 only displays origin, never infers IP. */
  id: string
  label: string
}

export interface PublicDownload {
  id: string
  platform: 'windows' | 'android' | 'other'
  label: string
  url: string
}

export interface PublicSiteInfo {
  name: string
  description?: string
  version?: string
}

/** Capability check helper: prefer capability detection over version branches. */
export function hasCapability(meta: PublicMeta, capability: string): boolean {
  return meta.capabilities.includes(capability)
}

export function hasPmpCapability(meta: PublicMeta, capability: string): boolean {
  return meta.pmp.capabilities.includes(capability)
}
