import type { Component } from 'vue'
import { markRaw } from 'vue'

/** Context/detail overlay stack. Depth is an explicit interaction limit. */
export interface ContextWindowEntry {
  id: string
  title?: string
  component?: Component
  props?: Record<string, unknown>
  size?: 'sm' | 'md' | 'lg' | 'content'
  mobileMode?: 'sheet' | 'fullscreen'
  onClose?: () => void
  /** Client-only element that opened this layer; used for spatial focus restore. */
  opener?: HTMLElement
}

export type ContextOpenResult =
  | { ok: true, id: string }
  | { ok: false, reason: 'MAX_CONTEXT_DEPTH' }

export const CONTEXT_WINDOW_MAX_DEPTH = 2

function makeId(): string {
  if (import.meta.client && typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
}

function currentOpener(): HTMLElement | undefined {
  if (!import.meta.client || !(document.activeElement instanceof HTMLElement))
    return undefined
  return markRaw(document.activeElement)
}

export function useContextWindow() {
  const stack = useState<ContextWindowEntry[]>('ppf:context-window-stack', () => [])

  function open(entry: Omit<ContextWindowEntry, 'id' | 'opener'> & { id?: string }): ContextOpenResult {
    if (stack.value.length >= CONTEXT_WINDOW_MAX_DEPTH)
      return { ok: false, reason: 'MAX_CONTEXT_DEPTH' }
    const id = entry.id ?? makeId()
    stack.value = [...stack.value, { ...entry, id, opener: currentOpener() }]
    return { ok: true, id }
  }

  /** Explicit replacement for callers that intentionally reuse the top layer. */
  function replaceTop(entry: Omit<ContextWindowEntry, 'id' | 'opener'> & { id?: string }): string {
    const top = stack.value.at(-1)
    top?.onClose?.()
    const id = entry.id ?? makeId()
    const base = top ? stack.value.slice(0, -1) : stack.value
    stack.value = [...base, { ...entry, id, opener: currentOpener() }]
    return id
  }

  /** Public close semantics are top-only. A hidden lower layer must never be
   * removed behind the active Context because that would restore focus through
   * the top layer and break spatial continuity. */
  function close(id?: string): boolean {
    const top = stack.value.at(-1)
    if (!top)
      return false
    if (id !== undefined && id !== top.id)
      return false
    top.onClose?.()
    stack.value = stack.value.slice(0, -1)
    return true
  }

  /** Normal product close: callbacks run top-to-bottom. */
  function closeAll(): void {
    for (const entry of [...stack.value].reverse())
      entry.onClose?.()
    stack.value = []
  }

  return { stack, open, replaceTop, close, closeAll, maxDepth: CONTEXT_WINDOW_MAX_DEPTH }
}
