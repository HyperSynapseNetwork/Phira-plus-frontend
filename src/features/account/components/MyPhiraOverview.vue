<script setup lang="ts">
import type { MyMultiplayerSummary } from '~/features/account/types'
import type { Replay } from '~/features/replay/types'
import ReplayList from '~/components/myphira/ReplayList.vue'

const props = defineProps<{
  summary: { label: string, value?: string }[]
  replays: Replay[]
  replaysPending: boolean
  replaysError: unknown
  multiplayer?: MyMultiplayerSummary
  multiplayerPending: boolean
  multiplayerError: unknown
}>()
const emit = defineEmits<{
  open: [tab: 'replay' | 'multiplayer']
  refreshReplays: []
  refreshMultiplayer: []
}>()
const { t } = useI18n()

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`
}
</script>

<template>
  <div class="space-y-6">
    <dl v-if="props.summary.length" class="flex flex-wrap gap-x-8 gap-y-3 border-y border-[var(--pp-border-subtle)] py-4">
      <div v-for="item in props.summary" :key="item.label" class="min-w-24">
        <dt class="text-xs text-[var(--pp-text-tertiary)]">
          {{ item.label }}
        </dt>
        <dd class="mt-1 text-lg font-semibold text-[var(--pp-text-primary)]">
          {{ item.value ?? t('common.loading') }}
        </dd>
      </div>
    </dl>

    <section>
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--pp-text-secondary)]">
          {{ t('myphira.recentReplay') }}
        </h2>
        <PPButton weight="quiet" size="sm" @click="emit('open', 'replay')">
          {{ t('common.open') }}
        </PPButton>
      </div>
      <p v-if="props.replaysPending" class="py-4 text-sm text-[var(--pp-text-secondary)]">
        {{ t('common.loading') }}
      </p>
      <div v-else-if="props.replaysError" class="border-y border-[var(--pp-border-subtle)] py-4">
        <p class="text-sm text-rose-300">
          {{ t('common.error') }}
        </p>
        <PPButton weight="quiet" size="sm" class="mt-2" @click="emit('refreshReplays')">
          {{ t('common.retry') }}
        </PPButton>
      </div>
      <ReplayList v-else :replays="props.replays.slice(0, 5)" manage @changed="emit('refreshReplays')" />
    </section>

    <section>
      <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--pp-text-secondary)]">
            {{ t('myphira.multiplayerSummary') }}
          </h2>
          <p class="mt-1 text-xs text-[var(--pp-text-tertiary)]">
            {{ t('myphira.multiplayerSource') }}
          </p>
        </div>
        <PPButton weight="quiet" size="sm" @click="emit('open', 'multiplayer')">
          {{ t('common.open') }}
        </PPButton>
      </div>
      <p v-if="props.multiplayerPending" class="py-4 text-sm text-[var(--pp-text-secondary)]">
        {{ t('common.loading') }}
      </p>
      <div v-else-if="props.multiplayerError" class="flex items-center gap-3 py-4 text-sm text-rose-300" role="alert">
        <span>{{ t('common.error') }}</span>
        <button type="button" class="text-accent hover:underline" @click="emit('refreshMultiplayer')">
          {{ t('common.retry') }}
        </button>
      </div>
      <dl v-else-if="props.multiplayer" class="flex flex-wrap gap-x-8 gap-y-3 border-y border-[var(--pp-border-subtle)] py-4 text-sm">
        <div>
          <dt class="text-[var(--pp-text-tertiary)]">
            {{ t('myphira.roundsTotal') }}
          </dt><dd class="mt-1 text-[var(--pp-text-primary)]">
            {{ props.multiplayer.rounds_total }}
          </dd>
        </div>
        <div>
          <dt class="text-[var(--pp-text-tertiary)]">
            {{ t('myphira.completedRounds') }}
          </dt><dd class="mt-1 text-[var(--pp-text-primary)]">
            {{ props.multiplayer.completed_rounds }}
          </dd>
        </div>
        <div>
          <dt class="text-[var(--pp-text-tertiary)]">
            {{ t('myphira.roomsVisited') }}
          </dt><dd class="mt-1 text-[var(--pp-text-primary)]">
            {{ props.multiplayer.rooms_visited }}
          </dd>
        </div>
        <div>
          <dt class="text-[var(--pp-text-tertiary)]">
            {{ t('myphira.playtime') }}
          </dt><dd class="mt-1 text-[var(--pp-text-primary)]">
            {{ formatDuration(props.multiplayer.playtime_ms) }}
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>
