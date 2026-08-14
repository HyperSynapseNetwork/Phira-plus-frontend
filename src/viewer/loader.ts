/**
 * WASM viewer loader (design §12.8).
 *
 * The wasm-pack `--target web` ESM bundle (`/viewer/monitor_client.js`) is a
 * CI artifact: it only exists in `src/public/viewer/` after a `wasm-pack`
 * build, so it is absent in dev and during SSG prerender. We always load it
 * with a *dynamic* import of a *variable* specifier — Vite/Rollup then leave
 * it as a native `import()` instead of trying to bundle it, and a missing
 * artifact surfaces as a runtime 404 that we catch here and degrade to
 * `null` ("preview unavailable") without ever breaking the SSG build.
 */

/** Nominal preview duration (seconds) used to map the 0..1 seek range — the WASM API exposes no duration getter. */
export const VIEWER_NOMINAL_DURATION = 300

/** Chart metadata returned by `load_chart` / `load_chart_bytes`. */
export interface ChartInfoJson {
  name?: string
  composer?: string
  charter?: string
  level?: string
  difficulty?: number
  offset?: number
  format?: string
  [key: string]: unknown
}

/** Instance API of the wasm-bindgen `ChartPlayer` export (typed loosely). */
declare class ChartPlayer {
  constructor(canvasId: string, apiBase?: string)
  pause(): Promise<void>
  resume(): Promise<void>
  set_time(time: number): void
  set_autoplay(flag: boolean): void
  note_time(lineId: number, noteId: number): number | undefined
  push_replay_judge(time: number, lineId: number, noteId: number, judgement: string): void
  render(): void
  resize(width: number, height: number): void
  load_chart(id: string): Promise<ChartInfoJson>
  load_chart_bytes(bytes: Uint8Array): Promise<ChartInfoJson>
  load_resource_pack(files: Record<string, Uint8Array>): Promise<void>
}

/** Instance API of the wasm-bindgen `GameMonitor` export (typed loosely). */
declare class GameMonitor {
  constructor(wsUrl: string, apiBase: string)
  join_room(roomId: string): void
  leave_room(): void
  attach_canvas(userId: number, canvasId: string): Promise<void>
  detach_canvas(userId: number): void
  resize_scene(userId: number, width: number, height: number): void
  destroy_scene(userId: number): void
  start_all_scenes(): void
  get_selected_chart_id(): number | null
  tick(timestamp: number): void
  is_connected(): boolean
  close(): void
  feed_chart_bytes(bytes: Uint8Array): void
  load_scene_resource_pack(userId: number, files: Record<string, Uint8Array>): Promise<void>
  resume_audio(): void
}

export type { ChartPlayer, GameMonitor }

/** Constructors exposed by the WASM module, after `init()` resolves. */
export interface WasmViewerApi {
  ChartPlayer: typeof ChartPlayer
  GameMonitor: typeof GameMonitor
}

/** Shape of the dynamically-imported wasm module. */
interface ViewerModule {
  default: () => Promise<unknown>
  ChartPlayer: typeof ChartPlayer
  GameMonitor: typeof GameMonitor
}

/** The wasm-pack ESM entry, served from the static public dir. */
const VIEWER_ENTRY: string = '/viewer/monitor_client.js'

let wasmPromise: Promise<WasmViewerApi | null> | null = null

/**
 * Module-level availability flag. It is an object so the export stays `const`
 * (no mutable-binding export); consumers read `viewerUnavailable.value`.
 */
export const viewerUnavailable = { value: false }

async function initWasm(): Promise<WasmViewerApi | null> {
  if (!import.meta.client)
    return null
  try {
    const mod = (await import(/* @vite-ignore */ VIEWER_ENTRY)) as ViewerModule
    await mod.default()
    viewerUnavailable.value = false
    return {
      ChartPlayer: mod.ChartPlayer,
      GameMonitor: mod.GameMonitor,
    }
  }
  catch {
    viewerUnavailable.value = true
    return null
  }
}

/** Load the WASM viewer once (memoized). Resolves `null` when unavailable. */
export function loadWasm(): Promise<WasmViewerApi | null> {
  if (!wasmPromise)
    wasmPromise = initWasm()
  return wasmPromise
}

/** Resolve whether the WASM viewer bundle is available to load. */
export async function wasmAvailable(): Promise<boolean> {
  return (await loadWasm()) !== null
}
