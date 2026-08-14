<script setup lang="ts">
import type { MyPrivacySettings, ReplayVisibility } from '~/utils/api/types'
import { apiFetch, getApiBase } from '~/utils/api/client'

const { t } = useI18n()
const notice = useNotice()
const { data, pending, error, refresh } = useFetch<MyPrivacySettings>('/api/v1/me/privacy', {
  baseURL: getApiBase(),
  credentials: 'include',
  retry: 0,
  server: false,
  lazy: true,
  default: (): MyPrivacySettings => ({ profile_visibility: 'public', show_online_status: true, show_recent_activity: true }),
})
const { data: ppfPref, refresh: refreshPpfPref } = useFetch<{ namespace?: string, revision?: number, json_data?: Record<string, unknown> }>('/api/v1/me/preferences/ppf', {
  baseURL: getApiBase(),
  credentials: 'include',
  retry: 0,
  server: false,
  lazy: true,
})
const saving = ref(false)
const replayVisibility = ref<ReplayVisibility>('public')
watch(() => ppfPref.value, (value) => {
  const raw = value?.json_data?.replay_default_visibility
  if (typeof raw === 'string' && ['public', 'friends', 'unlisted', 'private'].includes(raw))
    replayVisibility.value = raw as ReplayVisibility
}, { immediate: true })

async function save(): Promise<void> {
  if (saving.value)
    return
  saving.value = true
  try {
    const privacy = await apiFetch<MyPrivacySettings>('/api/v1/me/privacy', {
      method: 'PUT',
      body: {
        profile_visibility: data.value.profile_visibility,
        show_online_status: data.value.show_online_status,
        show_recent_activity: data.value.show_recent_activity,
      },
    })
    data.value = privacy
    const existing = ppfPref.value?.json_data ?? {}
    await apiFetch('/api/v1/me/preferences/ppf', {
      method: 'PUT',
      body: {
        data: { ...existing, replay_default_visibility: replayVisibility.value },
        base_revision: ppfPref.value?.revision,
      },
    })
    await refreshPpfPref()
    notice.success('notice.saved', undefined, { dedupKey: 'privacy:save' })
  }
  catch (err) {
    notice.errorFromApi(err, { dedupKey: 'privacy:save:error' })
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <p v-if="pending" class="text-sm text-slate-400">
      {{ t('common.loading') }}
    </p>
    <div v-else-if="error" class="flex items-center justify-between gap-3 text-sm text-rose-300" role="alert">
      <span>{{ t('common.error') }}</span>
      <button type="button" class="text-accent hover:underline" @click="() => refresh()">
        {{ t('common.retry') }}
      </button>
    </div>
    <template v-else>
      <label class="block">
        <span class="mb-1 block text-sm text-slate-300">{{ t('myphira.profileVisibility') }}</span>
        <PPSelect v-model="data.profile_visibility">
          <option value="public">{{ t('myphira.visibilityPublic') }}</option>
          <option value="friends">{{ t('myphira.visibilityFriends') }}</option>
          <option value="private">{{ t('myphira.visibilityPrivate') }}</option>
        </PPSelect>
      </label>
      <div class="flex items-center justify-between gap-3 border-y border-[var(--pp-border-subtle)] py-3">
        <span class="text-sm text-[var(--pp-text-secondary)]">{{ t('myphira.showOnlineStatus') }}</span>
        <PPSwitch v-model="data.show_online_status" />
      </div>
      <div class="flex items-center justify-between gap-3 border-b border-[var(--pp-border-subtle)] pb-3">
        <span class="text-sm text-[var(--pp-text-secondary)]">{{ t('myphira.showRecentActivity') }}</span>
        <PPSwitch v-model="data.show_recent_activity" />
      </div>
      <label class="block">
        <span class="mb-1 block text-sm text-slate-300">{{ t('myphira.replayDefaultVisibility') }}</span>
        <PPSelect v-model="replayVisibility">
          <option value="public">{{ t('myphira.visibilityPublic') }}</option>
          <option value="friends">{{ t('myphira.visibilityFriends') }}</option>
          <option value="unlisted">{{ t('myphira.visibilityUnlisted') }}</option>
          <option value="private">{{ t('myphira.visibilityPrivate') }}</option>
        </PPSelect>
      </label>
      <div class="flex justify-end">
        <PPButton :disabled="saving" @click="save">
          {{ saving ? t('common.loading') : t('common.save') }}
        </PPButton>
      </div>
    </template>
  </div>
</template>
