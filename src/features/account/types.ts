import type { components } from '../../utils/api/generated'

export interface MeProfile {
  user_id: string
  phira_id: number
  username: string
  avatar?: string | null
  status?: string
  last_seen_at?: string
  created_at?: string
  bio?: string
  profile_visibility?: 'public' | 'friends' | 'private'
}
export interface MySessionItem { id: string, client_type: string, device_name: string, ip: string, created_at: string, expires_at: string, last_seen_at?: string | null, current: boolean }
export interface MySessionsResponse { items: MySessionItem[] }
export interface MyPrivacySettings { profile_visibility: 'public' | 'friends' | 'private', show_online_status: boolean, show_recent_activity: boolean }
export interface MyMultiplayerRound { round_uuid: string, room_id: string, chart_id: number, chart_name: string, started_at: number, finished_at?: number | null }
export interface MyMultiplayerSummary { phira_id: number, rounds_total: number, completed_rounds: number, rooms_visited: number, playtime_ms: number, recent_rounds: MyMultiplayerRound[] }
export interface Identity { provider: 'phira' | 'github', provider_id: string, provider_name?: string, linked_at: string }
export interface SessionInfo { id: string, client_type: 'ppf' | 'panel' | 'windows' | 'android', created_at: string, expires_at: string, last_seen_at?: string, device_name?: string, ip?: string }
export interface MeSession { sid: string, client_type: 'ppf' | 'panel' | 'windows' | 'android', created_at: string }
export type GeneratedMeResponse = components['schemas']['MeResponse']
export interface MeResponse {
  csrf_token: string
  principal: { principal_type: 'user' | 'root', user_id?: string } | null
  user: MeProfile | null
  permissions: string[]
  capabilities: string[]
  session: MeSession | null
}
export interface SessionState { authenticated: boolean, profile?: MeProfile, identities?: Identity[], phira_reauth_required?: boolean }
export interface AuthGatewayConfig { authBase: string, returnTo: string }
