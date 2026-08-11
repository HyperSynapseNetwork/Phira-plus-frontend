<script setup lang="ts">
import type { Room, RoomPlayer } from '~/utils/api/types'

/**
 * Room player list with ready / host / self / live badges (design §16.3).
 */

defineProps<{ room: Room | null }>()

interface PlayerBadge {
  label: string
  cls: string
}

function badgesFor(p: RoomPlayer): PlayerBadge[] {
  const badges: PlayerBadge[] = []
  if (p.is_host)
    badges.push({ label: 'room.host', cls: 'bg-accent/15 text-accent' })
  if (p.is_self)
    badges.push({ label: 'room.you', cls: 'bg-accent/15 text-accent ring-1 ring-accent/40' })
  if (p.ready === true)
    badges.push({ label: 'room.ready', cls: 'bg-emerald-400/15 text-emerald-300' })
  else if (p.ready === false)
    badges.push({ label: 'room.notReady', cls: 'bg-slate-400/15 text-slate-300' })
  return badges
}
</script>

<template>
  <div>
    <h3 class="mb-3 text-sm font-semibold text-slate-100">
      {{ $t('room.tabPlayers') }}
    </h3>

    <div
      v-if="!room || room.players.length === 0"
      class="rounded-md border border-dashed border-white/10 p-6 text-center text-sm text-slate-400"
    >
      {{ $t('room.playerListEmpty') }}
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="p in room.players"
        :key="p.phira_id"
        class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/5 px-3 py-2"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm text-slate-100">{{ p.username }}</span>
          <span
            v-if="p.live"
            class="h-2 w-2 rounded-full bg-emerald-400"
            :title="$t('room.tabLive')"
          />
        </div>

        <div class="flex flex-wrap gap-1">
          <span
            v-for="badge in badgesFor(p)"
            :key="badge.label"
            class="rounded-full px-2 py-0.5 text-xs font-medium"
            :class="badge.cls"
          >
            {{ $t(badge.label) }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>
