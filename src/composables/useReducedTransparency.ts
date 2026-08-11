import { useMediaQuery } from '@vueuse/core'

/**
 * OS-level `prefers-reduced-transparency: reduce` media query.
 * The explicit guest preference lives in the preferences store
 * (and is applied via `data-reduced-transparency` on <html>).
 */
export function useReducedTransparency() {
  return useMediaQuery('(prefers-reduced-transparency: reduce)')
}
