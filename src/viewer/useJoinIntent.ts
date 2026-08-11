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
 * NOTE (contract proposal): these are proposed REST mappings of the frozen
 * `/api/v1/rooms/*` namespace (contracts README §18). PPB may adjust them;
 * every call here catches failures and never throws to the UI, so an unready
 * PPB degrades to a graceful `error`/`expired` state.
 *   POST /api/v1/rooms/{room_uuid}/join-intent                    → create
 *   POST /api/v1/rooms/{room_uuid}/join-intent/{intent_id}/cancel → cancel
 */

/** Short-lived join intent created by PPB (local interface, not a frozen type). */
export interface JoinIntent {
  intent_id: string
  room_uuid: string
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

  async function requestJoin(roomUuid: string): Promise<JoinIntentResult> {
    status.value = 'requesting'
    errorMessage.value = null
    try {
      const res = await apiFetch<JoinIntent>(`/api/v1/rooms/${encodeURIComponent(roomUuid)}/join-intent`, {
        method: 'POST',
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
    const id = intentId ?? intent.value?.intent_id
    const roomUuid = intent.value?.room_uuid
    if (!id || !roomUuid) {
      reset()
      return
    }
    try {
      await apiFetch(`/api/v1/rooms/${encodeURIComponent(roomUuid)}/join-intent/${encodeURIComponent(id)}/cancel`, {
        method: 'POST',
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
