import type { ApiError, Paginated, PaginationParams } from '~/utils/api/types'
import { apiFetch, getApiBase, getApiClient } from '~/utils/api/client'

/**
 * `useApi()` — composition helpers for the frozen PPB REST contract.
 *
 * - `fetch`      : `$fetch`-based typed request (memoized client singleton).
 * - `useFetch`   : Nuxt `useFetch` bound to the PPB base (client-side SSG-safe).
 * - `paginate`   : build `{ page, pageNum }` params (max pageNum 100).
 * - `isApiError` : type guard.
 */
export function useApi() {
  const baseURL = getApiBase()

  return {
    baseURL,
    client: getApiClient(),
    fetch: apiFetch,
    isApiError,
    paginate,
  }
}

export interface PageRequest {
  page?: number
  pageNum?: number
}

/** Build pagination request params (contract §2: `page`, `pageNum ≤ 100`). */
export function paginate(params: PageRequest = {}): PaginationParams {
  const page = Math.max(1, params.page ?? 1)
  const pageNum = Math.min(100, Math.max(1, params.pageNum ?? 20))
  return { page, pageNum }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof Error && 'code' in err && typeof (err as ApiError).code === 'string'
}

/** Convenience guard for paginated responses. */
export function isPaginated<T>(value: unknown): value is Paginated<T> {
  if (typeof value !== 'object' || value === null)
    return false
  const v = value as Record<string, unknown>
  return Array.isArray(v.items) && typeof v.total === 'number' && typeof v.page === 'number'
}
