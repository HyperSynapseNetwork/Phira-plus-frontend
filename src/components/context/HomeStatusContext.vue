<script setup lang="ts">
import { useNodes, usePublicMeta, useServerSummary } from '~/composables/usePublicContent'
const { data: meta, pending: metaPending, error: metaError, refresh: refreshMeta } = usePublicMeta()
const { data: summary, pending: summaryPending, error: summaryError, refresh: refreshSummary } = useServerSummary()
const { data: nodes, pending: nodesPending, error: nodesError, refresh: refreshNodes } = useNodes()
function latency(value?: number | null): string { return typeof value === 'number' && Number.isFinite(value) ? `${value} ms` : '' }
</script>

<template>
  <div class="space-y-6">
    <section>
      <h3 class="text-xs font-medium uppercase tracking-wide text-[var(--pp-text-tertiary)]">{{ $t('home.serverSummary') }}</h3>
      <div v-if="metaPending || summaryPending" class="mt-3 text-sm text-[var(--pp-text-secondary)]">{{ $t('common.loading') }}</div>
      <div v-else-if="metaError || summaryError" class="mt-3 flex items-center justify-between gap-3 border-y border-[var(--pp-border-subtle)] py-3 text-sm text-rose-300" role="alert">
        <span>{{ $t('common.error') }}</span>
        <PPButton weight="quiet" size="sm" @click="() => { refreshMeta(); refreshSummary() }">{{ $t('common.retry') }}</PPButton>
      </div>
      <dl v-else class="mt-3 divide-y divide-[var(--pp-border-subtle)] border-y border-[var(--pp-border-subtle)] text-sm">
        <div class="flex items-center justify-between gap-4 py-2.5"><dt class="text-[var(--pp-text-tertiary)]">{{ $t('home.apiVersion') }}</dt><dd class="text-[var(--pp-text-primary)]">{{ meta?.version || $t('common.unknown') }}<span v-if="meta?.api_version" class="text-[var(--pp-text-tertiary)]"> · API v{{ meta.api_version }}</span></dd></div>
        <div v-if="summary.online_users != null" class="flex items-center justify-between gap-4 py-2.5"><dt class="text-[var(--pp-text-tertiary)]">{{ $t('home.onlineUsers') }}</dt><dd>{{ summary.online_users }}</dd></div>
        <div v-if="summary.rooms != null" class="flex items-center justify-between gap-4 py-2.5"><dt class="text-[var(--pp-text-tertiary)]">{{ $t('home.roomCount') }}</dt><dd>{{ summary.rooms }}</dd></div>
        <div v-if="summary.sessions != null" class="flex items-center justify-between gap-4 py-2.5"><dt class="text-[var(--pp-text-tertiary)]">{{ $t('home.serverSessions') }}</dt><dd>{{ summary.sessions }}</dd></div>
      </dl>
    </section>

    <section>
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-xs font-medium uppercase tracking-wide text-[var(--pp-text-tertiary)]">{{ $t('home.externalNodes') }}</h3>
        <button type="button" class="text-xs text-accent hover:underline" @click="() => refreshNodes()">{{ $t('common.retry') }}</button>
      </div>
      <p v-if="nodesPending" class="mt-3 text-sm text-[var(--pp-text-secondary)]">{{ $t('common.loading') }}</p>
      <p v-else-if="nodesError" class="mt-3 border-y border-[var(--pp-border-subtle)] py-3 text-sm text-rose-300" role="alert">{{ $t('common.error') }}</p>
      <p v-else-if="nodes.items.length === 0" class="mt-3 border-y border-[var(--pp-border-subtle)] py-3 text-sm text-[var(--pp-text-secondary)]">{{ $t('home.noNodes') }}</p>
      <ul v-else class="mt-3 divide-y divide-[var(--pp-border-subtle)] border-y border-[var(--pp-border-subtle)]">
        <li v-for="node in nodes.items" :key="node.id" class="flex items-center gap-3 py-2.5 text-sm">
          <span class="size-2 rounded-full" :class="node.status === 'up' ? 'bg-emerald-400' : node.status === 'down' ? 'bg-rose-400' : 'bg-slate-500'" aria-hidden="true" />
          <span class="min-w-0 flex-1 truncate text-[var(--pp-text-primary)]">{{ node.label }}</span>
          <span class="text-xs text-[var(--pp-text-secondary)]">{{ latency(node.latency_ms) }}</span>
          <span v-if="node.source" class="hidden text-xs text-[var(--pp-text-tertiary)] sm:inline">{{ $t('home.nodeSource', { source: node.source }) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
