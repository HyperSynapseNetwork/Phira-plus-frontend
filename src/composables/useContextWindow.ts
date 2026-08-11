import type { Component } from 'vue'

/**
 * Context Window manager (design §22.4).
 *
 * Overlay/detail layer with a hard depth limit of 2. On mobile the window
 * renders as a bottom sheet or fullscreen (handled by ContextWindow.vue).
 * Skeleton only — no business content.
 */

export interface ContextWindowEntry {
  id: string
  title?: string
  /** Optional dynamic component to render inside the window. */
  component?: Component
  props?: Record<string, unknown>
  /** Mobile presentation: bottom sheet (default) or fullscreen takeover. */
  mobileMode?: 'sheet' | 'fullscreen'
  onClose?: () => void
}

export const CONTEXT_WINDOW_MAX_DEPTH = 2

function makeId(): string {
  if (import.meta.client && typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
}

export function useContextWindow() {
  const stack = useState<ContextWindowEntry[]>('ppf:context-window-stack', () => [])

  function open(entry: Omit<ContextWindowEntry, 'id'> & { id?: string }): string {
    const id = entry.id ?? makeId()
    const next = [...stack.value, { ...entry, id }]
    if (next.length > CONTEXT_WINDOW_MAX_DEPTH)
      next.splice(0, next.length - CONTEXT_WINDOW_MAX_DEPTH)
    stack.value = next
    return id
  }

  function close(id?: string): void {
    if (id === undefined) {
      const top = stack.value[stack.value.length - 1]
      top?.onClose?.()
      stack.value = stack.value.slice(0, -1)
    }
    else {
      const entry = stack.value.find(e => e.id === id)
      if (entry)
        entry.onClose?.()
      stack.value = stack.value.filter(e => e.id !== id)
    }
  }

  function closeAll(): void {
    stack.value = []
  }

  return { stack, open, close, closeAll, maxDepth: CONTEXT_WINDOW_MAX_DEPTH }
}
