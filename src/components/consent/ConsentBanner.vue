<script setup lang="ts">
/**
 * Cookie / analytics consent banner (design §23.3).
 *
 * Necessary cookies are exempt and always active. The banner asks only about
 * non-essential analytics (opt-in). It renders on every page until the user
 * chooses; the choice is stored locally (no fingerprinting).
 */
import { useConsent } from '~/composables/useConsent'

const { needsDecision, grantAnalytics, declineAnalytics } = useConsent()
</script>

<template>
  <div
    v-if="needsDecision"
    class="fixed inset-x-0 bottom-0 z-[var(--pp-z-drawer)] p-3 md:p-4"
    role="region"
    :aria-label="$t('a11y.cookieConsent')"
  >
    <div class="glass mx-auto flex max-w-3xl flex-col gap-3 rounded-window p-4 shadow-lg md:flex-row md:items-center">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-slate-100">
          {{ $t('consent.title') }}
        </p>
        <p class="mt-1 text-xs leading-relaxed text-slate-400">
          {{ $t('consent.body') }}
          <NuxtLink to="/terms" class="text-accent hover:underline">
            {{ $t('consent.privacyLink') }}
          </NuxtLink>
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <PPButton weight="quiet" size="sm" @click="declineAnalytics">
          {{ $t('consent.decline') }}
        </PPButton>
        <PPButton weight="primary" size="sm" @click="grantAnalytics">
          {{ $t('consent.accept') }}
        </PPButton>
      </div>
    </div>
  </div>
</template>
