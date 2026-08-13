import type { AccentKey } from '~/types/preferences'

/**
 * Color math for the preference system (design §21.3, Owner round 7).
 *
 * - Maps the 5 accent presets to concrete hex colors (previously the accent
 *   presets were stored but never rendered — the CSS `--color-accent` stayed a
 *   static cyan).
 * - Derives readable foreground / accent colors from a custom background color
 *   using WCAG relative luminance + contrast so a user-picked background stays
 *   legible (the "auto accent" feature).
 */

/** Accent preset → hex (HSN brand cyan + the 4 existing presets). */
export const ACCENT_HEX: Record<AccentKey, string> = {
  cyan: '#00F7FF',
  blue: '#60a5fa',
  violet: '#a78bfa',
  green: '#4ade80',
  amber: '#fbbf24',
}

export interface Rgb {
  r: number
  g: number
  b: number
}

/** Accepts 3- or 6-digit hex colors (`#fff` / `#0a0a0a`). */
export function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())
}

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m)
    return null
  let h = m[1]
  if (h.length === 3)
    h = h.split('').map(c => c + c).join('')
  const n = Number.parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to2 = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${to2(r)}${to2(g)}${to2(b)}`
}

export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb)
    return hex
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`
}

function linearize(v: number): number {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance (0..1). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/** WCAG contrast ratio between two sRGB colors (1..21). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min)
    return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn)
    h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn)
    h = (bn - rn) / d + 2
  else
    h = (rn - gn) / d + 4
  h *= 60
  return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let rgb: [number, number, number]
  if (h < 60)
    rgb = [c, x, 0]
  else if (h < 120)
    rgb = [x, c, 0]
  else if (h < 180)
    rgb = [0, c, x]
  else if (h < 240)
    rgb = [0, x, c]
  else if (h < 300)
    rgb = [x, 0, c]
  else
    rgb = [c, 0, x]
  return { r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 }
}

export interface DerivedColors {
  /** Readable text color on top of the background. */
  fg: string
  /** Readable accent color derived from the background. */
  accent: string
  /** Text color to place on top of `accent`. */
  accentFg: string
  isDark: boolean
}

/**
 * Derive foreground + accent colors from a custom background color using
 * relative luminance / contrast. Keeps the background's hue (falling back to
 * the HSN cyan hue for near-gray backgrounds) and pushes lightness to the
 * opposite side so the accent stays legible.
 */
export function deriveColorsFromBackground(backgroundHex: string): DerivedColors {
  const bg = hexToRgb(backgroundHex) ?? { r: 10, g: 10, b: 10 }
  const isDark = relativeLuminance(bg) < 0.45

  const fg = isDark ? '#f1f5f9' : '#0f172a'

  const { h, s } = rgbToHsl(bg)
  const hue = s < 0.12 ? 187 : h
  let accent = hslToRgb(hue, Math.max(s, 0.6), isDark ? 0.72 : 0.3)

  // Fall back to the HSN brand colors when the derived accent lacks contrast.
  const fallback = isDark ? ACCENT_HEX.cyan : '#0369a1'
  let accentHex = rgbToHex(accent)
  if (contrastRatio(accent, bg) < 2.5)
    accentHex = fallback

  accent = hexToRgb(accentHex) ?? accent
  const accentFg = relativeLuminance(accent) > 0.5 ? '#0f172a' : '#f8fafc'

  return { fg, accent: accentHex, accentFg, isDark }
}
