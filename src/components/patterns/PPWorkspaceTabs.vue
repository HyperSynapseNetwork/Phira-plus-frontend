<script setup lang="ts">
interface WorkspaceTab { key: string, label: string }
const props = defineProps<{ modelValue: string, tabs: WorkspaceTab[], label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <nav class="flex gap-1 overflow-x-auto border-b border-[var(--pp-border-subtle)]" :aria-label="label">
    <button
      v-for="tab in props.tabs"
      :key="tab.key"
      type="button"
      class="relative min-h-11 shrink-0 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
      :class="modelValue === tab.key ? 'text-accent' : 'text-[var(--pp-text-secondary)] hover:text-[var(--pp-text-primary)]'"
      :aria-current="modelValue === tab.key ? 'page' : undefined"
      @click="emit('update:modelValue', tab.key)"
    >
      {{ tab.label }}
      <span v-if="modelValue === tab.key" class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden="true" />
    </button>
  </nav>
</template>
