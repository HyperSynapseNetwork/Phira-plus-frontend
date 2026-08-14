<script setup lang="ts">
type Weight = 'primary' | 'secondary' | 'quiet' | 'dangerous'
type Size = 'sm' | 'md' | 'lg'
const props = withDefaults(defineProps<{
  weight?: Weight
  size?: Size
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  block?: boolean
  as?: string
}>(), { weight: 'secondary', size: 'md', type: 'button', disabled: false, loading: false, block: false, as: 'button' })
const emit = defineEmits<{ click: [MouseEvent] }>()
function click(event: MouseEvent) {
  if (props.disabled || props.loading) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  emit('click', event)
}
const weightClass: Record<Weight, string> = {
  primary: 'bg-accent text-[var(--pp-accent-fg)] hover:bg-accent-strong',
  secondary: 'border border-[var(--pp-border-subtle)] bg-[var(--pp-surface-2)] text-[var(--pp-text-primary)] hover:bg-[var(--pp-surface-3)]',
  quiet: 'text-[var(--pp-text-secondary)] hover:bg-[var(--pp-surface-2)] hover:text-[var(--pp-text-primary)]',
  dangerous: 'bg-[var(--pp-danger)] text-white hover:brightness-110',
}
const sizeClass: Record<Size, string> = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-4 text-sm', lg: 'h-10 px-5 text-sm' }
</script>

<template>
  <component
    :is="props.as"
    class="pp-touch-target inline-flex min-w-0 items-center justify-center gap-2 rounded-[var(--pp-radius-control)] font-medium transition-[background-color,color,transform] duration-[var(--pp-motion-fast)] active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50"
    :class="[weightClass[weight], sizeClass[size], block ? 'w-full' : '']"
    :type="props.as === 'button' ? type : undefined"
    :disabled="props.as === 'button' ? (disabled || loading) : undefined"
    :aria-disabled="disabled || loading || undefined"
    @click="click"
  >
    <span v-if="loading" class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
    <slot />
  </component>
</template>
