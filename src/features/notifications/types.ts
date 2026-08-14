import type { Paginated } from '../common/types'
import type { Friend } from '../social/types'
export type NotificationPriority = 'low' | 'normal' | 'high'
export type NotificationActionKind = 'join_room' | 'friend_accept' | 'friend_reject' | 'open_chart' | 'open_replay' | 'open_room' | 'open_user' | 'open_profile'
export interface NotificationActionTarget { room_id?: string; chart_id?: number; phira_id?: number; round_uuid?: string; friend_request_id?: string }
export interface NotificationAction { id: string; label: string; label_key?: string; action: NotificationActionKind; data: NotificationActionTarget; danger?: boolean }
export interface AppNotification { id: string; type: string; priority: NotificationPriority; title: string; title_key?: string | null; body: string; body_key?: string | null; params?: Record<string, string | number | boolean | null>; actor?: Friend; target?: Record<string, unknown>; actions?: NotificationAction[]; input?: { placeholder?: string, kind?: 'chat' | 'text' } | null; deep_link?: string; expires_at?: string | null; dedup_key?: string; read_at?: string | null; created_at: string }
export type NotificationActionResult = { status: 'completed', action: NotificationActionKind } | { status: 'pending_join_intent', action: NotificationActionKind, intent_id: string } | { status: 'navigate', action: NotificationActionKind, path: string }
export interface NotificationInputResponse { ok: boolean; result: unknown }
export interface NotificationInbox extends Paginated<AppNotification> { unread: number }
export interface NotificationPreferences { [topic: string]: { in_app: boolean, push: boolean } }
