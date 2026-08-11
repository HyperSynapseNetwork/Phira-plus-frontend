<script setup lang="ts">
import type { Friend } from '~/utils/api/types'
import UserAvatar from '~/components/myphira/UserAvatar.vue'

/**
 * Presentational friend cards with online-status dot (§16.6 / §7).
 * Each card links to the friend's public profile at `/user/:phira_id`.
 */
defineProps<{
  friends: Friend[]
  emptyText?: string
}>()

const { t } = useI18n()

function onlineStatusKey(status: Friend['online_status']): string {
  if (status === 'online')
    return 'user.online'
  if (status === 'offline')
    return 'user.offline'
  return 'user.onlineHidden'
}

function onlineDotClass(status: Friend['online_status']): string {
  if (status === 'online')
    return 'bg-emerald-400'
  if (status === 'offline')
    return 'bg-slate-500'
  return 'bg-slate-600'
}
</script>

<template>
  <div>
    <p v-if="!friends.length" class="text-sm text-slate-400">
      {{ emptyText || t('community.noFriends') }}
    </p>
    <ul v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="friend in friends" :key="friend.phira_id">
        <NuxtLink
          :to="`/user/${friend.phira_id}`"
          class="glass-focusable flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 hover:border-accent/40"
        >
          <UserAvatar :name="friend.username" :avatar="friend.avatar" size="sm" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-slate-100">
              {{ friend.username }}
            </span>
            <span class="block text-xs text-slate-400">
              #{{ friend.phira_id }}
            </span>
          </span>
          <span class="flex items-center gap-1.5 text-xs text-slate-400">
            <span class="h-2 w-2 rounded-full" :class="onlineDotClass(friend.online_status)" />
            {{ t(onlineStatusKey(friend.online_status)) }}
          </span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
