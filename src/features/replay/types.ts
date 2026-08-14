import type { Friend } from '../social/types'
export type ReplayVisibility = 'inherit' | 'public' | 'friends' | 'unlisted' | 'private' | 'custom'
export interface Replay { id: string; round_uuid: string; player_phira_id: number; chart_name?: string; chart_id?: number; room_id?: string; player?: Friend; score?: number; accuracy?: number; visibility: ReplayVisibility; created_at: string; share_token?: string; share_links?: { id: string, expires_at?: string | null, revoked_at?: string | null }[] }
export interface ReplayPolicy { default_visibility: ReplayVisibility; allow_share: boolean }
