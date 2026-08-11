<script setup lang="ts">
/**
 * Glass navigation (design §16.1 / §22.3).
 * Desktop: Logo | 首页 | 房间 | 谱面 | 社区 — 下载 | 通知 | 头像
 * Mobile:  Logo + 通知/头像 in a top bar (main nav lives in MobileNav).
 */

import { useSession } from '~/composables/useSession'

const { locale, setLocale } = useI18n()
const route = useRoute()
const { authenticated, profile, pending: sessionPending } = useSession()

const localeLinks = computed<{ code: 'zh' | 'en', label: string }[]>(() => [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'EN' },
])

const mainLinks = computed(() => [
  { to: '/', label: 'nav.home' },
  { to: '/rooms', label: 'nav.rooms' },
  { to: '/charts', label: 'nav.charts' },
  { to: '/community', label: 'nav.community' },
])

const avatarText = computed(() => profile.value?.username?.charAt(0).toUpperCase() || '')
const loginHref = computed(() => `/login?return_to=${encodeURIComponent(route.path)}`)
</script>

<template>
  <header class="glass sticky top-0 z-40 border-b border-white/10">
    <div class="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-6">
      <!-- Logo -->
      <NuxtLink to="/" class="flex shrink-0 items-center gap-2" aria-label="Phira+ Home">
        <span class="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
            <path d="M6 3v12" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M18 9a9 9 0 0 1-9 9" />
          </svg>
        </span>
        <span class="text-lg font-bold tracking-tight text-slate-50">
          {{ $t('app.name') }}
        </span>
      </NuxtLink>

      <!-- Desktop main nav -->
      <nav class="ml-6 hidden items-center gap-1 md:flex" aria-label="Primary">
        <NuxtLink
          v-for="link in mainLinks"
          :key="link.to"
          :to="link.to"
          class="glass-focusable rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:text-white"
          active-class="!bg-accent/15 !text-accent"
          exact-active-class=""
        >
          {{ $t(link.label) }}
        </NuxtLink>
      </nav>

      <div class="ml-auto flex items-center gap-2">
        <!-- Locale switch -->
        <div class="hidden items-center gap-1 rounded-md bg-white/5 p-0.5 text-xs sm:flex" aria-label="Language">
          <button
            v-for="l in localeLinks"
            :key="l.code"
            type="button"
            class="rounded px-2 py-1 font-medium transition-colors"
            :class="locale === l.code ? 'bg-accent/20 text-accent' : 'text-slate-400 hover:text-slate-200'"
            @click="setLocale(l.code)"
          >
            {{ l.label }}
          </button>
        </div>

        <!-- Downloads -->
        <NuxtLink
          to="/downloads"
          class="glass-focusable hidden h-9 w-9 place-items-center rounded-lg text-slate-300 hover:text-white sm:grid"
          :aria-label="$t('nav.downloads')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
        </NuxtLink>

        <!-- Notifications -->
        <NuxtLink
          to="/notifications"
          class="glass-focusable grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:text-white"
          :aria-label="$t('nav.notifications')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </NuxtLink>

        <!-- Avatar / profile / login -->
        <template v-if="authenticated">
          <NuxtLink
            to="/profile"
            class="glass-focusable flex h-9 items-center gap-2 overflow-hidden rounded-full bg-white/10 pr-1 pl-0.5 text-slate-200 hover:text-white"
            :aria-label="$t('nav.profile')"
            :title="profile?.username"
          >
            <span class="grid h-8 w-8 place-items-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
              {{ avatarText }}
            </span>
            <span class="hidden max-w-28 truncate text-xs font-medium sm:block">
              {{ profile?.username }}
            </span>
          </NuxtLink>
        </template>
        <NuxtLink
          v-else
          :to="loginHref"
          class="glass-focusable rounded-md px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
          :aria-disabled="sessionPending || undefined"
        >
          {{ $t('login.gatewayCta') }}
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
