# PPF Phase A — Scaffold + Foundation

> PPF = Phira+ Frontend: Nuxt 3 + Vue 3 + TypeScript + Vite **SSG** public site,
> later shared with a Tauri 2 (Windows + Android) app shell.
> Repo: `HyperSynapseNetwork/Phira-plus-frontend`, branch `main`.
> Author: PPF Agent (FireflyF09). Date: 2026-08-12.

## 1. Goal

Implement the Phase A scope defined in the PPF Agent brief, against the frozen
cross-repo contract (`contracts/README.md`, Contract-Freeze v0) and the V3
design spec (`DESIGN/PP-B-F-P_V3_总体设计规范.md` §3.2/§16/§21/§22/§23/§26.3).

All four local gates pass: `pnpm lint`, `pnpm vue-tsc`, `pnpm test`, `pnpm build`.

## 2. Stack & exact versions installed (for Main to freeze)

Design §3.2 / D5. **No `@heroui/vue`, no React runtime.** HeroUI is consumed as
`@heroui/styles` (framework-agnostic CSS/variant layer) + local Vue wrappers.

### Runtime dependencies (exact)
| Package | Version |
|---|---|
| `nuxt` | 3.21.11 |
| `vue` | 3.5.41 |
| `@heroui/styles` | 3.2.4 |
| `tailwindcss` | 4.3.3 |
| `@tailwindcss/vite` | 4.3.3 |
| `@nuxtjs/seo` | 3.1.0 |
| `@nuxt/image` | 1.11.0 |
| `@nuxtjs/i18n` | 9.5.6 |
| `@pinia/nuxt` | 0.11.2 |
| `pinia` | 3.0.4 |
| `@vueuse/nuxt` | 13.9.0 |
| `@vueuse/core` | 13.9.0 |
| `@tanstack/vue-virtual` | 3.13.35 |
| `@formkit/auto-animate` | 0.10.0 |
| `ofetch` | 1.5.1 |

### Dev dependencies (exact)
| Package | Version |
|---|---|
| `typescript` | 5.9.3 |
| `vue-tsc` | 3.3.9 |
| `@antfu/eslint-config` | 9.3.0 |
| `eslint` | 10.8.1 |
| `vitest` | 4.1.10 |
| `@vue/test-utils` | 2.4.11 |
| `@nuxt/test-utils` | 4.1.0 |
| `@vitejs/plugin-vue` | 6.0.8 |
| `@types/node` | 22.10.0 |

### Version-baseline notes (maintain shared baseline with Panel)
- **Nuxt 3 line** chosen (not Nuxt 4). Several latest modules require Nuxt 4's
  `@nuxt/kit ^4` — the Nuxt 3-compatible pins above were selected:
  `@pinia/nuxt@0.11.2`, `@nuxtjs/seo@3.1.0`, `@nuxt/image@1.11.0`,
  `@nuxtjs/i18n@9.5.6`, `@vueuse/nuxt@13.9.0`.
- **Tailwind v4** + `@tailwindcss/vite` directly (not `@nuxtjs/tailwindcss`,
  which pins Tailwind v3). `@heroui/styles@3.2.4` requires `tailwindcss >=4`.
- **TypeScript 5.9** (not 7.x — the Go-native tsc; vue-tsc 3.x peer needs `>=5`).
- **pnpm 11** settings live in `pnpm-workspace.yaml` (package.json `pnpm` field
  is ignored by pnpm 11). `allowBuilds` permits esbuild/sharp/vue-demi scripts.

## 3. What was built (Phase A scope)

1. **Nuxt 3 SSG scaffold** — `srcDir: 'src'`, `nitro.preset: 'static'`
   (server output off), `typescript.strict`, modules (pinia, seo, image, i18n,
   vueuse), `@tailwindcss/vite`, path alias `~`/`@` (default), `.env.example`.
2. **Design tokens + base layout** (§22) — `src/assets/css/main.css` imports
   `@heroui/styles` and defines PPF tokens (cyan accent `oklch(0.86 .14 197.5)`
   ≈ `#00F7FF`, atmosphere layer, content surface, glass primitives). Layout
   layers: `BackgroundLayer` (Atmosphere) → content surface → glass nav
   (`AppHeader` desktop / `MobileNav` bottom) → `ContextWindow` overlay.
   Reduced-motion / reduced-transparency / low-performance hooks
   (`usePreferences`, `useReducedTransparency`, `useLowPerformance`), all
   default OFF, driven by `data-*` attributes on `<html>`.
3. **Typed API client** — `src/utils/api/{types,errors,client}.ts` + `useApi()`
   composable. `$fetch`/`ofetch` with credentialed CORS to
   `NUXT_PUBLIC_API_BASE` (default `https://api-phira.htadiy.com`), frozen
   error envelope handling by `error.code`, pagination types, `paginate()`,
   capability helpers (`hasCapability`/`hasPmpCapability`).
4. **Auth pages** — `/login` delegates to the PPB auth gateway; client never
   sees Phira tokens. `/terms` standalone (not in main nav); login shows the
   terms/privacy agreement.
5. **Guest preferences** (§21.3) — `usePreferencesStore` (Pinia) + `useState`
   persistence, localStorage-backed, namespaced `common`/`ppf`/`device` for
   later per-field merge with account prefs. `PreferencesPanel` UI on `/profile`.
6. **Layout skeleton / IA** (§16.1) — Logo | 首页 | 房间 | 谱面 | 社区 +
   下载/通知/头像, mobile top bar + bottom nav, footer
   (Docs/GitHub/Terms/version placeholders), i18n zh default + en.
7. **Context Window base** (§22.4) — `useContextWindow` manager (depth ≤ 2) +
   `ContextWindow.vue` (Teleport overlay; mobile → bottom sheet / fullscreen).
   Skeleton only.
8. **CI** (§26.3) — `.github/workflows/build.yml`: frozen-lockfile install,
   ESLint, `vue-tsc`, vitest, Nuxt SSG build, link/static sanity.
   No Tauri pipelines (Phase D).
9. **Tests** — `tests/error-envelope.spec.ts`, `preferences.spec.ts`,
   `use-api.spec.ts`, `context-window.spec.ts` (17 tests). Vitest runs in
   `node` env with Nuxt auto-imports (`useState`, `watch`) stubbed in
   `tests/setup.ts`; the `environment: 'nuxt'` bootstrap was abandoned as
   fragile (failed to load the `nuxt` module under vitest 4 + Nuxt 3).

## 4. Contract issues / proposals (for Main to freeze)

1. **PPB auth gateway route (PROPOSAL).** `contracts/README.md` §1 lists
   `POST /api/v1/auth/phira/login` (API), but PPF needs a **gateway page URL**
   to link to. `/login` currently builds
   `${authBase}/auth/phira/login?return_to=<relative-path>`. Propose freezing:
   `GET https://api-phira.htadiy.com/auth/phira/login?return_to=...` (HTML
   gateway), with PPB whitelisting `return_to` (design §6.6 anti-open-redirect).
2. **`@intlify` version override (IMPLEMENTATION, frozen locally).**
   `@nuxtjs/i18n@9.5.6` pins `@intlify/shared@10.0.7`, but
   `@intlify/core-base@10.0.8` (via vue-i18n 10.0.8) requires
   `sanitizeTranslatedHtml`, which only exists in shared 10.0.8 → build error.
   Fixed via `pnpm-workspace.yaml` override `'@intlify/shared@10': 10.0.8`.
   This is a pnpm-workspace policy change — worth noting for the shared baseline.
3. **`trustPolicy: no-downgrade` NOT set (ENVIRONMENT, documented).** The
   npmmirror registry does not carry npm provenance attestation, so pnpm 11's
   `no-downgrade` policy rejects the lockfile locally. Reproducibility is
   guaranteed by the committed `pnpm-lock.yaml` + `--frozen-lockfile`.
   @antfu's `pnpm/yaml-enforce-settings` rule demanding the policy is disabled
   in `eslint.config.mjs`. If the Owner wants provenance enforcement in CI
   (registry.npmjs.org), re-enable there.
4. **i18n `restructureDir: false` (CONFIG).** @nuxtjs/i18n v9 defaults to the
   `restructureDir` layout (`<root>/i18n/...`); set to `false` so locale files
   stay in `srcDir/i18n/` (`langDir` relative to `srcDir`).
5. **No `output.server` in nitro (CONFIG).** Design §26.3 static target: the
   static preset implies no Nitro server output; `output: { server: false }`
   is not in Nuxt 3.21's typed `nitro.output`, so it was omitted.
6. **Tailwind v4 integration (NOTE for baseline).** Used `@tailwindcss/vite`
   directly. `@nuxtjs/tailwindcss` v6 pins `tailwindcss ~3.4` and was avoided.
   This differs from the audit §5 PPF stack wording, but satisfies
   design §3.4 (Tailwind v4 + `@heroui/styles`).

## 5. Local verification status

| Gate | Result |
|---|---|
| `pnpm install` | ✅ (pnpm 11.8.0, Node 22.23.1) |
| `pnpm lint` | ✅ 0 problems |
| `pnpm vue-tsc` | ✅ exit 0 |
| `pnpm test` | ✅ 17 tests / 4 files |
| `pnpm build` | ✅ 50 routes prerendered → `.output/public` |

Built output sanity: header/footer/nav render in SSG HTML, robots.txt +
sitemap generated, `/en/` locale pages render with `lang="en-US"`, `/404`
page renders, design tokens (accent oklch, glass blur, atmosphere) present in
the inlined CSS.

## 6. Things for Owner later

- Terms / privacy **body text** (placeholder on `/terms`).
- PPB `GET /api/v1/public/*` real payloads (home page uses a client-side
  `/public/meta` probe with graceful offline fallback).
- **Desktop Window** experiment (design §22.5): intentionally NOT implemented;
  default off.
- **PWA**: reserved (not re-confirmed for V3) — not implemented.
- Tauri Windows/Android pipelines: Phase D.
- analytics / cookie-consent provider (design §23.3): placeholder only.
- Visit counter / footer dynamic content: placeholder (`—`).
