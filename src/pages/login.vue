<script setup lang="ts">
/**
 * Login boundary. PPF never receives Phira credentials; PPB owns the standalone
 * authentication gateway, explicit legal acceptance and linked-GitHub login.
 * `return_to` remains a validated relative product route.
 */

const { t, locale } = useI18n()
useHead(() => ({ title: t('login.title') }))

const config = useRuntimeConfig()
const route = useRoute()

const authBase = config.public.authBase as string

// `return_to` must be a relative PPF path; PPB is expected to whitelist it
// against open redirects (design §6.6). Default to home.
const returnTo = computed(() => {
  const r = route.query.return_to
  return typeof r === 'string' && r.startsWith('/') ? r : '/'
})

const gatewayUrl = computed(() => `${authBase}/auth/phira/login?client_type=ppf&lang=${encodeURIComponent(locale.value)}&return_to=${encodeURIComponent(returnTo.value)}`)
const githubUrl = computed(() => `${authBase}/auth/phira/login?client_type=ppf&intent=github&lang=${encodeURIComponent(locale.value)}&return_to=${encodeURIComponent(returnTo.value)}`)
</script>

<template>
  <div class="mx-auto max-w-md">
    <PPSurface as="section" class="p-6 md:p-8">
      <h1 class="text-2xl font-bold text-slate-50">
        {{ $t('login.title') }}
      </h1>
      <p class="mt-3 text-sm leading-relaxed text-slate-300">
        {{ $t('login.subtitle') }}
      </p>

      <div class="mt-6">
        <PPButton
          weight="primary"
          size="lg"
          block
          as="a"
          :href="gatewayUrl"
          rel="noopener noreferrer"
        >
          {{ $t('login.gatewayCta') }}
        </PPButton>
        <PPButton weight="quiet" size="lg" block as="a" :href="githubUrl" class="mt-3">
          {{ $t('login.githubCta') }}
        </PPButton>
        <p class="mt-3 text-center text-xs text-slate-500">
          {{ $t('login.gatewayHint') }}
        </p>
      </div>

      <p class="mt-6 border-t border-white/10 pt-4 text-xs text-slate-400">
        <span>
          {{ $t('login.agreement', {
            terms: $t('nav.terms'),
          }) }}
        </span>
        <NuxtLink to="/terms" class="ml-1 text-accent hover:underline">
          {{ $t('nav.terms') }}
        </NuxtLink>
      </p>

      <div class="mt-4">
        <NuxtLink to="/" class="text-xs text-slate-400 hover:text-accent">
          ← {{ $t('login.backHome') }}
        </NuxtLink>
      </div>
    </PPSurface>
  </div>
</template>
