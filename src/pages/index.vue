<script setup lang="ts">
import { markRaw } from 'vue'
import HomeStatusContext from '~/components/context/HomeStatusContext.vue'
import { useChartList } from '~/composables/useCharts'
import { useContextWindow } from '~/composables/useContextWindow'
import { useAnnouncements, usePublicMeta, useServerSummary } from '~/composables/usePublicContent'
import { useRoomList } from '~/composables/useRooms'

const { t } = useI18n()
const { open } = useContextWindow()
usePageSeo(() => ({
  title: t('nav.home'),
  description: t('home.heroSubtitle'),
  jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'HSN Phira+', url: 'https://phira.htadiy.com/' }],
}))

const { data: meta, pending: metaPending, error: metaError } = usePublicMeta()
const { data: summary, error: summaryError } = useServerSummary()
const { data: announcements, error: announcementsError, refresh: refreshAnn } = useAnnouncements({ page: 1, pageNum: 3 })
const { charts, pending: chartsPending, error: chartsError, refresh: refreshCharts } = useChartList({ order: 'popular', pageNum: 5 })
const { rooms, pending: roomsPending, error: roomsError, refresh: refreshRooms } = useRoomList({ pageNum: 5 })

const serverState = computed<'loading' | 'unknown' | 'online' | 'offline'>(() => {
  if (metaPending.value) return 'loading'
  if (metaError.value) return 'unknown'
  return meta.value?.version && meta.value.version !== '0.0.0' ? 'online' : 'offline'
})
const announcementList = computed(() => announcements.value.items)
function openStatus(): void {
  open({ id: 'home-server-status', title: t('home.serverDetails'), component: markRaw(HomeStatusContext), mobileMode: 'sheet' })
}
function fmtTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
}
</script>

<template>
  <div class="space-y-12 pb-8">
    <section class="flex min-h-[60vh] items-center">
      <div class="max-w-2xl">
        <p class="mb-3 text-sm font-medium uppercase tracking-widest text-accent">{{ $t('app.tagline') }}</p>
        <h1 class="text-4xl font-bold leading-tight text-[var(--pp-text-primary)] md:text-6xl">{{ $t('home.heroTitle') }}</h1>
        <p class="mt-4 text-base text-[var(--pp-text-secondary)] md:text-lg">{{ $t('home.heroSubtitle') }}</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <PPButton weight="primary" size="lg" as="NuxtLink" to="/rooms">{{ $t('home.ctaRooms') }}</PPButton>
          <PPButton weight="quiet" size="lg" as="NuxtLink" to="/downloads">{{ $t('nav.downloads') }}</PPButton>
        </div>
        <div class="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[var(--pp-text-secondary)]">
          <span class="inline-flex items-center gap-2 font-medium" :class="serverState === 'online' ? 'text-emerald-300' : serverState === 'offline' ? 'text-slate-500' : 'text-[var(--pp-text-secondary)]'">
            <span class="size-1.5 rounded-full" :class="serverState === 'online' ? 'bg-emerald-400' : serverState === 'offline' ? 'bg-slate-500' : 'bg-amber-300'" aria-hidden="true" />
            {{ serverState === 'loading' ? $t('common.loading') : serverState === 'unknown' ? $t('common.unknown') : serverState === 'online' ? $t('common.online') : $t('common.offline') }}
          </span>
          <template v-if="!summaryError">
            <span v-if="summary.online_users != null">{{ summary.online_users }} {{ $t('home.onlineUsers') }}</span>
            <span v-if="summary.rooms != null">{{ summary.rooms }} {{ $t('home.roomCount') }}</span>
          </template>
          <button type="button" class="text-xs text-accent hover:underline" @click="openStatus">{{ $t('home.serverDetails') }}</button>
        </div>
      </div>
    </section>

    <section>
      <div class="mb-3 flex items-end justify-between gap-3">
        <div><p class="text-xs uppercase tracking-wide text-[var(--pp-text-tertiary)]">Live</p><h2 class="text-xl font-semibold text-[var(--pp-text-primary)]">{{ $t('home.recentRooms') }}</h2></div>
        <NuxtLink to="/rooms" class="text-sm text-accent hover:underline">{{ $t('home.viewAllRooms') }}</NuxtLink>
      </div>
      <p v-if="roomsPending" class="border-y border-[var(--pp-border-subtle)] py-5 text-sm text-[var(--pp-text-secondary)]">{{ $t('common.loading') }}</p>
      <div v-else-if="roomsError" class="flex items-center justify-between gap-3 border-y border-[var(--pp-border-subtle)] py-4 text-sm text-rose-300" role="alert"><span>{{ $t('common.error') }}</span><PPButton weight="quiet" size="sm" @click="() => refreshRooms()">{{ $t('common.retry') }}</PPButton></div>
      <p v-else-if="rooms.length === 0" class="border-y border-[var(--pp-border-subtle)] py-5 text-sm text-[var(--pp-text-secondary)]">{{ $t('rooms.empty') }}</p>
      <ul v-else class="divide-y divide-[var(--pp-border-subtle)] border-y border-[var(--pp-border-subtle)]">
        <li v-for="r in rooms" :key="r.room_uuid">
          <NuxtLink :to="`/room/${encodeURIComponent(r.room_id)}`" class="group grid gap-1 py-3 transition-colors hover:text-accent sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div class="min-w-0"><p class="truncate text-sm font-medium text-[var(--pp-text-primary)] group-hover:text-accent">{{ r.name || r.room_id }}</p><p class="mt-0.5 truncate text-xs text-[var(--pp-text-secondary)]">{{ r.host?.username || $t('common.unknown') }}<span v-if="r.chart?.name"> · {{ r.chart.name }}</span></p></div>
            <div class="flex items-center gap-3 text-xs text-[var(--pp-text-secondary)]"><span>{{ $t('rooms.players', { count: r.player_count, max: r.max_players }) }}</span><span v-if="r.live" class="font-medium text-emerald-300">LIVE</span></div>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section class="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,.7fr)]">
      <div>
        <div class="mb-3 flex items-center justify-between gap-3"><h2 class="text-xl font-semibold text-[var(--pp-text-primary)]">{{ $t('home.popularCharts') }}</h2><NuxtLink to="/charts" class="text-sm text-accent hover:underline">{{ $t('home.viewAllCharts') }}</NuxtLink></div>
        <p v-if="chartsPending" class="border-y border-[var(--pp-border-subtle)] py-5 text-sm text-[var(--pp-text-secondary)]">{{ $t('common.loading') }}</p>
        <div v-else-if="chartsError" class="flex items-center justify-between border-y border-[var(--pp-border-subtle)] py-4 text-sm text-rose-300" role="alert"><span>{{ $t('common.error') }}</span><PPButton weight="quiet" size="sm" @click="() => refreshCharts()">{{ $t('common.retry') }}</PPButton></div>
        <p v-else-if="charts.length === 0" class="border-y border-[var(--pp-border-subtle)] py-5 text-sm text-[var(--pp-text-secondary)]">{{ $t('charts.empty') }}</p>
        <ul v-else class="divide-y divide-[var(--pp-border-subtle)] border-y border-[var(--pp-border-subtle)]">
          <li v-for="c in charts" :key="c.id"><NuxtLink :to="`/chart/${c.id}`" class="flex items-center justify-between gap-4 py-3"><div class="min-w-0"><p class="truncate text-sm font-medium text-[var(--pp-text-primary)]">{{ c.name }}</p><p v-if="c.artist" class="truncate text-xs text-[var(--pp-text-secondary)]">{{ c.artist }}</p></div><span v-if="c.difficulty != null" class="shrink-0 text-xs text-accent">★{{ c.difficulty }}</span></NuxtLink></li>
        </ul>
      </div>

      <div>
        <div class="mb-3 flex items-center justify-between gap-3"><h2 class="text-xl font-semibold text-[var(--pp-text-primary)]">{{ $t('home.announcements') }}</h2><button type="button" class="text-xs text-accent hover:underline" @click="() => refreshAnn()">{{ $t('common.retry') }}</button></div>
        <p v-if="announcementsError" class="border-y border-[var(--pp-border-subtle)] py-4 text-sm text-rose-300" role="alert">{{ $t('common.error') }}</p>
        <p v-else-if="announcementList.length === 0" class="border-y border-[var(--pp-border-subtle)] py-4 text-sm text-[var(--pp-text-secondary)]">{{ $t('home.noAnnouncements') }}</p>
        <ul v-else class="divide-y divide-[var(--pp-border-subtle)] border-y border-[var(--pp-border-subtle)]"><li v-for="a in announcementList" :key="a.id" class="py-3"><p class="text-sm font-medium text-[var(--pp-text-primary)]">{{ a.title }}</p><p class="mt-1 line-clamp-2 text-xs text-[var(--pp-text-secondary)]">{{ a.body }}</p><p v-if="fmtTime(a.published_at)" class="mt-1 text-[11px] text-[var(--pp-text-tertiary)]">{{ fmtTime(a.published_at) }}</p></li></ul>
      </div>
    </section>

    <section class="flex flex-wrap items-center gap-3 border-t border-[var(--pp-border-subtle)] pt-5 text-sm">
      <NuxtLink to="/downloads" class="font-medium text-accent hover:underline">{{ $t('nav.downloads') }}</NuxtLink><span class="text-[var(--pp-text-tertiary)]">·</span><a href="https://docs.phira.htadiy.com" class="text-[var(--pp-text-secondary)] hover:text-accent" rel="noopener noreferrer">{{ $t('nav.docs') }}</a>
    </section>
  </div>
</template>
