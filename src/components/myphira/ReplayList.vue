<script setup lang="ts">
import type { Replay, ReplayVisibility } from '~/utils/api/types'

const props = withDefaults(defineProps<{ replays: Replay[], manage?: boolean }>(), { manage: false })
const emit = defineEmits<{ changed: [] }>()
const { t, locale } = useI18n()
const notice = useNotice()
const busy = ref<string | null>(null)

const visibilities: ReplayVisibility[] = ['inherit', 'public', 'friends', 'unlisted', 'private', 'custom']
const visibilityKey: Record<ReplayVisibility, string> = {
  inherit: 'myphira.visibilityInherit', public: 'myphira.visibilityPublic', friends: 'myphira.visibilityFriends',
  unlisted: 'myphira.visibilityUnlisted', private: 'myphira.visibilityPrivate', custom: 'myphira.visibilityCustom',
}
function formatDate(value: string): string {
  const d = new Date(value); if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale.value === 'en' ? 'en-US' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}
function hasValidDate(value: string): boolean { return Boolean(value) && !Number.isNaN(new Date(value).getTime()) }
async function changeVisibility(replay: Replay, value: ReplayVisibility) {
  busy.value = `${replay.id}:visibility`
  try { await setReplayVisibility(replay.round_uuid, replay.player_phira_id, value); notice.success('notice.saved'); emit('changed') }
  catch (err) { notice.errorFromApi(err) } finally { busy.value = null }
}
async function createShare(replay: Replay) {
  busy.value = `${replay.id}:share`
  try {
    const result = await createReplayShareLink(replay.round_uuid, replay.player_phira_id)
    const url = `${window.location.origin}/replay/share/${encodeURIComponent(result.token)}`
    await navigator.clipboard.writeText(url)
    notice.success('notice.copied'); emit('changed')
  } catch (err) { notice.errorFromApi(err) } finally { busy.value = null }
}
async function revokeShare(replay: Replay, linkId: string) {
  busy.value = `${replay.id}:${linkId}`
  try { await revokeReplayShareLink(replay.round_uuid, replay.player_phira_id, linkId); notice.success('notice.saved'); emit('changed') }
  catch (err) { notice.errorFromApi(err) } finally { busy.value = null }
}
</script>

<template>
  <p v-if="!replays.length" class="text-sm text-slate-400">{{ t('myphira.noReplays') }}</p>
  <ul v-else class="divide-y divide-white/10 border-y border-white/10">
    <li v-for="replay in replays" :key="replay.id" class="py-3">
      <div class="flex flex-wrap items-center gap-3">
        <div class="min-w-0 flex-1">
          <NuxtLink :to="{ path: `/replay/${encodeURIComponent(replay.round_uuid)}`, query: { player_id: replay.player_phira_id } }" class="truncate text-sm font-medium text-slate-100 hover:text-accent">
            {{ replay.chart_name || `${t('live.round')} ${replay.round_uuid}` }}
          </NuxtLink>
          <p v-if="hasValidDate(replay.created_at)" class="mt-0.5 text-xs text-slate-400">{{ formatDate(replay.created_at) }}</p>
        </div>
        <span class="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-300 ring-1 ring-white/10">{{ t(visibilityKey[replay.visibility]) }}</span>
      </div>
      <details v-if="manage" class="mt-2 text-sm">
        <summary class="cursor-pointer text-xs text-accent">{{ t('myphira.manageReplay') }}</summary>
        <div class="mt-3 space-y-3 border-l border-white/10 pl-3">
          <label class="block">
            <span class="mb-1 block text-xs text-slate-400">{{ t('myphira.visibility') }}</span>
            <PPSelect :model-value="replay.visibility" compact class="w-44" :disabled="busy !== null" @update:model-value="value => changeVisibility(replay, value as ReplayVisibility)">
              <option v-for="visibility in visibilities" :key="visibility" :value="visibility">{{ t(visibilityKey[visibility]) }}</option>
            </PPSelect>
          </label>
          <div class="flex flex-wrap items-center gap-2">
            <PPButton size="sm" weight="quiet" :disabled="busy !== null" @click="createShare(replay)">{{ t('myphira.createShare') }}</PPButton>
            <span class="text-xs text-slate-500">{{ t('myphira.shareTokenOnce') }}</span>
          </div>
          <ul v-if="replay.share_links?.length" class="space-y-1">
            <li v-for="link in replay.share_links" :key="link.id" class="flex items-center justify-between gap-2 text-xs text-slate-400">
              <span class="truncate">{{ link.id }}<span v-if="link.revoked_at"> · {{ t('myphira.revoked') }}</span></span>
              <PPButton v-if="!link.revoked_at" size="sm" weight="quiet" :disabled="busy !== null" @click="revokeShare(replay, link.id)">{{ t('myphira.revokeShare') }}</PPButton>
            </li>
          </ul>
        </div>
      </details>
    </li>
  </ul>
</template>
