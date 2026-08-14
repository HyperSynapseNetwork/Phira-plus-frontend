<script setup lang="ts">
defineProps<{ title: string, description?: string }>()
</script>

<template>
  <div class="flex min-h-16 flex-wrap items-center justify-between gap-4 py-3">
    <div class="min-w-0 flex-1">
      <h3 class="text-sm font-medium text-[var(--pp-text-primary)]">
        {{ title }}
      </h3>
      <p v-if="description" class="mt-1 text-xs leading-5 text-[var(--pp-text-tertiary)]">
        {{ description }}
      </p>
    </div>
    <div class="shrink-0">
      <slot />
    </div>
  </div>
</template>
