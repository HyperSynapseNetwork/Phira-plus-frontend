# Phira+ Tauri 2 shell (Phase D scaffold)

This directory is a **Phase D scaffold** for the Phira+ desktop/mobile app
(design §17). It is **config/stub only** — it does not compile locally and is
validated by review, not by running Cargo/Tauri.

## What this is

- A Tauri 2 project layout (`Cargo.toml`, `build.rs`, `tauri.conf.json`,
  `capabilities/`, `src/`) for **Windows + Android**.
- The web content is the **Nuxt 3 SSG site** in this repo. `tauri.conf.json`
  points `frontendDist` at `../.output/public` (the SSG output), so the Tauri
  window simply hosts the pre-rendered site.
- A **native adapter** (`src/native_adapter.rs`) with stub commands for secure
  credential storage, remote push registration, local notifications, device
  preferences, deep links and lifecycle events.

## Frontend

Run the normal Nuxt pipeline to produce the static site:

```bash
pnpm install
pnpm generate     # or `pnpm build` → .output/public
```

The frontend must exist at `.output/public` before a Tauri build can embed it.
`beforeDevCommand` / `beforeBuildCommand` are intentionally **empty**: the
frontend is never built by Tauri.

## Running locally

The local native toolchain is broken; do **not** attempt `cargo tauri dev`
until the Owner fixes it. Once fixed:

```bash
pnpm dev                 # terminal 1 — Nuxt dev server on :3000
cargo tauri dev --manifest-path src-tauri/Cargo.toml
```

`devUrl` is `http://localhost:3000`.

## Remote push (design §14.7) — pending Owner credentials

Full-exit remote push needs platform native integration:

| Platform | Service  | Owner must provide                                        |
| -------- | -------- | --------------------------------------------------------- |
| Windows  | WNS      | Package SID + client secret, code-signing certificate     |
| Android  | FCM      | `google-services.json` (sender ID), signing keystore      |

Until those are supplied, `register_remote_push` is a stub that only logs, and
the browser Web Push channel (`src/public/sw.js` + `src/plugins/push.client.ts`)
remains the active push path.

## CI notes

Packaging is **CI-only** and gated on the Owner providing signing keys (see
`bundle.windows` / `bundle.android` in `tauri.conf.json`). Icons are
Owner-provided — see `icons/README.md`.

## Gotchas

- This crate is **standalone** (no `[workspace]` in `Cargo.toml`) and lives
  outside the `viewer/` WASM workspace, so it cannot interfere with it.
- Never run `cargo`/`tauri` locally; config is validated by review.
