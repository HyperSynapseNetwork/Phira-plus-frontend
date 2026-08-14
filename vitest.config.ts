import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

/**
 * Vitest config for unit/component tests (design §26.3).
 *
 * Current tests cover logic-level contracts (error envelope, preferences, API helpers,
 * context window manager) and run in the `node` environment. Nuxt
 * auto-imports used by stores/composables (`useState`, `watch`) are stubbed
 * in `tests/setup.ts`.
 */
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.spec.ts'],
    setupFiles: ['tests/setup.ts'],
    css: false,
  },
  resolve: {
    alias: {
      '~': new URL('./src', import.meta.url).pathname,
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
})
