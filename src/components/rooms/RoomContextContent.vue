<script setup lang="ts">
import type { Room, RoomChart, RoomState } from '~/utils/api/types'
import { useRoom } from '~/composables/useRooms'

/**
 * Room detail content (design §16.3) — reused inside the Context Window AND
 * on the full room page (`/room/:room_id`).
 *
 * Tabs: Overview | Players | Chat | Live | History.
 * Chat is delegated to RoomChatPanel (uses `useRoomChat`); Live/History are
 * Phase-D placeholders.
 */

const props = defineProps<{ roomUuid: string }>()

const { t } = useI18n()

const { room, error, pending, refresh } = useRoom(() => props.roomUuid)

type TabId = 'overview' | 'players' | 'chat' | 'live' | 'history'

const tabs: { id: TabId, label: string }[] = [
  { id: 'overview', label: 'room.tabOverview' },
  { id: 'players', label: 'room.tabPlayers' },
  { id: 'chat', label: 'room.tabChat' },
  { id: 'live', label: 'room.tabLive' },
  { id: 'history', label: 'room.tabHistory' },
]

const activeTab = ref<TabId>('overview')

const chart = computed<RoomChart | null>(() => room.value?.chart ?? null)

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

function hostName(r: Room): string {
  if (r.host?.username)
    return r.host.username
  return r.players.find(p => p.is_host)?.username ?? t('common.unknown')
}

function formatDate(s?: string): string {
  if (!s)
    return '—'
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString()
}

function serverOnlineLabel(r: Room): string {
  if (r.server_online === true)
    return t('common.online')
  if (r.server_online === false)
    return t('common.offline')
  return '—'
}

function serverOnlineClass(r: Room): string {
  if (r.server_online === true)
    return 'text-emerald-400'
  if (r.server_online === false)
    return 'text-slate-500'
  return 'text-slate-500'
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Tabs -->
    <div
      role="tablist"
      :aria-label="$t('room.tabsLabel')"
      class="flex flex-wrap gap-1 border-b border-white/10 pb-2"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`tab-panel-${tab.id}`"
        class="glass-focusable rounded-md px-3 py-1.5 text-sm font-medium transition"
        :class="activeTab === tab.id
          ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
          : 'text-slate-400 hover:text-slate-200'"
        @click="activeTab = tab.id"
      >
        {{ $t(tab.label) }}
      </button>
    </div>

    <!-- Tab panels -->
    <div class="min-h-0 flex-1 pt-4">
      <!-- Loading -->
      <p v-if="pending && !room" class="py-10 text-center text-sm text-slate-400">
        {{ $t('common.loading') }}
      </p>

      <!-- Error -->
      <div v-else-if="error && !room" class="py-10 text-center">
        <p class="mb-3 text-sm text-red-400">
          {{ $t('common.error') }}
        </p>
        <BaseButton variant="ghost" size="sm" @click="() => refresh()">
          {{ $t('common.retry') }}
        </BaseButton>
      </div>

      <!-- Empty / not found -->
      <p v-else-if="!room" class="py-10 text-center text-sm text-slate-400">
        {{ $t('rooms.empty') }}
      </p>

      <!-- Content -->
      <div v-else>
        <div
          v-if="activeTab === 'overview'"
          id="tab-panel-overview"
          role="tabpanel"
          class="space-y-4"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="stateClass(room.state)"
            >
              <span v-if="room.live" class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {{ $t(stateLabel(room.state)) }}
            </span>
            <span v-if="room.locked" class="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs text-accent">
              {{ $t('room.locked') }}
            </span>
            <span v-if="room.cycle" class="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs text-accent">
              {{ $t('room.cycle') }}
            </span>
            <span v-if="room.persistent" class="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs text-accent">
              {{ $t('room.persistent') }}
            </span>
          </div>

          <div class="grid gap-2 text-sm md:grid-cols-2">
            <div class="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-2">
              <span class="text-slate-400">{{ $t('rooms.host') }}</span>
              <span class="truncate text-slate-100">{{ hostName(room) }}</span>
            </div>

            <div class="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-2">
              <span class="text-slate-400">{{ $t('room.tabPlayers') }}</span>
              <span class="text-slate-100">
                {{ $t('rooms.players', { count: room.player_count, max: room.max_players }) }}
              </span>
            </div>

            <div class="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-2 md:col-span-2">
              <span class="shrink-0 text-slate-400">{{ $t('room.chart') }}</span>
              <span class="truncate text-right text-slate-100">
                <template v-if="chart?.name">
                  {{ chart.name }}
                  <span v-if="chart.artist" class="text-slate-400">— {{ chart.artist }}</span>
                  <span v-if="typeof chart.difficulty === 'number'" class="text-slate-400">· Lv.{{ chart.difficulty }}</span>
                </template>
                <span v-else class="text-slate-500">{{ $t('room.chartNotSelected') }}</span>
              </span>
            </div>

            <div class="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-2">
              <span class="text-slate-400">{{ $t('room.serverOnline') }}</span>
              <span class="font-medium" :class="serverOnlineClass(room)">
                {{ serverOnlineLabel(room) }}
              </span>
            </div>

            <div class="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-2">
              <span class="text-slate-400">{{ $t('room.createdAt') }}</span>
              <span class="truncate text-slate-100">{{ formatDate(room.created_at) }}</span>
            </div>

            <div class="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-2 md:col-span-2">
              <span class="text-slate-400">{{ $t('room.updatedAt') }}</span>
              <span class="truncate text-slate-100">{{ formatDate(room.updated_at) }}</span>
            </div>
          </div>

          <HostControls :room="room" @acted="() => refresh()" />
        </div>

        <div
          v-else-if="activeTab === 'players'"
          id="tab-panel-players"
          role="tabpanel"
        >
          <RoomPlayersPanel :room="room" />
        </div>

        <div
          v-else-if="activeTab === 'chat'"
          id="tab-panel-chat"
          role="tabpanel"
        >
          <RoomChatPanel :room-uuid="roomUuid" />
        </div>

        <div
          v-else-if="activeTab === 'live'"
          id="tab-panel-live"
          role="tabpanel"
          class="rounded-md border border-dashed border-white/10 p-6 text-center text-sm text-slate-400"
        >
          {{ $t('room.livePlaceholder') }}
        </div>

        <div
          v-else
          id="tab-panel-history"
          role="tabpanel"
          class="rounded-md border border-dashed border-white/10 p-6 text-center text-sm text-slate-400"
        >
          {{ $t('room.historyPlaceholder') }}
        </div>
      </div>
    </div>
  </div>
</template>
