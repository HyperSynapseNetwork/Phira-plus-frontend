import type { MaybeRefOrGetter, Ref } from 'vue'
import type { GameMonitor } from './loader'
import { computed, onUnmounted, toValue, watch } from 'vue'
import { getApiBase } from '~/utils/api/client'
import { loadWasm } from './loader'
import { liveWsUrl, loadResourcePack } from './sources'

export type LiveStatus = 'connecting' | 'live' | 'reconnecting' | 'closed' | 'unavailable'

export interface UseGameMonitorReturn {
  status: Ref<LiveStatus>
  connected: Ref<boolean>
  connect: () => Promise<void>
  disconnect: () => void
  dispose: () => void
}

/**
 * `useGameMonitor()` — WASM `GameMonitor` wrapper for Live viewing
 * (design §12.6). The wasm monitor opens its own WebSocket internally; this
 * composable only drives `tick()` per rAF and polls `is_connected()` for the
 * status machine. A connection drop after first connect is surfaced as
 * `'reconnecting'` ("重新同步") per contract §4 sequence-gap / resync rules.
 *
 * The canvas element must carry an `id` when a scene is attached.
 * NOTE: `GameMonitor` auto-fetches the chart from `{apiBase}/chart/{id}` when
 * a room goes WaitingForReady — the Live tab does not need to supply the chart
 * blob in this pass.
 */
export function useGameMonitor(
  roomUuid: MaybeRefOrGetter<string>,
  canvasRef: Ref<HTMLCanvasElement | null>,
  playerUserId?: Ref<number | null>,
): UseGameMonitorReturn {
  const status = ref<LiveStatus>('connecting')
  const connected = computed(() => status.value === 'live')

  let monitor: GameMonitor | null = null
  let resourcePack: Record<string, Uint8Array> | null = null
  let rafId = 0
  let resizeObserver: ResizeObserver | null = null
  let attachedUserId: number | null = null
  let running = false
  let lastConnected = false
  let disposed = false

  function frame(ts: number): void {
    if (!running || disposed)
      return
    if (monitor) {
      monitor.tick(ts)
      const ok = monitor.is_connected()
      if (ok) {
        if (!lastConnected && status.value !== 'live')
          status.value = 'live'
        lastConnected = true
      }
      else if (lastConnected) {
        status.value = 'reconnecting'
        lastConnected = false
      }
    }
    rafId = requestAnimationFrame(frame)
  }

  function startLoop(): void {
    if (running)
      return
    running = true
    rafId = requestAnimationFrame(frame)
  }

  function stopLoop(): void {
    running = false
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }

  function syncSceneSize(uid: number): void {
    const canvas = canvasRef.value
    if (!monitor || !canvas)
      return
    monitor.resize_scene(uid, Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight))
  }

  function setupResizeObserver(uid: number): void {
    resizeObserver?.disconnect()
    const canvas = canvasRef.value
    if (!canvas)
      return
    resizeObserver = new ResizeObserver(() => syncSceneSize(uid))
    resizeObserver.observe(canvas)
  }

  async function attachScene(uid: number): Promise<void> {
    if (!monitor)
      return
    const canvas = canvasRef.value
    if (!canvas)
      return
    try {
      await monitor.attach_canvas(uid, canvas.id)
      resourcePack ??= await loadResourcePack()
      await monitor.load_scene_resource_pack(uid, resourcePack)
      attachedUserId = uid
      syncSceneSize(uid)
      setupResizeObserver(uid)
    }
    catch {
      // Scene attach is best-effort — Live still renders other players' scenes.
    }
  }

  async function syncAttach(): Promise<void> {
    if (!monitor)
      return
    const uid = playerUserId?.value ?? null
    const canvas = canvasRef.value
    if (uid == null || !canvas) {
      if (attachedUserId != null) {
        monitor.detach_canvas(attachedUserId)
        attachedUserId = null
      }
      resizeObserver?.disconnect()
      resizeObserver = null
      return
    }
    if (attachedUserId === uid)
      return
    if (attachedUserId != null)
      monitor.detach_canvas(attachedUserId)
    await attachScene(uid)
  }

  async function connect(): Promise<void> {
    if (disposed || monitor)
      return
    const apiBase = getApiBase()
    const uuid = String(toValue(roomUuid))
    status.value = 'connecting'
    lastConnected = false
    try {
      const api = await loadWasm()
      if (!api) {
        status.value = 'unavailable'
        return
      }
      const wsUrl = liveWsUrl(apiBase, uuid)
      monitor = new api.GameMonitor(wsUrl, apiBase)
      monitor.join_room(uuid)
      monitor.resume_audio()
      await syncAttach()
      monitor.start_all_scenes()
      startLoop()
    }
    catch {
      status.value = 'unavailable'
      stopLoop()
    }
  }

  function disconnect(): void {
    stopLoop()
    resizeObserver?.disconnect()
    resizeObserver = null
    attachedUserId = null
    if (monitor)
      monitor.close()
    monitor = null
    status.value = 'closed'
  }

  function dispose(): void {
    if (disposed)
      return
    disposed = true
    disconnect()
  }

  // React to player / canvas changes while connected.
  watch(canvasRef, () => void syncAttach(), { flush: 'post' })
  if (playerUserId)
    watch(playerUserId, () => void syncAttach())

  onUnmounted(dispose)

  return { status, connected, connect, disconnect, dispose }
}
