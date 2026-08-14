<script setup lang="ts">
import { apiFetch } from '~/utils/api/client'

const { t } = useI18n()
const notice = useNotice()
const code = ref('')
const busy = ref(false)
const fieldError = ref('')

async function redeem(): Promise<void> {
  fieldError.value = ''
  const normalized = code.value.trim().toUpperCase()
  if (!normalized) {
    fieldError.value = t('myphira.redemptionCodeRequired')
    return
  }
  busy.value = true
  try {
    await apiFetch('/api/v1/coupons/redeem', { method: 'POST', body: { code: normalized } })
    code.value = ''
    notice.success('notice.redemptionCompleted', undefined, { dedupKey: 'redemption:completed' })
  }
  catch (err) {
    notice.errorFromApi(err, { dedupKey: 'redemption:error' })
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="redeem">
    <div>
      <label for="redemption-code" class="mb-1 block text-sm font-medium text-slate-200">{{ t('myphira.redemptionCode') }}</label>
      <PPInput id="redemption-code" v-model="code" autocomplete="off" mono class="uppercase" :placeholder="t('myphira.redemptionCodePlaceholder')" />
      <p v-if="fieldError" class="mt-1 text-xs text-rose-300" role="alert">
        {{ fieldError }}
      </p>
    </div>
    <p class="text-xs leading-relaxed text-slate-400">
      {{ t('myphira.redemptionHint') }}
    </p>
    <PPButton type="submit" weight="primary" :disabled="busy">
      {{ t('myphira.redeem') }}
    </PPButton>
  </form>
</template>
