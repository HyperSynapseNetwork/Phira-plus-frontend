<script setup lang="ts">
import type { RoomState } from '~/utils/api/types'
import RoomContextContent from '~/components/rooms/RoomContextContent.vue'
import { useRoom } from '~/composables/useRooms'

/**
 * Room full page (design §16.3 Room Full Page) at `/room/:room_id`.
 * Public share URL; renders the same RoomContextContent as the Context
 * Window so Overview / Players / Chat / Live / History all work here.
 */

const route = useRoute()
const { t } = useI18n()

const roomUuid = computed(() => String(route.params.room_id))

const { room, error, pending, refresh } = useRoom(roomUuid)

usePageSeo(() => ({
  title: room.value?.name ?? t('nav.rooms'),
  description: room.value
    ? `${t('room.statePlaying')} · ${t('rooms.players', { count: room.value.player_count, max: room.value.max_players })}`
    : t('rooms.empty'),
  jsonLd: room.value
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'name': room.value.name ?? room.value.room_uuid,
        // Live room info is dynamic; only non-sensitive public metadata is indexed.
      }
    : undefined,
}))

function stateLabel(state: RoomState): string {
  if (state === 'SelectChart')
    return 'room.stateSelectChart'
  if (state === 'WaitingForReady')
    return 'room.stateWaitingForReady'
  return 'room.statePlaying'
}

function hostName(): string {
  const r = room.value
  if (!r)
    return '—'
  if (r.host?.username)
    return r.host.username
  return r.players.find(p => p.is_host)?.username || '—'
}
</script>

<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-2xl font-bold text-slate-50">
          {{ room?.name || roomUuid }}
        </h1>
        <p v-if="room" class="mt-1 text-sm text-slate-400">
          {{ $t(stateLabel(room.state)) }}
          <template v-if="hostName() !== '—'">
            · {{ $t('rooms.host') }}: {{ hostName() }}
          </template>
          <template v-if="room.live">
            · {{ $t('room.tabLive') }}
          </template>
        </p>
      </div>
      <BaseButton variant="ghost" size="sm" as="NuxtLink" to="/rooms">
        {{ $t('common.back') }}
      </BaseButton>
    </header>

    <section class="content-surface p-6">
      <p v-if="pending && !room" class="py-10 text-center text-sm text-slate-400">
        {{ $t('common.loading') }}
      </p>

      <div v-else-if="error && !room" class="py-10 text-center">
        <p class="mb-3 text-sm text-red-400">
          {{ $t('common.error') }}
        </p>
        <BaseButton variant="ghost" size="sm" @click="() => refresh()">
          {{ $t('common.retry') }}
        </BaseButton>
      </div>

      <p v-else-if="!room" class="py-10 text-center text-sm text-slate-400">
        {{ $t('rooms.empty') }}
      </p>

      <RoomContextContent v-else :room-uuid="roomUuid" />
    </section>

    <!-- JoinIntent: confirm-join → PPB intent → prompt → force_move (design §14.6, P-86).
         Join-intents are keyed by ROOM ID (P-82/P-86), not the shareable uuid. -->
    <section v-if="room" class="content-surface p-6">
      <JoinIntentPanel :room-id="room.id || roomUuid" />
    </section>
  </div>
</template>
