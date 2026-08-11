<script setup lang="ts">
/**
 * Chart browser (design §16.4).
 *
 * Search + filters (type / difficulty / rating / tags / order) are fed into a
 * single reactive `filters` object passed to `useChartList`, so any change
 * re-fetches automatically. Renders pending / error / empty / grid states.
 *
 * Clicking a card opens the Chart Context Window (overlay); each card also
 * links to the full `/chart/:id` page. All data is client-only with graceful
 * fallbacks — PPB Phase B may be unready.
 */
import type { Chart, ChartListParams } from '~/utils/api/types'
import ChartContextContent from '~/components/charts/ChartContextContent.vue'
import { useChartList } from '~/composables/useCharts'
import { useContextWindow } from '~/composables/useContextWindow'

const { t } = useI18n()
const { open } = useContextWindow()

useHead({ title: () => t('nav.charts') })

const search = ref('')
const difficultyMin = ref('')
const difficultyMax = ref('')
const ratingMin = ref('')
const ratingMax = ref('')
const tagsText = ref('')

const filters = reactive<ChartListParams>({
  order: 'updated',
})

watchDebounced(search, (val) => {
  filters.search = val.trim() || undefined
}, { debounce: 300, maxWait: 800 })

watch([difficultyMin, difficultyMax, ratingMin, ratingMax], ([dMin, dMax, rMin, rMax]) => {
  filters.difficulty_min = toNum(dMin)
  filters.difficulty_max = toNum(dMax)
  filters.rating_min = toNum(rMin)
  filters.rating_max = toNum(rMax)
})

watch(tagsText, (val) => {
  const tags = val.split(',').map(tag => tag.trim()).filter(Boolean)
  filters.tags = tags.length ? tags : undefined
})

const { charts, error, pending, refresh } = useChartList(filters)

function toNum(value: string): number | undefined {
  if (value === '')
    return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function openContext(chart: Chart): void {
  open({
    title: chart.name,
    component: markRaw(ChartContextContent),
    props: { chartId: chart.id },
    mobileMode: 'sheet',
  })
}

function fmtPlays(count?: number): string {
  return typeof count === 'number' ? count.toLocaleString() : '—'
}

function fmtDate(value?: string): string {
  if (!value)
    return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-50">
          {{ $t('nav.charts') }}
        </h1>
        <p v-if="charts.length" class="mt-1 text-xs text-slate-500">
          {{ $t('charts.totalCharts', { total: charts.length }) }}
        </p>
      </div>
      <input
        v-model="search"
        type="search"
        :placeholder="$t('charts.searchPlaceholder')"
        class="glass-focusable w-full rounded-md bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60 sm:w-72"
        aria-label="Search charts"
      >
    </header>

    <!-- Filters -->
    <section class="content-surface p-4">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label class="block">
          <span class="mb-1 block text-xs text-slate-500">{{ $t('charts.filterType') }}</span>
          <select
            v-model="filters.type"
            class="glass-focusable w-full rounded-md bg-white/5 px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/60"
          >
            <option value="">{{ $t('charts.allTypes') }}</option>
            <option value="SP">SP</option>
            <option value="DP">DP</option>
          </select>
        </label>

        <label class="block">
          <span class="mb-1 block text-xs text-slate-500">{{ $t('charts.difficultyRange') }}</span>
          <div class="flex items-center gap-1.5">
            <input
              v-model="difficultyMin"
              type="number"
              min="0"
              step="1"
              class="glass-focusable w-full rounded-md bg-white/5 px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/60"
              aria-label="Difficulty min"
            >
            <span class="text-slate-500">–</span>
            <input
              v-model="difficultyMax"
              type="number"
              min="0"
              step="1"
              class="glass-focusable w-full rounded-md bg-white/5 px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/60"
              aria-label="Difficulty max"
            >
          </div>
        </label>

        <label class="block">
          <span class="mb-1 block text-xs text-slate-500">{{ $t('charts.ratingRange') }}</span>
          <div class="flex items-center gap-1.5">
            <input
              v-model="ratingMin"
              type="number"
              min="0"
              step="0.1"
              class="glass-focusable w-full rounded-md bg-white/5 px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/60"
              aria-label="Rating min"
            >
            <span class="text-slate-500">–</span>
            <input
              v-model="ratingMax"
              type="number"
              min="0"
              step="0.1"
              class="glass-focusable w-full rounded-md bg-white/5 px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/60"
              aria-label="Rating max"
            >
          </div>
        </label>

        <label class="block">
          <span class="mb-1 block text-xs text-slate-500">{{ $t('charts.order') }}</span>
          <select
            v-model="filters.order"
            class="glass-focusable w-full rounded-md bg-white/5 px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/60"
          >
            <option value="updated">{{ $t('charts.orderUpdated') }}</option>
            <option value="popular">{{ $t('charts.orderPopular') }}</option>
            <option value="rating">{{ $t('charts.orderRating') }}</option>
            <option value="plays">{{ $t('charts.orderPlays') }}</option>
          </select>
        </label>

        <label class="block sm:col-span-2 lg:col-span-4">
          <span class="mb-1 block text-xs text-slate-500">{{ $t('charts.tags') }}</span>
          <input
            v-model="tagsText"
            type="text"
            :placeholder="$t('charts.tagsPlaceholder')"
            class="glass-focusable w-full rounded-md bg-white/5 px-2.5 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
          >
        </label>
      </div>
    </section>

    <!-- Results -->
    <section>
      <p v-if="pending" class="flex items-center justify-center py-16 text-sm text-slate-400">
        {{ $t('common.loading') }}
      </p>

      <div v-else-if="error" class="content-surface flex flex-col items-center gap-3 p-8 text-center">
        <p class="text-sm text-slate-400">
          {{ $t('common.error') }}
        </p>
        <BaseButton size="sm" variant="ghost" @click="() => refresh()">
          {{ $t('common.retry') }}
        </BaseButton>
      </div>

      <div v-else-if="charts.length === 0" class="content-surface p-8 text-center">
        <p class="text-sm text-slate-400">
          {{ $t('charts.empty') }}
        </p>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <article
          v-for="chart in charts"
          :key="chart.id"
          class="content-surface group cursor-pointer overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
          role="button"
          tabindex="0"
          @click="openContext(chart)"
          @keydown.enter="openContext(chart)"
        >
          <!-- Cover -->
          <div class="relative aspect-[16/10] overflow-hidden bg-white/5">
            <img
              v-if="chart.cover_url"
              :src="chart.cover_url"
              :alt="chart.name"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            >
            <div v-else class="grid h-full w-full place-items-center text-4xl text-slate-600">
              ♪
            </div>
            <span
              class="absolute right-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-slate-200 backdrop-blur-sm"
            >
              {{ chart.difficulty != null ? `★${chart.difficulty}` : (chart.level ?? '—') }}
            </span>
          </div>

          <!-- Body -->
          <div class="p-4">
            <h3 class="truncate text-sm font-semibold text-slate-50">
              {{ chart.name }}
            </h3>
            <p class="mt-0.5 truncate text-xs text-slate-400">
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

            <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span v-if="chart.type">{{ $t('chart.type') }}: {{ chart.type }}</span>
              <span v-if="chart.rating != null">{{ $t('chart.rating') }}: {{ chart.rating }}</span>
            </div>

            <div v-if="chart.tags?.length" class="mt-2 flex flex-wrap gap-1">
              <span
                v-for="tag in chart.tags"
                :key="tag"
                class="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400"
              >
                {{ tag }}
              </span>
            </div>

            <div class="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
              <span v-if="chart.play_count != null">{{ $t('charts.playCount', { count: fmtPlays(chart.play_count) }) }}</span>
              <span v-else />
              <span v-if="chart.updated_at">{{ fmtDate(chart.updated_at) }}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end border-t border-white/5 px-4 py-2.5">
            <NuxtLink
              :to="`/chart/${chart.id}`"
              class="text-xs text-accent transition-colors hover:text-accent-strong"
              @click.stop
            >
              {{ $t('chart.openFullPage') }}
            </NuxtLink>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
