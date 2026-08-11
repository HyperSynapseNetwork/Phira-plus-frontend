import { usePreferences } from '~/composables/usePreferences'
import { usePreferencesStore } from '~/stores/preferences'

/**
 * Client-only: apply guest preferences to <html> (data attributes + `.dark`
 * class) on boot and keep them in sync. Preferences default to OFF, so this
 * is a no-op until the user opts in.
 */
export default defineNuxtPlugin(() => {
  const store = usePreferencesStore()
  usePreferences() // installs the reactive watcher that calls apply()
  return {
    provide: {
      preferencesStore: store,
    },
  }
})
