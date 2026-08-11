<script setup lang="ts">
/**
 * User agreement / privacy (design §16.1, §23.3).
 * Standalone route — intentionally NOT part of the main navigation.
 */
useHead({
  title: '用户协议',
  meta: [
    { name: 'robots', content: 'index,follow' },
  ],
})
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <section class="content-surface p-6 md:p-8">
      <h1 class="text-2xl font-bold text-slate-50">
        {{ $t('terms.title') }}
      </h1>
      <div class="mt-4 space-y-4 text-sm leading-relaxed text-slate-300">
        <p>{{ $t('terms.intro') }}</p>

        <h2 class="pt-2 text-base font-semibold text-slate-100">
          Phira+
        </h2>
        <ul class="list-disc space-y-1 pl-5">
          <li>{{ $t('login.agreement', { terms: $t('nav.terms') }) }}</li>
        </ul>

        <h2 class="pt-2 text-base font-semibold text-slate-100">
          {{ $t('common.serverStatus') }}
        </h2>
        <p>
          <!-- §23.3: disclose third-party background, probes, external static services. -->
          —
        </p>
      </div>
    </section>
  </div>
</template>
