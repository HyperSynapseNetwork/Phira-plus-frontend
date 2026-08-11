# PPF WASM Viewer

Vendored from [HyperSynapseNetwork/phira-web-monitor](https://github.com/HyperSynapseNetwork/phira-web-monitor)
(`monitor-common` + `monitor-client`) plus a pinned snapshot of
`phira-mp-common`/`phira-mp-macros` (commit `c59f9868`) so the WASM viewer
builds **hermetically in CI** (no git dependency).

## Layout

```
viewer/
├── Cargo.toml            # workspace: monitor-common, monitor-client
├── phira-mp/
│   ├── Cargo.toml        # nested workspace: phira-mp-common, phira-mp-macros
│   ├── phira-mp-common/  # pinned snapshot (BinaryData / LiveEvent / TouchFrame / JudgeEvent)
│   └── phira-mp-macros/
├── monitor-common/       # chart data structures, bincode (ChartInfo, Chart), LiveEvent
└── monitor-client/       # WASM cdylib — ChartPlayer / GameMonitor (wasm-bindgen)
```

## Build (CI ONLY)

Local Rust toolchain is intentionally NOT used. CI job `wasm` runs:

```sh
wasm-pack build --target web --out-dir "$GITHUB_WORKSPACE/src/public/viewer" viewer/monitor-client
```

Output (ESM + `.wasm`) lands in `src/public/viewer/` and is uploaded as the
`viewer-wasm` GitHub Actions artifact. The TS integration layer
(`src/viewer/*`) imports it dynamically and degrades gracefully when the WASM
is absent (e.g. SSG builds without the artifact).

## WASM exports (from monitor-client)

- `init()` — wasm-bindgen bootstrap
- `ChartPlayer` — standalone chart preview:
  - `new(canvasId, apiBase?)`, `load_chart(id)`, `load_resource_pack(files)`
  - `resume()`, `pause()`, `set_time(t)`, `set_autoplay(bool)`
  - `resize(w, h)`, `render()`
- `GameMonitor` — live room monitoring:
  - `new(wsUrl, apiBase)`, `join_room(roomId)`, `leave_room()`
  - `attach_canvas(userId, canvasId)`, `detach_canvas(userId)`,
    `resize_scene(userId, w, h)`, `destroy_scene(userId)`
  - `start_all_scenes()`, `tick(performanceNow)`, `is_connected()`, `close()`
  - `load_scene_resource_pack(userId, files)`, `resume_audio()`

## Resource pack

Default note/audio assets live at `src/public/viewer/respack/default/*`
(fetched by the TS layer and passed via `load_resource_pack`).

## Contract notes

- Chart blob: bincode `(ChartInfo, Chart)` with varint encoding
  (`monitor-common`), same format as the web-monitor proxy `/chart/{id}`.
- Live frames: `LiveEvent` binary packets (`phira-mp-common` `decode_packet`),
  per contract §4.
- A fresh `Cargo.lock` should be committed once the Owner's Rust toolchain is
  repaired (CI regenerates it ephemerally for now).
