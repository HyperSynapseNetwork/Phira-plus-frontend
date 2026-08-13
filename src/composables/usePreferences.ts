import type { GuestPreferences, ThemeMode } from '~/types/preferences'
import { usePreferredDark } from '@vueuse/core'
import { ACCENT_HEX, deriveColorsFromBackground, hexToRgba, hexToRgb, relativeLuminance } from '~/utils/color'

export type ResolvedTheme = 'light' | 'dark'

/** Resolve `system` against the OS preference. Pure + testable. */
export function resolveTheme(theme: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (theme === 'light')
    return 'light'
  if (theme === 'dark')
    return 'dark'
  return prefersDark ? 'dark' : 'light'
}

/**
 * Resolve the rendered accent hex:
 * - custom background color → derived accent (contrast-aware, round 7);
 * - otherwise the stored accent preset (5 presets).
 */
export function resolveAccentHex(prefs: GuestPreferences): string {
  if (prefs.backgroundCustom)
    return deriveColorsFromBackground(prefs.backgroundCustom).accent
  return ACCENT_HEX[prefs.accent]
}

/** Apply preference-derived data attributes + accent CSS vars to <html>. */
export function applyPreferencesToDom(prefs: GuestPreferences, prefersDark: boolean): void {
  if (!import.meta.client)
    return
  const root = document.documentElement
  const resolved = resolveTheme(prefs.theme, prefersDark)

  root.dataset.reducedMotion = String(prefs.reducedMotion)
  root.dataset.reducedTransparency = String(prefs.reducedTransparency)
  root.dataset.lowPerformance = String(prefs.lowPerformance)
  root.dataset.theme = resolved
  root.dataset.accent = prefs.accent
  root.dataset.background = prefs.background
  root.dataset.bgCustom = prefs.backgroundCustom ? 'true' : 'false'

  // Accent + derived foreground/accent colors (round 7). Tailwind v4 utilities
  // (`text-accent`, `bg-accent`, …) compile to `var(--color-accent)`, so
  // overriding the variables here recolors the whole UI at runtime.
  const derived = prefs.backgroundCustom ? deriveColorsFromBackground(prefs.backgroundCustom) : null
  const accentHex = derived?.accent ?? resolveAccentHex(prefs)
  const accentRgb = hexToRgb(accentHex)
  const accentFg = accentRgb && relativeLuminance(accentRgb) > 0.5 ? '#0f172a' : '#f8fafc'

  root.style.setProperty('--color-accent', accentHex)
  root.style.setProperty('--color-accent-strong', accentHex)
  root.style.setProperty('--color-accent-soft', hexToRgba(accentHex, 0.14))
  root.style.setProperty('--color-accent-fg', derived?.accentFg ?? accentFg)
  root.style.setProperty('--color-custom-fg', derived?.fg ?? '')

  // HeroUI theme (light/dark) is driven by the `.dark` class.
  root.classList.toggle('dark', resolved === 'dark')
}

/**
 * Reactive preferences for components.
 * Keeps the resolved theme in sync with the OS preference when in `system` mode.
 */
export function usePreferences() {
  const store = usePreferencesStore()
  const prefersDark = usePreferredDark()

  const resolvedTheme = computed<ResolvedTheme>(() =>
    resolveTheme(store.prefs.theme, prefersDark.value),
  )

  const apply = () => applyPreferencesToDom(store.prefs, prefersDark.value)

  if (import.meta.client) {
    watch([() => store.prefs, prefersDark], apply, { deep: true, immediate: true })
  }

  return {
    store,
    prefs: store.prefs,
    update: store.update,
    reset: store.reset,
    isLocked: store.isLocked,
    lockedFields: store.lockedFields,
    resolvedTheme,
    apply,
  }
}
