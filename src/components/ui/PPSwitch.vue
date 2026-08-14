<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue?: boolean, label?: string, disabled?: boolean }>(), { modelValue: false, label: '', disabled: false })
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
function toggle() {
  if (!props.disabled)
    emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <label class="inline-flex min-h-11 cursor-pointer items-center gap-2">
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-[var(--pp-border-subtle)] transition-colors duration-[var(--pp-motion-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      :class="modelValue ? 'bg-[var(--pp-accent)]' : 'bg-[var(--pp-surface-3)]'"
      @click="toggle"
    >
      <span class="size-5 rounded-full bg-white shadow-sm transition-transform duration-[var(--pp-motion-fast)]" :class="modelValue ? 'translate-x-5' : 'translate-x-0.5'" />
    </button>
    <span v-if="label" class="text-sm text-[var(--pp-text-secondary)]">{{ label }}</span>
  </label>
</template>
