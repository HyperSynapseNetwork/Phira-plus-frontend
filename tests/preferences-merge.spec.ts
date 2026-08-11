import type { GuestPreferences } from '~/types/preferences'
import { describe, expect, it } from 'vitest'
import { withQuery } from '~/composables/useApi'
import { DEFAULT_GUEST_PREFERENCES } from '~/types/preferences'
import { guestToAccountPayload, mergeAccountIntoGuest } from '~/utils/preferences'

describe('three-layer preference merge (design §21, contract §7)', () => {
  it('account common prefs win over guest per-field', () => {
    const out = mergeAccountIntoGuest(
      { ...DEFAULT_GUEST_PREFERENCES, theme: 'system', reducedMotion: false },
      { theme: 'dark', reduced_motion: true, reduced_transparency: true },
      null,
    )
    expect(out.theme).toBe('dark')
    expect(out.reducedMotion).toBe(true)
    expect(out.reducedTransparency).toBe(true)
  })

  it('account ppf prefs merge into guest ppf fields', () => {
    const out = mergeAccountIntoGuest(
      { ...DEFAULT_GUEST_PREFERENCES, background: 'mesh', backgroundIntensity: 0.8 },
      null,
      { background: 'particles', background_intensity: 0.3, particles: true },
    )
    expect(out.background).toBe('particles')
    expect(out.backgroundIntensity).toBe(0.3)
    expect(out.particles).toBe(true)
  })

  it('ignores invalid / unknown account values', () => {
    const out = mergeAccountIntoGuest(
      { ...DEFAULT_GUEST_PREFERENCES, theme: 'light' },
      { theme: 'neon', accent: 'rainbow', language: 'fr' },
      { background: 42, particles: 'yes' },
    )
    expect(out.theme).toBe('light')
    expect(out.accent).toBe(DEFAULT_GUEST_PREFERENCES.accent)
    expect(out.language).toBe(DEFAULT_GUEST_PREFERENCES.language)
    expect(out.background).toBe(DEFAULT_GUEST_PREFERENCES.background)
    expect(out.particles).toBe(false)
  })

  it('never touches device-only prefs (lowPerformance)', () => {
    const out = mergeAccountIntoGuest(
      { ...DEFAULT_GUEST_PREFERENCES, lowPerformance: true },
      null,
      { background: 'mesh' },
    )
    expect(out.lowPerformance).toBe(true)
  })

  it('does not mutate the input guest object', () => {
    const guest: GuestPreferences = { ...DEFAULT_GUEST_PREFERENCES, theme: 'light' }
    const snapshot = { ...guest }
    mergeAccountIntoGuest(guest, { theme: 'dark' }, null)
    expect(guest).toEqual(snapshot)
  })

  it('guestToAccountPayload produces snake_case common/ppf payloads', () => {
    const guest: GuestPreferences = {
      ...DEFAULT_GUEST_PREFERENCES,
      theme: 'dark',
      reducedMotion: true,
      background: 'particles',
      backgroundIntensity: 0.5,
      particles: true,
    }
    const payload = guestToAccountPayload(guest)
    expect(payload.common).toEqual({
      theme: 'dark',
      accent: guest.accent,
      language: guest.language,
      reduced_motion: true,
      reduced_transparency: false,
    })
    expect(payload.ppf).toEqual({
      background: 'particles',
      background_intensity: 0.5,
      particles: true,
    })
    // device prefs are excluded
    expect('lowPerformance' in payload.common || 'lowPerformance' in payload.ppf).toBe(false)
  })
})

describe('withQuery (useApi helper)', () => {
  it('appends query params, skipping undefined/null/empty', () => {
    expect(withQuery('/api/v1/charts', { pageNum: 50, search: '', q: null, u: undefined }))
      .toBe('/api/v1/charts?pageNum=50')
  })

  it('repeats array params', () => {
    expect(withQuery('/api/v1/charts', { tags: ['sp', 'dp'] }))
      .toBe('/api/v1/charts?tags=sp&tags=dp')
  })

  it('returns the path unchanged when no params', () => {
    expect(withQuery('/api/v1/rooms', {})).toBe('/api/v1/rooms')
  })
})
