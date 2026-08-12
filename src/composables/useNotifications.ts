import type { NotificationInbox } from '~/utils/api/types'
import { apiFetch } from '~/utils/api/client'

/**
 * Notification Center (contract §8, design §16.7).
 * PPB-implemented endpoints under `/api/v1/notifications/*`:
 *   GET  /api/v1/notifications              → inbox (paginated + unread)
 *   POST /api/v1/notifications/{id}/read    → mark read
 *   POST /api/v1/notifications/{id}/dismiss → dismiss
 *   POST /api/v1/notifications/{id}/action  → run action (elevated reauth)
 *   POST /api/v1/notifications/{id}/input   → chat/text reply (elevated reauth)
 *
 * `action`/`input` require an elevated reauth context (contract §20 / P11):
 * pass the `X-Reauth-Token` obtained from `POST /api/v1/auth/phira/reauth`.
 * Callers should wrap these in `useReauth().withReauth(...)`.
 */

function emptyInbox(): NotificationInbox {
  return { items: [], total: 0, page: 1, pageNum: 50, unread: 0 }
}

export function useNotifications() {
  const { data, error, pending, refresh } = useApiData<NotificationInbox>('ppf:notifications', '/api/v1/notifications', emptyInbox())
  return { inbox: data, error, pending, refresh }
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })
}

export async function dismissNotification(id: string): Promise<void> {
  await apiFetch(`/api/v1/notifications/${encodeURIComponent(id)}/dismiss`, { method: 'POST' })
}

/** Notification action — PPB re-authenticates every execution (contract §8). */
export async function runNotificationAction(id: string, actionId: string, reauthToken?: string): Promise<void> {
  await apiFetch(`/api/v1/notifications/${encodeURIComponent(id)}/action`, {
    method: 'POST',
    body: { action: actionId },
    headers: reauthToken ? { 'X-Reauth-Token': reauthToken } : {},
  })
}

/** Input reply (e.g. chat) — goes through PPB `room.chat_send` (contract §8/§12). */
export async function sendNotificationInput(id: string, text: string, reauthToken?: string): Promise<void> {
  await apiFetch(`/api/v1/notifications/${encodeURIComponent(id)}/input`, {
    method: 'POST',
    body: { text },
    headers: reauthToken ? { 'X-Reauth-Token': reauthToken } : {},
  })
}
