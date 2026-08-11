import { useMediaQuery } from '@vueuse/core'

/**
 * Low-performance mode (design §22.8).
 *
 * A device-local preference (guest prefs) OR the OS
 * `prefers-reduced-transparency` hint may enable it. It disables
 * backdrop blur, particles, shadows/glow, and expensive transitions.
 */
export function useLowPerformance() {
  const store = usePreferencesStore()
  const forceReduced = useMediaQuery('(prefers-reduced-motion: reduce)')

  const enabled = computed(() => store.prefs.lowPerformance || forceReduced.value)

  return { enabled, force: computed(() => store.prefs.lowPerformance) }
}
