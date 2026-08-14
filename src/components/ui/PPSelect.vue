<script setup lang="ts">
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{
  modelValue?: string
  options?: Array<{ label: string, value: string }>
  placeholder?: string
  disabled?: boolean
  compact?: boolean
}>(), { modelValue: '', options: () => [], placeholder: '', disabled: false, compact: false })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
function onChange(event: Event) { emit('update:modelValue', (event.target as HTMLSelectElement).value) }
</script>

<template>
  <select
    v-bind="$attrs"
    :value="modelValue"
    :disabled="disabled"
    class="pp-touch-target w-full rounded-[var(--pp-radius-control)] border border-[var(--pp-border-subtle)] bg-[var(--pp-surface-2)] text-[var(--pp-text-primary)] outline-none transition-[border-color,background-color] duration-[var(--pp-motion-fast)] focus:border-[var(--pp-accent)] focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
    :class="compact ? 'h-9 px-2 text-sm' : 'h-10 px-3 text-sm'"
    @change="onChange"
  >
    <option v-if="placeholder" value="">
      {{ placeholder }}
    </option>
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
    <slot />
  </select>
</template>
