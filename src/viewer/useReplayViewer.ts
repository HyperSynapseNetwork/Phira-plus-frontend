import type { MaybeRefOrGetter, Ref } from 'vue'
import type { ChartPlayer } from './loader'
import { onUnmounted, toValue } from 'vue'
import { getApiBase } from '~/utils/api/client'
import { loadWasm } from './loader'
import { fetchChartBlob, fetchReplayFrames, fetchReplayManifest, loadResourcePack, resolveReplayShare } from './sources'

export type ReplayStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable'

export interface ReplayAnalysis {
  touches: number
  judges: number
  matched: number
  unmatched: number
  meanOffsetMs: number | null
  buckets: Array<{ key: string, count: number }>
}

export interface UseReplayViewerReturn {
  available: Ref<boolean>
  status: Ref<ReplayStatus>
  error: Ref<string | null>
  isPlaying: Ref<boolean>
  analysis: Ref<ReplayAnalysis | null>
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
  playerPhiraId?: MaybeRefOrGetter<number | undefined>,
  shareToken?: MaybeRefOrGetter<string | undefined>,
): UseReplayViewerReturn {
  const available = ref(false)
  const status = ref<ReplayStatus>('idle')
  const error = ref<string | null>(null)
  const isPlaying = ref(false)
  const analysis = ref<ReplayAnalysis | null>(null)
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
    let round = String(toValue(roundUuid) ?? '')
    let playerId = playerPhiraId === undefined ? undefined : toValue(playerPhiraId)
    const token = shareToken === undefined ? undefined : toValue(shareToken)
    if (!round && !token)
      return
    status.value = 'loading'
    error.value = null
    analysis.value = null
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

      if (token) {
        const resolved = await resolveReplayShare(getApiBase(), token)
        if (!resolved)
          throw new Error('share unavailable')
        round = resolved.round_uuid
        playerId = resolved.player_phira_id
      }

      // Manifest carries the PMP-owned round→chart relationship.
      const manifest = await fetchReplayManifest(getApiBase(), round, playerId, token)
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
      if (playerId == null)
        throw new Error('player identity unavailable')
      const frames = await fetchReplayFrames(getApiBase(), round, playerId, token)
      if (!frames)
        throw new Error('Replay telemetry unavailable')

      const offsets: number[] = []
      let unmatched = 0
      for (const judge of frames.judges) {
        const expected = player.note_time(judge.line_id, judge.note_id)
        if (typeof expected !== 'number') {
          unmatched += 1
          continue
        }
        offsets.push((judge.time - expected) * 1000)
        player.push_replay_judge(judge.time, judge.line_id, judge.note_id, judge.judgement)
      }
      const bucketCounts = [0, 0, 0, 0, 0]
      for (const offset of offsets) {
        const index = offset < -90 ? 0 : offset < -45 ? 1 : offset <= 45 ? 2 : offset <= 90 ? 3 : 4
        bucketCounts[index] = (bucketCounts[index] ?? 0) + 1
      }
      analysis.value = {
        touches: frames.touches.length,
        judges: frames.judges.length,
        matched: offsets.length,
        unmatched,
        meanOffsetMs: offsets.length ? offsets.reduce((sum, value) => sum + value, 0) / offsets.length : null,
        buckets: ['early_90', 'early_45', 'center', 'late_45', 'late_90'].map((key, index) => ({ key, count: bucketCounts[index] ?? 0 })),
      }
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

  return { available, status, error, isPlaying, analysis, load, play, pause, seek, dispose }
}
