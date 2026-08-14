<script setup lang="ts">
import type { PPIconName } from '~/types/ui'
import { useSession } from '~/composables/useSession'

const { locale, setLocale } = useI18n()
const { authenticated, profile, pending: sessionPending } = useSession()
const localeLinks = computed<{ code: 'zh' | 'en', label: string }[]>(() => [{ code: 'zh', label: '中文' }, { code: 'en', label: 'EN' }])
const mainLinks = computed<{ to: string, label: string, icon: PPIconName }[]>(() => [
  { to: '/', label: 'nav.home', icon: 'home' },
  { to: '/rooms', label: 'nav.rooms', icon: 'rooms' },
  { to: '/charts', label: 'nav.charts', icon: 'charts' },
  { to: '/community', label: 'nav.community', icon: 'users' },
])
const avatarText = computed(() => profile.value?.username?.charAt(0).toUpperCase() || '')
</script>

<template>
  <PPMaterial as="header" radius="none" class="sticky top-0 z-[var(--pp-z-sticky)] border-x-0 border-t-0 border-b">
    <div class="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-6">
      <NuxtLink to="/" class="flex shrink-0 items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" :aria-label="$t('a11y.home')">
        <img src="/logo.png" alt="HSN Phira+" width="120" height="31" class="h-7 w-auto" loading="eager">
      </NuxtLink>
      <nav class="ml-5 hidden items-center gap-1 md:flex" :aria-label="$t('a11y.primaryNavigation')">
        <NuxtLink v-for="link in mainLinks" :key="link.to" :to="link.to" data-pp-touch-critical="primary-nav" class="pp-touch-target flex items-center gap-2 rounded-[var(--pp-radius-control)] px-3 py-2 text-sm font-medium text-[var(--pp-text-secondary)] hover:bg-[var(--pp-surface-2)] hover:text-[var(--pp-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" active-class="!bg-accent/10 !text-accent">
          <PPIcon :name="link.icon" :size="16" /><span>{{ $t(link.label) }}</span>
        </NuxtLink>
      </nav>
      <div class="ml-auto flex items-center gap-2">
        <div class="hidden items-center gap-1 rounded-[var(--pp-radius-control)] bg-[var(--pp-surface-2)] p-0.5 text-xs sm:flex" :aria-label="$t('a11y.language')">
          <button v-for="l in localeLinks" :key="l.code" type="button" data-pp-touch-critical="language" class="pp-touch-target rounded px-2 py-1 font-medium" :class="locale === l.code ? 'bg-accent/15 text-accent' : 'text-[var(--pp-text-tertiary)] hover:text-[var(--pp-text-primary)]'" @click="setLocale(l.code)">
            {{ l.label }}
          </button>
        </div>
        <NuxtLink to="/downloads" data-pp-touch-critical="downloads" class="pp-touch-target grid size-11 place-items-center rounded-[var(--pp-radius-control)] text-[var(--pp-text-secondary)] hover:bg-[var(--pp-surface-2)] hover:text-[var(--pp-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" :aria-label="$t('nav.downloads')">
          <PPIcon name="download" />
        </NuxtLink>
        <NuxtLink to="/notifications" data-pp-touch-critical="notifications" class="pp-touch-target grid size-11 place-items-center rounded-[var(--pp-radius-control)] text-[var(--pp-text-secondary)] hover:bg-[var(--pp-surface-2)] hover:text-[var(--pp-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" :aria-label="$t('nav.notifications')">
          <PPIcon name="notification" />
        </NuxtLink>
        <NuxtLink v-if="authenticated" to="/profile" data-pp-touch-critical="account" class="pp-touch-target flex h-10 items-center gap-2 rounded-[var(--pp-radius-control)] bg-[var(--pp-surface-2)] px-1.5 pr-2 text-[var(--pp-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" :aria-label="$t('nav.profile')" :title="profile?.username">
          <span class="grid size-7 place-items-center rounded-full bg-accent/15 text-xs font-semibold text-accent">{{ avatarText }}</span><span class="hidden max-w-28 truncate text-xs font-medium sm:block">{{ profile?.username }}</span>
        </NuxtLink>
        <NuxtLink v-else to="/login" data-pp-touch-critical="login" class="pp-touch-target rounded-[var(--pp-radius-control)] px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10" :aria-disabled="sessionPending || undefined">
          {{ $t('login.gatewayCta') }}
        </NuxtLink>
      </div>
    </div>
  </PPMaterial>
</template>
