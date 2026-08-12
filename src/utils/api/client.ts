import type { $Fetch, FetchOptions } from 'ofetch'
import { $fetch } from 'ofetch'
import { ensureCsrfToken, getCsrfToken, invalidateCsrfToken, isWriteMethod, setCsrfToken } from './csrf'
import { toApiError } from './errors'
import { ApiError } from './types'

/**
 * Frozen PPB REST client (contract §20 / Gate 0).
 *
 * - Base URL: `NUXT_PUBLIC_API_BASE` (default `https://api-phira.htadiy.com`).
 * - Credentialed CORS (`credentials: 'include'`) — PPB session lives in an
 *   HttpOnly cookie; the client never holds Phira tokens.
 * - **CSRF**: the server issues a token via `GET /api/v1/me`; every
 *   state-changing request carries it as `X-CSRF-Token`. The browser also sends
 *   `Origin` on cross-origin POSTs for PPB to validate (we never read the
 *   API-domain cookie). The token rotates on session refresh — `apiFetch`
 *   re-fetches it and retries once when a write is rejected.
 * - Every non-2xx response is normalized to `ApiError` by `error.code`
 *   (contract §2). rate-limit 429 also carries `Retry-After`.
 */

export interface ApiClientOptions {
  baseURL: string
  credentials?: RequestCredentials
  headers?: Record<string, string>
}

export function createApiClient(opts: ApiClientOptions): $Fetch {
  return $fetch.create({
    baseURL: opts.baseURL,
    credentials: opts.credentials ?? 'include',
    headers: opts.headers,
    retry: 0,
    onResponse({ response }) {
      // Capture the CSRF token from `/api/v1/me` (and any response carrying it).
      const data = response._data as Record<string, unknown> | null
      if (data && typeof data.csrf_token === 'string')
        setCsrfToken(data.csrf_token)
    },
    async onResponseError({ response, error }) {
      // Normalize envelope / fetch errors into ApiError before callers see them.
      const normalized = toApiError(error ?? response)
      throw normalized
    },
  })
}

let _client: $Fetch | null = null

/** Lazily-create a singleton API client bound to runtime config. */
export function getApiClient(): $Fetch {
  if (_client)
    return _client
  const config = useRuntimeConfig()
  _client = createApiClient({ baseURL: config.public.apiBase })
  return _client
}

export function getApiBase(): string {
  return useRuntimeConfig().public.apiBase
}

export type ApiFetchOptions<T = unknown> = FetchOptions<'json', T>

/**
 * Low-level typed fetch against the PPB REST API.
 * Automatically attaches `X-CSRF-Token` to state-changing methods and retries
 * once after a rejected write (token rotation, contract §20).
 */
export async function apiFetch<T = unknown, R extends ApiFetchOptions<T> = ApiFetchOptions<T>>(
  path: string,
  options?: R,
): Promise<T> {
  const method = options?.method ?? 'get'
  const opts: ApiFetchOptions<T> = { ...options }

  if (isWriteMethod(method)) {
    const token = getCsrfToken() ?? await ensureCsrfToken()
    if (token)
      opts.headers = { ...(opts.headers as Record<string, string>), 'X-CSRF-Token': token }
  }

  try {
    return await getApiClient()<T>(path, opts) as T
  }
  catch (err) {
    // CSRF token rotated / rejected: refresh and retry once.
    if (isWriteMethod(method) && err instanceof ApiError && err.code === 'AUTH') {
      invalidateCsrfToken()
      const token = await ensureCsrfToken()
      if (token) {
        opts.headers = { ...(opts.headers as Record<string, string>), 'X-CSRF-Token': token }
        return await getApiClient()<T>(path, opts) as T
      }
    }
    throw err
  }
}
