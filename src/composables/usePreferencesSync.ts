import type { PreferenceNamespace } from '~/utils/api/types'
import { updateAccountPreferences, useAccountPreferences } from '~/composables/useAccountPreferences'
import { useSession } from '~/composables/useSession'
import { guestToAccountPayload, mergeAccountIntoGuest } from '~/utils/preferences'

/**
 * Account ⇄ guest preference sync (design §21, contract §7).
 *
 * When a user is authenticated, PPB `common`/`ppf` account prefs (JSONB +
 * revision, optimistic concurrency) are merged per-field INTO the guest store
 * so the UI reflects the account's saved preferences. Saving writes back with
 * the last-known revision.
 *
 * Device prefs never sync and are never overwritten by the merge.
 */

export function usePreferencesSync() {
  const store = usePreferencesStore()
  const { authenticated } = useSession()

  const common = useAccountPreferences('common')
  const ppf = useAccountPreferences('ppf')

  const syncing = computed(() => common.pending.value || ppf.pending.value)
  const saving = ref(false)
  const lastSavedAt = ref<string | null>(null)
  const syncError = ref<Error | null>(null)

  // Merge account prefs into the guest store as soon as they load.
  watch(
    [common.prefs, ppf.prefs, authenticated],
    () => {
      if (!authenticated.value)
        return
      const merged = mergeAccountIntoGuest(store.prefs, common.prefs.value?.data ?? null, ppf.prefs.value?.data ?? null)
      store.applyAccount(merged)
    },
    { immediate: true },
  )

  async function save(namespace: PreferenceNamespace): Promise<void> {
    if (!authenticated.value)
      return
    saving.value = true
    syncError.value = null
    try {
      const payload = guestToAccountPayload(store.prefs)
      const data = namespace === 'common' ? payload.common : payload.ppf
      const base = namespace === 'common' ? common.prefs.value : ppf.prefs.value
      await updateAccountPreferences({
        namespace,
        data,
        base_revision: base?.revision,
      })
      await (namespace === 'common' ? common.refresh() : ppf.refresh())
      lastSavedAt.value = new Date().toISOString()
    }
    catch (err) {
      syncError.value = err instanceof Error ? err : new Error(String(err))
      throw err
    }
    finally {
      saving.value = false
    }
  }

  async function saveAll(): Promise<void> {
    await save('common')
    await save('ppf')
  }

  return {
    authenticated,
    syncing,
    saving,
    syncError,
    lastSavedAt,
    save,
    saveAll,
  }
}
