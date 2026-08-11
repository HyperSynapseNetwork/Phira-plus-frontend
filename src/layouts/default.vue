<script setup lang="ts">
/**
 * Default layout — layer model (design §22.3):
 *   Atmosphere → Content Surface → Glass Navigation → Overlay/Context Window
 *
 * NOTE: `htmlAttrs.lang` is managed automatically by @nuxtjs/i18n.
 */
</script>

<template>
  <div class="relative flex min-h-dvh flex-col">
    <BackgroundLayer />

    <AppHeader />

    <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-10">
      <slot />
    </main>

    <AppFooter />

    <!-- Mobile bottom navigation -->
    <MobileNav />

    <!-- Context Window overlay (Teleported to body, depth ≤ 2) -->
    <ContextWindow />
  </div>
</template>
