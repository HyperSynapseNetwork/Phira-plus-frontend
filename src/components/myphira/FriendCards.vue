<script setup lang="ts">
import type { Friend } from '~/utils/api/types'
import FriendRoomInviteContext from '~/components/myphira/FriendRoomInviteContext.vue'
import UserAvatar from '~/components/myphira/UserAvatar.vue'

/**
 * Friend cards with online-status dot and remove/block actions (Gate 4 —
 * full friends lifecycle; friends only, no chat here). Each card links to the
 * friend's public profile at `/user/:phira_id`.
 */
const props = defineProps<{
  friends: Friend[]
  emptyText?: string
  onRemove?: (phiraId: number) => Promise<void>
  onBlock?: (phiraId: number) => Promise<void>
}>()

const { t } = useI18n()
const { open } = useContextWindow()

const busyId = ref<number | null>(null)

async function onRemove(friend: Friend): Promise<void> {
  busyId.value = friend.phira_id
  try {
    await props.onRemove?.(friend.phira_id)
  }
  finally {
    busyId.value = null
  }
}

async function onBlock(friend: Friend): Promise<void> {
  busyId.value = friend.phira_id
  try {
    await props.onBlock?.(friend.phira_id)
  }
  finally {
    busyId.value = null
  }
}

function inviteToRoom(friend: Friend): void {
  open({
    title: t('community.inviteRoomTitle'),
    component: FriendRoomInviteContext,
    props: { friend },
    mobileMode: 'sheet',
  })
}

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
        <PPSurface class="p-3">
          <NuxtLink
            :to="`/user/${friend.phira_id}`"
            class="flex items-center gap-3"
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

          <!-- Action hierarchy: Invite is quick; relationship/destructive actions are secondary. -->
          <div class="mt-2 border-t border-white/5 pt-2">
            <div class="flex items-center justify-end gap-2">
              <PPButton size="sm" weight="secondary" :disabled="busyId !== null" @click.stop="inviteToRoom(friend)">
                {{ t('community.inviteRoom') }}
              </PPButton>
              <details class="group">
                <summary class="pp-touch-target inline-flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-[var(--pp-radius-control)] text-sm text-[var(--pp-text-secondary)] hover:bg-[var(--pp-surface-2)]" :aria-label="t('common.moreActions')">
                  ⋯
                </summary>
                <div class="mt-2 flex justify-end gap-2">
                  <PPButton size="sm" weight="quiet" :disabled="busyId !== null" @click.stop="onRemove(friend)">
                    {{ t('community.removeFriend') }}
                  </PPButton>
                  <PPButton size="sm" weight="dangerous" :disabled="busyId !== null" @click.stop="onBlock(friend)">
                    {{ t('community.blockUser') }}
                  </PPButton>
                </div>
              </details>
            </div>
          </div>
        </PPSurface>
      </li>
    </ul>
  </div>
</template>
