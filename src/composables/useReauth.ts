import { $fetch } from 'ofetch'
import { getApiBase } from '~/utils/api/client'
import { ensureCsrfToken, getCsrfToken } from '~/utils/api/csrf'
import { ApiError } from '~/utils/api/types'

/**
 * Elevated reauth (contract §20 / P11, Gate 0).
 *
 * PPB requires an elevated reauth context for sensitive operations such as
 * notification actions/inputs. Flow:
 *   1. caller attempts the operation (e.g. `POST /api/v1/notifications/{id}/action`)
 *   2. if it fails with reauth-required (401 / PHIRA_REAUTH_REQUIRED), the caller
 *      runs `withReauth(...)`: we show a password prompt (`ReauthDialog`),
 *      call `POST /api/v1/auth/phira/reauth { password, client_type }`, receive a
 *      short-lived reauth JWT (TTL 5min, contract P11) via the `X-Reauth-Token`
 *      response header, and retry the operation with that header.
 *   3. cancellation / failure resolves to an explicit error (never silent).
 *
 * The reauth POST is CSRF-protected (§20) — we attach `X-CSRF-Token` from /me.
 */

export interface ReauthState {
  open: boolean
  resolve: ((token: string | null) => void) | null
}

const REAUTH_KEY = 'ppf:reauth'

/** True when a thrown error is an elevated-reauth rejection. */
export function isReauthRequired(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.code === 'PHIRA_REAUTH_REQUIRED'
      || err.code === 'AUTH'
      || err.status === 401
  }
  return false
}

export function useReauth() {
  const state = useState<ReauthState>(REAUTH_KEY, () => ({ open: false, resolve: null }))
  const isReauthOpen = computed(() => state.value.open)

  /** Show the reauth dialog; resolves with the token or null (cancelled/failed). */
  function requestReauth(): Promise<string | null> {
    return new Promise((resolve) => {
      state.value.resolve = resolve
      state.value.open = true
    })
  }

  function settleReauth(token: string | null): void {
    const r = state.value.resolve
    state.value.resolve = null
    state.value.open = false
    r?.(token)
  }

  function cancelReauth(): void {
    settleReauth(null)
  }

  /** Call PPB reauth with the Phira password; returns the reauth token or null. */
  async function reauth(password: string): Promise<string | null> {
    try {
      const base = getApiBase()
      const csrf = getCsrfToken() ?? await ensureCsrfToken()
      const res = await $fetch.raw<{ reauth_token?: string }>(`${base}/api/v1/auth/phira/reauth`, {
        method: 'POST',
        body: { password, client_type: 'ppf' },
        credentials: 'include',
        retry: 0,
        headers: csrf ? { 'X-CSRF-Token': csrf } : {},
      })
      const headerToken = res.headers.get('x-reauth-token') ?? res.headers.get('X-Reauth-Token')
      const bodyToken = res._data?.reauth_token
      return headerToken || bodyToken || null
    }
    catch {
      return null
    }
  }

  /**
   * Run a sensitive operation, transparently prompting for reauth on rejection.
   * `fn(token?)` is invoked first without a token; if reauth-required, the user
   * is prompted and `fn` is retried with the reauth token. Throws the original
   * error if reauth fails or is cancelled (caller surfaces it).
   */
  async function withReauth<T>(fn: (reauthToken?: string) => Promise<T>): Promise<T> {
    try {
      return await fn()
    }
    catch (err) {
      if (!isReauthRequired(err))
        throw err
      const token = await requestReauth()
      if (!token)
        throw new ApiError({ code: 'AUTH', message: 'Reauth cancelled or failed' })
      return await fn(token)
    }
  }

  return { state, isReauthOpen, requestReauth, settleReauth, cancelReauth, reauth, withReauth }
}
