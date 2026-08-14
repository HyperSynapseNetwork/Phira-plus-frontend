/**
 * Guest preferences (DESIGN §21.3, contracts README §7).
 *
 * Unauthenticated users can set theme/accent/background/reduced-motion/
 * low-performance locally. Once authenticated, fields are merged into the
 * PPB account preference namespaces (`common` / `ppf`) per-field, and device
 * prefs (`lowPerformance`) stay local-only.
 *
 * The stored shape mirrors the future PPB namespaces so migration is trivial:
 *   { common: {...}, ppf: {...}, device: {...} }
 */

export type ThemeMode = 'dark' | 'light' | 'system'
export type AccentKey = 'cyan' | 'blue' | 'violet' | 'green' | 'amber'
export type BackgroundKey = 'atmosphere' | 'mesh' | 'particles' | 'none'
export type BackgroundQuality = 'auto' | 'original'
export type LocaleCode = 'zh' | 'en'

export interface GuestPreferences {
  /** common namespace */
  theme: ThemeMode
  accent: AccentKey
  language: LocaleCode
  reducedMotion: boolean
  reducedTransparency: boolean
  /** account-scoped PPF appearance */
  background: BackgroundKey
  backgroundIntensity: number // 0..1
  particles: boolean
  /** device-scoped rendering / local appearance */
  /** Custom solid background color (hex, e.g. `#0a0a0a`); never synced to PPB. */
  backgroundCustom: string | null
  /** Background asset quality is rendering/device specific and never synced. */
  backgroundQuality: BackgroundQuality
  lowPerformance: boolean
}

/** Shape persisted to localStorage (mirrors PPB namespaces for later merge). */
export interface StoredGuestPreferences {
  common: Pick<GuestPreferences, 'theme' | 'accent' | 'language' | 'reducedMotion' | 'reducedTransparency'>
  ppf: Pick<GuestPreferences, 'background' | 'backgroundIntensity' | 'particles'>
  device: Pick<GuestPreferences, 'backgroundCustom' | 'backgroundQuality' | 'lowPerformance'>
}

export const DEFAULT_GUEST_PREFERENCES: GuestPreferences = {
  theme: 'dark',
  accent: 'cyan',
  language: 'zh',
  reducedMotion: false,
  reducedTransparency: false,
  background: 'atmosphere',
  backgroundCustom: null,
  backgroundIntensity: 0.8,
  backgroundQuality: 'auto',
  particles: false,
  lowPerformance: false,
}

export const STORAGE_KEY = 'ppf:guest-preferences'

export const ACCENT_KEYS: AccentKey[] = ['cyan', 'blue', 'violet', 'green', 'amber']
export const BACKGROUND_KEYS: BackgroundKey[] = ['atmosphere', 'mesh', 'particles', 'none']

export function isAccentKey(value: string): value is AccentKey {
  return (ACCENT_KEYS as string[]).includes(value)
}

export function isBackgroundKey(value: string): value is BackgroundKey {
  return (BACKGROUND_KEYS as string[]).includes(value)
}

export function isBackgroundQuality(value: string): value is BackgroundQuality {
  return value === 'auto' || value === 'original'
}

export function isThemeMode(value: string): value is ThemeMode {
  return value === 'dark' || value === 'light' || value === 'system'
}

export function isLocaleCode(value: string): value is LocaleCode {
  return value === 'zh' || value === 'en'
}

/** 3- or 6-digit hex color (`#fff` / `#0a0a0a`) — mirrors `src/utils/color.ts`. */
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
}

/** Every preference key, used to sanitize the persisted lock list. */
export type PreferenceKey = keyof GuestPreferences

export const PREFERENCE_KEYS: PreferenceKey[] = [
  'theme',
  'accent',
  'language',
  'reducedMotion',
  'reducedTransparency',
  'background',
  'backgroundCustom',
  'backgroundIntensity',
  'backgroundQuality',
  'particles',
  'lowPerformance',
]

/**
 * Fields locked by default to their HSN brand value (front-end-local lock,
 * Owner round 7). Locked fields render read-only + disabled and are dropped
 * from `update()`; the account-merge path (`applyAccount`) still applies
 * because account prefs are server-authoritative (see `usePreferencesSync`).
 */
export const DEFAULT_LOCKED_FIELDS: PreferenceKey[] = ['accent']

export const LOCKED_STORAGE_KEY = 'ppf:guest-preferences:locked'

/**
 * Sanitize an unknown stored value into a fully-valid GuestPreferences.
 * Pure + defensive: any malformed field falls back to defaults.
 */
export function normalizeGuestPreferences(input: unknown): GuestPreferences {
  if (typeof input !== 'object' || input === null)
    return { ...DEFAULT_GUEST_PREFERENCES }

  const raw = input as Record<string, unknown>
  return {
    theme: isThemeMode(String(raw.theme)) ? String(raw.theme) as ThemeMode : DEFAULT_GUEST_PREFERENCES.theme,
    accent: isAccentKey(String(raw.accent)) ? String(raw.accent) as AccentKey : DEFAULT_GUEST_PREFERENCES.accent,
    language: isLocaleCode(String(raw.language)) ? String(raw.language) as LocaleCode : DEFAULT_GUEST_PREFERENCES.language,
    reducedMotion: typeof raw.reducedMotion === 'boolean' ? raw.reducedMotion : DEFAULT_GUEST_PREFERENCES.reducedMotion,
    reducedTransparency: typeof raw.reducedTransparency === 'boolean'
      ? raw.reducedTransparency
      : DEFAULT_GUEST_PREFERENCES.reducedTransparency,
    background: isBackgroundKey(String(raw.background))
      ? String(raw.background) as BackgroundKey
      : DEFAULT_GUEST_PREFERENCES.background,
    backgroundCustom: isHexColor(raw.backgroundCustom)
      ? raw.backgroundCustom
      : DEFAULT_GUEST_PREFERENCES.backgroundCustom,
    backgroundIntensity: typeof raw.backgroundIntensity === 'number'
      ? Math.min(1, Math.max(0, raw.backgroundIntensity))
      : DEFAULT_GUEST_PREFERENCES.backgroundIntensity,
    backgroundQuality: isBackgroundQuality(String(raw.backgroundQuality))
      ? String(raw.backgroundQuality) as BackgroundQuality
      : DEFAULT_GUEST_PREFERENCES.backgroundQuality,
    particles: typeof raw.particles === 'boolean' ? raw.particles : DEFAULT_GUEST_PREFERENCES.particles,
    lowPerformance: typeof raw.lowPerformance === 'boolean' ? raw.lowPerformance : DEFAULT_GUEST_PREFERENCES.lowPerformance,
  }
}

/** Convert prefs to the namespaced stored shape. */
export function toStoredPreferences(prefs: GuestPreferences): StoredGuestPreferences {
  return {
    common: {
      theme: prefs.theme,
      accent: prefs.accent,
      language: prefs.language,
      reducedMotion: prefs.reducedMotion,
      reducedTransparency: prefs.reducedTransparency,
    },
    ppf: {
      background: prefs.background,
      backgroundIntensity: prefs.backgroundIntensity,
      particles: prefs.particles,
    },
    device: {
      backgroundCustom: prefs.backgroundCustom,
      backgroundQuality: prefs.backgroundQuality,
      lowPerformance: prefs.lowPerformance,
    },
  }
}

export function fromStoredPreferences(stored: unknown): GuestPreferences {
  if (typeof stored !== 'object' || stored === null)
    return { ...DEFAULT_GUEST_PREFERENCES }
  const s = stored as Record<string, unknown>
  const common = (typeof s.common === 'object' && s.common !== null) ? s.common as Record<string, unknown> : {}
  const ppf = (typeof s.ppf === 'object' && s.ppf !== null) ? s.ppf as Record<string, unknown> : {}
  const device = (typeof s.device === 'object' && s.device !== null) ? s.device as Record<string, unknown> : {}
  // Legacy v1 stored backgroundCustom/backgroundQuality under `ppf` even
  // though they were never account-synced. Reading ppf before device preserves
  // those local values once, while all new writes place them under `device`.
  return normalizeGuestPreferences({
    ...DEFAULT_GUEST_PREFERENCES,
    ...common,
    ...ppf,
    ...device,
  })
}
