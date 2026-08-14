import type { ReplayVisibility } from '../replay/types'
export type PreferenceNamespace = 'common' | 'ppf' | 'panel' | 'experiments'
export interface NamespacedPreferences<T = Record<string, unknown>> { user_id: string; namespace: PreferenceNamespace; revision: number; data: T; updated_at: string }
export interface CommonPrefs { theme?: 'system' | 'light' | 'dark'; accent?: string; language?: string; reduced_motion?: boolean; reduced_transparency?: boolean }
export interface PpfPrefs { background?: string; intensity?: number; blur?: number; particles?: boolean; room_list?: Record<string, unknown>; replay_default_visibility?: ReplayVisibility; notification_display?: Record<string, unknown>; content_density?: 'comfortable' | 'compact' }
export interface UpdatePreferencesBody { namespace: PreferenceNamespace; data: Record<string, unknown>; base_revision?: number }
