<script setup lang="ts">
/**
 * Presentational avatar with initials fallback (community identity §7).
 * Renders the remote avatar when present, otherwise an accent-tinted circle
 * with the user's initials.
 */
const props = withDefaults(defineProps<{
  name?: string | null
  avatar?: string | null
  size?: 'sm' | 'md' | 'lg'
}>(), {
  name: '',
  avatar: null,
  size: 'md',
})

const sizeClass: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
}

const initials = computed(() => {
  const n = props.name?.trim() ?? ''
  if (!n)
    return '?'
  return Array.from(n).slice(0, 2).join('').toUpperCase()
})
</script>

<template>
  <span
    class="relative inline-flex shrink-0 overflow-hidden rounded-full bg-accent/15 ring-1 ring-white/10"
    :class="sizeClass[props.size]"
    role="img"
    :aria-label="props.name || undefined"
  >
    <img
      v-if="props.avatar"
      :src="props.avatar"
      :alt="props.name || 'avatar'"
      class="h-full w-full object-cover"
      loading="lazy"
    >
    <span v-else class="grid h-full w-full place-items-center font-semibold text-accent">
      {{ initials }}
    </span>
  </span>
</template>
