<script setup lang="ts">
/**
 * Chart Context Window content (design §16.4).
 *
 * Compact chart detail rendered inside the overlay: Phira metadata, a
 * data-source badge (Phira vs Phira+), my-best summary, top-5 global ranking
 * and a lazy Chart Preview placeholder. All data is client-only with graceful
 * fallbacks — PPB Phase B may be unready, so every section degrades to a
 * neutral empty state.
 */
import type { ChartRecord } from '~/utils/api/types'
import { useChart, useChartRecords } from '~/composables/useCharts'

const props = defineProps<{
  chartId: number | string
}>()

const { chart, error, pending, refresh } = useChart(props.chartId)
const { records, error: recordsError, pending: recordsPending, refresh: refreshRecords } = useChartRecords(props.chartId)

const ranking = computed<ChartRecord[]>(() => {
  if (records.value.length)
    return records.value
  return chart.value?.records ?? []
})

const topFive = computed(() => ranking.value.slice(0, 5))

function fmtScore(score?: number): string {
  return typeof score === 'number' ? Math.round(score).toLocaleString() : '—'
}

function fmtAccuracy(acc?: number): string {
  return typeof acc === 'number' ? `${acc.toFixed(2)}%` : '—'
}
</script>

<template>
  <div class="space-y-5">
    <p v-if="pending" class="py-10 text-center text-sm text-slate-400">
      {{ $t('common.loading') }}
    </p>

    <div v-else-if="error" class="flex flex-col items-center gap-3 py-10 text-center">
      <p class="text-sm text-slate-400">
        {{ $t('common.error') }}
      </p>
      <BaseButton size="sm" variant="ghost" @click="() => refresh()">
        {{ $t('common.retry') }}
      </BaseButton>
    </div>

    <p v-else-if="!chart" class="py-10 text-center text-sm text-slate-400">
      {{ $t('charts.empty') }}
    </p>

    <template v-else>
      <!-- Metadata -->
      <div class="flex items-start gap-4">
        <div class="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
          <img
            v-if="chart.cover_url"
            :src="chart.cover_url"
            :alt="chart.name"
            class="h-full w-full object-cover"
            loading="lazy"
          >
          <div v-else class="grid h-full w-full place-items-center text-2xl text-slate-600">
            ♪
          </div>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="truncate text-base font-semibold text-slate-50">
              {{ chart.name }}
            </h3>
            <span
              class="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1"
              :class="chart.source === 'phira'
                ? 'bg-sky-400/10 text-sky-300 ring-sky-400/30'
                : 'bg-accent/15 text-accent ring-accent/50'"
            >
              {{ chart.source === 'phira' ? $t('chart.sourcePhira') : $t('chart.sourcePhiraPlus') }}
            </span>
          </div>

          <p class="mt-1 truncate text-xs text-slate-400">
            <template v-if="chart.artist">
              {{ chart.artist }}
            </template>
            <template v-if="chart.artist && chart.charter">
              ·
            </template>
            <template v-if="chart.charter">
              {{ $t('charts.charter') }}: {{ chart.charter }}
            </template>
          </p>

          <p class="mt-1 text-xs text-slate-400">
            <template v-if="chart.type">
              {{ $t('chart.type') }}: {{ chart.type }}
            </template>
            <template v-if="chart.level">
              · {{ $t('chart.level') }}: {{ chart.level }}
            </template>
            <template v-if="chart.difficulty != null">
              · {{ $t('chart.difficulty') }}: {{ chart.difficulty }}
            </template>
            <template v-if="chart.rating != null">
              · {{ $t('chart.rating') }}: {{ chart.rating }}
            </template>
          </p>

          <div v-if="chart.tags?.length" class="mt-2 flex flex-wrap gap-1">
            <span
              v-for="tag in chart.tags"
              :key="tag"
              class="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- My best summary -->
      <div class="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-xs">
        <span class="font-medium text-slate-300">{{ $t('chart.myBest') }}</span>
        <span v-if="chart.my_best" class="ml-2 text-slate-400">
          {{ fmtScore(chart.my_best.score) }} · {{ fmtAccuracy(chart.my_best.accuracy) }} · {{ $t('chart.rank') }} {{ chart.my_best.rank ?? '—' }}
        </span>
        <span v-else class="ml-2 text-slate-500">
          {{ $t('chart.noMyBest') }}
        </span>
      </div>

      <!-- Top-5 global ranking -->
      <div>
        <h4 class="text-xs font-semibold text-slate-100">
          {{ $t('chart.globalRanking') }}
        </h4>
        <p v-if="recordsPending" class="mt-2 text-xs text-slate-500">
          {{ $t('common.loading') }}
        </p>
        <p v-else-if="recordsError" class="mt-2 text-xs text-slate-500">
          <button type="button" class="text-accent hover:underline" @click="() => refreshRecords()">
            {{ $t('common.retry') }}
          </button>
        </p>
        <p v-else-if="topFive.length === 0" class="mt-2 text-xs text-slate-500">
          {{ $t('chart.noRanking') }}
        </p>
        <ol v-else class="mt-2 divide-y divide-white/5">
          <li
            v-for="r in topFive"
            :key="r.id ?? `${r.user_id ?? 'u'}-${r.rank ?? 'r'}`"
            class="flex items-center gap-3 py-1.5 text-xs"
            :class="r.is_self ? 'rounded-md bg-accent/10 px-1.5' : ''"
          >
            <span class="w-5 shrink-0 text-slate-500">{{ r.rank ?? '—' }}</span>
            <span class="min-w-0 flex-1 truncate text-slate-200">
              {{ r.username ?? '—' }}
              <span v-if="r.is_self" class="text-accent">({{ $t('chart.you') }})</span>
            </span>
            <span class="shrink-0 tabular-nums text-slate-300">{{ fmtScore(r.score) }}</span>
            <span class="w-16 shrink-0 text-right tabular-nums text-slate-400">{{ fmtAccuracy(r.accuracy) }}</span>
          </li>
        </ol>
      </div>

      <!-- Chart Preview — WASM ChartPlayer (design §12.7, Gate 4) -->
      <ChartPlayerCanvas :chart-id="chart.id" />

      <!-- Full page link -->
      <div class="flex justify-end border-t border-white/5 pt-3">
        <NuxtLink
          :to="`/chart/${chart.id}`"
          class="text-sm text-accent transition-colors hover:text-accent-strong"
        >
          {{ $t('chart.openFullPage') }}
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
