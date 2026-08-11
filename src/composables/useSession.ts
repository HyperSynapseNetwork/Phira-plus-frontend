import type { SessionState } from '~/utils/api/types'
import { apiFetch } from '~/utils/api/client'

/**
 * PPF session state.
 *
 * - PPB issues an HttpOnly session cookie (P9); PPF never sees Phira tokens.
 * - `/api/v1/me/profile` probes the session; a 401 just yields the empty state.
 * - Auth gateway URL follows P13: `{authBase}/auth/phira/login?return_to=<relative>`.
 */
const EMPTY_SESSION: SessionState = { authenticated: false }

export function useSession() {
  const config = useRuntimeConfig()
  const authBase = config.public.authBase as string

  const { data, error, refresh, pending } = useApiData<SessionState>('ppf:session', '/api/v1/me/profile', EMPTY_SESSION)

  const authenticated = computed(() => Boolean(data.value?.authenticated))
  const profile = computed(() => (data.value?.authenticated ? data.value.profile : undefined))
  const identities = computed(() => data.value?.identities ?? [])
  const requiresReauth = computed(() => Boolean(data.value?.phira_reauth_required))

  /** P13: build the PPB auth gateway URL with a relative, whitelisted return_to. */
  function loginUrl(returnTo: string): string {
    const safe = returnTo.startsWith('/') ? returnTo : '/'
    return `${authBase}/auth/phira/login?return_to=${encodeURIComponent(safe)}`
  }

  async function logout(): Promise<void> {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' })
    }
    catch {
      // Ignore — best-effort; refresh will reflect the new state.
    }
    finally {
      await refresh()
    }
  }

  return {
    data,
    error,
    pending,
    authenticated,
    profile,
    identities,
    requiresReauth,
    loginUrl,
    logout,
    refresh,
  }
}
