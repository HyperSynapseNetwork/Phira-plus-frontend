import type { NotificationInbox } from '~/utils/api/types'
import { apiFetch } from '~/utils/api/client'

/**
 * Notification Center (contract §8, design §16.7).
 * Proposed REST mappings of the frozen `/api/v1/notifications/*`:
 *   GET  /api/v1/notifications              → inbox (paginated + unread)
 *   POST /api/v1/notifications/{id}/read    → mark read
 *   POST /api/v1/notifications/{id}/dismiss → dismiss
 *   POST /api/v1/notifications/{id}/action  → run action (re-authed each time)
 *   POST /api/v1/notifications/{id}/input   → chat/text reply
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
export async function runNotificationAction(id: string, actionId: string): Promise<void> {
  await apiFetch(`/api/v1/notifications/${encodeURIComponent(id)}/action`, {
    method: 'POST',
    body: { action: actionId },
  })
}

/** Input reply (e.g. chat) — goes through PPB `room.chat_send` (contract §8/§12). */
export async function sendNotificationInput(id: string, text: string): Promise<void> {
  await apiFetch(`/api/v1/notifications/${encodeURIComponent(id)}/input`, {
    method: 'POST',
    body: { text },
  })
}
