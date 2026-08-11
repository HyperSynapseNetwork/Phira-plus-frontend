<script setup lang="ts">
/**
 * PPF root component.
 * - i18n `<NuxtLayout>` + `<NuxtPage>`
 * - SEO defaults via @nuxtjs/seo + useHead
 * - `skip-to-content` link for accessibility (design §22.7)
 */
useSeoMeta({
  titleTemplate: title => title ? `${title} · Phira+` : 'Phira+',
  ogSiteName: 'Phira+',
  ogType: 'website',
})
</script>

<template>
  <div>
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
    >
      Skip to content
    </a>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
