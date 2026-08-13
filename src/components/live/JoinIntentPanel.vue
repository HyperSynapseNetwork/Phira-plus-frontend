<script setup lang="ts">
import { useJoinIntent } from '~/viewer/useJoinIntent'

/**
 * JoinIntent panel (design §14.6, contracts README §8 / §11).
 *
 * Entry point for the "进入房间" flow: user confirms → PPB creates a short-lived
 * JoinIntent → PPF prompts the user to launch/switch to the HSN Phira+ client →
 * PPB watches PMP `user.online` and `room.force_move`s the user into the room.
 *
 * Always degrades gracefully when PPB is unready: `requestJoin`/`cancelJoin`
 * never throw, and the panel just shows the `error`/`expired` state.
 */

const props = defineProps<{ roomId: string }>()

const { intent, status, errorMessage, countdown, requestJoin, cancelJoin } = useJoinIntent()

async function onConfirm(): Promise<void> {
  await requestJoin(props.roomId)
}

async function onCancel(): Promise<void> {
  await cancelJoin()
}
</script>

<template>
  <div class="content-surface p-4">
    <h3 class="mb-2 text-sm font-semibold text-slate-100">
      {{ $t('joinIntent.title') }}
    </h3>

    <!-- Idle: offer the join action -->
    <template v-if="status === 'idle'">
      <p class="mb-3 text-sm text-slate-400">
        {{ $t('joinIntent.prompt') }}
      </p>
      <BaseButton variant="primary" size="sm" @click="onConfirm">
        {{ $t('joinIntent.confirm') }}
      </BaseButton>
    </template>

    <!-- Requesting: brief creation state -->
    <template v-else-if="status === 'requesting'">
      <p class="text-sm text-slate-400">
        {{ $t('joinIntent.waiting') }}
      </p>
    </template>

    <!-- Waiting: prompt to connect the client, show countdown + cancel -->
    <template v-else-if="status === 'waiting' || status === 'user_online' || status === 'moving'">
      <p class="mb-1 text-sm text-slate-200">
        {{ intent?.prompt || $t('joinIntent.prompt') }}
      </p>
      <p class="mb-3 text-xs text-slate-400">
        {{
          status === 'user_online'
            ? $t('joinIntent.userOnline')
            : status === 'moving'
              ? $t('joinIntent.moving')
              : $t('joinIntent.countdown', { seconds: countdown })
        }}
      </p>
      <BaseButton variant="ghost" size="sm" @click="onCancel">
        {{ $t('joinIntent.cancel') }}
      </BaseButton>
    </template>

    <p v-else-if="status === 'completed'" class="text-sm text-emerald-400">
      {{ $t('joinIntent.completed') }}
    </p>

    <p v-else-if="status === 'failed'" class="text-sm text-rose-400" role="alert">
      {{ $t('joinIntent.failed', { message: errorMessage ?? '—' }) }}
    </p>

    <p v-else-if="status === 'expired'" class="text-sm text-amber-400">
      {{ $t('joinIntent.expired') }}
    </p>

    <p v-else-if="status === 'error'" class="text-sm text-rose-400" role="alert">
      {{ $t('joinIntent.error', { message: errorMessage ?? '—' }) }}
    </p>
  </div>
</template>
