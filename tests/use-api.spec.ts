import { describe, expect, it } from 'vitest'
import { isPaginated, paginate } from '~/composables/useApi'

describe('useApi helpers', () => {
  it('paginate builds { page, pageNum } with pageNum ≤ 100', () => {
    expect(paginate()).toEqual({ page: 1, pageNum: 20 })
    expect(paginate({ page: 2, pageNum: 150 })).toEqual({ page: 2, pageNum: 100 })
    expect(paginate({ page: 0, pageNum: 0 })).toEqual({ page: 1, pageNum: 1 })
  })

  it('isPaginated matches the frozen paginated shape', () => {
    expect(isPaginated({ items: [], total: 0, page: 1, pageNum: 20 })).toBe(true)
    expect(isPaginated({ items: 'x', total: 0, page: 1, pageNum: 20 })).toBe(false)
    expect(isPaginated(null)).toBe(false)
  })
})
