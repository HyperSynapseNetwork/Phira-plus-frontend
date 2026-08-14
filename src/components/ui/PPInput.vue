<script setup lang="ts">
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{
  modelValue?: string
  type?: string
  placeholder?: string
  autocomplete?: string
  disabled?: boolean
  required?: boolean
  mono?: boolean
}>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  autocomplete: undefined,
  disabled: false,
  required: false,
  mono: false,
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
function onInput(event: Event) { emit('update:modelValue', (event.target as HTMLInputElement).value) }
</script>

<template>
  <input
    v-bind="$attrs"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :autocomplete="autocomplete"
    :disabled="disabled"
    :required="required"
    class="pp-touch-target h-10 w-full rounded-[var(--pp-radius-control)] border border-[var(--pp-border-subtle)] bg-[var(--pp-surface-2)] px-3 text-sm text-[var(--pp-text-primary)] outline-none transition-[border-color,background-color] duration-[var(--pp-motion-fast)] placeholder:text-[var(--pp-text-tertiary)] focus:border-[var(--pp-accent)] focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
    :class="mono ? 'font-mono' : ''"
    @input="onInput"
  >
</template>
