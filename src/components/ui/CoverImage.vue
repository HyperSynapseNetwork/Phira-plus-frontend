<script setup lang="ts">
/**
 * External cover image with graceful failure fallback (design §23.4).
 * If the remote image fails to load (offline / CORS / removed), a neutral
 * music-note placeholder is shown instead of a broken-image glyph.
 */
const props = defineProps<{
  src?: string | null
  alt: string
  /** Extra classes forwarded to the img / placeholder box. */
  class?: string
  /** Aspect behaviour for the placeholder (defaults to fill parent). */
  aspect?: 'square' | 'auto'
}>()

const failed = ref(false)

const show = computed(() => Boolean(props.src) && !failed.value)

function onError(): void {
  failed.value = true
}
</script>

<template>
  <img
    v-if="show"
    :src="props.src!"
    :alt="props.alt"
    :class="props.class"
    loading="lazy"
    @error="onError"
  >
  <div
    v-else
    class="grid place-items-center bg-white/5 text-slate-600" :class="[
      props.class,
      props.aspect === 'square' ? 'aspect-square' : '',
    ]"
    role="img"
    :aria-label="props.alt"
  >
    <span class="text-2xl">♪</span>
  </div>
</template>
