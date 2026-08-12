/**
 * Typed API client types for the frozen PPB REST contract.
 * Source of truth: contracts/README.md (Contract-Freeze v0) §1-§16, §24.
 *
 * - Error codes are UPPER_SNAKE_CASE (Main decision P4).
 * - Client-only codes (P5) are lowercase and never part of the server contract.
 * - PPB Phase B may not be finished: consumers must treat any of these as
 *   possibly-unavailable and render graceful fallbacks / empty states.
 */

/* ----------------------------------------------------------------------------
 * Errors (P4 / P5)
 * ------------------------------------------------------------------------- */

/** Server error codes (P4: UPPER_SNAKE_CASE). Frontend localizes by code. */
export type ApiErrorCode
  = | 'REQUEST_ID'
    | 'PAGINATION'
    | 'VALIDATION'
    | 'RATE_LIMIT'
    | 'AUTH'
    | 'SESSION'
    | 'PERMISSION_DENIED'
    | 'PMP_UNAVAILABLE'
    | 'CAPABILITY_NOT_SUPPORTED'
    | 'PHIRA_API_UNAVAILABLE'
    | 'PHIRA_REAUTH_REQUIRED'
    | 'LONG_JOB_ACCEPTED'

/** Client-only codes (P5) — never sent by the server. */
export type ClientErrorCode = 'network_error' | 'unknown_error' | 'invalid_response'

export type AnyErrorCode = ApiErrorCode | ClientErrorCode

/** Frozen error envelope (contract §2 / §24.5). */
export interface ApiErrorEnvelope {
  error: {
    code: string
    message: string
    request_id?: string
    details?: Record<string, unknown>
  }
}

export class ApiError extends Error {
  readonly code: AnyErrorCode
  readonly requestId?: string
  readonly details?: Record<string, unknown>
  readonly status?: number
  readonly retryAfterSeconds?: number

  constructor(opts: {
    code: AnyErrorCode
    message: string
    requestId?: string
    details?: Record<string, unknown>
    status?: number
    retryAfterSeconds?: number
    cause?: unknown
  }) {
    super(opts.message)
    this.name = 'ApiError'
    this.code = opts.code
    this.requestId = opts.requestId
    this.details = opts.details
    this.status = opts.status
    this.retryAfterSeconds = opts.retryAfterSeconds
    if (opts.cause)
      this.cause = opts.cause
  }
}

/* ----------------------------------------------------------------------------
 * Pagination (contract §2 / P8)
 * ------------------------------------------------------------------------- */

export interface PaginationParams {
  /** 1-based page index (P8). */
  page?: number
  /** Page size, maximum 100. */
  pageNum?: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageNum: number
}

/* ----------------------------------------------------------------------------
 * Public (contract §1 / §9 / §24.4)
 * ------------------------------------------------------------------------- */

export interface PublicMeta {
  version: string
  api_version: number
  capabilities: string[]
  pmp: {
    connected: boolean
    version: string
    capabilities: string[]
  }
}

export interface PublicSiteInfo {
  name: string
  description?: string
  version?: string
  server_name?: string
  welcome?: string
}

export interface PublicAnnouncement {
  id: string
  title: string
  body: string
  published_at: string
  pinned?: boolean
}

export interface PublicDownload {
  id: string
  platform: 'windows' | 'android' | 'other'
  label: string
  url: string
  version?: string
  size_bytes?: number
}

/** External node (probe) — display origin + latency, NEVER infer IP (audit §2.10). */
export interface PublicNode {
  id: string
  label: string
  source?: string
  status?: 'up' | 'down' | 'unknown'
  latency_ms?: number | null
  message?: string
  updated_at?: string
}

/** Server heartbeat summary (design §16.2). */
export interface ServerSummary {
  online_users?: number
  rooms?: number
  sessions?: number
  at?: string
}

/* ----------------------------------------------------------------------------
 * Me / Session / Auth (contract §1 / §24.2, P1/P9/P11)
 * ------------------------------------------------------------------------- */

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

export interface Identity {
  provider: 'phira' | 'github'
  provider_id: string
  provider_name?: string
  linked_at: string
}

export interface SessionInfo {
  id: string
  client_type: 'ppf' | 'panel' | 'windows' | 'android'
  created_at: string
  expires_at: string
  last_seen_at?: string
  device_name?: string
  ip?: string
}

/** `GET /api/v1/me` session metadata (contract §20). */
export interface MeSession {
  sid: string
  client_type: 'ppf' | 'panel' | 'windows' | 'android'
  created_at: string
}

/**
 * `GET /api/v1/me` — the ONLY session probe (contract §20).
 * Returns identity, runtime-resolved permissions/capabilities and a CSRF token
 * for write operations. `user` is `null` when unauthenticated (401).
 */
export interface MeResponse {
  csrf_token: string
  principal: {
    principal_type: 'user' | 'root'
    user_id?: string
  } | null
  user: MeProfile | null
  permissions: string[]
  capabilities: string[]
  session: MeSession | null
}

/** `GET /api/v1/me/profile` result (legacy alias; profile info only). */
export interface SessionState {
  authenticated: boolean
  profile?: MeProfile
  identities?: Identity[]
  phira_reauth_required?: boolean
}

export interface AuthGatewayConfig {
  authBase: string
  returnTo: string
}

/* ----------------------------------------------------------------------------
 * Rooms (contract §1 / design §16.3 / §13.2)
 * ------------------------------------------------------------------------- */

export type RoomState = 'SelectChart' | 'WaitingForReady' | 'Playing'

export interface RoomPlayer {
  phira_id: number
  username: string
  ready?: boolean
  is_host?: boolean
  is_self?: boolean
  live?: boolean
}

export interface RoomChart {
  chart_id?: number
  name?: string
  artist?: string
  difficulty?: number
  rating?: number
  cover_url?: string
}

export interface Room {
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

export interface RoomListParams extends PaginationParams {
  search?: string
  state?: RoomState
  only_live?: boolean
}

/** PPF chat message (design §13.2). `user_id === 0` => system message. */
export interface RoomChatMessage {
  user_id: number
  user_name?: string
  content: string
  is_system?: boolean
  timestamp?: string
}

/** Chat send body (design §13.3) — client never supplies a trusted user_id. */
export interface ChatSendBody {
  room_id: string
  content: string
}

/** Host-allowed action request (design §13.4, contract §6 Action Manifest). */
export interface HostActionBody {
  action: string
  room_id: string
  args?: Record<string, unknown>
}

/* ----------------------------------------------------------------------------
 * Charts / Records (design §16.4; Phira API shape, proxied by PPB)
 * ------------------------------------------------------------------------- */

export interface Chart {
  id: number
  name: string
  artist?: string
  charter?: string
  difficulty?: number
  rating?: number
  level?: string
  type?: string
  tags?: string[]
  cover_url?: string
  file_url?: string
  play_count?: number
  updated_at?: string
}

export interface ChartListParams extends PaginationParams {
  search?: string
  type?: string
  difficulty_min?: number
  difficulty_max?: number
  rating_min?: number
  rating_max?: number
  tags?: string[]
  order?: 'updated' | 'popular' | 'rating' | 'plays'
}

export interface ChartRecord {
  id?: number
  user_id?: number
  username?: string
  score: number
  accuracy?: number
  combo?: number
  rank?: number
  is_self?: boolean
  updated_at?: string
}

export interface ChartDetail extends Chart {
  records?: ChartRecord[]
  my_best?: ChartRecord | null
  /** Data provenance label: Phira (official API) vs Phira+ (PPB aggregated). */
  source: 'phira' | 'phira_plus'
}

/* ----------------------------------------------------------------------------
 * Users / Community / Friends (design §16.6 / §24.2)
 * ------------------------------------------------------------------------- */

export interface UserProfile {
  phira_id: number
  username: string
  avatar?: string | null
  bio?: string
  online_status?: 'online' | 'offline' | 'hidden'
  profile_visibility?: 'public' | 'friends' | 'private'
  rks?: number | null
  stats?: UserStats
  friends_count?: number
  is_friend?: boolean
  is_blocked?: boolean
}

export interface UserStats {
  plays?: number
  avg_accuracy?: number
  best_score?: number
  total_score?: number
}

export interface Friend {
  phira_id: number
  username: string
  avatar?: string | null
  online_status?: 'online' | 'offline' | 'hidden'
}

export interface FriendRequest {
  id: string
  from?: Friend
  to?: Friend
  status: 'pending' | 'accepted' | 'rejected' | 'blocked'
  created_at: string
}

/* ----------------------------------------------------------------------------
 * Replays (contract §4 / §10, design §16.5)
 * ------------------------------------------------------------------------- */

export type ReplayVisibility = 'public' | 'friends' | 'unlisted' | 'private'

export interface Replay {
  id: string
  round_uuid: string
  chart_name?: string
  chart_id?: number
  player?: Friend
  score?: number
  accuracy?: number
  visibility: ReplayVisibility
  created_at: string
  share_token?: string
}

export interface ReplayPolicy {
  default_visibility: ReplayVisibility
  allow_share: boolean
}

/* ----------------------------------------------------------------------------
 * Notifications (contract §8, design §16.7)
 * ------------------------------------------------------------------------- */

export type NotificationPriority = 'low' | 'normal' | 'high'

export interface NotificationAction {
  id: string
  label: string
  /** Usually a deep link or an action id resolved server-side each time. */
  href?: string
  action?: string
  danger?: boolean
}

export interface AppNotification {
  id: string
  type: string
  priority: NotificationPriority
  title: string
  body?: string
  actor?: Friend
  target?: Record<string, unknown>
  actions?: NotificationAction[]
  input?: { placeholder?: string, kind?: 'chat' | 'text' } | null
  deep_link?: string
  expires_at?: string | null
  dedup_key?: string
  read_at?: string | null
  created_at: string
}

export interface NotificationInbox extends Paginated<AppNotification> {
  unread: number
}

export interface NotificationPreferences {
  /** topic × channel(in_app/push) independent prefs. */
  [topic: string]: {
    in_app: boolean
    push: boolean
  }
}

/* ----------------------------------------------------------------------------
 * Preferences (contract §7, design §21)
 * ------------------------------------------------------------------------- */

export type PreferenceNamespace = 'common' | 'ppf' | 'panel' | 'experiments'

export interface NamespacedPreferences<T = Record<string, unknown>> {
  user_id: string
  namespace: PreferenceNamespace
  revision: number
  data: T
  updated_at: string
}

export interface CommonPrefs {
  theme?: 'system' | 'light' | 'dark'
  accent?: string
  language?: string
  reduced_motion?: boolean
  reduced_transparency?: boolean
}

export interface PpfPrefs {
  background?: string
  intensity?: number
  blur?: number
  particles?: boolean
  room_list?: Record<string, unknown>
  replay_default_visibility?: ReplayVisibility
  notification_display?: Record<string, unknown>
  content_density?: 'comfortable' | 'compact'
}

export interface UpdatePreferencesBody {
  namespace: PreferenceNamespace
  data: Record<string, unknown>
  /** Optimistic concurrency (contract §7). Send last-known revision. */
  base_revision?: number
}

/* ----------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

export function hasCapability(meta: PublicMeta, capability: string): boolean {
  return meta.capabilities.includes(capability)
}

export function hasPmpCapability(meta: PublicMeta, capability: string): boolean {
  return meta.pmp.capabilities.includes(capability)
}

/** True when the meta probe indicates rooms.v1 is available. */
export function roomsAvailable(meta: PublicMeta | null | undefined): boolean {
  return Boolean(meta?.capabilities.includes('rooms.v1'))
}
