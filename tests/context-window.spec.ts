import { describe, expect, it } from 'vitest'
import { CONTEXT_WINDOW_MAX_DEPTH, useContextWindow } from '~/composables/useContextWindow'

describe('context window manager (design §22.4)', () => {
  it('is depth-limited to 2', () => {
    const { stack, open } = useContextWindow()
    open({ title: 'A' })
    open({ title: 'B' })
    open({ title: 'C' })
    expect(stack.value).toHaveLength(2)
    expect(stack.value.map(e => e.title)).toEqual(['B', 'C'])
    expect(CONTEXT_WINDOW_MAX_DEPTH).toBe(2)
  })

  it('closes top entry when no id given', () => {
    const { stack, open, close } = useContextWindow()
    open({ title: 'A' })
    open({ title: 'B' })
    close()
    expect(stack.value.map(e => e.title)).toEqual(['A'])
  })

  it('closes by id and clears all', () => {
    const { stack, open, close, closeAll } = useContextWindow()
    const id = open({ title: 'A' })
    open({ title: 'B' })
    close(id)
    expect(stack.value.map(e => e.title)).toEqual(['B'])
    closeAll()
    expect(stack.value).toHaveLength(0)
  })

  it('generates unique ids', () => {
    const { open } = useContextWindow()
    const a = open({ title: 'A' })
    const b = open({ title: 'B' })
    expect(a).not.toBe(b)
  })
})
