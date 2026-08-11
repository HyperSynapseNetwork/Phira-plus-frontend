<script setup lang="ts">
/**
 * Live Monitor (design §12.6, contract §4 / P-81 / P-82).
 *
 * Owns the JSON WebSocket to the PPB Live Gateway
 * (`WSS /ws/v1/rooms/{room_id}/live` — ROOM ID, not room_uuid), parses the
 * JSON envelope, and renders the live state: status strip, players, room
 * state, round, resync/sequence-gap banner, heartbeat, and touch/judge
 * counters. The WASM per-player *visual* rendering is deferred until PPB
 * freezes the binary TouchFrame/JudgeEvent encoding (P-81) — the canvas here
 * shows a pending placeholder.
 */
import type { LiveStreamStatus } from '~/viewer/liveStream'
import { createLiveStream } from '~/viewer/liveStream'

const props = defineProps<{
  /** Live WS identifier — the ROOM ID (P-82), not the shareable room_uuid. */
  roomId: string
}>()

const emit = defineEmits<{
  statusChange: [status: LiveStreamStatus]
}>()

const stream = createLiveStream(props.roomId)
const state = stream.state

const playerList = computed(() => Object.values(state.players))

function fmtHeartbeat(): string {
  if (!state.heartbeatAt)
    return '—'
  const age = Date.now() - state.heartbeatAt
  return `${Math.max(0, Math.round(age / 1000))}s`
}

watch(() => state.status, (s) => {
  emit('statusChange', s)
}, { immediate: true })

onMounted(() => {
  stream.connect()
})
onUnmounted(() => {
  stream.dispose()
})
</script>

<template>
  <div class="space-y-3">
    <div class="grid gap-2 text-xs sm:grid-cols-2">
      <div class="flex items-center justify-between gap-2 rounded-md bg-white/5 px-3 py-2">
        <span class="text-slate-400">{{ $t('live.roomState') }}</span>
        <span class="font-medium text-slate-100">{{ state.state ?? '—' }}</span>
      </div>
      <div class="flex items-center justify-between gap-2 rounded-md bg-white/5 px-3 py-2">
        <span class="text-slate-400">{{ $t('live.round') }}</span>
        <span class="font-medium text-slate-100">{{ state.round ?? '—' }}</span>
      </div>
      <div class="flex items-center justify-between gap-2 rounded-md bg-white/5 px-3 py-2">
        <span class="text-slate-400">{{ $t('live.touches') }}</span>
        <span class="font-medium tabular-nums text-slate-100">{{ state.touches }}</span>
      </div>
      <div class="flex items-center justify-between gap-2 rounded-md bg-white/5 px-3 py-2">
        <span class="text-slate-400">{{ $t('live.judges') }}</span>
        <span class="font-medium tabular-nums text-slate-100">{{ state.judges }}</span>
      </div>
      <div class="flex items-center justify-between gap-2 rounded-md bg-white/5 px-3 py-2">
        <span class="text-slate-400">{{ $t('live.heartbeat') }}</span>
        <span class="font-medium text-slate-100">{{ fmtHeartbeat() }}</span>
      </div>
      <div class="flex items-center justify-between gap-2 rounded-md bg-white/5 px-3 py-2">
        <span class="text-slate-400">{{ $t('live.players') }}</span>
        <span class="font-medium text-slate-100">{{ playerList.length }}</span>
      </div>
    </div>

    <!-- Sequence gap / resync banner (contract §4) -->
    <p
      v-if="state.resync"
      class="flex items-center gap-2 rounded-md bg-amber-500/15 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-400/30"
      role="status"
    >
      <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
      {{ $t('live.reconnecting') }}
    </p>

    <!-- Players -->
    <div v-if="playerList.length" class="space-y-1.5">
      <p v-for="p in playerList" :key="p.id" class="flex items-center gap-2 text-sm">
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span class="text-slate-200">{{ p.name ?? `#${p.id}` }}</span>
        <span v-if="p.monitor" class="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
          monitor
        </span>
      </p>
    </div>
    <p v-else class="text-xs text-slate-500">
      {{ $t('live.noPlayers') }}
    </p>

    <!-- WASM visual rendering is pending the binary frame freeze (P-81). -->
    <div
      class="flex aspect-video items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/30 px-6 text-center"
    >
      <p class="text-sm text-slate-400">
        {{ $t('live.wasmVisualPending') }}
      </p>
    </div>

    <p v-if="state.error" class="text-xs text-rose-400">
      {{ $t(state.error) }}
    </p>

    <div class="flex items-center justify-between gap-3">
      <BaseButton
        variant="ghost"
        size="sm"
        :disabled="state.status === 'connecting'"
        @click="state.status === 'live' || state.status === 'reconnecting' ? stream.disconnect() : stream.connect()"
      >
        {{
          state.status === 'live' || state.status === 'reconnecting'
            ? $t('live.disconnect')
            : $t('live.connect')
        }}
      </BaseButton>
      <span class="text-xs text-slate-500">
        {{ $t('live.hint') }}
      </span>
    </div>
  </div>
</template>
