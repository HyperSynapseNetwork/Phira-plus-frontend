<script setup lang="ts">
import { useLowPerformance } from '~/composables/useLowPerformance'
import { usePreferencesStore } from '~/stores/preferences'

/**
 * Layer 1 — Atmosphere (design §22.3).
 * Fixed full-viewport background driven by guest preferences:
 *   - `background`: atmosphere | mesh | particles | none
 *   - `backgroundIntensity`: opacity of glow/mesh layers
 *   - `lowPerformance` / OS hints: static + no glow/particles
 * The base image is the previous-generation default background (reused from
 * HSNPhira-frontend-remake app.config.json); the CSS gradient acts as a
 * fallback while it (lazily) loads.
 */
const prefs = usePreferencesStore()
const lowPerf = useLowPerformance()

/** Previous-generation default background (HSNPhira-frontend-remake). */
const PREV_GEN_BACKGROUND_URL = 'https://webstatic.cn-nb1.rains3.com/5712%C3%973360.jpeg'

const hasCustom = computed(() => Boolean(prefs.prefs.backgroundCustom))
const showDefaultImage = computed(() => !hasCustom.value && prefs.prefs.background !== 'none' && !lowPerf.enabled.value)
const showMesh = computed(() => !hasCustom.value && prefs.prefs.background === 'mesh' && !lowPerf.enabled.value)
const showParticles = computed(() => !hasCustom.value && prefs.prefs.background === 'particles' && prefs.prefs.particles && !lowPerf.enabled.value)
const glowOpacity = computed(() =>
  hasCustom.value || prefs.prefs.background === 'none' ? 0 : prefs.prefs.backgroundIntensity * 0.5,
)
</script>

<template>
  <div
    class="atmosphere"
    aria-hidden="true"
    :data-background="prefs.prefs.background"
  >
    <img
      v-if="showDefaultImage"
      class="atmosphere__image"
      :src="PREV_GEN_BACKGROUND_URL"
      alt=""
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
    >
    <div
      v-if="hasCustom"
      class="atmosphere__custom"
      :style="{ background: prefs.prefs.backgroundCustom ?? '' }"
    />
    <div
      v-if="showMesh"
      class="atmosphere__mesh"
      :style="{ opacity: 0.3 * prefs.prefs.backgroundIntensity }"
    />
    <div
      class="atmosphere__glow"
      :style="{ opacity: glowOpacity }"
      style="inset-inline-start: -8rem; inset-block-start: -6rem; width: 28rem; height: 28rem; background: radial-gradient(circle, oklch(0.65 0.15 210 / 0.55), transparent 70%);"
    />
    <div
      class="atmosphere__glow"
      :style="{ opacity: glowOpacity }"
      style="inset-inline-end: -10rem; inset-block-end: -8rem; width: 34rem; height: 34rem; background: radial-gradient(circle, oklch(0.55 0.14 290 / 0.45), transparent 70%);"
    />
    <canvas
      v-if="showParticles"
      class="particles-canvas absolute inset-0 h-full w-full"
    />
  </div>
</template>
