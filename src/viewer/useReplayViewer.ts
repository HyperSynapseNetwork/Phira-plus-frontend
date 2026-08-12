import type { MaybeRefOrGetter, Ref } from 'vue'
import type { ChartPlayer } from './loader'
import { onUnmounted, toValue } from 'vue'
import { getApiBase } from '~/utils/api/client'
import { loadWasm } from './loader'
import { fetchChartBlob, fetchReplayManifest, loadResourcePack, replayWsUrl } from './sources'

export type ReplayStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable'

export interface UseReplayViewerReturn {
  available: Ref<boolean>
  status: Ref<ReplayStatus>
  error: Ref<string | null>
  isPlaying: Ref<boolean>
  load: () => Promise<void>
  play: () => Promise<void>
  pause: () => void
  seek: (time: number) => void
  dispose: () => void
}

/**
 * `useReplayViewer()` — ChartPlayer-based Replay viewer (design §12.2 / §12.5,
 * contract §19 / P-86).
 *
 * Per P-86 the Replay viewer no longer fetches a `/replays/{round}/viewer`
 * blob. Instead it:
 *   1. `GET /api/v1/replays/{identifier}/manifest` → round `chart_id`
 *   2. `GET /api/v1/charts/{id}/viewer` → bincode `(ChartInfo, Chart)` blob
 *      → `ChartPlayer.load_chart_bytes`
 *   3. opens `WSS /ws/v1/replays/{round_uuid}` and parses the touches/judges
 *      JSON envelope (P-81) — best-effort in this pass.
 * `identifier` is the round_uuid, or the opaque share token (PPB resolves it).
 * No raw replay file download is offered (contract §12.2).
 */
export function useReplayViewer(
  roundUuid: MaybeRefOrGetter<string>,
  canvasRef: Ref<HTMLCanvasElement | null>,
): UseReplayViewerReturn {
  const available = ref(false)
  const status = ref<ReplayStatus>('idle')
  const error = ref<string | null>(null)
  const isPlaying = ref(false)
  const lowPerf = useLowPerformance().enabled

  let player: ChartPlayer | null = null
  let resourcePack: Record<string, Uint8Array> | null = null
  let rafId = 0
  let resizeObserver: ResizeObserver | null = null
  let playing = false
  let disposed = false
  let lastRenderAt = 0
  let replayWs: WebSocket | null = null

  function renderFrame(ts: number): void {
    if (disposed)
      return
    // Low-performance mode: cap at ~30fps (design §22.8).
    if (playing && player) {
      if (!lowPerf.value || ts - lastRenderAt >= 33) {
        lastRenderAt = ts
        player.render()
      }
    }
    rafId = requestAnimationFrame(renderFrame)
  }

  function startLoop(): void {
    if (rafId)
      return
    rafId = requestAnimationFrame(renderFrame)
  }

  function stopLoop(): void {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }

  function syncSize(): void {
    const canvas = canvasRef.value
    if (!canvas || !player)
      return
    player.resize(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight))
  }

  function connectReplayStream(identifier: string): void {
    if (!import.meta.client || replayWs)
      return
    try {
      const ws = new WebSocket(replayWsUrl(getApiBase(), identifier))
      replayWs = ws
      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(String(event.data)) as { type?: string }
          // JSON envelope (P-81): touches/judges/round_switch/resync/heartbeat.
          // This pass only asserts liveness — full per-player visuals await the
          // binary frame feed. No throw.
          void data
        }
        catch {
          // Ignore non-JSON frames.
        }
      })
    }
    catch {
      replayWs = null
    }
  }

  async function load(): Promise<void> {
    if (status.value === 'loading')
      return
    const identifier = String(toValue(roundUuid))
    if (!identifier)
      return
    status.value = 'loading'
    error.value = null
    try {
      const api = await loadWasm()
      if (!api) {
        status.value = 'unavailable'
        available.value = false
        return
      }
      available.value = true

      const canvas = canvasRef.value
      if (!canvas)
        throw new Error('canvas not ready')
      if (!canvas.id)
        canvas.id = `viewer-canvas-${Math.random().toString(36).slice(2, 10)}`
      if (!player)
        player = new api.ChartPlayer(canvas.id, getApiBase())

      resourcePack ??= await loadResourcePack()
      await player.load_resource_pack(resourcePack)

      // P-86: manifest → chart_id → chart blob (no replay viewer blob).
      const manifest = await fetchReplayManifest(getApiBase(), identifier)
      const chartId = manifest?.chart_id ?? manifest?.chart?.id
      if (!chartId) {
        status.value = 'error'
        error.value = 'viewer.replayNoData'
        return
      }

      const blob = await fetchChartBlob(getApiBase(), chartId)
      if (!blob) {
        status.value = 'error'
        error.value = 'viewer.replayNoData'
        return
      }

      await player.load_chart_bytes(blob)
      player.set_time(0)
      status.value = 'ready'
      syncSize()
      resizeObserver?.disconnect()
      resizeObserver = new ResizeObserver(() => syncSize())
      resizeObserver.observe(canvas)

      // Best-effort replay stream (touches/judges JSON, P-81/P-86).
      connectReplayStream(identifier)
    }
    catch {
      status.value = 'error'
      error.value = 'viewer.replayNoData'
    }
  }

  async function play(): Promise<void> {
    if (!player || status.value !== 'ready')
      return
    try {
      await player.resume()
      playing = true
      isPlaying.value = true
      startLoop()
    }
    catch {
      // Best-effort — the WASM scene may be mid-reset.
    }
  }

  function pause(): void {
    playing = false
    isPlaying.value = false
    stopLoop()
    if (player)
      void player.pause()
  }

  function seek(time: number): void {
    if (player)
      player.set_time(time)
  }

  function dispose(): void {
    if (disposed)
      return
    disposed = true
    stopLoop()
    resizeObserver?.disconnect()
    resizeObserver = null
    if (replayWs) {
      replayWs.close()
      replayWs = null
    }
    if (player)
      void player.pause()
    player = null
  }

  onUnmounted(dispose)

  return { available, status, error, isPlaying, load, play, pause, seek, dispose }
}
