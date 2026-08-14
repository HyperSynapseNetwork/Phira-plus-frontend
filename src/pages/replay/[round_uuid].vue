<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()

const roundUuid = computed(() => String(route.params.round_uuid ?? ''))
const playerPhiraId = computed(() => {
  const value = Number(route.query.player_id)
  return Number.isInteger(value) && value > 0 ? value : undefined
})

usePageSeo(() => ({
  title: `${t('live.round')} ${roundUuid.value}`,
  description: t('viewer.replayNoRawDownload'),
  noindex: true,
}))
</script>

<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold text-slate-50">
          {{ $t('viewer.replayPlay') }}
        </h1>
        <p class="mt-1 truncate font-mono text-xs text-slate-400">
          {{ roundUuid }} · #{{ playerPhiraId ?? '—' }}
        </p>
      </div>
      <PPButton as="NuxtLink" to="/replays" size="sm" weight="quiet">
        {{ $t('common.back') }}
      </PPButton>
    </header>

    <PPSurface as="section" class="p-6">
      <p v-if="!playerPhiraId" class="text-sm text-rose-300">
        {{ $t('viewer.replayNoData') }}
      </p>
      <ReplayViewer v-else :round-uuid="roundUuid" :player-phira-id="playerPhiraId" />
    </PPSurface>
  </div>
</template>
