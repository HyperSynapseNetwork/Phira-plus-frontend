/**
 * Data-source adapters for the WASM viewer (design §12.8).
 *
 * ChartSource / LiveSource / ReplaySource separate *where* chart data comes
 * from so the renderer / audio / time / resource cores stay shared. The Rust
 * zip→bincode chart parser is not in the WASM build, so the frozen PPB viewer
 * endpoint is the source of the raw bincode `(ChartInfo, Chart)` blob; any
 * failure renders preview unavailable rather than pretending an empty chart.
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
 * Frozen endpoint: `GET {apiBase}/api/v1/charts/{id}/viewer`
 * returns the `(ChartInfo, Chart)` bincode blob consumed by
 * `ChartPlayer.load_chart_bytes`. Client-side zip→bincode parsing is a future
 * step (the Rust parser is not in the WASM build); the PPB viewer endpoint is
 * the current source and failures render an explicit unavailable state.
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
 * Contract P-82/§20: Replay WS uses the ROUND UUID and is pinned to
 * `(round_uuid, player_phira_id)`. `playerPhiraId` defaults to the caller's own
 * phira_id (server-side) when omitted; the server pins it after auth, so the
 * client cannot read another player's frames with a spoofed id.
 */
export function replayWsUrl(apiBase: string, roundUuid: string, playerPhiraId?: number | string, shareToken?: string): string {
  const wsBase = apiBase.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:').replace(/\/$/, '')
  const base = `${wsBase}/ws/v1/replays/${encodeURIComponent(roundUuid)}`
  const query = new URLSearchParams()
  if (playerPhiraId != null)
    query.set('player_id', String(playerPhiraId))
  if (shareToken)
    query.set('token', shareToken)
  return query.size ? `${base}?${query}` : base
}

/**
 * ReplaySource — round manifest (contract §19, P-86 / §20).
 *
 * `GET /api/v1/replays/{round_uuid}/manifest` returns the round metadata,
 * pinned to the `(round_uuid, player_phira_id)` identity (generated
 * `ReplayManifest` schema). The `chart_id`/`chart` refinements below are what
 * the ReplayViewer uses to fetch the chart blob (`GET /api/v1/charts/{id}/viewer`);
 * the identifier is normally the round_uuid, or the opaque share token for a
 * share link (PPB resolves it — see §10/§19).
 */
export interface ReplayManifest {
  round_uuid?: string
  player_phira_id?: number
  chart_id?: number | null
  chart?: { id?: number } | null
  [key: string]: unknown
}

export async function fetchReplayManifest(
  apiBase: string,
  roundUuid: string,
  playerPhiraId?: number | string,
  shareToken?: string,
): Promise<ReplayManifest | null> {
  try {
    const query = new URLSearchParams()
    if (playerPhiraId != null)
      query.set('player_id', String(playerPhiraId))
    if (shareToken)
      query.set('token', shareToken)
    const suffix = query.size ? `?${query}` : ''
    const res = await fetch(`${apiBase}/api/v1/replays/${encodeURIComponent(roundUuid)}/manifest${suffix}`, { credentials: 'include' })
    if (!res.ok)
      return null
    return await res.json() as ReplayManifest
  }
  catch {
    return null
  }
}

export interface ResolvedReplayShare {
  round_uuid: string
  player_phira_id: number
}

export async function resolveReplayShare(apiBase: string, token: string): Promise<ResolvedReplayShare | null> {
  try {
    const res = await fetch(`${apiBase}/api/v1/replays/share/${encodeURIComponent(token)}`, { credentials: 'include' })
    if (!res.ok)
      return null
    return await res.json() as ResolvedReplayShare
  }
  catch {
    return null
  }
}

export interface ReplayJudgeFrame {
  time: number
  line_id: number
  note_id: number
  judgement: string
}

export interface ReplayFrames {
  round_uuid: string
  player_phira_id: number
  touches: Array<{ time: number, finger: number, x: number, y: number }>
  judges: ReplayJudgeFrame[]
}

export async function fetchReplayFrames(
  apiBase: string,
  roundUuid: string,
  playerPhiraId: number,
  shareToken?: string,
): Promise<ReplayFrames | null> {
  try {
    const query = new URLSearchParams({ player_id: String(playerPhiraId) })
    if (shareToken)
      query.set('token', shareToken)
    const res = await fetch(`${apiBase}/api/v1/replays/${encodeURIComponent(roundUuid)}/frames?${query}`, { credentials: 'include' })
    if (!res.ok)
      return null
    return await res.json() as ReplayFrames
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
