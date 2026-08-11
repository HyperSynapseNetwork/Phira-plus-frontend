<script setup lang="ts">
/**
 * Chart browser (design §16.4). Phase A: search/filter skeleton.
 */
useHead({ title: '谱面' })
</script>

<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-slate-50">
        {{ $t('nav.charts') }}
      </h1>
      <div class="flex items-center gap-2">
        <input
          type="search"
          :placeholder="$t('charts.searchPlaceholder')"
          class="glass-focusable rounded-md bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
          aria-label="Search charts"
        >
      </div>
    </header>

    <section class="content-surface p-6">
      <p class="text-sm text-slate-400">
        {{ $t('charts.empty') }}
      </p>
    </section>
  </div>
</template>
