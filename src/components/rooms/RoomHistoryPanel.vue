<script setup lang="ts">
/**
 * Room round history (Gate 4 — real PMP `room.history`, proxied by PPB).
 * Lists past rounds with chart + player scores. Degrades to an empty state
 * while PPB is unready.
 */
import { useRoomHistory } from '~/composables/useRooms'

const props = defineProps<{ roomUuid: string }>()

const { history, pending, error, refresh } = useRoomHistory(() => props.roomUuid)

function fmtTime(iso?: string): string {
  if (!iso)
    return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}
</script>

<template>
  <div class="space-y-2">
    <p v-if="pending" class="py-4 text-center text-sm text-slate-400">
      {{ $t('common.loading') }}
    </p>

    <div v-else-if="error && !history.length" class="py-4 text-center">
      <p class="mb-2 text-sm text-slate-400">
        {{ $t('common.error') }}
      </p>
      <BaseButton variant="ghost" size="sm" @click="() => refresh()">
        {{ $t('common.retry') }}
      </BaseButton>
    </div>

    <p v-else-if="!history.length" class="py-4 text-center text-sm text-slate-400">
      {{ $t('room.historyEmpty') }}
    </p>

    <ul v-else class="space-y-2">
      <li v-for="h in history" :key="h.round_uuid" class="rounded-lg border border-white/10 bg-white/5 p-3">
        <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span class="truncate font-medium text-slate-100">
            {{ h.chart_name || $t('room.historyNoChart') }}
          </span>
          <span class="text-xs text-slate-500">{{ fmtTime(h.started_at) }}</span>
        </div>
        <ul v-if="h.players?.length" class="mt-2 space-y-1">
          <li v-for="p in h.players" :key="p.phira_id" class="flex items-center justify-between gap-2 text-xs">
            <span class="truncate text-slate-300">{{ p.username || `#${p.phira_id}` }}</span>
            <span class="tabular-nums text-slate-400">{{ p.score ?? '—' }}</span>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>
