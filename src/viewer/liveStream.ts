import { getApiBase } from '~/utils/api/client'
import { liveWsUrl } from './sources'

/**
 * Live WS JSON client (contract P-81 / P-82).
 *
 * PPB emits a JSON envelope that mirrors the monitor-common `LiveEvent`
 * semantics: `touches` / `judges` / `state_change` / `user_join` /
 * `user_leave` / `message`, plus control signals `resync`, `round_switch` and
 * `heartbeat`. The exact JSON field names are still being frozen by PPB, so
 * this client types the envelope defensively (a `type` discriminator plus
 * optional fields) and normalizes the parts the UI needs:
 *
 *   - connection status machine: connecting → live → reconnecting → closed
 *   - sequence gap / resync → surfaces the `resync` flag (UI "重新同步")
 *   - round switch → `round` bumps
 *   - heartbeat → `heartbeatAt` freshness
 *   - player separation → `players` map keyed by player id
 *
 * The WASM per-player *visual* rendering awaits the binary
 * `TouchFrame/JudgeEvent` freeze (P-81) — this client owns the WS and exposes
 * parsed events so a future feed bridge can forward them to the WASM monitor.
 */

export type LiveStreamStatus = 'connecting' | 'live' | 'reconnecting' | 'closed' | 'unavailable'

/** Raw PPB JSON envelope (schema in flux — defensive typing). */
export interface LiveWsEnvelope {
  type: string
  [key: string]: unknown
}

export interface LiveStreamState {
  status: LiveStreamStatus
  state: string | null
  round: number | null
  resync: boolean
  resyncingAt: number | null
  heartbeatAt: number | null
  lastEventAt: number | null
  players: Record<number, { id: number, name?: string, monitor?: boolean }>
  touches: number
  judges: number
  error: string | null
}

/** Normalized event delivered to subscribers (e.g. a future WASM feed bridge). */
export interface LiveStreamEvent {
  type: string
  raw: LiveWsEnvelope
  at: number
}

export interface LiveStream {
  state: LiveStreamState
  connect: () => void
  disconnect: () => void
  dispose: () => void
}

const DEFAULT_STATE: LiveStreamState = {
  status: 'connecting',
  state: null,
  round: null,
  resync: false,
  resyncingAt: null,
  heartbeatAt: null,
  lastEventAt: null,
  players: {},
  touches: 0,
  judges: 0,
  error: null,
}

function copyState(s: LiveStreamState): LiveStreamState {
  return { ...s, players: { ...s.players } }
}

export function createLiveStream(roomId: string, onEvent?: (ev: LiveStreamEvent) => void): LiveStream {
  const state = reactive<LiveStreamState>(copyState(DEFAULT_STATE))

  let ws: WebSocket | null = null
  let manualClose = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let disposed = false

  function clearTimers(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function handleEnvelope(raw: LiveWsEnvelope): void {
    state.lastEventAt = Date.now()
    const type = raw.type

    // Normalize the envelope for the UI. All fields are defensive.
    switch (type) {
      case 'heartbeat': {
        state.heartbeatAt = Date.now()
        state.status = 'live'
        break
      }
      case 'state_change': {
        state.state = typeof raw.state === 'string' ? raw.state : state.state
        state.status = 'live'
        break
      }
      case 'round_switch': {
        state.round = typeof raw.round === 'number' ? raw.round : (state.round ?? 0) + 1
        state.resync = false
        state.status = 'live'
        break
      }
      case 'resync':
      case 'snapshot': {
        state.resync = true
        state.resyncingAt = Date.now()
        // Auto-clear the "重新同步" banner once live events resume.
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
        reconnectTimer = setTimeout(() => {
          state.resync = false
        }, 3000)
        state.status = 'live'
        break
      }
      case 'user_join': {
        const pid = Number(raw.user_id ?? raw.id)
        if (Number.isFinite(pid)) {
          state.players[pid] = {
            id: pid,
            name: typeof raw.name === 'string' ? raw.name : undefined,
            monitor: raw.monitor === true,
          }
        }
        state.status = 'live'
        break
      }
      case 'user_leave': {
        const pid = Number(raw.user_id ?? raw.user ?? raw.id)
        if (Number.isFinite(pid))
          delete state.players[pid]
        state.status = 'live'
        break
      }
      case 'touches': {
        if (typeof raw.frames === 'number' || Array.isArray(raw.frames))
          state.touches += Array.isArray(raw.frames) ? raw.frames.length : 1
        state.status = 'live'
        break
      }
      case 'judges': {
        if (typeof raw.judges === 'number' || Array.isArray(raw.judges))
          state.judges += Array.isArray(raw.judges) ? raw.judges.length : 1
        state.status = 'live'
        break
      }
      default:
        // 'auth' / 'join' / 'leave' / 'message' etc. — treated as liveness.
        state.status = 'live'
        break
    }

    onEvent?.({ type, raw, at: Date.now() })
  }

  function open(): void {
    if (disposed)
      return
    try {
      const wsUrl = liveWsUrl(getApiBase(), roomId)
      ws = new WebSocket(wsUrl)
      ws.addEventListener('open', () => {
        state.status = 'live'
      })
      ws.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(String(event.data)) as LiveWsEnvelope
          if (data && typeof data.type === 'string')
            handleEnvelope(data)
        }
        catch {
          // Non-JSON frame — ignore (binary frames may appear before the freeze).
        }
      })
      ws.addEventListener('close', () => {
        if (disposed || manualClose) {
          state.status = 'closed'
          return
        }
        state.status = 'reconnecting'
        if (reconnectTimer)
          clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(() => {
          if (!disposed && !manualClose)
            open()
        }, 2000)
      })
      ws.addEventListener('error', () => {
        state.error = 'live.wsError'
      })
    }
    catch {
      state.status = 'unavailable'
    }
  }

  function connect(): void {
    manualClose = false
    state.status = 'connecting'
    open()
    heartbeatTimer = setInterval(() => {
      // Heartbeat staleness (>15s without a frame) ⇒ likely gap → resync hint.
      if (state.lastEventAt && Date.now() - state.lastEventAt > 15_000 && state.status === 'live') {
        state.resync = true
        state.resyncingAt = Date.now()
      }
    }, 5000)
  }

  function disconnect(): void {
    manualClose = true
    clearTimers()
    if (ws) {
      ws.close()
      ws = null
    }
    state.status = 'closed'
  }

  function dispose(): void {
    if (disposed)
      return
    disposed = true
    disconnect()
  }

  return { state, connect, disconnect, dispose }
}
