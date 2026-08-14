# Phira+ Tauri 2 shell

This directory contains the Phira+ Windows/Android desktop/mobile shell. Secure credential storage and production push identities remain release gates until verified on target devices.
The current source package has no Rust/Tauri toolchain, so native compilation
is performed by CI and remains a release gate.

## What this is

- A Tauri 2 project layout (`Cargo.toml`, `build.rs`, `tauri.conf.json`,
  `capabilities/`, `src/`) for **Windows + Android**.
- The web content is the **Nuxt 3 SSG site** in this repo. `tauri.conf.json`
  points `frontendDist` at `../.output/public` (the SSG output), so the Tauri
  window simply hosts the pre-rendered site.
- A **native adapter** (`src/native_adapter.rs`): local notification and device
  preference persistence are implemented; secure credential storage and remote
  push fail explicitly until their platform bridges/Owner credentials exist.
- Deep links and lifecycle events are forwarded by `src/lib.rs`.

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

Install a Rust/Tauri toolchain before running locally:

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

Until those are supplied, `register_remote_push` returns `NOT_CONFIGURED`, and
the browser Web Push channel (`src/public/sw.js` + `src/plugins/push.client.ts`)
remains the active push path.

## CI notes

Packaging is **CI-only** and gated on the Owner providing signing keys (see
`bundle.windows` / `bundle.android` in `tauri.conf.json`). Icons are
Owner-provided — see `icons/README.md`.

## Gotchas

- This crate is **standalone** (no `[workspace]` in `Cargo.toml`) and lives
  outside the `viewer/` WASM workspace, so it cannot interfere with it.
- Run `cargo check` and the platform Tauri builds in an environment that has
  the required Rust, WebView and Android/Windows SDK toolchains.
