<script setup lang="ts">
/**
 * Mobile bottom navigation (design §16.1 / §22.6).
 * Main entry points only — no full-screen hamburger.
 * Desktop is `hidden md:hidden`; shown below `md`.
 */
const items = computed(() => [
  { to: '/', icon: 'home', label: 'nav.home' },
  { to: '/rooms', icon: 'rooms', label: 'nav.rooms' },
  { to: '/charts', icon: 'charts', label: 'nav.charts' },
  { to: '/community', icon: 'community', label: 'nav.community' },
  { to: '/notifications', icon: 'bell', label: 'nav.notifications' },
])
</script>

<template>
  <nav
    class="glass fixed inset-x-0 bottom-0 z-40 border-t border-white/10 md:hidden"
    aria-label="Primary"
  >
    <ul class="flex items-stretch justify-around">
      <li v-for="item in items" :key="item.to" class="flex-1">
        <NuxtLink
          :to="item.to"
          class="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-slate-300"
          active-class="!text-accent"
        >
          <svg
            v-if="item.icon === 'home'"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"
          ><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          <svg
            v-else-if="item.icon === 'rooms'"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"
          ><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" /><path d="M9 18v.01" /></svg>
          <svg
            v-else-if="item.icon === 'charts'"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"
          ><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
          <svg
            v-else-if="item.icon === 'community'"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"
          ><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"
          ><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
          <span>{{ $t(item.label) }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
