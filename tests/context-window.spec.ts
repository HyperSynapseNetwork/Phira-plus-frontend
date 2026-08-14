import { describe, expect, it } from 'vitest'
import { CONTEXT_WINDOW_MAX_DEPTH, useContextWindow } from '~/composables/useContextWindow'

describe('context window manager (design §22.4)', () => {
  it('is depth-limited to 2 (rejects when full)', () => {
    const { stack, open } = useContextWindow()
    open({ title: 'A' })
    open({ title: 'B' })
    const third = open({ title: 'C' })
    expect(third.ok).toBe(false)
    expect(stack.value).toHaveLength(2)
    expect(stack.value.map(e => e.title)).toEqual(['A', 'B'])
    expect(CONTEXT_WINDOW_MAX_DEPTH).toBe(2)
  })

  it('closes top entry when no id given', () => {
    const { stack, open, close } = useContextWindow()
    open({ title: 'A' })
    open({ title: 'B' })
    close()
    expect(stack.value.map(e => e.title)).toEqual(['A'])
  })

  it('closes the top layer by id and clears all', () => {
    const { stack, open, close, closeAll } = useContextWindow()
    open({ title: 'A' })
    const top = open({ title: 'B' })
    close(top.ok ? top.id : undefined)
    expect(stack.value.map(e => e.title)).toEqual(['A'])
    closeAll()
    expect(stack.value).toHaveLength(0)
  })

  it('refuses to close a non-top layer (top-only semantics)', () => {
    const { stack, open, close } = useContextWindow()
    const bottom = open({ title: 'A' })
    open({ title: 'B' })
    expect(close(bottom.ok ? bottom.id : undefined)).toBe(false)
    expect(stack.value.map(e => e.title)).toEqual(['A', 'B'])
  })

  it('generates unique ids', () => {
    const { open } = useContextWindow()
    const a = open({ title: 'A' })
    const b = open({ title: 'B' })
    expect(a.ok ? a.id : null).not.toBe(b.ok ? b.id : null)
  })
})
