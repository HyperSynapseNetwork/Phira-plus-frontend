<script setup lang="ts">
import type { Room, RoomState } from '~/utils/api/types'

const props = defineProps<{ room: Room }>()
const emit = defineEmits<{ select: [] }>()
function stateLabel(state: RoomState): string { return state === 'SelectChart' ? 'room.stateSelectChart' : state === 'WaitingForReady' ? 'room.stateWaitingForReady' : 'room.statePlaying' }
function hostName(): string { return props.room.host?.username || props.room.players.find(p => p.is_host)?.username || '' }
function chartName(): string { return props.room.chart?.name?.trim() || '' }
</script>

<template>
  <div class="group grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
    <button type="button" class="min-w-0 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" @click="emit('select')">
      <div class="flex min-w-0 items-center gap-2">
        <h3 class="truncate text-sm font-medium text-[var(--pp-text-primary)] group-hover:text-accent">
          {{ room.name || room.room_id }}
        </h3>
        <span v-if="room.live" class="shrink-0 text-[10px] font-semibold tracking-wide text-emerald-300">LIVE</span>
        <span v-if="room.locked" class="shrink-0 text-[10px] text-[var(--pp-text-tertiary)]">{{ $t('room.locked') }}</span>
      </div>
      <p class="mt-1 truncate text-xs text-[var(--pp-text-secondary)]">
        <span v-if="hostName()">{{ hostName() }}</span><span v-if="hostName() && chartName()"> · </span><span>{{ chartName() || $t('room.chartNotSelected') }}</span>
      </p>
    </button>
    <div class="flex items-center gap-3 text-xs text-[var(--pp-text-secondary)]">
      <span>{{ $t('rooms.players', { count: room.player_count, max: room.max_players }) }}</span>
      <span class="hidden sm:inline">{{ $t(stateLabel(room.state)) }}</span>
      <NuxtLink :to="`/room/${encodeURIComponent(room.room_id)}`" data-pp-touch-critical="room-full-page" class="pp-touch-target inline-flex h-11 w-11 items-center justify-center rounded-[var(--pp-radius-control)] text-accent hover:bg-[var(--pp-surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" :aria-label="$t('room.openFullPage')">
        →
      </NuxtLink>
    </div>
  </div>
</template>
