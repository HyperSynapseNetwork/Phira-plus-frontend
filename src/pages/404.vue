<script setup lang="ts">
useHead({
  title: '404',
  meta: [{ name: 'robots', content: 'noindex,follow' }],
})
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col items-center justify-center py-24 text-center">
    <p class="text-6xl font-bold text-accent">
      404
    </p>
    <h1 class="mt-4 text-xl font-semibold text-slate-100">
      Page not found
    </h1>
    <p class="mt-2 text-sm text-slate-400">
      该页面不存在或已被移动。
    </p>
    <BaseButton variant="primary" class="mt-6" as="NuxtLink" to="/">
      {{ $t('login.backHome') }}
    </BaseButton>
  </div>
</template>
