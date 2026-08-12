<script setup lang="ts">
/**
 * PPF root component.
 * - i18n `<NuxtLayout>` + `<NuxtPage>`
 * - SEO defaults via @nuxtjs/seo + useHead (design §23.1)
 * - `skip-to-content` link for accessibility (design §22.7)
 */
const site = useSiteConfig()

const socialImage = computed(() => `${site.url.replace(/\/$/, '')}/social-card.svg`)

useSeoMeta({
  titleTemplate: title => title ? `${title} · Phira+` : 'Phira+',
  ogSiteName: 'Phira+',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

// Global Open Graph / Twitter fallback (per-page `usePageSeo` overrides these).
useHead(() => ({
  meta: [
    { property: 'og:image', content: socialImage.value },
    { name: 'twitter:image', content: socialImage.value },
  ],
}))
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
