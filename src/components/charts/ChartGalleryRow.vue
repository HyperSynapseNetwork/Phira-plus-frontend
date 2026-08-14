<script setup lang="ts">
import type { Chart } from '~/utils/api/types'

const props = defineProps<{ chart: Chart }>()
const emit = defineEmits<{ open: [chart: Chart] }>()
const { t } = useI18n()

const meta = computed(() => {
  const parts: string[] = []
  if (props.chart.artist)
    parts.push(props.chart.artist)
  if (props.chart.charter)
    parts.push(`${t('charts.charter')}: ${props.chart.charter}`)
  return parts.join(' · ')
})
</script>

<template>
  <article class="group grid gap-3 py-4 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center sm:gap-5">
    <button
      type="button"
      class="relative aspect-[16/10] overflow-hidden rounded-[var(--pp-radius-control)] bg-[var(--pp-surface-muted)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
      :aria-label="chart.name"
      @click="emit('open', chart)"
    >
      <img
        v-if="chart.cover_url"
        :src="chart.cover_url"
        :alt="chart.name"
        class="h-full w-full object-cover transition-transform duration-[var(--pp-motion-normal)] group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:transform-none"
        loading="lazy"
      >
      <span v-else class="grid h-full w-full place-items-center text-3xl text-[var(--pp-text-tertiary)]" aria-hidden="true">♪</span>
      <span
        v-if="chart.difficulty != null || chart.level"
        class="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm"
      >
        {{ chart.difficulty != null ? `★${chart.difficulty}` : chart.level }}
      </span>
    </button>

    <button
      type="button"
      class="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
      @click="emit('open', chart)"
    >
      <h2 class="truncate text-base font-semibold text-[var(--pp-text-primary)] transition-colors group-hover:text-accent">
        {{ chart.name }}
      </h2>
      <p v-if="meta" class="mt-1 truncate text-sm text-[var(--pp-text-secondary)]">
        {{ meta }}
      </p>
      <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--pp-text-tertiary)]">
        <span v-if="chart.type">{{ t('chart.type') }}: {{ chart.type }}</span>
        <span v-if="chart.rating != null">{{ t('chart.rating') }}: {{ chart.rating }}</span>
        <span v-if="chart.play_count != null">{{ t('charts.playCount', { count: chart.play_count.toLocaleString() }) }}</span>
      </div>
      <div v-if="chart.tags?.length" class="mt-2 flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-[11px] text-[var(--pp-text-tertiary)]">
        <span v-for="tag in chart.tags.slice(0, 4)" :key="tag">#{{ tag }}</span>
      </div>
    </button>

    <NuxtLink
      :to="`/chart/${chart.id}`"
      class="inline-flex min-h-11 items-center gap-1 self-center text-xs text-[var(--pp-text-tertiary)] transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
      @click.stop
    >
      <span>{{ t('chart.openFullPage') }}</span>
      <span aria-hidden="true">→</span>
    </NuxtLink>
  </article>
</template>
