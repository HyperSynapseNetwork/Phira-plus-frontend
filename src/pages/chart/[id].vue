<script setup lang="ts">
/**
 * Chart detail page `/chart/:id` (design §16.4).
 *
 * Shows Phira metadata, a data-source badge (Phira vs HSN Phira+), a lazy WASM
 * Chart Preview, the global record ranking and the current user's best. All
 * data is client-only with graceful fallbacks — PPB Phase B may be unready.
 */
import type { ChartRecord } from '~/utils/api/types'
import { useChart, useChartRecords } from '~/composables/useCharts'

const route = useRoute()
const { t } = useI18n()

const rawId = computed(() => {
  const v = route.params.id
  const n = Number(Array.isArray(v) ? v[0] : v)
  return Number.isFinite(n) && n > 0 ? n : NaN
})
const chartId = computed(() => rawId.value)
const chartIdValid = computed(() => Number.isFinite(rawId.value))

const { chart, error, pending, refresh } = useChart(chartId)
const { records, error: recordsError, pending: recordsPending, refresh: refreshRecords } = useChartRecords(chartId)

usePageSeo(() => ({
  title: chart.value?.name ?? t('nav.charts'),
  description: chart.value
    ? [chart.value.artist, chart.value.charter, chart.value.level].filter(Boolean).join(' · ')
    : t('charts.empty'),
  image: chart.value?.cover_url ?? null,
  type: 'music.song',
  jsonLd: chart.value
    ? {
        '@context': 'https://schema.org',
        '@type': 'MusicRecording',
        'name': chart.value.name,
        'byArtist': chart.value.artist ? { '@type': 'Person', 'name': chart.value.artist } : undefined,
        // Phira chart metadata is the source; no PII is exposed here.
        'description': [chart.value.artist, chart.value.charter].filter(Boolean).join(' · '),
      }
    : undefined,
}))

const ranking = computed<ChartRecord[]>(() => {
  if (records.value.length)
    return records.value
  return chart.value?.records ?? []
})

function fmtPlays(count?: number): string {
  return typeof count === 'number' ? count.toLocaleString() : '—'
}

function fmtScore(score?: number): string {
  return typeof score === 'number' ? Math.round(score).toLocaleString() : '—'
}

function fmtAccuracy(acc?: number): string {
  return typeof acc === 'number' ? `${acc.toFixed(2)}%` : '—'
}

function fmtCombo(combo?: number): string {
  return typeof combo === 'number' ? String(combo) : '—'
}

function fmtDate(value?: string): string {
  if (!value)
    return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back -->
    <NuxtLink
      to="/charts"
      class="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-accent"
    >
      <span aria-hidden="true">←</span>
      {{ $t('common.back') }}
    </NuxtLink>

    <!-- Loading -->
    <div v-if="pending" class="content-surface flex items-center justify-center p-16 text-sm text-slate-400">
      {{ $t('common.loading') }}
    </div>

    <!-- Invalid chart id -->
    <section v-else-if="!chartIdValid" class="content-surface p-10 text-center">
      <p class="text-sm text-slate-400">
        {{ $t('chart.notFound') }}
      </p>
    </section>

    <!-- Error -->
    <section v-else-if="error" class="content-surface flex flex-col items-center gap-3 p-10 text-center">
      <p class="text-sm text-slate-400">
        {{ $t('common.error') }}
      </p>
      <BaseButton size="sm" variant="ghost" @click="() => refresh()">
        {{ $t('common.retry') }}
      </BaseButton>
    </section>

    <!-- Empty -->
    <section v-else-if="!chart" class="content-surface p-10 text-center">
      <p class="text-sm text-slate-400">
        {{ $t('charts.empty') }}
      </p>
    </section>

    <template v-else>
      <!-- Metadata -->
      <section class="content-surface p-6">
        <div class="flex flex-col gap-5 md:flex-row">
          <div class="w-full shrink-0 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10 md:w-52">
            <CoverImage
              :src="chart.cover_url"
              :alt="chart.name"
              aspect="square"
              class="aspect-square h-auto w-full object-cover"
            />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-2xl font-bold text-slate-50">
                {{ chart.name }}
              </h1>
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1"
                :class="chart.source === 'phira'
                  ? 'bg-sky-400/10 text-sky-300 ring-sky-400/30'
                  : 'bg-accent/15 text-accent ring-accent/50'"
              >
                {{ chart.source === 'phira' ? $t('chart.sourcePhira') : $t('chart.sourcePhiraPlus') }}
              </span>
            </div>

            <p class="mt-1.5 text-sm text-slate-400">
              <template v-if="chart.artist">
                {{ $t('chart.artist') }}: {{ chart.artist }}
              </template>
              <template v-if="chart.charter">
                · {{ $t('charts.charter') }}: {{ chart.charter }}
              </template>
            </p>

            <dl class="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <div v-if="chart.type">
                <dt class="text-xs text-slate-500">
                  {{ $t('chart.type') }}
                </dt>
                <dd class="mt-0.5 text-slate-200">
                  {{ chart.type }}
                </dd>
              </div>
              <div v-if="chart.level">
                <dt class="text-xs text-slate-500">
                  {{ $t('chart.level') }}
                </dt>
                <dd class="mt-0.5 text-slate-200">
                  {{ chart.level }}
                </dd>
              </div>
              <div v-if="chart.difficulty != null">
                <dt class="text-xs text-slate-500">
                  {{ $t('chart.difficulty') }}
                </dt>
                <dd class="mt-0.5 text-slate-200">
                  {{ chart.difficulty }}
                </dd>
              </div>
              <div v-if="chart.rating != null">
                <dt class="text-xs text-slate-500">
                  {{ $t('chart.rating') }}
                </dt>
                <dd class="mt-0.5 text-slate-200">
                  {{ chart.rating }}
                </dd>
              </div>
              <div v-if="chart.play_count != null">
                <dt class="text-xs text-slate-500">
                  {{ $t('charts.playCountLabel') }}
                </dt>
                <dd class="mt-0.5 text-slate-200">
                  {{ fmtPlays(chart.play_count) }}
                </dd>
              </div>
              <div v-if="chart.updated_at">
                <dt class="text-xs text-slate-500">
                  {{ $t('chart.updatedAt') }}
                </dt>
                <dd class="mt-0.5 text-slate-200">
                  {{ fmtDate(chart.updated_at) }}
                </dd>
              </div>
            </dl>

            <div v-if="chart.tags?.length" class="mt-4 flex flex-wrap gap-1.5">
              <span
                v-for="tag in chart.tags"
                :key="tag"
                class="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-400"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Chart Preview (WASM viewer, lazy — design §12.7) -->
      <section class="content-surface p-6">
        <h2 class="text-sm font-semibold text-slate-100">
          {{ $t('chart.preview') }}
        </h2>
        <ChartPlayerCanvas class="mt-4" :chart-id="chart.id" />
      </section>

      <!-- Global ranking -->
      <section class="content-surface p-6">
        <h2 class="text-sm font-semibold text-slate-100">
          {{ $t('chart.globalRanking') }}
        </h2>
        <p v-if="recordsPending" class="mt-4 text-sm text-slate-400">
          {{ $t('common.loading') }}
        </p>
        <p v-else-if="recordsError" class="mt-4 text-sm text-slate-500">
          <button type="button" class="text-accent hover:underline" @click="() => refreshRecords()">
            {{ $t('common.retry') }}
          </button>
        </p>
        <p v-else-if="ranking.length === 0" class="mt-4 text-sm text-slate-400">
          {{ $t('chart.noRanking') }}
        </p>
        <div v-else class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[560px] text-sm">
            <thead>
              <tr class="border-b border-white/10 text-left text-xs text-slate-500">
                <th class="py-2 pr-3 font-medium">
                  {{ $t('chart.rank') }}
                </th>
                <th class="py-2 pr-3 font-medium">
                  {{ $t('chart.player') }}
                </th>
                <th class="py-2 pr-3 text-right font-medium">
                  {{ $t('chart.score') }}
                </th>
                <th class="py-2 pr-3 text-right font-medium">
                  {{ $t('chart.accuracy') }}
                </th>
                <th class="py-2 pr-3 text-right font-medium">
                  {{ $t('chart.combo') }}
                </th>
                <th class="py-2 font-medium">
                  {{ $t('chart.updatedAt') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr
                v-for="r in ranking"
                :key="r.id ?? `${r.user_id ?? 'u'}-${r.rank ?? 'r'}`"
                :class="r.is_self ? 'bg-accent/10' : ''"
              >
                <td class="py-2.5 pr-3 text-slate-300">
                  {{ r.rank ?? '—' }}
                </td>
                <td class="py-2.5 pr-3 text-slate-200">
                  {{ r.username ?? '—' }}
                  <span v-if="r.is_self" class="ml-1 text-xs font-medium text-accent">
                    ({{ $t('chart.you') }})
                  </span>
                </td>
                <td class="py-2.5 pr-3 text-right tabular-nums text-slate-200">
                  {{ fmtScore(r.score) }}
                </td>
                <td class="py-2.5 pr-3 text-right tabular-nums text-slate-300">
                  {{ fmtAccuracy(r.accuracy) }}
                </td>
                <td class="py-2.5 pr-3 text-right tabular-nums text-slate-300">
                  {{ fmtCombo(r.combo) }}
                </td>
                <td class="py-2.5 text-xs text-slate-500">
                  {{ fmtDate(r.updated_at) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- My best -->
      <section class="content-surface p-6">
        <h2 class="text-sm font-semibold text-slate-100">
          {{ $t('chart.myBest') }}
        </h2>
        <p v-if="chart.my_best" class="mt-4 text-sm text-slate-300">
          <span class="font-medium text-accent">{{ $t('chart.you') }}</span>
          <template v-if="chart.my_best.rank != null">
            · {{ $t('chart.rank') }}: {{ chart.my_best.rank }}
          </template>
          <template v-if="chart.my_best.score != null">
            · {{ $t('chart.score') }}: {{ fmtScore(chart.my_best.score) }}
          </template>
          <template v-if="chart.my_best.accuracy != null">
            · {{ $t('chart.accuracy') }}: {{ fmtAccuracy(chart.my_best.accuracy) }}
          </template>
          <template v-if="chart.my_best.combo != null">
            · {{ $t('chart.combo') }}: {{ fmtCombo(chart.my_best.combo) }}
          </template>
        </p>
        <p v-else class="mt-4 text-sm text-slate-400">
          {{ $t('chart.noMyBest') }}
        </p>
      </section>
    </template>
  </div>
</template>
