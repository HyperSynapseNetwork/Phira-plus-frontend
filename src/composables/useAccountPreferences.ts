import type { NamespacedPreferences, PreferenceNamespace, UpdatePreferencesBody } from '~/features/preferences/types'
import { apiFetch, getApiBase } from '~/utils/api/client'

/**
 * Account preferences (contract §7, design §21.1/§21.2).
 *
 * - PPB stores namespaced JSONB + revision (`common | ppf | panel | experiments`).
 * - Account prefs must NEVER live only in localStorage.
 * - Device prefs (low-performance, render scale, window geometry) stay local.
 * - Guest prefs merge per-field on login — they do not overwrite device settings.
 *
 * Frozen REST mappings for `/api/v1/me/preferences/*`:
 *   GET  /api/v1/me/preferences/{namespace}
 *   PUT  /api/v1/me/preferences/{namespace}  { data, base_revision }
 */

export function useAccountPreferences(namespace: PreferenceNamespace) {
  const path = computed(() => `/api/v1/me/preferences/${namespace}`)
  const { data, error, pending, refresh } = useFetch<NamespacedPreferences | null>(path, {
    baseURL: getApiBase(),
    credentials: 'include',
    retry: 0,
    server: false,
    lazy: true,
    default: () => null,
  })
  return { prefs: data, error, pending, refresh }
}

export async function updateAccountPreferences(body: UpdatePreferencesBody): Promise<NamespacedPreferences> {
  return apiFetch<NamespacedPreferences>(`/api/v1/me/preferences/${body.namespace}`, {
    method: 'PUT',
    body: { data: body.data, base_revision: body.base_revision },
  })
}
