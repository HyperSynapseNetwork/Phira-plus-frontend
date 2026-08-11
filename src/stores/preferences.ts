import type { GuestPreferences } from '~/types/preferences'
import { defineStore } from 'pinia'
import {
  DEFAULT_GUEST_PREFERENCES,
  fromStoredPreferences,

  STORAGE_KEY,
  toStoredPreferences,
} from '~/types/preferences'

function readStored(): GuestPreferences | null {
  if (!import.meta.client)
    return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return null
    return fromStoredPreferences(JSON.parse(raw))
  }
  catch {
    return null
  }
}

function persist(prefs: GuestPreferences): void {
  if (!import.meta.client)
    return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStoredPreferences(prefs)))
  }
  catch {
    // localStorage unavailable (private mode / quota) — ignore, prefs stay in memory.
  }
}

/**
 * Guest preferences store (design §21.3).
 *
 * Local-only for now; the `common`/`ppf` namespaces mirror PPB account
 * preferences so a logged-in user's fields can be merged per-field later
 * (contracts README §7) without overwriting device settings wholesale.
 */
export const usePreferencesStore = defineStore('ppf:preferences', () => {
  const prefs = useState<GuestPreferences>('ppf:guest-preferences', () => readStored() ?? { ...DEFAULT_GUEST_PREFERENCES })

  // Hydrate local guest prefs on the client and persist any change.
  if (import.meta.client) {
    const stored = readStored()
    if (stored)
      prefs.value = stored
    watch(prefs, v => persist(v), { deep: true })
  }

  function update(patch: Partial<GuestPreferences>): void {
    prefs.value = { ...prefs.value, ...patch }
  }

  function reset(): void {
    prefs.value = { ...DEFAULT_GUEST_PREFERENCES }
  }

  return { prefs, update, reset }
})

/** Convenience accessor used by the preferences UI. */
export function useGuestPreferences() {
  return usePreferencesStore()
}
