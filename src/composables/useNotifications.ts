import type { NotificationActionResult, NotificationInbox, NotificationInputResponse } from '~/utils/api/types'
import { apiFetch } from '~/utils/api/client'

/**
 * Notification Center (contract §8, design §16.7).
 * PPB-implemented endpoints under `/api/v1/notifications/*`:
 *   GET  /api/v1/notifications              → inbox (paginated + unread)
 *   POST /api/v1/notifications/{id}/read    → mark read
 *   POST /api/v1/notifications/{id}/dismiss → dismiss
 *   POST /api/v1/notifications/{id}/action  → typed action result
 *   POST /api/v1/notifications/{id}/input   → chat/text reply
 *
 * Social/navigation notification actions use session + CSRF + resource policy;
 * they do not borrow the admin/high-risk reauth plane.
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

/** Execute a server-frozen notification button by stable id. */
export async function runNotificationAction(id: string, actionId: string): Promise<NotificationActionResult> {
  return apiFetch<NotificationActionResult>(`/api/v1/notifications/${encodeURIComponent(id)}/action`, {
    method: 'POST',
    body: { action: actionId },
  })
}

/** Input reply (for notification types that explicitly expose input). */
export async function sendNotificationInput(id: string, text: string): Promise<NotificationInputResponse> {
  return apiFetch<NotificationInputResponse>(`/api/v1/notifications/${encodeURIComponent(id)}/input`, {
    method: 'POST',
    body: { text },
  })
}
