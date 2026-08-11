import type { $Fetch, FetchOptions } from 'ofetch'
import { $fetch } from 'ofetch'
import { toApiError } from './errors'

/**
 * Frozen PPB REST client.
 *
 * - Base URL: `NUXT_PUBLIC_API_BASE` (default `https://api-phira.htadiy.com`).
 * - Credentialed CORS (`credentials: 'include'`) — PPB session lives in an
 *   HttpOnly cookie; the client never holds Phira tokens.
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
 * Prefer `useApi()` in components / composables.
 */
export function apiFetch<T = unknown, R extends ApiFetchOptions<T> = ApiFetchOptions<T>>(
  path: string,
  options?: R,
): Promise<T> {
  return getApiClient()<T>(path, options) as Promise<T>
}
