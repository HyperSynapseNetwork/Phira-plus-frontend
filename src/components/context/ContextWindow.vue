<script setup lang="ts">
import type { ContextWindowEntry } from '~/composables/useContextWindow'
import { vAutoAnimate } from '@formkit/auto-animate'
import { useContextWindow } from '~/composables/useContextWindow'

/**
 * Context Window base (design §22.4).
 *
 * Overlay/detail layer rendered via Teleport. Depth-limited to 2. On mobile
 * it degrades to a bottom sheet (`sheet`) or fullscreen takeover
 * (`fullscreen`). Skeleton only — business content is injected later via
 * `entry.component` or the default slot.
 */

const props = withDefaults(defineProps<{
  /** Render a single entry by id (default: render the whole stack). */
  id?: string
}>(), {
  id: undefined,
})

const { stack, close } = useContextWindow()

const entries = computed<ContextWindowEntry[]>(() => {
  if (props.id)
    return stack.value.filter(e => e.id === props.id)
  return stack.value
})

const hasVisible = computed(() => entries.value.length > 0)

function onBackdrop(index: number): void {
  const entry = entries.value[index]
  if (entry)
    close(entry.id)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !hasVisible.value)
    return
  const top = entries.value[entries.value.length - 1]
  if (top)
    close(top.id)
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-auto-animate
      class="pointer-events-none fixed inset-0 z-50"
      aria-live="polite"
    >
      <div
        v-for="(entry, index) in entries"
        :key="entry.id"
        class="pointer-events-auto absolute inset-0"
        :style="{ zIndex: 50 + index }"
      >
        <!-- Backdrop -->
        <div
          class="context-window-backdrop absolute inset-0"
          @click="onBackdrop(index)"
          @keydown="onKeydown"
        />

        <!-- Panel -->
        <section
          :class="[
            entry.mobileMode === 'fullscreen'
              ? 'fixed inset-0 rounded-none'
              : entry.mobileMode === 'sheet'
                ? 'fixed inset-x-0 bottom-0 max-h-[92dvh] rounded-t-window'
                : 'fixed inset-0',
          ]"
          class="context-window-panel flex flex-col md:absolute md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[80dvh] md:w-full md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-window"
          role="dialog"
          aria-modal="true"
          :aria-label="entry.title ?? 'Context window'"
          tabindex="-1"
        >
          <!-- Header -->
          <header class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-5">
            <h2 class="truncate text-base font-semibold text-slate-100">
              {{ entry.title }}
            </h2>
            <button
              type="button"
              class="glass-focusable rounded-md p-1.5 text-slate-300 hover:text-slate-100"
              :aria-label="`Close ${entry.title ?? 'window'}`"
              @click="close(entry.id)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </header>

          <!-- Body: dynamic component or default slot -->
          <div class="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
            <component :is="entry.component" v-if="entry.component" v-bind="entry.props" />
            <slot v-else :entry="entry">
              <div class="flex h-full min-h-48 items-center justify-center rounded-lg border border-dashed border-white/10 text-sm text-slate-400">
                {{ $t('context.empty', { title: entry.title ?? '—' }) }}
              </div>
            </slot>
          </div>
        </section>
      </div>
    </div>
  </Teleport>
</template>
