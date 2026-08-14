import { ref } from 'vue'

type OverlayLayer = 'drawer' | 'context' | 'notice' | 'reauth'
interface OverlayEntry { id: string, layer: OverlayLayer, sequence: number, restoreFocus: HTMLElement | null }

const entries = ref<OverlayEntry[]>([])
let sequence = 0
let originalBodyOverflow = ''
const priority: Record<OverlayLayer, number> = { drawer: 70, context: 80, notice: 90, reauth: 100 }

function ordered(): OverlayEntry[] {
  return [...entries.value].sort((a, b) => priority[a.layer] - priority[b.layer] || a.sequence - b.sequence)
}

export function focusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root)
    return []
  return [...root.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true')
}

export function trapTab(event: KeyboardEvent, root: HTMLElement | null): void {
  if (event.key !== 'Tab' || !root)
    return
  const items = focusableElements(root)
  if (!items.length) { event.preventDefault(); root.focus(); return }
  const first = items[0]!
  const last = items[items.length - 1]!
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === root)) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus() }
}

export function useOverlayManager() {
  function push(id: string, layer: OverlayLayer): void {
    if (!import.meta.client || entries.value.some(e => e.id === id))
      return
    if (!entries.value.length) {
      originalBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    entries.value.push({ id, layer, sequence: ++sequence, restoreFocus: document.activeElement instanceof HTMLElement ? document.activeElement : null })
  }
  function pop(id: string): void {
    if (!import.meta.client)
      return
    const topBefore = ordered().at(-1)
    const entry = entries.value.find(e => e.id === id)
    entries.value = entries.value.filter(e => e.id !== id)
    if (!entries.value.length)
      document.body.style.overflow = originalBodyOverflow
    if (entry && topBefore?.id === id)
      entry.restoreFocus?.focus({ preventScroll: true })
  }
  function isTopmost(id: string): boolean { return ordered().at(-1)?.id === id }
  function topId(): string | undefined { return ordered().at(-1)?.id }
  return { entries, push, pop, isTopmost, topId }
}
