<script setup lang="ts">
import type { RoomChatMessage } from '~/utils/api/types'
import { isApiError } from '~/composables/useApi'
import { sendRoomChat, useRoomChat } from '~/composables/useRooms'

/**
 * Room chat panel (design §13 / §16.3 Room Context Window Chat tab).
 *
 * Display rules (contract §12):
 * - Player messages render as `[<user_name>]XXX`.
 * - System messages (`user_id === 0` or `is_system`) render as a centered,
 *   muted line without the `[...]` prefix.
 *
 * The client never supplies a trusted user_id (design §13.3) — `sendRoomChat`
 * only sends `{ room_id, content }`.
 */

const props = defineProps<{ roomUuid: string }>()

const { t } = useI18n()

const { messages, error, pending, refresh } = useRoomChat(() => props.roomUuid)

const draft = ref('')
const sending = ref(false)
const sendError = ref('')

const inputId = computed(() => `ppf-room-chat-${props.roomUuid}`)
const scrollEl = ref<HTMLElement | null>(null)

/** Keep the newest message visible (latest last). */
watch(
  () => messages.value.length,
  () => {
    nextTick(() => {
      if (scrollEl.value)
        scrollEl.value.scrollTop = scrollEl.value.scrollHeight
    })
  },
)

function isSystem(msg: RoomChatMessage): boolean {
  return msg.user_id === 0 || msg.is_system === true
}

function displayName(msg: RoomChatMessage): string {
  if (msg.user_name?.trim())
    return msg.user_name.trim()
  if (msg.user_id > 0)
    return String(msg.user_id)
  return t('common.unknown')
}

async function submit(): Promise<void> {
  const content = draft.value.trim()
  if (!content || sending.value)
    return

  sending.value = true
  sendError.value = ''
  try {
    await sendRoomChat({ room_id: props.roomUuid, content })
    draft.value = ''
    await refresh()
  }
  catch (err) {
    const message = isApiError(err) ? err.message : t('common.unknown')
    sendError.value = t('room.sendFailed', { message })
  }
  finally {
    sending.value = false
  }
}
</script>

<template>
  <div>
    <h3 class="mb-3 text-sm font-semibold text-slate-100">
      {{ $t('room.tabChat') }}
    </h3>

    <!-- Chat history -->
    <div
      ref="scrollEl"
      class="h-72 overflow-y-auto rounded-md bg-white/5 p-3"
    >
      <div class="flex min-h-full flex-col">
        <div class="mt-auto flex flex-col gap-1.5">
          <p v-if="pending && messages.length === 0" class="py-6 text-center text-sm text-slate-400">
            {{ $t('common.loading') }}
          </p>

          <div v-else-if="error && messages.length === 0" class="py-6 text-center">
            <p class="mb-2 text-sm text-red-400">
              {{ $t('common.error') }}
            </p>
            <BaseButton variant="ghost" size="sm" @click="() => refresh()">
              {{ $t('common.retry') }}
            </BaseButton>
          </div>

          <p v-else-if="messages.length === 0" class="py-6 text-center text-sm text-slate-400">
            {{ $t('room.chatEmpty') }}
          </p>

          <template v-else>
            <div
              v-for="(msg, index) in messages"
              :key="`${msg.timestamp ?? 'msg'}-${index}`"
              class="text-sm"
            >
              <!-- System message: centered muted line, no [..] prefix -->
              <p v-if="isSystem(msg)" class="py-0.5 text-center text-xs text-slate-500">
                {{ msg.content }}
              </p>
              <!-- Player message: [<user_name>]XXX -->
              <p v-else class="py-0.5 text-slate-200">
                <span class="font-medium text-slate-100">[{{ displayName(msg) }}]</span>
                <span>{{ msg.content }}</span>
              </p>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Composer -->
    <form class="mt-3 flex items-center gap-2" @submit.prevent="submit">
      <label :for="inputId" class="sr-only">{{ $t('room.chatPlaceholder') }}</label>
      <input
        :id="inputId"
        v-model="draft"
        type="text"
        :placeholder="$t('room.chatPlaceholder')"
        :disabled="sending"
        autocomplete="off"
        class="glass-focusable min-w-0 flex-1 rounded-md bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
      >
      <BaseButton
        variant="primary"
        size="sm"
        type="submit"
        :disabled="sending || !draft.trim()"
      >
        {{ $t('room.chatSend') }}
      </BaseButton>
    </form>

    <p v-if="sendError" class="mt-2 text-xs text-red-400" role="alert">
      {{ sendError }}
    </p>
  </div>
</template>
