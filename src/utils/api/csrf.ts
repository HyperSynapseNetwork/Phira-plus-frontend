import type { MeResponse } from './types'
import { $fetch } from 'ofetch'

/**
 * CSRF token management (contract §20, S-1 / Gate 0).
 *
 * PPB redesigned CSRF: the server issues a token via `GET /api/v1/me`, and the
 * client sends it back on every state-changing request via the `X-CSRF-Token`
 * header (the browser also sends `Origin` on cross-origin POSTs, which PPB
 * validates). We NEVER read the API-domain cookie from PPF.
 *
 * The token rotates when the session refreshes, so the API client invalidates
 * and re-fetches it once on a rejected write.
 *
 * This module is intentionally self-contained (no import of `./client`) so the
 * API client can depend on it without a circular import.
 */

let csrfToken: string | null = null
let csrfPromise: Promise<string | null> | null = null

export function getCsrfToken(): string | null {
  return csrfToken
}

export function setCsrfToken(token: string | null): void {
  csrfToken = token
}

export function invalidateCsrfToken(): void {
  csrfToken = null
}

/** Fetch `/api/v1/me` once to obtain a CSRF token (GET — no CSRF needed). */
export function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken)
    return Promise.resolve(csrfToken)
  if (!csrfPromise) {
    csrfPromise = (async () => {
      try {
        const base = useRuntimeConfig().public.apiBase as string
        const data = await $fetch<MeResponse>(`${base}/api/v1/me`, {
          credentials: 'include',
          retry: 0,
        })
        if (data && typeof data.csrf_token === 'string')
          csrfToken = data.csrf_token
      }
      catch {
        // 401 → unauthenticated; writes will surface AUTH and the UI handles it.
      }
      return csrfToken
    })()
    csrfPromise.finally(() => {
      csrfPromise = null
    })
  }
  return csrfPromise
}

/** True for state-changing HTTP methods that require a CSRF token. */
export function isWriteMethod(method?: string): boolean {
  const m = (method ?? 'get').toUpperCase()
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE'
}
