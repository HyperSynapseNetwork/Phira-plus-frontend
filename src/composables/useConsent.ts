/**
 * Cookie / analytics consent (design §23.3).
 *
 * - **Necessary** cookies/storage are ALWAYS allowed (session cookie from PPB,
 *   i18n locale cookie, localStorage guest prefs) — no consent required.
 * - **Analytics** (non-essential tracker) is opt-IN. Until the user chooses,
 *   `analytics === false` and the ConsentBanner is shown.
 * - Consent is stored locally (`ppf:consent`). No fingerprinting, no third
 *   party contact until the user opts in AND a provider is configured.
 */

export interface ConsentState {
  /** Functional/necessary storage — always true. */
  necessary: boolean
  /** Non-essential analytics — opt-in. */
  analytics: boolean
}

export type ConsentKind = keyof ConsentState

const STORAGE_KEY = 'ppf:consent'
const DEFAULT_STATE: ConsentState = { necessary: true, analytics: false }

function readStored(): ConsentState | null {
  if (!import.meta.client)
    return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return null
    const parsed = JSON.parse(raw) as Partial<ConsentState>
    return {
      necessary: parsed.necessary !== false,
      analytics: parsed.analytics === true,
    }
  }
  catch {
    return null
  }
}

function persist(state: ConsentState): void {
  if (!import.meta.client)
    return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
  catch {
    // Private mode / quota — consent stays in-memory for the session.
  }
}

export function useConsent() {
  const state = useState<ConsentState>('ppf:consent', () => readStored() ?? { ...DEFAULT_STATE })

  // On the client, override the SSR-serialized payload with the actual stored
  // consent (a returning user's decision must not be lost across navigations).
  if (import.meta.client) {
    const stored = readStored()
    if (stored)
      state.value = stored
  }

  /** True until the user has made an analytics decision. */
  const needsDecision = computed(() => {
    if (state.value.analytics === true)
      return false
    return readStored() === null
  })
  const analyticsAllowed = computed(() => state.value.analytics === true)

  function grantAnalytics(): void {
    state.value = { ...state.value, analytics: true }
    persist(state.value)
  }

  function declineAnalytics(): void {
    state.value = { ...state.value, analytics: false }
    persist(state.value)
  }

  return { state, needsDecision, analyticsAllowed, grantAnalytics, declineAnalytics }
}
