<script setup lang="ts">
/**
 * Elevated reauth password prompt (contract §20 / P11, design §6.9).
 *
 * Shown via `useReauth()` when a sensitive operation (e.g. notification
 * action/input) is rejected with reauth-required. Submits the Phira password to
 * `POST /api/v1/auth/phira/reauth`, receives the `X-Reauth-Token`, and resolves
 * `withReauth` so the original operation can retry with the token. Cancellation
 * / failure resolves `null` → the caller surfaces an explicit error.
 */
import { useReauth } from '~/composables/useReauth'

const { isReauthOpen, reauth, settleReauth } = useReauth()

const password = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)

async function onSubmit(): Promise<void> {
  if (!password.value || submitting.value)
    return
  submitting.value = true
  error.value = null
  const token = await reauth(password.value)
  if (token) {
    password.value = ''
    settleReauth(token)
  }
  else {
    error.value = 'reauth.failed'
  }
  submitting.value = false
}

function onCancel(): void {
  password.value = ''
  error.value = null
  settleReauth(null)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isReauthOpen"
      class="fixed inset-0 z-[70] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Re-authenticate"
    >
      <div class="absolute inset-0 bg-black/60" @click="onCancel" />
      <form
        class="context-window-panel relative w-full max-w-sm rounded-window p-5"
        @submit.prevent="onSubmit"
      >
        <h2 class="text-base font-semibold text-slate-50">
          {{ $t('reauth.title') }}
        </h2>
        <p class="mt-1 text-sm text-slate-400">
          {{ $t('reauth.body') }}
        </p>

        <label class="mt-4 block">
          <span class="mb-1 block text-xs text-slate-400">
            {{ $t('reauth.passwordLabel') }}
          </span>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            :placeholder="$t('reauth.passwordPlaceholder')"
            class="glass-focusable w-full rounded-md bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
          >
        </label>

        <p v-if="error" class="mt-2 text-xs text-rose-400" role="alert">
          {{ $t(error) }}
        </p>
        <p v-if="!error && password" class="mt-2 text-xs text-slate-500">
          {{ $t('reauth.hint') }}
        </p>

        <div class="mt-4 flex justify-end gap-2">
          <BaseButton variant="ghost" size="sm" :disabled="submitting" @click="onCancel">
            {{ $t('common.cancel') }}
          </BaseButton>
          <BaseButton variant="primary" size="sm" type="submit" :disabled="submitting || !password">
            {{ submitting ? $t('common.loading') : $t('reauth.confirm') }}
          </BaseButton>
        </div>
      </form>
    </div>
  </Teleport>
</template>
