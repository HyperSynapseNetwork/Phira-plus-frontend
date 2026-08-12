import type { MaybeRefOrGetter, Ref } from 'vue'
import type { ChartInfoJson, ChartPlayer, WasmViewerApi } from './loader'
import { onUnmounted, toValue, watch } from 'vue'
import { getApiBase } from '~/utils/api/client'
import { loadWasm } from './loader'
import { fetchChartBlob, loadResourcePack } from './sources'

export interface UseChartPlayerReturn {
  available: Ref<boolean>
  loading: Ref<boolean>
  error: Ref<string | null>
  info: Ref<ChartInfoJson | null>
  isPaused: Ref<boolean>
  volume: Ref<number>
  muted: Ref<boolean>
  lowPerf: Ref<boolean>
  play: () => Promise<void>
  pause: () => void
  seek: (time: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  toggleFullscreen: () => void
  togglePlay: () => Promise<void>
  loadAndPlay: () => Promise<boolean>
  dispose: () => void
}

/**
 * `useChartPlayer()` — WASM `ChartPlayer` wrapper for Chart Preview
 * (design §12.7 / §12.8). Lazily loads the wasm bundle, fetches the chart
 * blob and the default resource pack, then drives a rAF render loop while
 * playing.
 *
 * The canvas element must be in the DOM and carry an `id` when `loadAndPlay()`
 * is called (the component mounts it before the user clicks "Load preview").
 *
 * LIMITATION: the WASM `ChartPlayer` exposes no volume/gain API — `volume` and
 * `muted` are tracked locally only (for a future API); audio gain is not
 * controllable through the current WASM surface.
 */
export function useChartPlayer(
  chartId: MaybeRefOrGetter<number | string>,
  canvasRef: Ref<HTMLCanvasElement | null>,
): UseChartPlayerReturn {
  const available = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const info = ref<ChartInfoJson | null>(null)
  const isPaused = ref(true)
  const volume = ref(1)
  const muted = ref(false)
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
    // Low-performance mode: cap at ~30fps (design §22.8) in addition to the
    // 0.5 render scale applied in `syncSize()`.
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
    const scale = lowPerf.value ? 0.5 : 1
    player.resize(
      Math.max(1, Math.floor(canvas.clientWidth * scale)),
      Math.max(1, Math.floor(canvas.clientHeight * scale)),
    )
  }

  function ensurePlayer(api: WasmViewerApi): ChartPlayer {
    if (!player) {
      const canvas = canvasRef.value
      if (!canvas)
        throw new Error('canvas not ready')
      if (!canvas.id)
        canvas.id = `viewer-canvas-${Math.random().toString(36).slice(2, 10)}`
      player = new api.ChartPlayer(canvas.id, getApiBase())
      resizeObserver = new ResizeObserver(() => syncSize())
      resizeObserver.observe(canvas)
    }
    return player
  }

  async function loadAndPlay(): Promise<boolean> {
    if (loading.value)
      return false
    const id = String(toValue(chartId))
    if (!id || id === 'NaN')
      return false
    loading.value = true
    error.value = null
    try {
      const api = await loadWasm()
      if (!api) {
        available.value = false
        return false
      }
      available.value = true

      const p = ensurePlayer(api)
      resourcePack ??= await loadResourcePack()
      await p.load_resource_pack(resourcePack)

      const blob = await fetchChartBlob(getApiBase(), id)
      if (!blob) {
        error.value = 'viewer.noBlob'
        return false
      }

      info.value = await p.load_chart_bytes(blob)
      p.set_autoplay(true)
      playing = true
      isPaused.value = false
      syncSize()
      await p.resume()
      startLoop()
      return true
    }
    catch {
      error.value = 'viewer.error'
      playing = false
      isPaused.value = true
      return false
    }
    finally {
      loading.value = false
    }
  }

  async function play(): Promise<void> {
    if (!player || !available.value)
      return
    try {
      await player.resume()
      playing = true
      isPaused.value = false
      startLoop()
    }
    catch {
      // Best-effort — the WASM scene may be mid-reset.
    }
  }

  function pause(): void {
    playing = false
    isPaused.value = true
    stopLoop()
    if (player)
      void player.pause()
  }

  function seek(time: number): void {
    if (player)
      player.set_time(time)
  }

  async function togglePlay(): Promise<void> {
    if (playing)
      pause()
    else
      await play()
  }

  function setVolume(v: number): void {
    volume.value = Math.min(1, Math.max(0, v))
  }

  function toggleMute(): void {
    muted.value = !muted.value
  }

  function toggleFullscreen(): void {
    const el = canvasRef.value?.parentElement ?? canvasRef.value
    if (!el)
      return
    if (document.fullscreenElement)
      void document.exitFullscreen()
    else
      void el.requestFullscreen()
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

  watch(lowPerf, () => syncSize())
  onUnmounted(dispose)

  return {
    available,
    loading,
    error,
    info,
    isPaused,
    volume,
    muted,
    lowPerf,
    play,
    pause,
    seek,
    setVolume,
    toggleMute,
    toggleFullscreen,
    togglePlay,
    loadAndPlay,
    dispose,
  }
}
