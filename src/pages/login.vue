<script setup lang="ts">
/**
 * Login (design §6.6 / §16).
 *
 * PPF never handles Phira credentials. Login is delegated to the PPB auth
 * gateway (api-phira.htadiy.com), which owns the Phira login/reauth flow and
 * issues an HttpOnly session cookie on OUR origin (same-site family).
 *
 * NOTE (contract proposal): the exact gateway route
 * `{authBase}/auth/phira/login?return_to=...` is NOT yet frozen in
 * contracts/README.md — see docs/PHASE_A_PLAN.md.
 */

useHead({ title: '登录' })

const config = useRuntimeConfig()
const route = useRoute()

const authBase = config.public.authBase as string

// `return_to` must be a relative PPF path; PPB is expected to whitelist it
// against open redirects (design §6.6). Default to home.
const returnTo = computed(() => {
  const r = route.query.return_to
  return typeof r === 'string' && r.startsWith('/') ? r : '/'
})

const gatewayUrl = computed(() =>
  `${authBase}/auth/phira/login?return_to=${encodeURIComponent(returnTo.value)}`,
)
</script>

<template>
  <div class="mx-auto max-w-md">
    <section class="content-surface p-6 md:p-8">
      <h1 class="text-2xl font-bold text-slate-50">
        {{ $t('login.title') }}
      </h1>
      <p class="mt-3 text-sm leading-relaxed text-slate-300">
        {{ $t('login.subtitle') }}
      </p>

      <div class="mt-6">
        <BaseButton
          variant="primary"
          size="lg"
          block
          as="a"
          :href="gatewayUrl"
          rel="noopener noreferrer"
        >
          {{ $t('login.gatewayCta') }}
        </BaseButton>
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
    </section>
  </div>
</template>
