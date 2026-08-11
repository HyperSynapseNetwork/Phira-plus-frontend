import type { ChatSendBody, HostActionBody, Paginated, Room, RoomChatMessage, RoomListParams } from '~/utils/api/types'
import { apiFetch, getApiBase } from '~/utils/api/client'
import { withQuery } from './useApi'

/**
 * Rooms (`/api/v1/rooms/*`, contract §1 / design §16.3 / §13).
 *
 * NOTE (contract proposal): the specific sub-routes below are proposed REST
 * mappings of the frozen `/api/v1/rooms/*` namespace:
 *   GET  /api/v1/rooms                      → room list (paginated)
 *   GET  /api/v1/rooms/{room_uuid}          → room detail
 *   GET  /api/v1/rooms/{room_uuid}/chat     → chat history
 *   POST /api/v1/rooms/{room_uuid}/chat     → send chat { content }
 *   POST /api/v1/rooms/{room_uuid}/actions  → host action { action, args }
 * PPB may adjust; callers treat failures as graceful empty states.
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

/** Chat history for a room. */
export function useRoomChat(roomUuid: MaybeRefOrGetter<string>) {
  const path = computed(() => `/api/v1/rooms/${encodeURIComponent(toValue(roomUuid))}/chat`)
  const { data, error, pending, refresh } = useFetch<RoomChatMessage[]>(path, {
    baseURL: getApiBase(),
    credentials: 'include',
    retry: 0,
    server: false,
    lazy: true,
    default: () => [],
  })
  return { messages: data, error, pending, refresh }
}

/** Send a chat message. Client never supplies a trusted user_id (design §13.3). */
export async function sendRoomChat(body: ChatSendBody): Promise<void> {
  await apiFetch(`/api/v1/rooms/${encodeURIComponent(body.room_id)}/chat`, {
    method: 'POST',
    body: { content: body.content },
  })
}

/** Host control action (design §13.4). UI shows the control; PPB re-checks host each time. */
export async function sendHostAction(body: HostActionBody): Promise<void> {
  await apiFetch(`/api/v1/rooms/${encodeURIComponent(body.room_id)}/actions`, {
    method: 'POST',
    body: { action: body.action, args: body.args ?? {} },
  })
}

/** Proposed host-action ids (design §13.4 / contract §6). UI-only; server re-checks. */
export const HOST_ACTIONS = [
  'room.set_chart',
  'room.lock',
  'room.unlock',
  'room.kick',
  'room.start',
  'room.cancel_start',
  'room.whitelist_add',
  'room.whitelist_remove',
  'room.blacklist_add',
  'room.blacklist_remove',
] as const
