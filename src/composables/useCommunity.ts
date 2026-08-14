import type { Friend, FriendRequest, MyMultiplayerSummary, Paginated, UserProfile } from '~/utils/api/types'
import { apiFetch, getApiBase } from '~/utils/api/client'

/**
 * Community / Friends / Users (design §16.6, contract §1 `/api/v1/users/*`,
 * `/api/v1/friends/*`). PPB-implemented endpoints (see `generated.ts`):
 *   GET  /api/v1/users/{phira_id}              → public user profile
 *   GET  /api/v1/users/{phira_id}/stats        → public stats
 *   GET  /api/v1/friends                       → friend list (paginated)
 *   GET  /api/v1/friends/requests              → friend requests (paginated)
 *   POST /api/v1/friends/requests              → send friend request { phira_id }
 *   POST /api/v1/friends/requests/{id}/accept | /reject
 *   POST /api/v1/friends/{phira_id}/remove     → remove friend
 *   POST /api/v1/users/{phira_id}/block        → block user
 *
 * Friends are a peer relationship only — no chat in this namespace (design
 * §16.6). All friend mutations are CSRF-protected via `apiFetch`.
 */

function emptyList<T>(): Paginated<T> {
  return { items: [], total: 0, page: 1, pageNum: 50 }
}

export function useUserProfile(phiraId: MaybeRefOrGetter<number | string>) {
  const path = computed(() => `/api/v1/users/${encodeURIComponent(String(toValue(phiraId)))}`)
  const { data, error, pending, refresh } = useFetch<UserProfile>(path, {
    baseURL: getApiBase(),
    credentials: 'include',
    retry: 0,
    server: false,
    lazy: true,
  })
  return { user: data, error, pending, refresh }
}

export function useUserSearch(search: MaybeRefOrGetter<string>) {
  const query = computed(() => toValue(search).trim())
  const path = computed(() => `/api/v1/users?search=${encodeURIComponent(query.value)}&page=1&pageNum=20`)
  const { data, error, pending, refresh } = useFetch<unknown>(path, {
    baseURL: getApiBase(),
    credentials: 'include',
    retry: 0,
    server: false,
    lazy: true,
    immediate: false,
  })
  const users = computed<UserProfile[]>(() => {
    const raw = data.value
    const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null
    const list = Array.isArray(raw) ? raw : record && [record.items, record.results].find(Array.isArray)
    if (!Array.isArray(list))
      return []
    return list.flatMap((item): UserProfile[] => {
      if (!item || typeof item !== 'object')
        return []
      const value = item as Record<string, unknown>
      const phiraId = typeof value.phira_id === 'number'
        ? value.phira_id
        : typeof value.id === 'number' ? value.id : Number(value.id)
      const username = typeof value.username === 'string'
        ? value.username
        : typeof value.name === 'string' ? value.name : ''
      if (!Number.isFinite(phiraId) || !username)
        return []
      return [{
        phira_id: phiraId,
        username,
        avatar: typeof value.avatar === 'string' ? value.avatar : null,
        bio: typeof value.bio === 'string' ? value.bio : undefined,
      }]
    })
  })
  return { query, users, error, pending, refresh }
}

export function useFriendRequests() {
  return useApiData<Paginated<FriendRequest>>('ppf:friend-requests', '/api/v1/friends/requests', emptyList())
}

export function useFriendList() {
  return useApiData<Paginated<Friend>>('ppf:friends', '/api/v1/friends', emptyList())
}

export async function sendFriendRequest(phiraId: number | string): Promise<void> {
  await apiFetch('/api/v1/friends/requests', { method: 'POST', body: { phira_id: Number(phiraId) } })
}

export async function respondFriendRequest(requestId: string, action: 'accept' | 'reject'): Promise<void> {
  await apiFetch(`/api/v1/friends/requests/${encodeURIComponent(requestId)}/${action}`, { method: 'POST' })
}

export async function inviteFriendToRoom(phiraId: number | string, roomId: string): Promise<{ event_id: string, status: string }> {
  return apiFetch(`/api/v1/friends/${encodeURIComponent(String(phiraId))}/room-invite`, {
    method: 'POST',
    body: { room_id: roomId.trim() },
  })
}

/** Remove a friend (full friends lifecycle — Gate 4). */
export async function removeFriend(phiraId: number | string): Promise<void> {
  await apiFetch(`/api/v1/friends/${encodeURIComponent(String(phiraId))}/remove`, { method: 'POST' })
}

export async function blockUser(phiraId: number | string): Promise<void> {
  await apiFetch(`/api/v1/users/${encodeURIComponent(String(phiraId))}/block`, { method: 'POST' })
}

function emptyMultiplayer(): MyMultiplayerSummary {
  return {
    phira_id: 0, rounds_total: 0, completed_rounds: 0, rooms_visited: 0, playtime_ms: 0, recent_rounds: [],
  }
}

/** Authenticated multiplayer facts derived from durable PMP round history. */
export function useMyMultiplayer() {
  return useApiData<MyMultiplayerSummary>('ppf:my-multiplayer', '/api/v1/me/multiplayer', emptyMultiplayer())
}
