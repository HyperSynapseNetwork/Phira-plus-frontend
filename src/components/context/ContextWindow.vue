<script setup lang="ts">
import type { ContextWindowEntry } from '~/composables/useContextWindow'
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useContextWindow } from '~/composables/useContextWindow'
import { focusableElements, trapTab, useOverlayManager } from '~/composables/useOverlayManager'

const props = withDefaults(defineProps<{
  id?: string
}>(), {
  id: undefined,
})

const { stack, close } = useContextWindow()
const panels = new Map<string, HTMLElement>()
const overlay = useOverlayManager()
const overlayId = `ppf-context-${Math.random().toString(36).slice(2, 9)}`

const entries = computed<ContextWindowEntry[]>(() => {
  if (props.id)
    return stack.value.filter(entry => entry.id === props.id)
  return stack.value
})

const sizeClass: Record<NonNullable<ContextWindowEntry['size']>, string> = {
  sm: 'md:w-[min(28rem,calc(100vw-3rem))]',
  md: 'md:w-[min(36rem,calc(100vw-3rem))]',
  lg: 'md:w-[min(52rem,calc(100vw-3rem))]',
  content: 'md:w-auto md:min-w-[20rem] md:max-w-[min(64rem,calc(100vw-3rem))]',
}

function setPanelRef(id: string, element: unknown): void {
  if (element instanceof HTMLElement)
    panels.set(id, element)
  else
    panels.delete(id)
}

async function focusTop(): Promise<void> {
  await nextTick()
  const top = entries.value.at(-1)
  if (!top || !overlay.isTopmost(overlayId))
    return
  const panel = panels.get(top.id)
  if (!panel) {
    return
  }(focusableElements(panel)[0] ?? panel).focus({ preventScroll: true })
}

function closeTop(): void {
  const top = entries.value.at(-1)
  if (top)
    close(top.id)
}

function onBackdrop(entry: ContextWindowEntry): void {
  if (entries.value.at(-1)?.id === entry.id)
    close(entry.id)
}

function onKeydown(event: KeyboardEvent): void {
  const top = entries.value.at(-1)
  if (!top || !overlay.isTopmost(overlayId))
    return

  if (event.key === 'Escape') {
    event.preventDefault()
    close(top.id)
    return
  }
  trapTab(event, panels.get(top.id) ?? null)
}

watch(entries, async (next, previous = []) => {
  const visible = next.length > 0
  if (visible && previous.length === 0)
    overlay.push(overlayId, 'context')

  await nextTick()
  if (next.length > previous.length) {
    await focusTop()
  }
  else if (next.length < previous.length) {
    const removed = previous.filter(oldEntry => !next.some(entry => entry.id === oldEntry.id)).reverse()
    const opener = removed.map(entry => entry.opener).find(element => element?.isConnected)
    if (opener)
      opener.focus({ preventScroll: true })
    else if (next.length > 0)
      await focusTop()
  }

  if (!visible && previous.length > 0)
    overlay.pop(overlayId)
}, { immediate: true })

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  overlay.pop(overlayId)
})
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="context-layer" tag="div" class="pointer-events-none fixed inset-0 z-[var(--pp-z-context)]" aria-live="polite">
      <div
        v-for="(entry, index) in entries"
        :key="entry.id"
        class="context-window-layer pointer-events-auto absolute inset-0"
        :style="{ '--pp-context-layer-index': index }"
      >
        <button
          type="button"
          class="context-window-backdrop absolute inset-0 h-full w-full cursor-default border-0 p-0"
          :aria-label="$t('context.close')"
          @click="onBackdrop(entry)"
        />

        <section
          :ref="element => setPanelRef(entry.id, element)"
          :class="[
            entry.mobileMode === 'fullscreen'
              ? 'fixed inset-0 rounded-none'
              : entry.mobileMode === 'sheet'
                ? 'fixed inset-x-0 bottom-0 max-h-[92dvh] rounded-t-window'
                : 'fixed inset-0',
            sizeClass[entry.size ?? 'md'],
          ]"
          class="context-window-panel flex flex-col outline-none md:absolute md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[80dvh] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-window"
          role="dialog"
          aria-modal="true"
          :aria-label="entry.title || $t('context.title')"
          tabindex="-1"
        >
          <header class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-5">
            <h2 class="truncate text-base font-semibold text-slate-100">
              {{ entry.title }}
            </h2>
            <button
              type="button"
              data-pp-touch-critical="overlay-close"
              class="pp-touch-target inline-flex h-11 w-11 items-center justify-center rounded-[var(--pp-radius-control)] text-[var(--pp-text-secondary)] transition-colors duration-[var(--pp-motion-fast)] hover:bg-[var(--pp-surface-2)] hover:text-[var(--pp-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              :aria-label="$t('context.close')"
              @click="closeTop"
            >
              <PPIcon name="close" :size="20" />
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
            <component :is="entry.component" v-if="entry.component" v-bind="entry.props" />
            <slot v-else :entry="entry">
              <div class="flex h-full min-h-48 items-center justify-center border-y border-white/10 text-sm text-slate-400">
                {{ $t('context.empty', { title: entry.title ?? '—' }) }}
              </div>
            </slot>
          </div>
        </section>
      </div>
    </TransitionGroup>
  </Teleport>
</template>
