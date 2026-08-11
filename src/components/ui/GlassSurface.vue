<script setup lang="ts">
/**
 * Glass primitive (design §22.1/§22.3).
 * A frosted surface for navigation, floating controls, popovers — not for
 * every block of body text. Honor reduced-transparency via CSS data attr.
 */
withDefaults(defineProps<{
  variant?: 'dark' | 'light'
  /** Use for content surface instead of glass (Layer 2). */
  as?: string
  padding?: boolean
}>(), {
  variant: 'dark',
  as: 'div',
  padding: true,
})
</script>

<template>
  <component
    :is="as"
    :class="[
      variant === 'light' ? 'glass-light' : 'glass',
      padding ? 'px-4 py-3' : '',
    ]"
  >
    <slot />
  </component>
</template>
