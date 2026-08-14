<script setup lang="ts">
/**
 * Live Monitor (design §12.6, contract §4 / P-81 / P-82).
 *
 * Owns the JSON WebSocket to the PPB Live Gateway
 * (`WSS /ws/v1/rooms/{room_id}/live` — ROOM ID, not room_uuid), parses the
 * JSON envelope, and renders the live state: status strip, players, room
 * state, round, resync/sequence-gap banner, heartbeat, and touch/judge
 * counters and a live touch overlay. PPB's JSON contract carries PMP's typed
 * touch points, so visual feedback does not depend on a second binary codec.
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

interface TouchDot {
  id: string
  x: number
  y: number
  player: number
  at: number
}

const touchDots = ref<TouchDot[]>([])
const latestJudgement = ref<string | null>(null)
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | null = null

const stream = createLiveStream(props.roomId, ({ type, raw, at }) => {
  if (type === 'touches' && Array.isArray(raw.frames)) {
    const player = Number(raw.player)
    const additions = raw.frames.flatMap((frame, index): TouchDot[] => {
      if (!frame || typeof frame !== 'object')
        return []
      const point = frame as Record<string, unknown>
      const x = Number(point.x)
      const y = Number(point.y)
      const finger = Number(point.finger)
      if (![x, y, finger, player].every(Number.isFinite))
        return []
      return [{ id: `${player}:${finger}:${at}:${index}`, x, y, player, at }]
    })
    touchDots.value = [...touchDots.value, ...additions].slice(-120)
  }
  if (type === 'judges' && Array.isArray(raw.judges)) {
    const last = raw.judges.at(-1)
    if (last && typeof last === 'object' && typeof (last as Record<string, unknown>).judgement === 'string')
      latestJudgement.value = String((last as Record<string, unknown>).judgement)
  }
})
const state = stream.state

const visibleDots = computed(() => touchDots.value.filter(dot => now.value - dot.at < 900))

function dotStyle(dot: TouchDot): Record<string, string> {
  const normalizedX = Math.max(0, Math.min(1, (dot.x + 1) / 2))
  const normalizedY = Math.max(0, Math.min(1, 1 - (dot.y + 1) / 2))
  const age = Math.max(0, now.value - dot.at)
  return {
    left: `${normalizedX * 100}%`,
    top: `${normalizedY * 100}%`,
    opacity: String(Math.max(0, 1 - age / 900)),
  }
}

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
  clock = setInterval(() => {
    now.value = Date.now()
  }, 100)
})
onUnmounted(() => {
  if (clock)
    clearInterval(clock)
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

    <div
      class="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-black/40"
      :aria-label="$t('live.touchVisual')"
    >
      <div class="absolute inset-0 opacity-20" style="background-image: linear-gradient(rgb(255 255 255 / 20%) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 20%) 1px, transparent 1px); background-size: 12.5% 12.5%;" />
      <span
        v-for="dot in visibleDots"
        :key="dot.id"
        class="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-accent/60 shadow-[0_0_12px_var(--color-accent)] transition-opacity duration-100"
        :style="dotStyle(dot)"
        :title="`#${dot.player}`"
      />
      <div class="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-[11px] text-slate-300">
        {{ $t('live.touchVisual') }}<template v-if="latestJudgement">
          · {{ latestJudgement }}
        </template>
      </div>
    </div>

    <p v-if="state.error" class="text-xs text-rose-400">
      {{ $t(state.error) }}
    </p>

    <div class="flex items-center justify-between gap-3">
      <PPButton
        weight="quiet"
        size="sm"
        :disabled="state.status === 'connecting'"
        @click="state.status === 'live' || state.status === 'reconnecting' ? stream.disconnect() : stream.connect()"
      >
        {{
          state.status === 'live' || state.status === 'reconnecting'
            ? $t('live.disconnect')
            : $t('live.connect')
        }}
      </PPButton>
      <span class="text-xs text-slate-500">
        {{ $t('live.hint') }}
      </span>
    </div>
  </div>
</template>
