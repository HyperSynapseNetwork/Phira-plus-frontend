import type { GuestPreferences } from '~/types/preferences'

/**
 * Three-layer preference merge (design §21, contract §7).
 *
 * Layers:
 *   device  — local only (low-performance, geometry, render scale). Never
 *             synced to the account; never overwritten by guest/account.
 *   guest   — local pre-merge base (dark theme/accent/background/…).
 *   account — PPB namespaced JSONB + revision (`common` | `ppf`). Authoritative
 *             for the overlapping fields once a user is authenticated.
 *
 * Merge order: device < guest < account (per-field). The functions below are
 * pure and defensive — they accept raw `Record<string, unknown>` from the
 * server and only pick known, valid fields.
 */

/** `common` namespace fields we understand (snake_case per contract §7). */
const THEME_KEYS = new Set(['dark'])
const ACCENT_KEYS = new Set(['cyan', 'blue', 'violet', 'green', 'amber'])
const LANGUAGE_KEYS = new Set(['zh', 'en'])
const BACKGROUND_KEYS = new Set(['atmosphere', 'mesh', 'particles', 'none'])

/**
 * Per-field merge of account prefs (raw PPB JSONB) into guest prefs.
 * `common`/`ppf` are the `data` payloads of the namespaced preferences.
 * Returns a NEW object; never mutates `guest`.
 */
export function mergeAccountIntoGuest(
  guest: GuestPreferences,
  common?: Record<string, unknown> | null,
  ppf?: Record<string, unknown> | null,
): GuestPreferences {
  const next: GuestPreferences = { ...guest }
  const c = common ?? {}
  const p = ppf ?? {}

  if (typeof c.theme === 'string' && THEME_KEYS.has(c.theme))
    next.theme = c.theme as GuestPreferences['theme']
  if (typeof c.accent === 'string' && ACCENT_KEYS.has(c.accent))
    next.accent = c.accent as GuestPreferences['accent']
  if (typeof c.language === 'string' && LANGUAGE_KEYS.has(c.language))
    next.language = c.language as GuestPreferences['language']
  if (typeof c.reduced_motion === 'boolean')
    next.reducedMotion = c.reduced_motion
  if (typeof c.reduced_transparency === 'boolean')
    next.reducedTransparency = c.reduced_transparency

  if (typeof p.background === 'string' && BACKGROUND_KEYS.has(p.background))
    next.background = p.background as GuestPreferences['background']
  if (typeof p.background_intensity === 'number')
    next.backgroundIntensity = Math.min(1, Math.max(0, p.background_intensity))
  if (typeof p.particles === 'boolean')
    next.particles = p.particles

  return next
}

/**
 * Guest prefs → account payload (snake_case) for the `common`/`ppf` namespaces.
 * Only the overlapping fields are sent; device prefs are excluded.
 */
export function guestToAccountPayload(guest: GuestPreferences): {
  common: Record<string, unknown>
  ppf: Record<string, unknown>
} {
  return {
    common: {
      theme: guest.theme,
      accent: guest.accent,
      language: guest.language,
      reduced_motion: guest.reducedMotion,
      reduced_transparency: guest.reducedTransparency,
    },
    ppf: {
      background: guest.background,
      background_intensity: guest.backgroundIntensity,
      particles: guest.particles,
    },
  }
}
