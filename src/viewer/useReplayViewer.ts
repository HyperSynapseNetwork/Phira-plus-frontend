import type { MaybeRefOrGetter, Ref } from 'vue'
import type { ChartPlayer } from './loader'
import { onUnmounted, toValue } from 'vue'
import { getApiBase } from '~/utils/api/client'
import { loadWasm } from './loader'
import { fetchReplayBlob, loadResourcePack } from './sources'

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
 * `useReplayViewer()` — ChartPlayer-based Replay viewer (design §12.2 / §12.5).
 *
 * The replay WS stream (`/ws/v1/replays/{round_uuid}`) is a Phase-D+
 * capability that may be unready, so this pass renders the chart from the
 * PPB viewer blob via `ChartPlayer.load_chart_bytes` and exposes
 * play/pause/seek — the presentational viewer still renders the chart when the
 * blob is available. No raw replay file download is offered (contract §12.2).
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

  async function load(): Promise<void> {
    if (status.value === 'loading')
      return
    const uuid = String(toValue(roundUuid))
    if (!uuid)
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

      const blob = await fetchReplayBlob(getApiBase(), uuid)
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
    if (player)
      void player.pause()
    player = null
  }

  onUnmounted(dispose)

  return { available, status, error, isPlaying, load, play, pause, seek, dispose }
}
