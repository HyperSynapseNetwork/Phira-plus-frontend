<script setup lang="ts">
/**
 * Notification center (design §16.7). Phase A: skeleton.
 * Requires login for real data; unauthenticated shows empty state.
 */
useHead({ title: '通知' })
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-slate-50">
      {{ $t('nav.notifications') }}
    </h1>
    <section class="content-surface p-6">
      <p class="text-sm text-slate-400">
        {{ $t('notifications.empty') }}
      </p>
    </section>
  </div>
</template>
