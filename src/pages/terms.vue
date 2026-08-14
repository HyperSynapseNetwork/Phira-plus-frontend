<script setup lang="ts">
/**
 * User agreement / privacy (design §16.1, §23.3).
 * Standalone route — intentionally NOT part of the main navigation.
 * Discloses third-party resources, consent-gated analytics, and the fact that
 * credentials / room chat are never sent to analytics.
 */
const { t } = useI18n()

usePageSeo(() => ({
  title: t('terms.title'),
  description: t('terms.intro'),
  type: 'website',
}))
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <PPSurface as="section" class="p-6 md:p-8">
      <h1 class="text-2xl font-bold text-slate-50">
        {{ $t('terms.title') }}
      </h1>
      <div class="mt-4 space-y-4 text-sm leading-relaxed text-slate-300">
        <p>{{ $t('terms.intro') }}</p>
        <p>{{ $t('terms.approval') }}</p>

        <h2 class="pt-2 text-base font-semibold text-slate-100">
          HSN Phira+
        </h2>
        <ul class="list-disc space-y-1 pl-5">
          <li>{{ $t('login.agreement', { terms: $t('nav.terms') }) }}</li>
        </ul>

        <h2 class="pt-2 text-base font-semibold text-slate-100">
          {{ $t('terms.thirdParty.title') }}
        </h2>
        <p>
          {{ $t('terms.thirdParty.intro') }}
        </p>
        <ul class="list-disc space-y-1 pl-5">
          <li>{{ $t('terms.thirdParty.authGateway') }}</li>
          <li>{{ $t('terms.thirdParty.chartCdn') }}</li>
          <li>{{ $t('terms.thirdParty.externalLinks') }}</li>
          <li>{{ $t('terms.thirdParty.probes') }}</li>
        </ul>

        <h2 class="pt-2 text-base font-semibold text-slate-100">
          {{ $t('terms.analytics.title') }}
        </h2>
        <p>
          {{ $t('terms.analytics.body') }}
        </p>

        <h2 class="pt-2 text-base font-semibold text-slate-100">
          {{ $t('terms.contact.title') }}
        </h2>
        <p>
          {{ $t('terms.contact.body') }}
        </p>
      </div>
    </PPSurface>
  </div>
</template>
