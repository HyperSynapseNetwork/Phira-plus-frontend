import type { Paginated } from '~/features/common/types'
import type { ChatSendBody, HostActionBody, Room, RoomChatMessage, RoomHistoryEntry, RoomListParams } from '~/features/rooms/types'
import { apiFetch, getApiBase } from '~/utils/api/client'
import { normalizeRoom, normalizeRoomListResponse } from '~/utils/rooms'
import { withQuery } from './useApi'

/**
 * Rooms (`/api/v1/rooms/*`, contract §1 / design §16.3 / §13). PPB-implemented:
 *   GET  /api/v1/rooms                 → room list (paginated)
 *   GET  /api/v1/rooms/{room_id}       → room detail
 *   POST /api/v1/rooms/{room_id}/chat  → send chat { content }
 *   GET  /api/v1/rooms/{room_id}/history → round history
 *   POST /api/v1/rooms/{room_id}/actions → host action { action, args }
 *
 * Chat history is loaded over REST; new messages may also arrive over the live
 * room stream.
 */

function emptyRooms(): Paginated<Room> {
  return { items: [], total: 0, page: 1, pageNum: 50 }
}

/** Reactive room list. `query` re-runs the fetch on change. */
export function useRoomList(query: MaybeRefOrGetter<RoomListParams>) {
  const params = computed(() => ({ pageNum: 50, ...toValue(query) }))
  const path = computed(() => withQuery('/api/v1/rooms', params.value))

  const { data, error, pending, refresh } = useFetch<Paginated<Room>>(path, {
    baseURL: getApiBase(),
    credentials: 'include',
    retry: 0,
    server: false,
    lazy: true,
    default: emptyRooms,
    // PPB may pass PMP `room.list` through verbatim (bare array / {rooms} /
    // {results} with PMP field names) — normalize to `Paginated<Room>`.
    transform: raw => normalizeRoomListResponse(raw, params.value),
  })

  const rooms = computed(() => data.value?.items ?? [])

  return { rooms, total: computed(() => data.value?.total ?? 0), error, pending, refresh }
}

/** Single room detail. */
export function useRoom(roomUuid: MaybeRefOrGetter<string>) {
  const path = computed(() => `/api/v1/rooms/${encodeURIComponent(toValue(roomUuid))}`)
  const { data, error, pending, refresh } = useFetch<Room>(path, {
    baseURL: getApiBase(),
    credentials: 'include',
    retry: 0,
    server: false,
    lazy: true,
    // Detail also flows through PMP passthrough — normalize field names.
    transform: raw => normalizeRoom(raw),
  })
  return { room: data, error, pending, refresh }
}

/**
 * Room chat — SEND via REST, RECEIVE via the live WS.
 *
 * PPB OpenAPI registers only `POST /rooms/{room_id}/chat`; there is no REST
 * history endpoint. Live messages arrive over the room WS (`/ws/v1/rooms/{id}/live`,
 * contract §4/§12) — the Live tab consumes those. This returns an empty list so
 * the chat panel renders a live/empty state instead of calling an unregistered
 * GET. (A future WS-driven chat history can populate this list reactively.)
 */
export function useRoomChat(roomUuid: MaybeRefOrGetter<string>): {
  messages: Ref<RoomChatMessage[]>
  error: Ref<unknown>
  pending: Ref<boolean>
  refresh: () => Promise<void>
} {
  const path = computed(() => `/api/v1/rooms/${encodeURIComponent(toValue(roomUuid))}/chat`)
  const { data, error, pending, refresh: fetchHistory } = useFetch<unknown>(path, {
    baseURL: getApiBase(),
    credentials: 'include',
    retry: 0,
    server: false,
    lazy: true,
  })
  const messages = computed<RoomChatMessage[]>(() => {
    const raw = data.value
    const list = Array.isArray(raw)
      ? raw
      : raw && typeof raw === 'object'
        ? ((raw as Record<string, unknown>).items
          ?? (raw as Record<string, unknown>).messages
          ?? (raw as Record<string, unknown>).results)
        : []
    if (!Array.isArray(list))
      return []
    return list.flatMap((item): RoomChatMessage[] => {
      if (!item || typeof item !== 'object')
        return []
      const value = item as Record<string, unknown>
      const content = typeof value.content === 'string'
        ? value.content
        : typeof value.message === 'string' ? value.message : ''
      if (!content)
        return []
      const userId = typeof value.user_id === 'number'
        ? value.user_id
        : typeof value.phira_id === 'number'
          ? value.phira_id
          : typeof value.user === 'number' ? value.user : 0
      return [{
        user_id: userId,
        user_name: typeof value.user_name === 'string'
          ? value.user_name
          : typeof value.username === 'string' ? value.username : undefined,
        content,
        is_system: value.is_system === true || userId === 0,
        timestamp: typeof value.timestamp === 'string'
          ? value.timestamp
          : typeof value.created_at === 'string' ? value.created_at : undefined,
      }]
    })
  })
  async function refresh(): Promise<void> {
    await fetchHistory()
  }
  return { messages: messages as unknown as Ref<RoomChatMessage[]>, error, pending, refresh }
}

/** Normalize PMP `room.history` (`{room_id, rounds:[...]}`) into the stable PPF list. */
function normalizeRoomHistory(raw: unknown): RoomHistoryEntry[] {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null
  const list = Array.isArray(raw) ? raw : source?.rounds
  if (!Array.isArray(list))
    return []
  return list.flatMap((item): RoomHistoryEntry[] => {
    if (!item || typeof item !== 'object')
      return []
    const value = item as Record<string, unknown>
    const roundUuid = typeof value.round_uuid === 'string'
      ? value.round_uuid
      : typeof value.round_id === 'string' ? value.round_id : ''
    if (!roundUuid)
      return []
    const rawPlayers = Array.isArray(value.players)
      ? value.players
      : Array.isArray(value.results) ? value.results : []
    const players = rawPlayers.flatMap((rawPlayer): NonNullable<RoomHistoryEntry['players']> => {
      if (!rawPlayer || typeof rawPlayer !== 'object')
        return []
      const player = rawPlayer as Record<string, unknown>
      const phiraId = typeof player.phira_id === 'number'
        ? player.phira_id
        : typeof player.user === 'number'
          ? player.user
          : typeof player.player_id === 'number' ? player.player_id : 0
      if (!phiraId)
        return []
      return [{
        phira_id: phiraId,
        username: typeof player.username === 'string' ? player.username : undefined,
        score: typeof player.score === 'number' ? player.score : undefined,
      }]
    })
    return [{
      round_uuid: roundUuid,
      chart_id: typeof value.chart_id === 'number' ? value.chart_id : undefined,
      chart_name: typeof value.chart_name === 'string' ? value.chart_name : undefined,
      started_at: typeof value.started_at === 'string' ? value.started_at : undefined,
      ended_at: typeof value.ended_at === 'string'
        ? value.ended_at
        : typeof value.finished_at === 'string' ? value.finished_at : undefined,
      players,
    }]
  })
}

/** Round history for a room from the real PMP `room.history` proxy. */
export function useRoomHistory(roomUuid: MaybeRefOrGetter<string>) {
  const path = computed(() => `/api/v1/rooms/${encodeURIComponent(toValue(roomUuid))}/history`)
  const { data, error, pending, refresh } = useFetch<unknown>(path, {
    baseURL: getApiBase(),
    credentials: 'include',
    retry: 0,
    server: false,
    lazy: true,
  })
  const history = computed(() => normalizeRoomHistory(data.value))
  return { history, error, pending, refresh }
}

/** Send a chat message. Room id is in the path; PPB resolves the real phira_id (design §13.3). */
export async function sendRoomChat(roomId: string, content: string): Promise<void> {
  await apiFetch(`/api/v1/rooms/${encodeURIComponent(roomId)}/chat`, {
    method: 'POST',
    body: { content } satisfies ChatSendBody,
  })
}

/** Host control action (design §13.4). UI shows the control; PPB re-checks host each time. */
export async function sendHostAction(body: HostActionBody): Promise<void> {
  await apiFetch(`/api/v1/rooms/${encodeURIComponent(body.room_id)}/actions`, {
    method: 'POST',
    body: { action: body.action, args: body.args ?? {} },
  })
}

/**
 * Frozen host-action ids. UI visibility is advisory; PPB re-checks authorization.
 * NOTE (contract §22): `room.unlock` is removed — lock/unlock is `room.lock`
 * with `{ locked: bool }` (`locked:false` = unlock).
 */
export const HOST_ACTIONS = [
  'room.set_chart',
  'room.lock',
  'room.kick',
  'room.start',
  'room.cancel_start',
  'room.whitelist_add',
  'room.whitelist_remove',
] as const
