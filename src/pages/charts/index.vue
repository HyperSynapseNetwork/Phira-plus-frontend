<script setup lang="ts">
/**
 * Artwork-led chart browser. The page composes search + editorial rows; wire
 * normalization stays in `useChartList`, and deep chart details open in the
 * shared Context Window instead of becoming card chrome here.
 */
import type { Chart, ChartListParams } from '~/utils/api/types'
import ChartContextContent from '~/components/charts/ChartContextContent.vue'
import ChartGalleryRow from '~/components/charts/ChartGalleryRow.vue'
import { useChartList } from '~/composables/useCharts'
import { useContextWindow } from '~/composables/useContextWindow'

const { t } = useI18n()
const { open } = useContextWindow()
useHead({ title: () => t('nav.charts') })

const search = ref('')
const filters = reactive<ChartListParams>({})
watchDebounced(search, (value) => {
  filters.search = value.trim() || undefined
}, { debounce: 300, maxWait: 800 })

const { charts, total, error, pending, refresh } = useChartList(filters)

function openContext(chart: Chart): void {
  open({
    title: chart.name,
    component: markRaw(ChartContextContent),
    props: { chartId: chart.id },
    mobileMode: 'sheet',
  })
}
</script>

<template>
  <div class="space-y-5">
    <header class="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--pp-border-subtle)] pb-4">
      <div>
        <h1 class="text-2xl font-bold text-[var(--pp-text-primary)]">
          {{ t('nav.charts') }}
        </h1>
        <p v-if="!pending && !error" class="mt-1 text-xs text-[var(--pp-text-tertiary)]">
          {{ t('charts.totalCharts', { total }) }}
        </p>
      </div>
      <label class="w-full sm:w-72">
        <span class="sr-only">{{ t('charts.searchPlaceholder') }}</span>
        <PPInput v-model="search" type="search" :placeholder="t('charts.searchPlaceholder')" />
      </label>
    </header>

    <section aria-live="polite">
      <p v-if="pending" class="py-16 text-center text-sm text-[var(--pp-text-secondary)]">
        {{ t('common.loading') }}
      </p>

      <div v-else-if="error" class="border-y border-[var(--pp-border-subtle)] py-8 text-center">
        <p class="text-sm text-rose-300">
          {{ t('common.error') }}
        </p>
        <PPButton size="sm" weight="quiet" class="mt-3" @click="() => refresh()">
          {{ t('common.retry') }}
        </PPButton>
      </div>

      <p v-else-if="charts.length === 0" class="border-y border-[var(--pp-border-subtle)] py-8 text-center text-sm text-[var(--pp-text-secondary)]">
        {{ t('charts.empty') }}
      </p>

      <div v-else class="divide-y divide-[var(--pp-border-subtle)]">
        <ChartGalleryRow v-for="chart in charts" :key="chart.id" :chart="chart" @open="openContext" />
      </div>
    </section>
  </div>
</template>
