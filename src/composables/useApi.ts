import type { ApiError, Paginated, PaginationParams } from '~/utils/api/types'
import { apiFetch, getApiBase, getApiClient } from '~/utils/api/client'
import { toApiError } from '~/utils/api/errors'

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

/**
 * Graceful client-only data fetch bound to the PPB base (SSG-safe).
 *
 * - `server: false` keeps dynamic data out of the prerendered HTML, leaving a
 *   static skeleton (SEO) and hydrating on the client.
 * - `defaultVal` renders when PPB is unreachable (Phase B may not be ready).
 * - The returned `error` ref is normalized to `ApiError` (P4/P5).
 */
export function useApiData<T>(key: string, path: string, defaultVal: T) {
  // Manual client-only fetch instead of Nuxt `useFetch`:
  // - Nuxt's generic `useFetch<T>` typing is unusable for a generic `T`
  //   (`default: () => T` and even the plain return type break on the
  //   `T extends void ? unknown : T` conditional).
  // - We get exact semantics we need: SSG-safe (server: false), graceful
  //   fallback to `defaultVal` while PPB is unreachable, normalized ApiError.
  // - `useState` shares the payload across routes and is serialized to the
  //   prerendered HTML (so the skeleton renders without a client flash).
  const raw = useState<T | null>(key, () => defaultVal)
  const pending = ref(false)
  const error = ref<ApiError | null>(null)

  const data = computed<T>(() => raw.value ?? defaultVal)

  async function refresh(): Promise<void> {
    pending.value = true
    error.value = null
    try {
      raw.value = await apiFetch<T>(path)
    }
    catch (err) {
      error.value = toApiError(err)
    }
    finally {
      pending.value = false
    }
  }

  if (import.meta.client) {
    // Registered from component setup — all callers use these composables in setup.
    onMounted(refresh)
  }

  return { data, error, pending, refresh }
}

/**
 * Append query params to a `/api/v1/...` path (stringified, skips undefined).
 */
export function withQuery(path: string, params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '')
      continue
    if (Array.isArray(v))
      v.forEach(item => search.append(k, String(item)))
    else
      search.set(k, String(v))
  }
  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}
