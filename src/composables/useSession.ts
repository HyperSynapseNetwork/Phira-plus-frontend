import type { Identity, MeResponse } from '~/utils/api/types'
import { apiFetch } from '~/utils/api/client'

/**
 * PPF session state (contract §20 / Gate 0).
 *
 * - `GET /api/v1/me` is the ONLY session probe: `{principal, user,
 *   permissions[], capabilities[], session}` + a `csrf_token` for writes.
 *   `/api/v1/me/profile` is NOT used as a probe anymore.
 * - The CSRF token is captured automatically by the API client's `onResponse`
 *   hook and attached to state-changing requests.
 * - PPB issues an HttpOnly session cookie (P9); PPF never sees Phira tokens.
 * - Auth gateway URL follows P13: `{authBase}/auth/phira/login?return_to=<relative>`.
 */
const EMPTY_ME: MeResponse = {
  csrf_token: '',
  principal: null,
  user: null,
  permissions: [],
  capabilities: [],
  session: null,
}

export function useSession() {
  const config = useRuntimeConfig()
  const authBase = config.public.authBase as string

  const { data, error, refresh, pending } = useApiData<MeResponse>('ppf:session', '/api/v1/me', EMPTY_ME)

  const authenticated = computed(() => Boolean(data.value.user) || Boolean(data.value.principal))
  const profile = computed(() => data.value.user ?? undefined)
  const permissions = computed(() => data.value.permissions ?? [])
  const capabilities = computed(() => data.value.capabilities ?? [])
  const session = computed(() => data.value.session ?? undefined)

  // The new /me probe may omit reauth status; legacy field read defensively.
  const requiresReauth = computed(() =>
    Boolean((data.value as unknown as { phira_reauth_required?: boolean }).phira_reauth_required),
  )
  // Identities are a separate `/api/v1/me/identities` call; exposed as [] for now.
  const identities = computed<Identity[]>(() => [])

  /** P13: build the PPB auth gateway URL with a relative, whitelisted return_to. */
  function loginUrl(returnTo: string): string {
    const safe = returnTo.startsWith('/') ? returnTo : '/'
    return `${authBase}/auth/phira/login?return_to=${encodeURIComponent(safe)}`
  }

  async function logout(): Promise<void> {
    try {
      // POST /auth/logout carries the CSRF token via apiFetch (contract §20).
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
    permissions,
    capabilities,
    session,
    requiresReauth,
    loginUrl,
    logout,
    refresh,
  }
}
