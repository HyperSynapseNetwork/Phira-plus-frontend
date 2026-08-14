<script setup lang="ts">
import type { MyMultiplayerSummary } from '~/features/account/types'

const props = defineProps<{ data?: MyMultiplayerSummary, pending: boolean, error: unknown }>()
const emit = defineEmits<{ refresh: [] }>()
const { t } = useI18n()

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`
}
function formatRoundTime(value: number): string {
  const timestamp = value < 10_000_000_000 ? value * 1000 : value
  return new Date(timestamp).toLocaleString()
}
</script>

<template>
  <section>
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--pp-text-secondary)]">{{ t('myphira.tabMultiplayer') }}</h2>
        <p class="mt-1 text-xs text-[var(--pp-text-tertiary)]">{{ t('myphira.multiplayerSource') }}</p>
      </div>
      <PPButton weight="quiet" size="sm" :disabled="props.pending" @click="emit('refresh')">{{ t('common.retry') }}</PPButton>
    </div>
    <p v-if="props.pending" class="py-4 text-sm text-[var(--pp-text-secondary)]">{{ t('common.loading') }}</p>
    <p v-else-if="props.error" class="py-4 text-sm text-rose-300" role="alert">{{ t('common.error') }}</p>
    <template v-else-if="props.data">
      <dl class="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-y border-[var(--pp-border-subtle)] py-4 text-sm">
        <div><dt class="text-[var(--pp-text-tertiary)]">{{ t('myphira.roundsTotal') }}</dt><dd class="mt-1 text-[var(--pp-text-primary)]">{{ props.data.rounds_total }}</dd></div>
        <div><dt class="text-[var(--pp-text-tertiary)]">{{ t('myphira.completedRounds') }}</dt><dd class="mt-1 text-[var(--pp-text-primary)]">{{ props.data.completed_rounds }}</dd></div>
        <div><dt class="text-[var(--pp-text-tertiary)]">{{ t('myphira.roomsVisited') }}</dt><dd class="mt-1 text-[var(--pp-text-primary)]">{{ props.data.rooms_visited }}</dd></div>
        <div><dt class="text-[var(--pp-text-tertiary)]">{{ t('myphira.playtime') }}</dt><dd class="mt-1 text-[var(--pp-text-primary)]">{{ formatDuration(props.data.playtime_ms) }}</dd></div>
      </dl>
      <p v-if="props.data.recent_rounds.length === 0" class="py-5 text-sm text-[var(--pp-text-secondary)]">{{ t('myphira.noRounds') }}</p>
      <ul v-else class="divide-y divide-[var(--pp-border-subtle)]">
        <li v-for="round in props.data.recent_rounds" :key="round.round_uuid" class="grid gap-1 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div class="min-w-0">
            <p class="truncate font-medium text-[var(--pp-text-primary)]">{{ round.chart_name || `#${round.chart_id}` }}</p>
            <p class="mt-0.5 text-xs text-[var(--pp-text-tertiary)]">{{ t('myphira.room') }} {{ round.room_id }} · {{ formatRoundTime(round.started_at) }}</p>
          </div>
          <span v-if="round.finished_at" class="text-xs text-[var(--pp-text-secondary)]">{{ formatDuration(Math.max(0, round.finished_at - round.started_at)) }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>
