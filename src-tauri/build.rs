// Tauri 2 build script — generates the embedded context from tauri.conf.json
// and the SSG frontend (`.output/public`).
//
// NOTE: this compiles only in CI or on a working native toolchain. Never run
// locally (the toolchain is broken). The frontend must be built first so that
// `../.output/public` exists before `tauri-build` runs.
fn main() {
    tauri_build::build()
}
