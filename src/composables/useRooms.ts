import type { ChatSendBody, HostActionBody, Paginated, Room, RoomChatMessage, RoomHistoryEntry, RoomListParams } from '~/utils/api/types'
import { apiFetch, getApiBase } from '~/utils/api/client'
import { withQuery } from './useApi'

/**
 * Rooms (`/api/v1/rooms/*`, contract §1 / design §16.3 / §13). PPB-implemented:
 *   GET  /api/v1/rooms                 → room list (paginated)
 *   GET  /api/v1/rooms/{room_id}       → room detail
 *   POST /api/v1/rooms/{room_id}/chat  → send chat { content }
 *   GET  /api/v1/rooms/{room_id}/history → round history
 *   POST /api/v1/rooms/{room_id}/actions → host action { action, args }
 *
 * NOTE: PPB OpenAPI registers only `POST /rooms/{room_id}/chat` (send); chat
 * HISTORY is not REST-exposed — live messages arrive via the room WS
 * (`WSS /ws/v1/rooms/{room_id}/live`, contract §4/§12). See `useRoomChat`.
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
export function useRoomChat(_roomUuid: MaybeRefOrGetter<string>): {
  messages: Ref<RoomChatMessage[]>
  error: Ref<unknown>
  pending: Ref<boolean>
  refresh: () => Promise<void>
} {
  const messages = ref<RoomChatMessage[]>([])
  const error = ref<unknown>(null)
  const pending = ref(false)
  async function refresh(): Promise<void> {
    // No-op — chat history is live via the room WS, not REST.
  }
  return { messages, error, pending, refresh }
}

/**
 * Round history for a room (Gate 4 — real PMP `room.history`, proxied by PPB).
 * PROPOSED endpoint: `GET /api/v1/rooms/{uuid}/history`. Degrades to an empty
 * list while PPB is unready.
 */
export function useRoomHistory(roomUuid: MaybeRefOrGetter<string>) {
  const path = computed(() => `/api/v1/rooms/${encodeURIComponent(toValue(roomUuid))}/history`)
  const { data, error, pending, refresh } = useFetch<RoomHistoryEntry[]>(path, {
    baseURL: getApiBase(),
    credentials: 'include',
    retry: 0,
    server: false,
    lazy: true,
    default: () => [],
  })
  return { history: data, error, pending, refresh }
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
 * Proposed host-action ids (design §13.4 / contract §6). UI-only; server re-checks.
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
  'room.blacklist_add',
  'room.blacklist_remove',
] as const
