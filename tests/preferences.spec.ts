import type { GuestPreferences } from '~/types/preferences'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { usePreferencesStore } from '~/stores/preferences'
import {
  DEFAULT_GUEST_PREFERENCES,
  fromStoredPreferences,

  normalizeGuestPreferences,
  toStoredPreferences,
} from '~/types/preferences'

describe('guest preferences (design §21.3)', () => {
  describe('normalization', () => {
    it('returns defaults for garbage input', () => {
      expect(normalizeGuestPreferences(null)).toEqual(DEFAULT_GUEST_PREFERENCES)
      expect(normalizeGuestPreferences('nope')).toEqual(DEFAULT_GUEST_PREFERENCES)
    })

    it('sanitizes invalid fields to defaults', () => {
      const out = normalizeGuestPreferences({
        theme: 'neon',
        accent: 'pink',
        background: 42,
        reducedMotion: 'yes',
        lowPerformance: 1,
      })
      expect(out.theme).toBe(DEFAULT_GUEST_PREFERENCES.theme)
      expect(out.accent).toBe(DEFAULT_GUEST_PREFERENCES.accent)
      expect(out.background).toBe(DEFAULT_GUEST_PREFERENCES.background)
      expect(out.reducedMotion).toBe(false)
      expect(out.lowPerformance).toBe(false)
    })

    it('clamps backgroundIntensity to [0,1]', () => {
      expect(normalizeGuestPreferences({ backgroundIntensity: 5 }).backgroundIntensity).toBe(1)
      expect(normalizeGuestPreferences({ backgroundIntensity: -2 }).backgroundIntensity).toBe(0)
    })
  })

  describe('namespaced storage shape', () => {
    it('round-trips through the stored shape', () => {
      const prefs: GuestPreferences = { ...DEFAULT_GUEST_PREFERENCES, theme: 'dark', accent: 'violet', lowPerformance: true }
      const stored = toStoredPreferences(prefs)
      expect(stored.common.theme).toBe('dark')
      expect(stored.common.accent).toBe('violet')
      expect(stored.device.lowPerformance).toBe(true)
      expect(fromStoredPreferences(stored)).toEqual(prefs)
    })

    it('survives a malformed stored blob', () => {
      expect(fromStoredPreferences({ common: { theme: 'light' }, ppf: null })).toEqual({
        ...DEFAULT_GUEST_PREFERENCES,
        theme: 'light',
      })
    })
  })

  describe('pinia store', () => {
    it('updates and resets prefs', () => {
      setActivePinia(createPinia())
      const store = usePreferencesStore()
      store.update({ theme: 'dark', lowPerformance: true })
      expect(store.prefs.theme).toBe('dark')
      expect(store.prefs.lowPerformance).toBe(true)
      store.reset()
      expect(store.prefs).toEqual(DEFAULT_GUEST_PREFERENCES)
    })
  })
})
