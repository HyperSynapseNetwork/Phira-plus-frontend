<script setup lang="ts">
/**
 * Replay share page `/replay/share/:token` (design §12.4).
 * Access always goes through PPB's viewer stream (contract §10) — never a
 * raw download. Renders a card with the token and the ChartPlayer-based
 * ReplayViewer, degrading gracefully while PPB endpoints are unready.
 */
const route = useRoute()
const { t } = useI18n()

const token = computed(() => {
  const v = route.params.token
  return Array.isArray(v) ? v[0] : v
})

usePageSeo(() => ({
  title: t('viewer.replayShare'),
  description: t('viewer.replayNoRawDownload'),
  type: 'website',
}))
</script>

<template>
  <div class="space-y-4">
    <header>
      <h1 class="text-2xl font-bold text-slate-50">
        {{ $t('viewer.replayShare') }}
      </h1>
      <p v-if="token" class="mt-1 text-sm text-slate-400">
        {{ $t('viewer.replayShareToken', { token }) }}
      </p>
    </header>

    <PPSurface as="section" class="p-6">
      <p v-if="!token" class="py-10 text-center text-sm text-slate-400">
        {{ $t('viewer.replayNoData') }}
      </p>
      <ReplayViewer v-else :share-token="token" />
    </PPSurface>
  </div>
</template>
