<script setup lang="ts">
import type { Friend, FriendRequest } from '~/features/social/types'
import FriendCards from '~/components/myphira/FriendCards.vue'
import FriendRequestList from '~/components/myphira/FriendRequestList.vue'

const props = defineProps<{
  friends: Friend[]
  friendTotal: number
  requests: FriendRequest[]
  requestTotal: number
  friendsPending: boolean
  requestsPending: boolean
  onRemove?: (phiraId: number) => Promise<void>
  onBlock?: (phiraId: number) => Promise<void>
  onRefresh?: () => void | Promise<void>
}>()
const { t } = useI18n()
</script>

<template>
  <div class="space-y-6">
    <section>
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--pp-text-secondary)]">
          {{ t('community.friends') }}
        </h2>
        <span class="text-xs text-[var(--pp-text-tertiary)]">{{ props.friendsPending ? t('common.loading') : props.friendTotal }}</span>
      </div>
      <FriendCards :friends="props.friends" :on-remove="props.onRemove" :on-block="props.onBlock" />
    </section>
    <section>
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--pp-text-secondary)]">
          {{ t('community.friendRequests') }}
        </h2>
        <span class="text-xs text-[var(--pp-text-tertiary)]">{{ props.requestsPending ? t('common.loading') : props.requestTotal }}</span>
      </div>
      <FriendRequestList :requests="props.requests" @changed="props.onRefresh?.()" />
    </section>
  </div>
</template>
