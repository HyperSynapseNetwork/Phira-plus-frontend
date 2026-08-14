import type { components } from '../../utils/api/generated'
import type { PaginationParams } from '../common/types'

export type RoomState = 'SelectChart' | 'WaitingForReady' | 'Playing'
export interface RoomPlayer { phira_id: number; username: string; ready?: boolean; is_host?: boolean; is_self?: boolean; live?: boolean }
export interface RoomChart { chart_id?: number; name?: string; artist?: string; difficulty?: number; rating?: number; cover_url?: string }
export interface Room {
  room_id: string
  room_uuid: string
  id?: string
  name?: string
  state: RoomState
  host?: RoomPlayer | null
  players: RoomPlayer[]
  player_count: number
  max_players: number
  chart?: RoomChart | null
  locked?: boolean
  cycle?: boolean
  persistent?: boolean
  hidden?: boolean
  live?: boolean
  server_online?: boolean
  created_at?: string
  updated_at?: string
}
export interface RoomListParams extends PaginationParams { search?: string; state?: RoomState; only_live?: boolean }
export interface RoomHistoryEntry { round_uuid: string; chart_id?: number; chart_name?: string; started_at?: string; ended_at?: string; players?: { phira_id: number, username?: string, score?: number }[] }
export interface RoomChatMessage { user_id: number; user_name?: string; content: string; is_system?: boolean; timestamp?: string }
export type ChatSendBody = components['schemas']['ChatSendBody']
export interface HostActionBody { action: string; room_id: string; args?: Record<string, unknown> }
