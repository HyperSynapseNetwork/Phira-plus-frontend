<script setup lang="ts">
import type { Room } from '~/utils/api/types'
import { isApiError } from '~/composables/useApi'
import { sendHostAction } from '~/composables/useRooms'

/**
 * Host controls (design §13.4 / §27.1).
 *
 * Rendered ONLY when the current user is the host — but PPB re-checks the
 * real host on every action, so a client-side host flag is never trusted.
 * The client never sends a `user_id` / `phira_id` (identity is resolved
 * server-side from the session); only the frozen action id + room id.
 */

const props = defineProps<{ room: Room | null }>()

const emit = defineEmits<{ acted: [] }>()

const { t } = useI18n()

const isHost = computed(() => {
  const r = props.room
  if (!r)
    return false
  return r.host?.is_self === true || r.players.some(p => p.is_self === true && p.is_host === true)
})

const busy = ref(false)
const actionError = ref('')

interface HostAction {
  action: string
  label: string
  disabled?: boolean
  danger?: boolean
  args?: Record<string, unknown>
}

const actions = computed<HostAction[]>(() => {
  const r = props.room
  if (!r || !isHost.value)
    return []
  const list: HostAction[] = []
  // contract §22: lock/unlock is a single `room.lock` action with `{ locked }`.
  list.push({
    action: 'room.lock',
    label: r.locked ? 'room.unlock' : 'room.lock',
    args: { locked: !r.locked },
  })
  list.push(r.state === 'Playing'
    ? { action: 'room.cancel_start', label: 'room.cancelStart', danger: true }
    : { action: 'room.start', label: 'room.start' })
  // Chart picker UI is not built yet — keep the action visible but inert.
  list.push({ action: 'room.set_chart', label: 'room.setChart', disabled: true })
  return list
})

async function run(a: HostAction): Promise<void> {
  const r = props.room
  if (!r || busy.value)
    return
  busy.value = true
  actionError.value = ''
  try {
    await sendHostAction({ action: a.action, room_id: r.room_uuid, args: a.args ?? {} })
    emit('acted')
  }
  catch (err) {
    actionError.value = isApiError(err) ? err.message : t('common.unknown')
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="isHost" class="space-y-2 rounded-md bg-white/5 p-3">
    <h3 class="text-sm font-semibold text-slate-100">
      {{ $t('room.hostControls') }}
    </h3>

    <div class="flex flex-wrap gap-2">
      <BaseButton
        v-for="a in actions"
        :key="a.action"
        :variant="a.danger ? 'danger' : 'default'"
        size="sm"
        :disabled="busy || a.disabled"
        @click="run(a)"
      >
        {{ $t(a.label) }}
      </BaseButton>
    </div>

    <p class="text-xs text-slate-500">
      {{ $t('room.hostServerCheck') }}
    </p>

    <p v-if="actionError" class="text-xs text-red-400" role="alert">
      {{ actionError }}
    </p>
  </div>
</template>
