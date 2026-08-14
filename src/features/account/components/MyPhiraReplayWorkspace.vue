<script setup lang="ts">
import type { Replay } from '~/features/replay/types'
import ReplayList from '~/components/myphira/ReplayList.vue'

const props = defineProps<{ replays: Replay[], pending: boolean, error: unknown }>()
const emit = defineEmits<{ refresh: [] }>()
const { t } = useI18n()
</script>

<template>
  <section>
    <div class="mb-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--pp-text-secondary)]">{{ t('myphira.tabReplay') }}</h2>
      <p class="mt-1 text-sm text-[var(--pp-text-tertiary)]">{{ t('myphira.replayVisibility') }}</p>
    </div>
    <p v-if="props.pending" class="py-4 text-sm text-[var(--pp-text-secondary)]">{{ t('common.loading') }}</p>
    <div v-else-if="props.error" class="border-y border-[var(--pp-border-subtle)] py-4">
      <p class="text-sm text-rose-300">{{ t('common.error') }}</p>
      <PPButton weight="quiet" size="sm" class="mt-2" @click="emit('refresh')">{{ t('common.retry') }}</PPButton>
    </div>
    <ReplayList v-else :replays="props.replays" manage @changed="emit('refresh')" />
  </section>
</template>
