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
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useReauth } from '~/composables/useReauth'
import { focusableElements, trapTab, useOverlayManager } from '~/composables/useOverlayManager'

const { isReauthOpen, reauth, settleReauth } = useReauth()

const password = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const overlay = useOverlayManager()
const overlayId = `ppf-reauth-${Math.random().toString(36).slice(2, 9)}`

function onKeydown(event: KeyboardEvent): void {
  if (!isReauthOpen.value || !overlay.isTopmost(overlayId)) return
  if (event.key === 'Escape') { event.preventDefault(); onCancel(); return }
  trapTab(event, panelEl.value)
}

watch(isReauthOpen, async (open) => {
  if (!import.meta.client) return
  if (open) {
    overlay.push(overlayId, 'reauth')
    await nextTick()
    ;(focusableElements(panelEl.value)[0] ?? panelEl.value)?.focus({ preventScroll: true })
  } else overlay.pop(overlayId)
}, { immediate: true })
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => { window.removeEventListener('keydown', onKeydown); overlay.pop(overlayId) })

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
      class="fixed inset-0 z-[var(--pp-z-reauth)] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="$t('a11y.reauth')"
    >
      <div class="absolute inset-0 bg-black/60" @click="overlay.isTopmost(overlayId) && onCancel()" />
      <form
        ref="panelEl"
        tabindex="-1"
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
          <PPInput v-model="password" type="password" autocomplete="current-password" :placeholder="$t('reauth.passwordPlaceholder')" />
        </label>

        <p v-if="error" class="mt-2 text-xs text-rose-400" role="alert">
          {{ $t(error) }}
        </p>
        <p v-if="!error && password" class="mt-2 text-xs text-slate-500">
          {{ $t('reauth.hint') }}
        </p>

        <div class="mt-4 flex justify-end gap-2">
          <PPButton weight="quiet" size="sm" :disabled="submitting" @click="overlay.isTopmost(overlayId) && onCancel()">
            {{ $t('common.cancel') }}
          </PPButton>
          <PPButton weight="primary" size="sm" type="submit" :disabled="submitting || !password">
            {{ submitting ? $t('common.loading') : $t('reauth.confirm') }}
          </PPButton>
        </div>
      </form>
    </div>
  </Teleport>
</template>
