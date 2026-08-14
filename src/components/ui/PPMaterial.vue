<script setup lang="ts">
withDefaults(defineProps<{ as?: string, padded?: boolean, thickness?: 'thin' | 'regular' | 'thick', radius?: 'none' | 'control' | 'window' }>(), { as: 'div', padded: false, thickness: 'regular', radius: 'control' })
const radiusClass = { none: 'rounded-none', control: 'rounded-[var(--pp-radius-control)]', window: 'rounded-[var(--pp-radius-window)]' } as const
</script>

<template>
  <component :is="as" class="border border-[var(--pp-border-subtle)] backdrop-blur-[var(--pp-material-blur)]" :class="[radiusClass[radius], padded ? 'px-4 py-3' : '']" :style="{ background: `var(--pp-material-${thickness})` }">
    <slot />
  </component>
</template>
