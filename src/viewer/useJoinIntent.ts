import { isApiError } from '~/composables/useApi'
import { apiFetch } from '~/utils/api/client'

/**
 * JoinIntent UX (design §14.6, contract §19 / P-86, Gate 4).
 *
 * The "进入房间" action does NOT assume Phira has a usable official deep link.
 * State machine:
 *   requesting → waiting (intent created, waiting for user.online)
 *             → user_online → moving → completed
 *             → failed | expired | error
 *
 * Flow:
 *   1. user confirms join → `POST /api/v1/me/join-intents { room_id }`
 *   2. PPF/Tauri prompts the user to launch / switch to the HSN Phira+ client
 *   3. PPB watches PMP `user.online` and calls `room.force_move` → user lands
 *   4. expired / cancelled → PPB cleans the intent up
 *
 * We poll `GET /api/v1/me/join-intents/{id}` (PROPOSED) for the server-side
 * transition to `user_online` / `moving` / `completed` / `failed` / `expired`.
 * Creating a new intent SUPERSEDES any active one (server-side); the client
 * resets its local state first. A `force_move` failure is surfaced (never
 * silently swallowed). Every call catches failures so an unready PPB degrades
 * gracefully.
 */

/** Short-lived join intent created by PPB (local interface, not a frozen type). */
export interface JoinIntent {
  id: string
  room_id: string
  expires_at: string
  prompt?: string
}

/** Server-reported intent status (proposed `/api/v1/me/join-intents/{id}`). */
export interface JoinIntentStatusResponse {
  id: string
  status?: 'pending' | 'user_online' | 'moving' | 'completed' | 'failed' | 'expired'
  error?: string
  room_id?: string
}

export interface JoinIntentResult {
  ok: boolean
  intent?: JoinIntent
  error?: string
}

export type JoinIntentStatus
  = | 'idle'
    | 'requesting'
    | 'waiting'
    | 'user_online'
    | 'moving'
    | 'completed'
    | 'failed'
    | 'expired'
    | 'error'

const POLL_MS = 2000

export function useJoinIntent() {
  const intent = ref<JoinIntent | null>(null)
  const status = ref<JoinIntentStatus>('idle')
  const errorMessage = ref<string | null>(null)
  /** Seconds until `expires_at`, ticking every second while active. */
  const countdown = ref(0)

  let countdownTimer: ReturnType<typeof setInterval> | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null

  function stopTimers(): void {
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function startCountdown(expiresAt: string): void {
    if (countdownTimer)
      clearInterval(countdownTimer)
    const end = new Date(expiresAt).getTime()
    if (Number.isNaN(end)) {
      countdown.value = 0
      return
    }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000))
      countdown.value = remaining
      if (remaining <= 0) {
        status.value = 'expired'
        stopTimers()
      }
    }
    tick()
    countdownTimer = setInterval(tick, 1000)
  }

  const TERMINAL: JoinIntentStatus[] = ['completed', 'failed', 'expired']

  async function pollStatus(): Promise<void> {
    const id = intent.value?.id
    if (!id || TERMINAL.includes(status.value))
      return
    try {
      const res = await apiFetch<JoinIntentStatusResponse>(`/api/v1/me/join-intents/${encodeURIComponent(id)}`)
      const s = res.status
      if (s === 'user_online') {
        status.value = 'user_online'
      }
      else if (s === 'moving') {
        status.value = 'moving'
      }
      else if (s === 'completed') {
        status.value = 'completed'
        stopTimers()
      }
      else if (s === 'failed') {
        status.value = 'failed'
        // force_move failure is surfaced, not silently swallowed.
        errorMessage.value = res.error || 'joinIntent.forceMoveFailed'
        stopTimers()
      }
      else if (s === 'expired') {
        status.value = 'expired'
        stopTimers()
      }
    }
    catch {
      // Poll is best-effort; the countdown TTL still expires the intent locally.
    }
  }

  function startPolling(): void {
    stopTimers()
    pollTimer = setInterval(() => void pollStatus(), POLL_MS)
  }

  function reset(): void {
    stopTimers()
    intent.value = null
    status.value = 'idle'
    errorMessage.value = null
    countdown.value = 0
  }

  async function requestJoin(roomId: string): Promise<JoinIntentResult> {
    // Supersede any active intent (PPB also replaces it server-side).
    if (intent.value?.id)
      await cancelJoin(intent.value.id)
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
      startPolling()
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
    stopTimers()
    if (!id) {
      intent.value = null
      status.value = 'idle'
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
      intent.value = null
      status.value = 'idle'
      errorMessage.value = null
      countdown.value = 0
    }
  }

  onScopeDispose(stopTimers)

  return { intent, status, errorMessage, countdown, requestJoin, cancelJoin, reset }
}
