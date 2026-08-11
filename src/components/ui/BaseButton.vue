<script setup lang="ts">
/**
 * Local Button wrapper built on @heroui/styles BEM classes
 * (`.button`, `.button--primary`, `.button--sm`, …) — no React runtime.
 * Design §3.4 (HeroUI styles + Vue local components).
 */
const props = withDefaults(defineProps<{
  variant?: 'primary' | 'danger' | 'ghost' | 'default'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  block?: boolean
  as?: string
}>(), {
  variant: 'default',
  size: 'md',
  disabled: false,
  block: false,
  as: 'button',
})

const emit = defineEmits<{ click: [event: MouseEvent] }>()

function onClick(event: MouseEvent) {
  if (props.disabled)
    return
  emit('click', event)
}
</script>

<template>
  <component
    :is="props.as"
    class="button" :class="[
      props.variant !== 'default' ? `button--${props.variant}` : '',
      props.size !== 'md' ? `button--${props.size}` : '',
      props.block ? 'w-full' : '',
    ]"
    :disabled="props.as === 'button' ? props.disabled : undefined"
    :aria-disabled="props.disabled || undefined"
    @click="onClick"
  >
    <slot />
  </component>
</template>
