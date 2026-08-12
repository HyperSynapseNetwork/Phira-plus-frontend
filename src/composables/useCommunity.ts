import type { Friend, FriendRequest, Paginated, UserProfile } from '~/utils/api/types'
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

/** Remove a friend (full friends lifecycle — Gate 4). */
export async function removeFriend(phiraId: number | string): Promise<void> {
  await apiFetch(`/api/v1/friends/${encodeURIComponent(String(phiraId))}/remove`, { method: 'POST' })
}

export async function blockUser(phiraId: number | string): Promise<void> {
  await apiFetch(`/api/v1/users/${encodeURIComponent(String(phiraId))}/block`, { method: 'POST' })
}
