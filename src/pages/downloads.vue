<script setup lang="ts">
/**
 * Downloads (design §16.8).
 *
 * Download entries come from PPB public content (`/api/v1/public/downloads`)
 * so operators can update them without a rebuild. PPB may be unready →
 * graceful empty state.
 */
import { useDownloads } from '~/composables/usePublicContent'

const { t } = useI18n()
useHead(() => ({ title: t('nav.downloads') }))

const { data: downloads, pending, error, refresh } = useDownloads({ page: 1, pageNum: 50 })

const items = computed(() => downloads.value.items)

function platformKey(platform: string): string {
  return `downloads.platform${platform.charAt(0).toUpperCase()}${platform.slice(1)}`
}

function fmtSize(bytes?: number): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0)
    return ''
  if (bytes >= 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (bytes >= 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-slate-50">
      {{ $t('nav.downloads') }}
    </h1>

    <p v-if="pending" class="text-sm text-slate-400">
      {{ $t('common.loading') }}
    </p>
    <p v-else-if="items.length === 0" class="text-sm text-slate-400">
      {{ $t('downloads.empty') }}
    </p>

    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <PPSurface
        as="a"
        v-for="d in items"
        :key="d.id"
        :href="d.url"
        target="_blank"
        rel="noopener noreferrer"
        class="group flex flex-col gap-3 rounded-lg p-5 transition-colors hover:bg-white/5"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm font-semibold text-slate-100">
            {{ d.label }}
          </span>
          <span class="rounded bg-white/5 px-2 py-0.5 text-xs text-slate-400">
            {{ $t(platformKey(d.platform)) }}
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span v-if="d.version">{{ $t('downloads.version', { version: d.version }) }}</span>
          <span v-if="fmtSize(d.size_bytes)">{{ $t('downloads.size') }}: {{ fmtSize(d.size_bytes) }}</span>
        </div>

        <span class="mt-auto inline-flex items-center gap-1 text-sm text-accent">
          {{ $t('downloads.open') }}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 transition-transform group-hover:translate-x-0.5">
            <path d="M7 17 17 7" />
            <path d="M7 7h10v10" />
          </svg>
        </span>
      </PPSurface>
    </div>

    <p v-if="error" class="text-xs text-slate-500">
      <button type="button" class="text-accent hover:underline" @click="() => refresh()">
        {{ $t('common.retry') }}
      </button>
    </p>
  </div>
</template>
