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

const { prefs, update } = usePreferences()
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
      <span class="text-sm text-slate-300">{{ $t('preferences.accent') }}</span>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="opt in accentOptions"
          :key="opt.value"
          type="button"
          class="glass-focusable flex items-center gap-2 rounded-md px-3 py-2 text-sm"
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
