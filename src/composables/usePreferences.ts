import type { GuestPreferences, ThemeMode } from '~/types/preferences'
import { usePreferredDark } from '@vueuse/core'

export type ResolvedTheme = 'light' | 'dark'

/** Resolve `system` against the OS preference. Pure + testable. */
export function resolveTheme(theme: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (theme === 'light')
    return 'light'
  if (theme === 'dark')
    return 'dark'
  return prefersDark ? 'dark' : 'light'
}

/** Apply preference-derived data attributes + `.dark` class to <html>. */
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
    resolvedTheme,
    apply,
  }
}
