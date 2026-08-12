/**
 * Data-source adapters for the WASM viewer (design §12.8).
 *
 * ChartSource / LiveSource / ReplaySource separate *where* chart data comes
 * from so the renderer / audio / time / resource cores stay shared. The Rust
 * zip→bincode chart parser is NOT yet in the WASM build, so the PPB viewer
 * endpoints below (proposed, not yet frozen) are the source of the raw
 * bincode `(ChartInfo, Chart)` blobs; any failure degrades to "preview
 * unavailable" rather than a client-side parse.
 */

/** Committed default resource-pack files under `/viewer/respack/default/`. */
const RESOURCE_PACK_FILES = [
  'info.yml',
  'click.png',
  'click.ogg',
  'click_mh.png',
  'drag.png',
  'drag.ogg',
  'drag_mh.png',
  'flick.png',
  'flick.ogg',
  'flick_mh.png',
  'hold.png',
  'hold.ogg',
  'hold_mh.png',
  'hit_fx.png',
] as const

/**
 * ChartSource — raw bincode chart blob for the Chart Player.
 *
 * PROPOSED endpoint (not frozen): `GET {apiBase}/api/v1/charts/{id}/viewer`
 * returns the `(ChartInfo, Chart)` bincode blob consumed by
 * `ChartPlayer.load_chart_bytes`. Client-side zip→bincode parsing is a future
 * step (the Rust parser is not in the WASM build yet); for now the PPB viewer
 * endpoint is the source and failures degrade to "preview unavailable".
 */
export async function fetchChartBlob(apiBase: string, chartId: number | string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(`${apiBase}/api/v1/charts/${encodeURIComponent(String(chartId))}/viewer`)
    if (!res.ok)
      return null
    return new Uint8Array(await res.arrayBuffer())
  }
  catch {
    return null
  }
}

/**
 * LiveSource — WebSocket URL for a room's live stream.
 * Contract P-82: Live WS uses the ROOM ID (matching the PMP stream `room`
 * field), NOT the shareable room_uuid → `WSS /ws/v1/rooms/{room_id}/live`.
 */
export function liveWsUrl(apiBase: string, roomId: string): string {
  const wsBase = apiBase.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:').replace(/\/$/, '')
  return `${wsBase}/ws/v1/rooms/${encodeURIComponent(roomId)}/live`
}

/**
 * ReplaySource — WebSocket URL for a replay stream.
 * Contract P-82: Replay WS uses the ROUND UUID → `WSS /ws/v1/replays/{round_uuid}`.
 */
export function replayWsUrl(apiBase: string, roundUuid: string): string {
  const wsBase = apiBase.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:').replace(/\/$/, '')
  return `${wsBase}/ws/v1/replays/${encodeURIComponent(roundUuid)}`
}

/**
 * ReplaySource — round manifest (contract §19, P-86).
 *
 * `GET /api/v1/replays/{round_uuid}/manifest` returns the round metadata,
 * including the `chart_id` the ReplayViewer uses to fetch the chart blob
 * (`GET /api/v1/charts/{id}/viewer`) and the identifiers for the replay WS.
 * The `identifier` is normally the round_uuid; for a share link it may be the
 * opaque share token (PPB resolves it — see §10/§19).
 */
export interface ReplayManifest {
  round_uuid?: string
  chart_id?: number | null
  chart?: { id?: number } | null
  [key: string]: unknown
}

export async function fetchReplayManifest(apiBase: string, identifier: string): Promise<ReplayManifest | null> {
  try {
    const res = await fetch(`${apiBase}/api/v1/replays/${encodeURIComponent(identifier)}/manifest`)
    if (!res.ok)
      return null
    return await res.json() as ReplayManifest
  }
  catch {
    return null
  }
}

/** Fetch the committed default resource pack into a filename→bytes map. Missing files are tolerated. */
export async function loadResourcePack(base = '/viewer/respack/default'): Promise<Record<string, Uint8Array>> {
  const files: Record<string, Uint8Array> = {}
  await Promise.all(RESOURCE_PACK_FILES.map(async (name) => {
    try {
      const res = await fetch(`${base}/${name}`)
      if (!res.ok)
        return
      files[name] = new Uint8Array(await res.arrayBuffer())
    }
    catch {
      // Tolerate missing / unreadable pack files.
    }
  }))
  return files
}
