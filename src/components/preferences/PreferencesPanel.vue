<script setup lang="ts">
import type { AccentKey, BackgroundKey } from '~/types/preferences'
/**
 * Guest preferences panel (design §21.3).
 * Accent / background / accessibility / low-performance preferences. The current
 * release intentionally exposes only the fully-designed dark theme.
 * When the user signs in, these fields merge per-field into PPB account
 * preference namespaces (`common` / `ppf`); device prefs stay local.
 */
import { usePreferences } from '~/composables/usePreferences'
import { usePreferencesSync } from '~/composables/usePreferencesSync'

const { prefs, update, reset, isLocked } = usePreferences()
const notice = useNotice()
const { authenticated, syncing, saving, syncError, lastSavedAt, saveAll } = usePreferencesSync()

async function onSave(): Promise<void> {
  try {
    await saveAll()
    notice.success('notice.saved', undefined, { dedupKey: 'preferences:save' })
  }
  catch (err) {
    notice.errorFromApi(err, { dedupKey: 'preferences:save:error' })
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

    <!-- Accent -->
    <div>
      <span class="flex items-center gap-1.5 text-sm text-slate-300">
        {{ $t('preferences.accent') }}
        <span
          v-if="isLocked('accent')"
          class="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-400"
          :title="$t('preferences.locked')"
        >
          <PPIcon name="lock" :size="12" />
        </span>
      </span>
      <div class="mt-2 flex flex-wrap gap-2">
        <PPButton
          v-for="opt in accentOptions"
          :key="opt.value"
          size="sm"
          :weight="prefs.accent === opt.value ? 'primary' : 'secondary'"
          :disabled="isLocked('accent')"
          @click="update({ accent: opt.value })"
        >
          <span class="h-3 w-3 rounded-full" :style="{ background: opt.swatch }" />
          {{ opt.label }}
        </PPButton>
      </div>
    </div>

    <!-- Background -->
    <div>
      <span class="text-sm text-slate-300">{{ $t('preferences.background') }}</span>
      <div class="mt-2 flex flex-wrap gap-2">
        <PPButton
          v-for="opt in backgroundOptions"
          :key="opt.value"
          size="sm"
          :weight="prefs.background === opt.value ? 'primary' : 'secondary'"
          @click="update({ background: opt.value })"
        >
          {{ opt.label }}
        </PPButton>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <span class="text-sm text-slate-300">{{ $t('preferences.backgroundQuality') }}</span>
        <div class="flex overflow-hidden rounded-md border border-white/10">
          <PPButton size="sm" :weight="prefs.backgroundQuality === 'auto' ? 'primary' : 'secondary'" @click="update({ backgroundQuality: 'auto' })">
            {{ $t('preferences.qualityAuto') }}
          </PPButton>
          <PPButton size="sm" :weight="prefs.backgroundQuality === 'original' ? 'primary' : 'secondary'" @click="update({ backgroundQuality: 'original' })">
            {{ $t('preferences.qualityOriginal') }}
          </PPButton>
        </div>
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
        <PPButton v-if="hasCustomBackground" size="sm" weight="quiet" @click="clearCustomBackground">
          {{ $t('preferences.clearCustomBackground') }}
        </PPButton>
        <PPButton size="sm" weight="quiet" @click="resetBackground">
          {{ $t('preferences.resetBackground') }}
        </PPButton>
      </div>
      <p class="mt-2 text-xs text-slate-500">
        {{ $t('preferences.customBackgroundHint') }}
      </p>
    </div>

    <!-- Toggles -->
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm text-slate-300">{{ $t('preferences.reducedMotion') }}</span><PPSwitch v-model="prefs.reducedMotion" />
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm text-slate-300">{{ $t('preferences.reducedTransparency') }}</span><PPSwitch v-model="prefs.reducedTransparency" />
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm text-slate-300">{{ $t('preferences.lowPerformance') }}</span><PPSwitch v-model="prefs.lowPerformance" />
      </div>
    </div>

    <!-- Reset -->
    <div class="border-t border-white/10 pt-4">
      <PPButton weight="quiet" size="sm" @click="resetAll">
        {{ $t('preferences.resetAll') }}
      </PPButton>
    </div>

    <!-- Account sync (only when signed in) -->
    <template v-if="authenticated">
      <div class="border-t border-white/10 pt-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs text-slate-400">
            {{ $t('preferences.accountSyncHint') }}
          </span>
          <PPButton size="sm" :disabled="saving || syncing" @click="onSave">
            {{ saving ? $t('common.loading') : $t('preferences.saveToAccount') }}
          </PPButton>
        </div>
        <p v-if="syncing" class="mt-2 text-xs text-slate-500">
          {{ $t('common.loading') }}
        </p>
        <p v-else-if="syncError" class="mt-2 text-xs text-rose-400">
          {{ $t('preferences.syncFailed') }}
        </p>
        <p v-else-if="lastSavedAt" class="mt-2 text-xs text-slate-500">
          {{ $t('preferences.lastSyncedAt', { time: new Date(lastSavedAt).toLocaleString() }) }}
        </p>
      </div>
    </template>
  </div>
</template>
