<script setup lang="ts">
import type { PPIconName } from '~/types/ui'

const items = computed<{ to: string, icon: PPIconName, label: string }[]>(() => [
  { to: '/', icon: 'home', label: 'nav.home' },
  { to: '/rooms', icon: 'rooms', label: 'nav.rooms' },
  { to: '/charts', icon: 'charts', label: 'nav.charts' },
  { to: '/community', icon: 'users', label: 'nav.community' },
  { to: '/notifications', icon: 'notification', label: 'nav.notifications' },
])
</script>

<template>
  <PPMaterial as="nav" radius="none" class="fixed inset-x-0 bottom-0 z-[var(--pp-z-sticky)] border-x-0 border-b-0 border-t md:hidden" :aria-label="$t('a11y.primaryNavigation')">
    <ul class="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
      <li v-for="item in items" :key="item.to" class="flex-1">
        <NuxtLink :to="item.to" class="flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium text-[var(--pp-text-secondary)] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-accent" active-class="!text-accent">
          <PPIcon :name="item.icon" :size="19" /><span>{{ $t(item.label) }}</span>
        </NuxtLink>
      </li>
    </ul>
  </PPMaterial>
</template>
