<script setup lang="ts">
/**
 * Downloads (design §16.8). Content comes from PPB public content later.
 */
useHead({ title: '下载' })
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-slate-50">
      {{ $t('nav.downloads') }}
    </h1>
    <section class="content-surface p-6">
      <p class="text-sm text-slate-400">
        {{ $t('downloads.empty') }}
      </p>
    </section>
  </div>
</template>
