<script setup lang="ts">
import type { Room, RoomState } from '~/utils/api/types'

/**
 * Room list card/row (design §16.3 Room List).
 * Shows name, state badge, host, player count, chart, lock/cycle indicators,
 * live dot and server_online hint. Clicking the body emits `select` (parent
 * opens a Context Window); an explicit "open full page" link is provided.
 */

const props = defineProps<{ room: Room }>()

const emit = defineEmits<{ select: [] }>()

function stateLabel(state: RoomState): string {
  if (state === 'SelectChart')
    return 'room.stateSelectChart'
  if (state === 'WaitingForReady')
    return 'room.stateWaitingForReady'
  return 'room.statePlaying'
}

function stateClass(state: RoomState): string {
  if (state === 'SelectChart')
    return 'bg-amber-400/15 text-amber-300'
  if (state === 'WaitingForReady')
    return 'bg-sky-400/15 text-sky-300'
  return 'bg-emerald-400/15 text-emerald-300'
}

function hostName(): string {
  const r = props.room
  if (r.host?.username)
    return r.host.username
  return r.players.find(p => p.is_host)?.username ?? ''
}

function chartName(): string {
  return props.room.chart?.name?.trim() ?? ''
}
</script>

<template>
  <div class="glass glass-focusable flex flex-col rounded-surface transition">
    <!-- Clickable summary → Context Window -->
    <button
      type="button"
      class="flex flex-1 flex-col gap-2 px-4 py-3 text-left"
      @click="emit('select')"
    >
      <div class="flex items-start justify-between gap-2">
        <h3 class="truncate text-sm font-semibold text-slate-50">
          {{ room.name || room.room_uuid }}
        </h3>
        <span
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
          :class="stateClass(room.state)"
        >
          <span v-if="room.live" class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {{ $t(stateLabel(room.state)) }}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
        <span class="inline-flex items-center gap-1">
          <span class="text-slate-500">{{ $t('rooms.host') }}</span>
          <span class="text-slate-300">{{ hostName() || '—' }}</span>
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="text-slate-500">{{ $t('room.tabPlayers') }}</span>
          <span class="text-slate-300">
            {{ $t('rooms.players', { count: room.player_count, max: room.max_players }) }}
          </span>
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="truncate text-slate-400">
          {{ chartName() || $t('room.chartNotSelected') }}
        </span>

        <span
          v-if="room.locked"
          class="rounded-full bg-accent/15 px-2 py-0.5 text-accent"
        >
          {{ $t('room.locked') }}
        </span>
        <span
          v-if="room.cycle"
          class="rounded-full bg-accent/15 px-2 py-0.5 text-accent"
        >
          {{ $t('room.cycle') }}
        </span>
        <span
          v-if="room.server_online === false"
          class="rounded-full bg-slate-400/15 px-2 py-0.5 text-slate-400"
        >
          {{ $t('common.offline') }}
        </span>
      </div>
    </button>

    <!-- Footer: full-page link -->
    <div class="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-2">
      <span class="text-xs text-slate-500">{{ room.room_uuid }}</span>
      <NuxtLink
        :to="`/room/${room.room_uuid}`"
        class="glass-focusable rounded-md px-2 py-1 text-xs text-accent hover:text-accent-strong"
      >
        {{ $t('room.openFullPage') }}
      </NuxtLink>
    </div>
  </div>
</template>
