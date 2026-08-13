<script setup lang="ts">
import type { AccentKey, BackgroundKey } from '~/types/preferences'
/**
 * Guest preferences panel (design §21.3).
 * Local-only theme / accent / background / reduced-motion / low-performance.
 * When the user signs in, these fields merge per-field into PPB account
 * preference namespaces (`common` / `ppf`); device prefs stay local.
 */
import { usePreferences } from '~/composables/usePreferences'
import { usePreferencesSync } from '~/composables/usePreferencesSync'

const { prefs, update, reset, isLocked } = usePreferences()
const { t } = useI18n()
const { authenticated, syncing, saving, syncError, lastSavedAt, saveAll } = usePreferencesSync()

const saveResult = ref<'idle' | 'saved' | 'error'>('idle')

async function onSave(): Promise<void> {
  saveResult.value = 'idle'
  try {
    await saveAll()
    saveResult.value = 'saved'
  }
  catch {
    saveResult.value = 'error'
  }
}

const accentOptions: { value: AccentKey, label: string, swatch: string }[] = [
  { value: 'cyan', label: 'Cyan', swatch: '#00F7FF' },
  { value: 'blue', label: 'Blue', swatch: '#60a5fa' },
  { value: 'violet', label: 'Violet', swatch: '#a78bfa' },
  { value: 'green', label: 'Green', swatch: '#4ade80' },
  { value: 'amber', label: 'Amber', swatch: '#fbbf24' },
]

const backgroundOptions: { value: BackgroundKey, label: string }[] = [
  { value: 'atmosphere', label: 'Atmosphere' },
  { value: 'mesh', label: 'Mesh' },
  { value: 'particles', label: 'Particles' },
  { value: 'none', label: 'None' },
]

// Custom background color (round 7). Bound through `update` so the lock layer
// and persistence stay consistent; empty input clears the custom color.
const customColor = computed({
  get: () => prefs.backgroundCustom ?? '#0a0a0a',
  set: (value: string) => update({ backgroundCustom: value.trim() || null }),
})

const hasCustomBackground = computed(() => Boolean(prefs.backgroundCustom))

function clearCustomBackground(): void {
  update({ backgroundCustom: null })
}

/** One-click back to the default/original background (prev-gen image + atmosphere). */
function resetBackground(): void {
  update({ background: 'atmosphere', backgroundCustom: null })
}

function resetAll(): void {
  reset()
}
</script>

<template>
  <div class="space-y-5">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
      {{ $t('preferences.title') }}
    </h2>

    <!-- Theme -->
    <div>
      <span class="text-sm text-slate-300">{{ $t('preferences.theme') }}</span>
      <div class="mt-2 grid grid-cols-3 gap-2">
        <button
          v-for="theme in (['system', 'light', 'dark'] as const)"
          :key="theme"
          type="button"
          class="glass-focusable rounded-md px-3 py-2 text-sm"
          :class="prefs.theme === theme ? 'bg-accent/15 text-accent ring-1 ring-accent/50' : 'bg-white/5 text-slate-300'"
          @click="update({ theme })"
        >
          {{ t(`preferences.theme${theme.charAt(0).toUpperCase()}${theme.slice(1)}`) }}
        </button>
      </div>
    </div>

    <!-- Accent -->
    <div>
      <span class="flex items-center gap-1.5 text-sm text-slate-300">
        {{ $t('preferences.accent') }}
        <span
          v-if="isLocked('accent')"
          class="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-400"
          :title="$t('preferences.locked')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      </span>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="opt in accentOptions"
          :key="opt.value"
          type="button"
          :disabled="isLocked('accent')"
          class="glass-focusable flex items-center gap-2 rounded-md px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          :class="prefs.accent === opt.value ? 'bg-accent/15 text-slate-50 ring-1 ring-accent/50' : 'bg-white/5 text-slate-300'"
          @click="update({ accent: opt.value })"
        >
          <span class="h-3 w-3 rounded-full" :style="{ background: opt.swatch }" />
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Background -->
    <div>
      <span class="text-sm text-slate-300">{{ $t('preferences.background') }}</span>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="opt in backgroundOptions"
          :key="opt.value"
          type="button"
          class="glass-focusable rounded-md px-3 py-2 text-sm"
          :class="prefs.background === opt.value ? 'bg-accent/15 text-slate-50 ring-1 ring-accent/50' : 'bg-white/5 text-slate-300'"
          @click="update({ background: opt.value })"
        >
          {{ opt.label }}
        </button>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <label class="flex items-center gap-2 text-sm text-slate-300">
          <span>{{ $t('preferences.customBackground') }}</span>
          <input
            v-model="customColor"
            type="color"
            class="h-8 w-10 cursor-pointer rounded border border-white/10 bg-transparent"
          >
        </label>
        <button
          v-if="hasCustomBackground"
          type="button"
          class="glass-focusable rounded-md bg-white/5 px-3 py-2 text-sm text-slate-300"
          @click="clearCustomBackground"
        >
          {{ $t('preferences.clearCustomBackground') }}
        </button>
        <button
          type="button"
          class="glass-focusable rounded-md bg-white/5 px-3 py-2 text-sm text-slate-300"
          @click="resetBackground"
        >
          {{ $t('preferences.resetBackground') }}
        </button>
      </div>
      <p class="mt-2 text-xs text-slate-500">
        {{ $t('preferences.customBackgroundHint') }}
      </p>
    </div>

    <!-- Toggles -->
    <div class="space-y-3">
      <label class="flex cursor-pointer items-center justify-between gap-3">
        <span class="text-sm text-slate-300">{{ $t('preferences.reducedMotion') }}</span>
        <input v-model="prefs.reducedMotion" type="checkbox" class="h-4 w-4 accent-[var(--color-accent)]">
      </label>
      <label class="flex cursor-pointer items-center justify-between gap-3">
        <span class="text-sm text-slate-300">{{ $t('preferences.reducedTransparency') }}</span>
        <input v-model="prefs.reducedTransparency" type="checkbox" class="h-4 w-4 accent-[var(--color-accent)]">
      </label>
      <label class="flex cursor-pointer items-center justify-between gap-3">
        <span class="text-sm text-slate-300">{{ $t('preferences.lowPerformance') }}</span>
        <input v-model="prefs.lowPerformance" type="checkbox" class="h-4 w-4 accent-[var(--color-accent)]">
      </label>
    </div>

    <!-- Reset -->
    <div class="border-t border-white/10 pt-4">
      <BaseButton variant="ghost" size="sm" @click="resetAll">
        {{ $t('preferences.resetAll') }}
      </BaseButton>
    </div>

    <!-- Account sync (only when signed in) -->
    <template v-if="authenticated">
      <div class="border-t border-white/10 pt-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs text-slate-400">
            {{ $t('preferences.accountSyncHint') }}
          </span>
          <BaseButton size="sm" :disabled="saving || syncing" @click="onSave">
            {{ saving ? $t('common.loading') : $t('preferences.saveToAccount') }}
          </BaseButton>
        </div>
        <p v-if="syncing" class="mt-2 text-xs text-slate-500">
          {{ $t('common.loading') }}
        </p>
        <p v-else-if="saveResult === 'saved'" class="mt-2 text-xs text-emerald-400">
          {{ $t('preferences.syncSaved') }}
        </p>
        <p v-else-if="saveResult === 'error' || syncError" class="mt-2 text-xs text-rose-400">
          {{ $t('preferences.syncFailed') }}
        </p>
        <p v-else-if="lastSavedAt" class="mt-2 text-xs text-slate-500">
          {{ $t('preferences.lastSyncedAt', { time: new Date(lastSavedAt).toLocaleString() }) }}
        </p>
      </div>
    </template>
  </div>
</template>
