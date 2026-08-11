import { vi } from 'vitest'
import { ref, watch } from 'vue'

/**
 * Stub Nuxt auto-imports that stores/composables reference as globals so they
 * can be exercised in a plain Vitest (node) environment.
 *
 * - `useState` returns a fresh `ref` per key per call. Each test re-instantiates
 *   its store/composable, so isolation is preserved.
 * - `watch` is Vue's own watcher.
 */
vi.stubGlobal('useState', (key: string, init?: () => unknown) => {
  void key
  return ref(init ? init() : undefined)
})

vi.stubGlobal('watch', watch)
