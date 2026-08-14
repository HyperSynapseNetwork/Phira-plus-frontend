<script setup lang="ts">
import type { Friend } from '~/utils/api/types'
import { inviteFriendToRoom } from '~/composables/useCommunity'

const props = defineProps<{ friend: Friend }>()
const { t } = useI18n()
const notice = useNotice()
const { close } = useContextWindow()
const roomId = ref('')
const busy = ref(false)
const fieldError = computed(() => roomId.value.trim().length === 0)

async function submit(): Promise<void> {
  if (busy.value || fieldError.value)
    return
  busy.value = true
  try {
    await inviteFriendToRoom(props.friend.phira_id, roomId.value)
    notice.success('community.inviteSent', { dedupKey: `friend-room-invite:${props.friend.phira_id}` })
    close()
  }
  catch (error) {
    notice.errorFromApi(error, { dedupKey: `friend-room-invite:${props.friend.phira_id}:error` })
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div class="flex items-center gap-3 border-b border-white/10 pb-4">
      <UserAvatar :name="friend.username" :avatar="friend.avatar" size="sm" />
      <div class="min-w-0">
        <p class="truncate text-sm font-medium text-slate-100">
          {{ friend.username }}
        </p>
        <p class="text-xs text-slate-500">
          #{{ friend.phira_id }}
        </p>
      </div>
    </div>

    <p class="text-sm leading-6 text-slate-400">
      {{ t('community.inviteRoomHelp') }}
    </p>

    <label class="block">
      <span class="mb-1 block text-xs font-medium text-slate-300">{{ t('community.roomId') }}</span>
      <PPInput v-model="roomId" type="text" autocomplete="off" :placeholder="t('community.roomId')" />
    </label>

    <div class="flex justify-end">
      <PPButton type="submit" weight="primary" :disabled="busy || fieldError">
        {{ t('community.inviteRoom') }}
      </PPButton>
    </div>
  </form>
</template>
