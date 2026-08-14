<script setup lang="ts">
withDefaults(defineProps<{ as?: string, padded?: boolean }>(), { as: 'div', padded: false })
</script>

<template>
  <component :is="as" class="rounded-[var(--pp-radius-surface)] border border-[var(--pp-border-subtle)] bg-[var(--pp-surface-1)] shadow-[var(--pp-shadow-surface)]" :class="padded ? 'px-4 py-3' : ''">
    <slot />
  </component>
</template>
