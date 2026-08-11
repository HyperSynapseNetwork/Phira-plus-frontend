<script setup lang="ts">
/**
 * Community (design §16.6). Phase A: skeleton — user profiles, friends,
 * public replays. NOT a forum / chat / feed platform.
 */
useHead({ title: '社区' })
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-slate-50">
      {{ $t('nav.community') }}
    </h1>
    <section class="content-surface p-6">
      <p class="text-sm text-slate-400">
        {{ $t('community.empty') }}
      </p>
    </section>
  </div>
</template>
