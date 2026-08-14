<script setup lang="ts">
/**
 * Push channel settings (design §14.7, contract §8).
 * Used in MyPhira → Settings. Shows Web Push status for this browser and lets
 * the user enable / disable it. Windows / Android remote push is handled by
 * the Tauri native adapter and is intentionally outside this Web Push panel.
 */
import { usePush } from '~/composables/usePush'

const { supported, enabled, subscription, error, subscribe, unsubscribe, syncToServer } = usePush()

const busy = ref(false)

async function onToggle(): Promise<void> {
  busy.value = true
  try {
    if (enabled.value) {
      await unsubscribe()
    }
    else {
      const sub = await subscribe()
      if (sub)
        await syncToServer()
    }
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-3">
    <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
      {{ $t('push.title') }}
    </h3>

    <p class="text-sm text-slate-400">
      {{ supported ? $t('push.supported') : $t('push.unsupported') }}
    </p>

    <p v-if="supported" class="text-sm text-slate-400">
      {{ enabled ? $t('push.enabled') : $t('push.disabled') }}
    </p>

    <p v-if="subscription && enabled" class="break-all text-xs text-slate-500">
      {{ subscription.endpoint }}
    </p>

    <PPButton
      v-if="supported"
      size="sm"
      :disabled="busy"
      :weight="enabled ? 'quiet' : 'primary'"
      @click="onToggle"
    >
      {{ busy ? $t('common.loading') : (enabled ? $t('push.disable') : $t('push.enable')) }}
    </PPButton>

    <p v-if="error" class="text-xs text-rose-400">
      {{ $t('push.error') }}：{{ $t(error) }}
    </p>
  </div>
</template>
