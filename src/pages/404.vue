<script setup lang="ts">
const { t } = useI18n()
useHead(() => ({
  title: `404 · ${t('notFound.title')}`,
  meta: [{ name: 'robots', content: 'noindex,follow' }],
}))
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col items-center justify-center py-24 text-center">
    <p class="text-6xl font-bold text-accent">404</p>
    <h1 class="mt-4 text-xl font-semibold text-slate-100">{{ $t('notFound.title') }}</h1>
    <p class="mt-2 text-sm text-slate-400">{{ $t('notFound.body') }}</p>
    <PPButton weight="primary" class="mt-6" as="NuxtLink" to="/">{{ $t('login.backHome') }}</PPButton>
  </div>
</template>
