<script setup lang="ts">
import type { RoomChatMessage } from '~/utils/api/types'
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

const props = defineProps<{ roomId: string }>()

const { t } = useI18n()
const notice = useNotice()

const { messages, error, pending, refresh } = useRoomChat(() => props.roomId)

const draft = ref('')
const sending = ref(false)

const inputId = computed(() => `ppf-room-chat-${props.roomId}`)
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
  try {
    await sendRoomChat(props.roomId, content)
    draft.value = ''
    await refresh()
  }
  catch (err) {
    notice.errorFromApi(err, { dedupKey: `room-chat:${props.roomId}:send` })
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
            <PPButton weight="quiet" size="sm" @click="() => refresh()">
              {{ $t('common.retry') }}
            </PPButton>
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
      <PPInput
        :id="inputId"
        v-model="draft"
        type="text"
        :placeholder="$t('room.chatPlaceholder')"
        :disabled="sending"
        autocomplete="off"
        class="min-w-0 flex-1"
      />
      <PPButton
        weight="primary"
        size="sm"
        type="submit"
        :disabled="sending || !draft.trim()"
      >
        {{ $t('room.chatSend') }}
      </PPButton>
    </form>

  </div>
</template>
