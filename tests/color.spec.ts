import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  deriveColorsFromBackground,
  hexToRgb,
  isValidHexColor,
  relativeLuminance,
} from '~/utils/color'

describe('color utils (round 7)', () => {
  it('validates hex colors', () => {
    expect(isValidHexColor('#fff')).toBe(true)
    expect(isValidHexColor('#0a0a0a')).toBe(true)
    expect(isValidHexColor('#abcd')).toBe(false)
    expect(isValidHexColor('red')).toBe(false)
    expect(isValidHexColor(null)).toBe(false)
  })

  it('converts hex to rgb', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('zzz')).toBeNull()
  })

  it('computes WCAG relative luminance and contrast', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 3)
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 3)
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 3)
  })

  it('derives light foreground + accent from a dark background', () => {
    const d = deriveColorsFromBackground('#0a0a0a')
    expect(d.isDark).toBe(true)
    expect(d.fg).toBe('#f1f5f9')
    expect(isValidHexColor(d.accent)).toBe(true)
    expect(contrastRatio(hexToRgb(d.accent)!, { r: 10, g: 10, b: 10 })).toBeGreaterThan(2.5)
    expect(d.accentFg).toBe('#0f172a')
  })

  it('derives dark foreground + light accent-fg from a light background', () => {
    const d = deriveColorsFromBackground('#ffffff')
    expect(d.isDark).toBe(false)
    expect(d.fg).toBe('#0f172a')
    expect(d.accentFg).toBe('#f8fafc')
    expect(isValidHexColor(d.accent)).toBe(true)
  })
})
