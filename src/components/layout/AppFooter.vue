<script setup lang="ts">
/**
 * Footer (design §16.10): Docs / GitHub / Terms / Privacy / version placeholders.
 * Docs links to docs.phira.htadiy.com; not part of the main navigation.
 */

const { locale, setLocale, t } = useI18n()

const version = '0.1.0' // TODO(Phase E): sync with package metadata + CI bump

const socialLinks = computed(() => [
  { href: 'https://docs.phira.htadiy.com', label: t('footer.docs'), external: true },
  { href: 'https://github.com/HyperSynapseNetwork/Phira-plus-frontend', label: t('footer.github'), external: true },
  { to: '/terms', label: t('footer.terms') },
  { to: '/terms', label: t('footer.privacy') },
])
</script>

<template>
  <footer class="glass mt-auto border-t border-white/10">
    <div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
      <div class="flex flex-col gap-1">
        <span class="text-sm font-semibold text-slate-100">
          {{ $t('app.name') }}
        </span>
        <span class="text-xs text-slate-400">
          {{ $t('app.tagline') }}
        </span>
      </div>

      <nav class="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Footer">
        <template v-for="link in socialLinks" :key="link.label">
          <a
            v-if="link.external"
            :href="link.href"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-slate-300 transition-colors hover:text-accent"
          >
            {{ link.label }}
          </a>
          <NuxtLink
            v-else
            :to="link.to!"
            class="text-sm text-slate-300 transition-colors hover:text-accent"
          >
            {{ link.label }}
          </NuxtLink>
        </template>
      </nav>

      <div class="flex items-center gap-3 text-xs text-slate-500">
        <span>{{ $t('footer.buildInfo') }}: v{{ version }}</span>
        <span class="hidden h-3 w-px bg-white/15 sm:block" />
        <span>{{ $t('common.visitCount') }}: —</span>
        <div class="flex items-center gap-1" aria-label="Language">
          <button
            type="button"
            class="rounded px-1.5 py-0.5"
            :class="locale === 'zh' ? 'bg-accent/15 text-accent' : 'hover:text-slate-300'"
            @click="setLocale('zh')"
          >
            中文
          </button>
          <button
            type="button"
            class="rounded px-1.5 py-0.5"
            :class="locale === 'en' ? 'bg-accent/15 text-accent' : 'hover:text-slate-300'"
            @click="setLocale('en')"
          >
            EN
          </button>
        </div>
      </div>
    </div>
  </footer>
</template>
