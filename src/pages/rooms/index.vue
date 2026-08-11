<script setup lang="ts">
import type { Room, RoomListParams, RoomState } from '~/utils/api/types'
import { markRaw } from 'vue'
import RoomContextContent from '~/components/rooms/RoomContextContent.vue'
import { useContextWindow } from '~/composables/useContextWindow'
import { useRoomList } from '~/composables/useRooms'

/**
 * Room list (design §16.3 Room List).
 * Search / state filter / live-only filter, fed into `useRoomList` as a
 * computed path so the fetch re-runs automatically on change.
 * Clicking a card opens a Context Window; each card also links to the full
 * room page (`/room/:room_id`).
 */

const { t } = useI18n()

useHead(() => ({ title: t('nav.rooms') }))

const search = ref('')
const state = ref<RoomState | ''>('')
const onlyLive = ref(false)

const query = computed<RoomListParams>(() => ({
  search: search.value.trim() || undefined,
  state: state.value || undefined,
  only_live: onlyLive.value || undefined,
}))

const { rooms, total, error, pending, refresh } = useRoomList(query)

const { open } = useContextWindow()

function openRoom(room: Room): void {
  open({
    id: room.room_uuid,
    title: room.name || room.room_uuid,
    component: markRaw(RoomContextContent),
    props: { roomUuid: room.room_uuid },
    mobileMode: 'fullscreen',
  })
}

const stateOptions = [
  { value: '' as const, label: 'rooms.allStates' },
  { value: 'SelectChart' as const, label: 'room.stateSelectChart' },
  { value: 'WaitingForReady' as const, label: 'room.stateWaitingForReady' },
  { value: 'Playing' as const, label: 'room.statePlaying' },
]
</script>

<template>
  <div class="space-y-4">
    <!-- Header + search -->
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-50">
          {{ $t('nav.rooms') }}
        </h1>
        <p v-if="!pending" class="mt-1 text-sm text-slate-400">
          {{ $t('rooms.totalRooms', { total }) }}
        </p>
      </div>
      <input
        v-model="search"
        type="search"
        :placeholder="$t('rooms.searchPlaceholder')"
        :aria-label="$t('rooms.searchPlaceholder')"
        class="glass-focusable w-full rounded-md bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60 sm:w-64"
      >
    </header>

    <!-- Filters -->
    <section class="flex flex-wrap items-center gap-4">
      <label class="flex items-center gap-2 text-sm text-slate-300">
        <span>{{ $t('rooms.filterState') }}</span>
        <select
          v-model="state"
          class="glass-focusable rounded-md bg-white/5 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent/60"
        >
          <option v-for="opt in stateOptions" :key="opt.value" :value="opt.value">
            {{ $t(opt.label) }}
          </option>
        </select>
      </label>

      <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
        <input
          v-model="onlyLive"
          type="checkbox"
          class="h-4 w-4 accent-accent"
        >
        <span>{{ $t('rooms.onlyLive') }}</span>
      </label>
    </section>

    <!-- Room list -->
    <section class="content-surface p-6">
      <p v-if="pending && rooms.length === 0" class="py-10 text-center text-sm text-slate-400">
        {{ $t('common.loading') }}
      </p>

      <div v-else-if="error && rooms.length === 0" class="py-10 text-center">
        <p class="mb-3 text-sm text-red-400">
          {{ $t('common.error') }}
        </p>
        <BaseButton variant="ghost" size="sm" @click="() => refresh()">
          {{ $t('common.retry') }}
        </BaseButton>
      </div>

      <p v-else-if="rooms.length === 0" class="py-10 text-center text-sm text-slate-400">
        {{ $t('rooms.empty') }}
      </p>

      <div v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <RoomCard
          v-for="room in rooms"
          :key="room.room_uuid"
          :room="room"
          @select="openRoom(room)"
        />
      </div>

      <p v-if="error && rooms.length > 0" class="mt-4 text-sm text-red-400">
        {{ $t('common.error') }}
        <button type="button" class="ml-2 text-accent hover:underline" @click="() => refresh()">
          {{ $t('common.retry') }}
        </button>
      </p>
    </section>
  </div>
</template>
