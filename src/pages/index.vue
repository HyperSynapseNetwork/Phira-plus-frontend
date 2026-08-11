<script setup lang="ts">
/**
 * Home (design §16.2): brand/server entry, availability, online summary,
 * announcements, popular charts, recent public rooms, downloads entry.
 * Phase A: static skeleton + client-side `/public/meta` probe.
 */
import type { PublicMeta } from '~/utils/api/types'

useHead({
  title: '首页',
})

// Client-only fetch so SSG never depends on PPB being reachable at build time.
const { data: meta, error, pending, refresh } = useFetch<PublicMeta>('/api/v1/public/meta', {
  server: false,
  lazy: true,
})

const serverOnline = computed(() => !pending.value && !error.value && Boolean(meta.value))
</script>

<template>
  <div class="space-y-8">
    <!-- Hero -->
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

    <!-- Server summary -->
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
        <span class="text-sm text-slate-300">{{ $t('home.serverSummary') }}</span>
        <span class="text-sm text-slate-200">—</span>
      </GlassSurface>
      <GlassSurface class="flex items-center justify-between">
        <span class="text-sm text-slate-300">API</span>
        <span class="text-sm text-slate-200">{{ meta?.version ?? '—' }}</span>
      </GlassSurface>
    </section>

    <!-- Announcements + placeholders -->
    <section class="grid gap-4 lg:grid-cols-3">
      <GlassSurface class="lg:col-span-1">
        <h2 class="mb-3 text-sm font-semibold text-slate-100">
          {{ $t('home.announcements') }}
        </h2>
        <p class="text-sm text-slate-400">
          —
        </p>
      </GlassSurface>
      <GlassSurface class="lg:col-span-2">
        <h2 class="mb-3 text-sm font-semibold text-slate-100">
          {{ $t('home.popularCharts') }}
        </h2>
        <p class="text-sm text-slate-400">
          —
        </p>
      </GlassSurface>
    </section>

    <section>
      <GlassSurface>
        <h2 class="mb-3 text-sm font-semibold text-slate-100">
          {{ $t('home.recentRooms') }}
        </h2>
        <p class="text-sm text-slate-400">
          —
        </p>
      </GlassSurface>
    </section>

    <p v-if="error" class="text-xs text-slate-500">
      {{ error }}
      <button type="button" class="ml-2 text-accent hover:underline" @click="() => refresh()">
        {{ $t('common.retry') }}
      </button>
    </p>
  </div>
</template>
