<script setup lang="ts">
import { useChartList } from '~/composables/useCharts'
/**
 * Home (design §16.2).
 *
 * - Brand / server entry, availability (public/meta probe)
 * - Online users / room / session summary
 * - External node latency summary (source + latency, never infer IP)
 * - Announcements, popular charts, recent public rooms, downloads entry
 *
 * All data is fetched client-side with graceful fallback — PPB Phase B may be
 * unready, so every section degrades to a neutral empty state (SSG-safe).
 */
import { useAnnouncements, useNodes, usePublicMeta, useServerSummary } from '~/composables/usePublicContent'
import { useRoomList } from '~/composables/useRooms'

useHead({
  title: '首页',
})

const { data: meta, pending: metaPending, error: metaError, refresh: refreshMeta } = usePublicMeta()
const { data: summary, error: summaryError, refresh: refreshSummary } = useServerSummary()
const { data: announcements, refresh: refreshAnn } = useAnnouncements({ page: 1, pageNum: 5 })
const { data: nodes, error: nodesError, refresh: refreshNodes } = useNodes()
const { charts, pending: chartsPending, error: chartsError, refresh: refreshCharts } = useChartList({ order: 'popular', pageNum: 5 })
const { rooms, pending: roomsPending, error: roomsError, refresh: refreshRooms } = useRoomList({ pageNum: 5 })

const serverOnline = computed(() => !metaPending.value && !metaError.value && Boolean(meta.value?.version && meta.value?.version !== '0.0.0'))

const nodesTotal = computed(() => nodes.value.items.length)

const announcementList = computed(() => announcements.value.items)

function fmtTime(iso?: string): string {
  if (!iso)
    return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime()))
    return '—'
  return d.toLocaleString()
}

function fmtLatency(ms?: number | null): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms))
    return '—'
  return `${ms} ms`
}
</script>

<template>
  <div class="space-y-8">
    <!-- Hero / brand entry -->
    <section class="content-surface p-6 md:p-10">
      <div class="max-w-2xl">
        <p class="mb-3 text-sm font-medium uppercase tracking-widest text-accent">
          {{ $t('app.tagline') }}
        </p>
        <h1 class="text-3xl font-bold leading-tight text-slate-50 md:text-5xl">
          {{ $t('home.heroTitle') }}
        </h1>
        <p class="mt-4 text-base text-slate-300 md:text-lg">
          {{ $t('home.heroSubtitle') }}
        </p>
        <div class="mt-6 flex flex-wrap gap-3">
          <BaseButton variant="primary" size="lg" as="NuxtLink" to="/rooms">
            {{ $t('home.ctaRooms') }}
          </BaseButton>
          <BaseButton variant="ghost" size="lg" as="NuxtLink" to="/charts">
            {{ $t('home.ctaCharts') }}
          </BaseButton>
        </div>
      </div>
    </section>

    <!-- Server availability + summary -->
    <section class="grid gap-4 md:grid-cols-3">
      <GlassSurface class="flex items-center justify-between">
        <span class="text-sm text-slate-300">{{ $t('common.serverStatus') }}</span>
        <span
          class="inline-flex items-center gap-2 text-sm font-semibold"
          :class="serverOnline ? 'text-emerald-400' : 'text-slate-500'"
        >
          <span class="h-2 w-2 rounded-full" :class="serverOnline ? 'bg-emerald-400' : 'bg-slate-500'" />
          {{ serverOnline ? $t('common.online') : $t('common.offline') }}
        </span>
      </GlassSurface>

      <GlassSurface class="flex items-center justify-between">
        <span class="text-sm text-slate-300">{{ $t('home.onlineUsers') }}</span>
        <span class="text-sm font-semibold text-slate-100">{{ summary.online_users ?? '—' }}</span>
      </GlassSurface>

      <GlassSurface class="flex items-center justify-between">
        <span class="text-sm text-slate-300">{{ $t('home.roomCount') }}</span>
        <span class="text-sm font-semibold text-slate-100">{{ summary.rooms ?? '—' }}</span>
      </GlassSurface>
    </section>

    <!-- API version + external nodes -->
    <section class="grid gap-4 lg:grid-cols-2">
      <GlassSurface>
        <h2 class="mb-2 text-sm font-semibold text-slate-100">
          {{ $t('home.apiVersion') }}
        </h2>
        <p class="text-sm text-slate-400">
          {{ meta?.version || '—' }}
          <template v-if="meta?.api_version">
            · API v{{ meta.api_version }}
          </template>
        </p>
        <p v-if="summaryError" class="mt-2 text-xs text-slate-500">
          <button type="button" class="text-accent hover:underline" @click="() => { refreshMeta(); refreshSummary() }">
            {{ $t('common.retry') }}
          </button>
        </p>
      </GlassSurface>

      <GlassSurface>
        <h2 class="mb-2 text-sm font-semibold text-slate-100">
          {{ $t('home.externalNodes') }}
        </h2>
        <p v-if="nodesTotal === 0" class="text-sm text-slate-400">
          {{ $t('home.noNodes') }}
        </p>
        <ul v-else class="space-y-1.5">
          <li
            v-for="node in nodes.items"
            :key="node.id"
            class="flex flex-wrap items-center gap-x-3 text-sm"
          >
            <span
              class="inline-block h-2 w-2 rounded-full"
              :class="node.status === 'up' ? 'bg-emerald-400' : node.status === 'down' ? 'bg-rose-400' : 'bg-slate-500'"
              :title="node.status ?? 'unknown'"
            />
            <span class="text-slate-200">{{ node.label }}</span>
            <span class="text-xs text-slate-400">{{ $t('home.latency') }}: {{ fmtLatency(node.latency_ms) }}</span>
            <span v-if="node.source" class="text-xs text-slate-500">
              {{ $t('home.nodeSource', { source: node.source }) }}
            </span>
          </li>
        </ul>
        <p v-if="nodesError" class="mt-2 text-xs text-slate-500">
          <button type="button" class="text-accent hover:underline" @click="() => refreshNodes()">
            {{ $t('common.retry') }}
          </button>
        </p>
      </GlassSurface>
    </section>

    <!-- Announcements + popular charts -->
    <section class="grid gap-4 lg:grid-cols-3">
      <GlassSurface class="lg:col-span-1">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-100">
            {{ $t('home.announcements') }}
          </h2>
          <button
            type="button"
            class="text-xs text-accent hover:underline"
            @click="() => refreshAnn()"
          >
            {{ $t('common.retry') }}
          </button>
        </div>
        <p v-if="announcementList.length === 0" class="text-sm text-slate-400">
          {{ $t('home.noAnnouncements') }}
        </p>
        <ul v-else class="space-y-3">
          <li v-for="a in announcementList" :key="a.id" class="border-b border-white/5 pb-2 last:border-0">
            <p class="text-sm font-medium text-slate-100">
              {{ a.title }}
            </p>
            <p class="mt-0.5 line-clamp-2 text-xs text-slate-400">
              {{ a.body }}
            </p>
            <p class="mt-1 text-[11px] text-slate-500">
              {{ fmtTime(a.published_at) }}
            </p>
          </li>
        </ul>
      </GlassSurface>

      <GlassSurface class="lg:col-span-2">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-100">
            {{ $t('home.popularCharts') }}
          </h2>
          <NuxtLink to="/charts" class="text-xs text-accent hover:underline">
            {{ $t('home.viewAllCharts') }}
          </NuxtLink>
        </div>
        <p v-if="chartsPending" class="text-sm text-slate-400">
          {{ $t('common.loading') }}
        </p>
        <p v-else-if="charts.length === 0" class="text-sm text-slate-400">
          {{ $t('charts.empty') }}
        </p>
        <ul v-else class="space-y-2">
          <li v-for="c in charts" :key="c.id">
            <NuxtLink
              :to="`/chart/${c.id}`"
              class="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-white/5"
            >
              <span class="truncate text-sm text-slate-200">{{ c.name }}</span>
              <span class="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                <span v-if="c.artist">{{ c.artist }}</span>
                <span v-if="c.difficulty != null" class="text-accent">★{{ c.difficulty }}</span>
              </span>
            </NuxtLink>
          </li>
        </ul>
        <p v-if="chartsError" class="mt-2 text-xs text-slate-500">
          <button type="button" class="text-accent hover:underline" @click="() => refreshCharts()">
            {{ $t('common.retry') }}
          </button>
        </p>
      </GlassSurface>
    </section>

    <!-- Recent public rooms -->
    <section>
      <GlassSurface>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-100">
            {{ $t('home.recentRooms') }}
          </h2>
          <NuxtLink to="/rooms" class="text-xs text-accent hover:underline">
            {{ $t('home.viewAllRooms') }}
          </NuxtLink>
        </div>
        <p v-if="roomsPending" class="text-sm text-slate-400">
          {{ $t('common.loading') }}
        </p>
        <p v-else-if="rooms.length === 0" class="text-sm text-slate-400">
          {{ $t('rooms.empty') }}
        </p>
        <ul v-else class="divide-y divide-white/5">
          <li v-for="r in rooms" :key="r.room_uuid">
            <NuxtLink
              :to="`/room/${r.room_uuid}`"
              class="flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-white/5"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-slate-100">
                  {{ r.name || r.room_uuid }}
                </p>
                <p class="mt-0.5 text-xs text-slate-400">
                  {{ r.host?.username || $t('common.unknown') }}
                  <span class="mx-1 text-slate-600">·</span>
                  {{ $t('rooms.players', { count: r.player_count, max: r.max_players }) }}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-2 text-xs">
                <span v-if="r.live" class="inline-flex items-center gap-1 font-medium text-emerald-400">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live
                </span>
                <span v-if="r.chart?.name" class="max-w-40 truncate text-slate-400">{{ r.chart.name }}</span>
              </div>
            </NuxtLink>
          </li>
        </ul>
        <p v-if="roomsError" class="mt-2 text-xs text-slate-500">
          <button type="button" class="text-accent hover:underline" @click="() => refreshRooms()">
            {{ $t('common.retry') }}
          </button>
        </p>
      </GlassSurface>
    </section>

    <!-- Downloads entry + sessions -->
    <section class="grid gap-4 md:grid-cols-3">
      <NuxtLink
        to="/downloads"
        class="glass-focusable content-surface flex items-center justify-between gap-3 rounded-lg p-5 transition-colors hover:bg-white/5"
      >
        <div>
          <h2 class="text-sm font-semibold text-slate-100">
            {{ $t('nav.downloads') }}
          </h2>
          <p class="mt-1 text-xs text-slate-400">
            {{ $t('home.downloadsHint') }}
          </p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 shrink-0 text-accent">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
      </NuxtLink>

      <GlassSurface class="flex items-center justify-between">
        <span class="text-sm text-slate-300">{{ $t('home.serverSessions') }}</span>
        <span class="text-sm font-semibold text-slate-100">{{ summary.sessions ?? '—' }}</span>
      </GlassSurface>

      <GlassSurface class="flex items-center justify-between">
        <span class="text-sm text-slate-300">API</span>
        <span class="text-sm font-semibold text-slate-100">{{ meta?.version || '—' }}</span>
      </GlassSurface>
    </section>
  </div>
</template>
