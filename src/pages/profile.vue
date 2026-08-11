<script setup lang="ts">
/**
 * Avatar/profile target (design §16.1). Phase A: placeholder.
 * Login page delegates to the PPB auth gateway — the client never holds
 * Phira tokens (contracts README §13).
 */
useHead({ title: '我的' })
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-slate-50">
      {{ $t('nav.profile') }}
    </h1>
    <section class="content-surface p-6">
      <p class="text-sm text-slate-400">
        {{ $t('profile.empty') }}
      </p>
      <BaseButton variant="primary" class="mt-4" as="NuxtLink" to="/login">
        {{ $t('profile.loginCta') }}
      </BaseButton>
    </section>

    <!-- Guest preferences (design §21.3) -->
    <section class="content-surface p-6">
      <PreferencesPanel />
    </section>
  </div>
</template>
