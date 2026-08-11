<script setup lang="ts">
import type { FriendRequest } from '~/utils/api/types'
import UserAvatar from '~/components/myphira/UserAvatar.vue'
import { respondFriendRequest } from '~/composables/useCommunity'

/**
 * Incoming friend requests with accept / reject (§16.6).
 * Calls the PPB endpoint directly and emits `changed` so the parent can
 * refresh both the requests and friends lists.
 */
const props = defineProps<{
  requests: FriendRequest[]
  emptyText?: string
}>()

const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()

const pendingRequests = computed(() => props.requests.filter(request => request.status === 'pending'))

const busyId = ref<string | null>(null)
const error = ref(false)

async function respond(request: FriendRequest, action: 'accept' | 'reject'): Promise<void> {
  if (busyId.value)
    return
  busyId.value = request.id
  error.value = false
  try {
    await respondFriendRequest(request.id, action)
    emit('changed')
  }
  catch {
    error.value = true
  }
  finally {
    busyId.value = null
  }
}

function formatDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime()))
    return ''
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d)
}
</script>

<template>
  <div class="space-y-2">
    <p v-if="!pendingRequests.length" class="text-sm text-slate-400">
      {{ emptyText || t('community.noRequests') }}
    </p>
    <ul v-else class="space-y-2">
      <li
        v-for="request in pendingRequests"
        :key="request.id"
        class="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
      >
        <UserAvatar :name="request.from?.username" :avatar="request.from?.avatar" size="sm" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-slate-100">
            {{ request.from?.username || '—' }}
          </p>
          <p class="text-xs text-slate-400">
            #{{ request.from?.phira_id ?? '—' }} · {{ formatDate(request.created_at) }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <BaseButton
            size="sm"
            variant="primary"
            :disabled="busyId !== null"
            @click="respond(request, 'accept')"
          >
            {{ t('common.confirm') }}
          </BaseButton>
          <BaseButton
            size="sm"
            variant="ghost"
            :disabled="busyId !== null"
            @click="respond(request, 'reject')"
          >
            {{ t('common.cancel') }}
          </BaseButton>
        </div>
      </li>
    </ul>
    <p v-if="error" class="text-xs text-rose-300">
      {{ t('common.error') }}
    </p>
  </div>
</template>
