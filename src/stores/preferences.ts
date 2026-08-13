import type { GuestPreferences, PreferenceKey } from '~/types/preferences'
import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  DEFAULT_GUEST_PREFERENCES,
  DEFAULT_LOCKED_FIELDS,
  fromStoredPreferences,
  LOCKED_STORAGE_KEY,
  PREFERENCE_KEYS,
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

/** Read the front-end-local lock list (defaults to the HSN brand lock). */
function readLocked(): PreferenceKey[] {
  if (!import.meta.client)
    return [...DEFAULT_LOCKED_FIELDS]
  try {
    const raw = localStorage.getItem(LOCKED_STORAGE_KEY)
    if (!raw)
      return [...DEFAULT_LOCKED_FIELDS]
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed))
      return [...DEFAULT_LOCKED_FIELDS]
    return parsed.filter((k): k is PreferenceKey => PREFERENCE_KEYS.includes(k as PreferenceKey))
  }
  catch {
    return [...DEFAULT_LOCKED_FIELDS]
  }
}

function persistLocked(locked: PreferenceKey[]): void {
  if (!import.meta.client)
    return
  try {
    localStorage.setItem(LOCKED_STORAGE_KEY, JSON.stringify(locked))
  }
  catch {
    // ignore — lock stays in memory only.
  }
}

/**
 * Guest preferences store (design §21.3, Owner round 7).
 *
 * Local-only for now; the `common`/`ppf` namespaces mirror PPB account
 * preferences so a logged-in user's fields can be merged per-field later
 * (contracts README §7) without overwriting device settings wholesale.
 *
 * Locking (front-end-local, round 7): `lockedFields` holds the HSN brand-locked
 * keys (default `accent`). `update()` drops locked keys so a user cannot edit
 * them; `applyAccount()` is the separate authoritative path used by
 * `usePreferencesSync` so account prefs still merge per the three-layer rule.
 */
export const usePreferencesStore = defineStore('ppf:preferences', () => {
  const prefs = useState<GuestPreferences>('ppf:guest-preferences', () => readStored() ?? { ...DEFAULT_GUEST_PREFERENCES })
  const lockedFields = ref<PreferenceKey[]>(readLocked())

  // Hydrate local guest prefs on the client and persist any change.
  if (import.meta.client) {
    const stored = readStored()
    if (stored)
      prefs.value = stored
    watch(prefs, v => persist(v), { deep: true })

    // Materialize the lock list into localStorage on first run so the front-end
    // state layer can be inspected / overridden by an external (future backend) writer.
    try {
      if (localStorage.getItem(LOCKED_STORAGE_KEY) === null)
        persistLocked(lockedFields.value)
    }
    catch {
      // ignore — lock stays in memory only.
    }
  }

  function isLocked(key: PreferenceKey): boolean {
    return lockedFields.value.includes(key)
  }

  function update(patch: Partial<GuestPreferences>): void {
    const filtered = { ...patch }
    for (const key of lockedFields.value)
      delete filtered[key]
    prefs.value = { ...prefs.value, ...filtered }
  }

  /** Account-merge path: authoritative, bypasses the front-end lock. */
  function applyAccount(merged: GuestPreferences): void {
    prefs.value = { ...merged }
  }

  function reset(): void {
    prefs.value = { ...DEFAULT_GUEST_PREFERENCES }
  }

  return { prefs, lockedFields, isLocked, update, applyAccount, reset }
})

/** Convenience accessor used by the preferences UI. */
export function useGuestPreferences() {
  return usePreferencesStore()
}
