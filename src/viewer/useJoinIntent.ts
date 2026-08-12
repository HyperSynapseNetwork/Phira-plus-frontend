import { isApiError } from '~/composables/useApi'
import { apiFetch } from '~/utils/api/client'

/**
 * JoinIntent UX (design §14.6, contracts README §8 / §11).
 *
 * The "进入房间" action does NOT assume Phira has a usable official deep link.
 * Flow:
 *   1. user confirms join → PPB creates a short-lived `JoinIntent(user, room, expires_at)`
 *   2. PPF/Tauri prompts the user to launch / switch to the Phira+ client
 *   3. PPB watches PMP `user.online` and calls `room.force_move` → user lands in room
 *   4. expired / cancelled → PPB cleans the intent up
 *
 * NOTE (contract §19 / P-86): PPB implements the join-intent lifecycle under
 * `/api/v1/me/join-intents`. PPF uses these paths (NOT `/rooms/{uuid}/...`):
 *   POST   /api/v1/me/join-intents         { room_id }        → create
 *   DELETE /api/v1/me/join-intents/{id}                        → cancel
 * Every call catches failures and never throws to the UI, so an unready PPB
 * degrades to a graceful `error`/`expired` state.
 */

/** Short-lived join intent created by PPB (local interface, not a frozen type). */
export interface JoinIntent {
  id: string
  room_id: string
  expires_at: string
  prompt?: string
}

export interface JoinIntentResult {
  ok: boolean
  intent?: JoinIntent
  error?: string
}

export type JoinIntentStatus = 'idle' | 'requesting' | 'waiting' | 'expired' | 'error'

export function useJoinIntent() {
  const intent = ref<JoinIntent | null>(null)
  const status = ref<JoinIntentStatus>('idle')
  const errorMessage = ref<string | null>(null)
  /** Seconds until `expires_at`, ticking every second while `waiting`. */
  const countdown = ref(0)

  let timer: ReturnType<typeof setInterval> | null = null

  function stopTimer(): void {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function startCountdown(expiresAt: string): void {
    stopTimer()
    const end = new Date(expiresAt).getTime()
    if (Number.isNaN(end)) {
      // No reliable expiry — stay `waiting`; PPB cleans up on its own TTL.
      countdown.value = 0
      return
    }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000))
      countdown.value = remaining
      if (remaining <= 0) {
        status.value = 'expired'
        stopTimer()
      }
    }
    tick()
    timer = setInterval(tick, 1000)
  }

  function reset(): void {
    stopTimer()
    intent.value = null
    status.value = 'idle'
    errorMessage.value = null
    countdown.value = 0
  }

  async function requestJoin(roomId: string): Promise<JoinIntentResult> {
    status.value = 'requesting'
    errorMessage.value = null
    try {
      // Contract §19 / P-86: POST /api/v1/me/join-intents { room_id }
      const res = await apiFetch<JoinIntent>('/api/v1/me/join-intents', {
        method: 'POST',
        body: { room_id: roomId },
        credentials: 'include',
      })
      intent.value = res
      status.value = 'waiting'
      startCountdown(res.expires_at)
      return { ok: true, intent: res }
    }
    catch (err) {
      status.value = 'error'
      const message = isApiError(err) ? err.message : (err instanceof Error ? err.message : String(err))
      errorMessage.value = message
      return { ok: false, error: message }
    }
  }

  async function cancelJoin(intentId?: string): Promise<void> {
    const id = intentId ?? intent.value?.id
    if (!id) {
      reset()
      return
    }
    try {
      // Contract §19 / P-86: DELETE /api/v1/me/join-intents/{id}
      await apiFetch(`/api/v1/me/join-intents/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
    }
    catch {
      // Best-effort cancel — local state resets regardless (PPB also TTL-expires).
    }
    finally {
      reset()
    }
  }

  onScopeDispose(stopTimer)

  return { intent, status, errorMessage, countdown, requestJoin, cancelJoin, reset }
}
