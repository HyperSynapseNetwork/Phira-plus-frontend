import type { Paginated, Room, RoomChart, RoomPlayer, RoomState } from '~/utils/api/types'

/**
 * Room response normalization (PMP `room.list` passthrough tolerance).
 *
 * PPB's `GET /api/v1/rooms` currently proxies PMP `room.list` verbatim, so the
 * payload is a bare array, `{rooms:[...]}` or `{results:[...]}` — not the
 * frozen `Paginated<Room>` shape `{items, total, page, pageNum}` — and the
 * room objects use PMP field names (`room_id`, `players`, `host_id`, …)
 * instead of the PPF `Room` contract (`room_uuid`, `players: RoomPlayer[]`,
 * `host: RoomPlayer`, `player_count`, `max_players`). This module normalizes
 * whatever PPB sends into `Room`/`Paginated<Room>` so the room list/detail
 * never dereference a missing `items` array or a renamed field.
 *
 * Field mapping is limited to confirmed PMP→PPF renames; values are coerced
 * to the PPF field types but never invented (e.g. a bare `players` count can
 * fill `player_count` but cannot fabricate `RoomPlayer` objects). When PPB
 * later returns the canonical shape, these helpers are idempotent — canonical
 * values win over PMP fallbacks.
 */

type RawRecord = Record<string, unknown>

function asRecord(value: unknown): RawRecord | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as RawRecord
    : null
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function asBool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

/** A count PMP may send as a number or as an array. */
function countOf(value: unknown): number | undefined {
  if (typeof value === 'number')
    return value
  if (Array.isArray(value))
    return value.length
  return undefined
}

/** PMP room identifier (`room_id`) → PPF `room_uuid`. */
function roomUuid(room: RawRecord): string {
  return asString(room.room_uuid) ?? asString(room.uuid) ?? asString(room.room_id) ?? asString(room.id) ?? ''
}

/**
 * Normalize a PMP/PPB state string into the PPF `RoomState` union.
 * Accepts the canonical values and the snake/SCREAMING variants PPB/PMP emit;
 * anything unrecognized falls back to the lobby state.
 */
function roomState(value: unknown): RoomState {
  const key = asString(value)?.toLowerCase().replace(/[^a-z0-9]+/g, '')
  if (key === 'playing')
    return 'Playing'
  if (key === 'selectchart' || key === 'selectingchart')
    return 'SelectChart'
  return 'WaitingForReady'
}

/** Normalize a player entry (`RoomPlayer`) from any player-shaped record. */
function playerOf(value: unknown): RoomPlayer | null {
  const p = asRecord(value)
  if (p == null)
    return null
  const phira_id = asNumber(p.phira_id) ?? asNumber(p.user_id) ?? asNumber(p.id)
  const username = asString(p.username) ?? asString(p.name)
  if (phira_id == null && username == null)
    return null
  return {
    phira_id: phira_id ?? 0,
    username: username ?? String(phira_id ?? ''),
    ready: asBool(p.ready),
    is_host: asBool(p.is_host),
    is_self: asBool(p.is_self),
    live: asBool(p.live),
  }
}

/** Derive the host `RoomPlayer` from `host` (object) or a flat `host_id`. */
function hostOf(room: RawRecord): RoomPlayer | null {
  const host = asRecord(room.host)
  if (host) {
    const p = playerOf(host)
    if (p)
      return { ...p, is_host: p.is_host ?? true }
  }
  const direct = asNumber(room.host_id)
  if (direct != null)
    return { phira_id: direct, username: String(direct), is_host: true, is_self: false }
  return null
}

/** Player array from `players` (canonical `RoomPlayer[]`). */
function playersOf(room: RawRecord): RoomPlayer[] {
  if (!Array.isArray(room.players))
    return []
  const out: RoomPlayer[] = []
  for (const item of room.players) {
    const p = playerOf(item)
    if (p)
      out.push(p)
  }
  return out
}

function chartOf(room: RawRecord): RoomChart | null {
  const chart = asRecord(room.chart) ?? asRecord(room.current_chart)
  if (chart == null) {
    const chartId = asNumber(room.chart_id)
    const chartName = asString(room.chart_name)
    return chartId == null && chartName == null ? null : { chart_id: chartId, name: chartName }
  }
  return {
    chart_id: asNumber(chart.chart_id) ?? asNumber(chart.id),
    name: asString(chart.name) ?? asString(chart.song_name),
    artist: asString(chart.artist),
    difficulty: asNumber(chart.difficulty),
    rating: asNumber(chart.rating),
    cover_url: asString(chart.cover_url),
  }
}

/** Normalize a single PMP/PPB room object into the PPF `Room` contract. */
export function normalizeRoom(raw: unknown): Room {
  const room = asRecord(raw) ?? {}
  const players = playersOf(room)
  return {
    room_id: asString(room.room_id) ?? asString(room.id) ?? '',
    room_uuid: roomUuid(room),
    id: asString(room.room_id) ?? asString(room.id),
    name: asString(room.name) ?? asString(room.room_id),
    state: roomState(room.state),
    host: hostOf(room),
    players,
    player_count: asNumber(room.player_count) ?? countOf(room.players) ?? players.length,
    max_players: asNumber(room.max_players) ?? asNumber(room.max_users) ?? 0,
    chart: chartOf(room),
    locked: asBool(room.locked),
    cycle: asBool(room.cycle),
    persistent: asBool(room.persistent),
    hidden: asBool(room.hidden),
    live: asBool(room.live),
    server_online: asBool(room.server_online),
    created_at: asString(room.created_at),
    updated_at: asString(room.updated_at),
  }
}

/**
 * Extract the room array from any shape PPB may return today:
 * a bare array, `{items}`, `{rooms}` or `{results}`.
 */
export function normalizeRoomList(raw: unknown): Room[] {
  if (Array.isArray(raw))
    return raw.map(normalizeRoom)
  const record = asRecord(raw)
  if (record == null)
    return []
  const arr = [record.items, record.rooms, record.results].find(
    (candidate): candidate is unknown[] => Array.isArray(candidate),
  )
  return arr != null ? arr.map(normalizeRoom) : []
}

/**
 * Normalize a room-list response into `Paginated<Room>`. `total` is taken
 * from the server when present, otherwise derived from the (un-paginated) list.
 */
export function normalizeRoomListResponse(raw: unknown, params?: Record<string, unknown>): Paginated<Room> {
  const items = normalizeRoomList(raw)
  const record = asRecord(raw)
  const total = record != null && typeof record.total === 'number' ? record.total : items.length
  const page = typeof params?.page === 'number' ? params.page : 1
  const pageNum = typeof params?.pageNum === 'number' ? params.pageNum : (items.length || 1)
  return { items, total, page, pageNum }
}
