<script setup lang="ts">
import type { Room, RoomListParams, RoomState } from '~/utils/api/types'
import { markRaw } from 'vue'
import RoomContextContent from '~/components/rooms/RoomContextContent.vue'
import RoomListRow from '~/components/rooms/RoomListRow.vue'
import { useContextWindow } from '~/composables/useContextWindow'
import { useRoomList } from '~/composables/useRooms'

const { t } = useI18n()
useHead(() => ({ title: t('nav.rooms') }))
const search = ref('')
const state = ref<RoomState | ''>('')
const onlyLive = ref(false)
const query = computed<RoomListParams>(() => ({ search: search.value.trim() || undefined, state: state.value || undefined, only_live: onlyLive.value || undefined }))
const { rooms, total, error, pending, refresh } = useRoomList(query)
const { open } = useContextWindow()
function openRoom(room: Room): void { open({ id: room.room_id, title: room.name || room.room_id, component: markRaw(RoomContextContent), props: { roomId: room.room_id }, mobileMode: 'fullscreen' }) }
const stateOptions = [
  { value: '' as const, label: 'rooms.allStates' },
  { value: 'SelectChart' as const, label: 'room.stateSelectChart' },
  { value: 'WaitingForReady' as const, label: 'room.stateWaitingForReady' },
  { value: 'Playing' as const, label: 'room.statePlaying' },
]
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div><h1 class="text-2xl font-bold text-[var(--pp-text-primary)]">{{ $t('nav.rooms') }}</h1><p v-if="!pending" class="mt-1 text-sm text-[var(--pp-text-secondary)]">{{ $t('rooms.totalRooms', { total }) }}</p></div>
      <PPInput v-model="search" type="search" :placeholder="$t('rooms.searchPlaceholder')" :aria-label="$t('rooms.searchPlaceholder')" class="w-full sm:w-72" />
    </header>

    <div class="flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-[var(--pp-border-subtle)] py-3">
      <label class="flex items-center gap-2 text-sm text-[var(--pp-text-secondary)]"><span>{{ $t('rooms.filterState') }}</span><PPSelect v-model="state" compact class="w-36"><option v-for="opt in stateOptions" :key="opt.value" :value="opt.value">{{ $t(opt.label) }}</option></PPSelect></label>
      <PPSwitch v-model="onlyLive" :label="$t('rooms.onlyLive')" />
    </div>

    <section>
      <p v-if="pending && rooms.length === 0" class="border-y border-[var(--pp-border-subtle)] py-10 text-center text-sm text-[var(--pp-text-secondary)]">{{ $t('common.loading') }}</p>
      <div v-else-if="error && rooms.length === 0" class="flex flex-col items-center gap-3 border-y border-[var(--pp-border-subtle)] py-10 text-center"><p class="text-sm text-rose-300">{{ $t('common.error') }}</p><PPButton weight="quiet" size="sm" @click="() => refresh()">{{ $t('common.retry') }}</PPButton></div>
      <p v-else-if="rooms.length === 0" class="border-y border-[var(--pp-border-subtle)] py-10 text-center text-sm text-[var(--pp-text-secondary)]">{{ $t('rooms.empty') }}</p>
      <ul v-else class="divide-y divide-[var(--pp-border-subtle)] border-y border-[var(--pp-border-subtle)]"><li v-for="room in rooms" :key="room.room_uuid"><RoomListRow :room="room" @select="openRoom(room)" /></li></ul>
      <div v-if="error && rooms.length > 0" class="mt-4 flex items-center gap-2 text-sm text-rose-300" role="alert"><span>{{ $t('common.error') }}</span><button type="button" class="text-accent hover:underline" @click="() => refresh()">{{ $t('common.retry') }}</button></div>
    </section>
  </div>
</template>
