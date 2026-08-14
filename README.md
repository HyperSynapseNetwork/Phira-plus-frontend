<div align="center">

# HSN Phira+ Frontend（PPF）

**HSN Phira+（Phira+ V3）三件套之一** · Nuxt 3 SSG 官网 · WASM 谱面/房间查看器 · Tauri 2 Windows/Android 应用壳

<br/>

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Nuxt](https://img.shields.io/badge/Nuxt-3.21-00DC82.svg?logo=nuxt&logoColor=white)](https://nuxt.com/)
[![Vue](https://img.shields.io/badge/Vue-3.5-42b883.svg?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Build](https://github.com/HyperSynapseNetwork/Phira-plus-frontend/actions/workflows/build.yml/badge.svg)](https://github.com/HyperSynapseNetwork/Phira-plus-frontend/actions/workflows/build.yml)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.3-06B6D4.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![WASM](https://img.shields.io/badge/WASM-Viewer-7f52ff.svg)](https://webassembly.org/)

</div>

> [!IMPORTANT]
> **HSN Phira+ 三件套之一**：`ppb`（Phira-plus-Backend，后端）· `ppf`（本仓库，官网）· `panel`（Phira-plus-panel，管理控制台）。
> **跨仓冻结契约以三仓工作区的 `contracts/README.md`（Contract-Freeze v0）与 [契约一致性脚本](scripts/check-contract-consistency.mjs) 为准** —— 先改契约，再实现；禁止三边猜字段。
> 本仓库采用 **Apache License, Version 2.0**，详见 [LICENSE](LICENSE)。

> [!TIP]
> 第一次来？直接看[快速开始](#快速开始)。

## 简介

**PPF（HSN Phira+ Frontend）** 是 HSN Phira+ 的官网，面向玩家呈现房间、谱面、社区与 Replay（player presentation / viewer）。一句话数据所有权：**PPF 只做展示层，一切身份、策略与数据来自 PPB API；Phira token 永不进入前端。**

### 核心特性

- **纯静态 SSG**：Nuxt 3 `ssr:true` + `nitro.preset:'static'`，构建产出 `.output/public` 预渲染 HTML，可直接丢给任意静态托管 / 反代
- **WASM 查看器（Viewer）**：`viewer/` 内 vendor 的 Rust 查看器（monitor-common + monitor-client，Apache-2.0），CI 用 `wasm-pack --target web` 构建到 `src/public/viewer/`；TS 集成层（`src/viewer/*`）在 WASM 缺失时优雅降级
- **完整 SEO**：`@nuxtjs/seo` 生成 robots.txt + sitemap + Organization JSON-LD，`usePageSeo` 提供 canonical/OG/Twitter/hreflang；默认中文（`zh`）+ 英文（`en`）双语（`prefix_except_default`）
- **统一 API 客户端**：`src/utils/api/{types,errors,client}.ts` + `useApi()`，向 PPB 发起 credentialed CORS 请求，按冻结错误契约 `error.code` 本地化
- **认证网关**：`/login` 跳转 PPB Auth 网关（`${authBase}/auth/phira/login?return_to=<relative>`）；客户端永不接触 Phira access/refresh token
- **偏好系统**：`usePreferencesStore`（Pinia）+ `useState` 持久化，localStorage 承载 Guest 偏好（命名空间 `common`/`ppf`/`device`），登录后按字段合并到账户偏好
- **Tauri 2 壳**：`src-tauri/` 为 Windows + Android 应用壳（`frontendDist` 指向 SSG 产物）；secure refresh credential、生产 FCM/WNS、签名与 full-exit push 仍是 Release Gate

## 文档

| 分类 | 文档 |
|------|------|
| **快速开始** | [docs/getting-started.md](docs/getting-started.md)（dev / build / generate / WASM viewer） |
| **配置** | [docs/configuration.md](docs/configuration.md)（`NUXT_PUBLIC_*` 环境变量表 + `runtimeConfig`） |
| **部署** | [docs/deployment.md](docs/deployment.md)（SSG 构建 → 反代 / 静态托管） |
| **开发** | [docs/development.md](docs/development.md)（模块结构 / 页面 / 查看器 / 测试） |
| **历史计划** | [docs/history/PHASE_A_PLAN.md](docs/history/PHASE_A_PLAN.md)（Phase A 实施计划存档） |

## 技术栈

| 技术 | 用途 |
|------|------|
| [Nuxt](https://nuxt.com/) `3.21.11` | 框架（SSG，`nitro.preset:'static'`） |
| [Vue](https://vuejs.org/) `3.5.41` | UI 框架 |
| [TypeScript](https://www.typescriptlang.org/) `5.9` | 类型系统（strict） |
| [Tailwind CSS](https://tailwindcss.com/) `4.3` + `@tailwindcss/vite` | 样式（设计 token 在 `src/assets/css/main.css`） |
| [@heroui/styles](https://www.heroui.com/) `3.2.4` | HeroUI 框架无关样式层（**非** `@heroui/vue`，无 React runtime） |
| [@nuxtjs/seo](https://nuxtseo.com/) `3.1.0` | robots / sitemap / JSON-LD / OG |
| [@nuxtjs/i18n](https://i18n.nuxtjs.org/) `9.5.6` | 中英双语 |
| [@pinia/nuxt](https://pinia.vuejs.org/) `1.0.1` + [pinia](https://pinia.vuejs.org/) `4.0.2` | 状态管理 |
| [@vueuse/nuxt](https://vueuse.org/) `14.4.0` | VueUse 组合函数 |
| [@tanstack/vue-virtual](https://tanstack.com/virtual/) `3.13` | 虚拟列表 |
| [ofetch](https://github.com/unjs/ofetch) `1.5.1` | HTTP 客户端 |
| [Rust](https://www.rust-lang.org/) + [wasm-pack](https://rustwasm.github.io/wasm-pack/) | WASM 查看器（仅 CI 构建） |

## 快速开始

> [!NOTE]
> 本地需要 Node ≥ 22 与 pnpm ≥ 11（仓库 `packageManager: pnpm@11.8.0`，registry 走 npmmirror，见 `.npmrc`）。WASM 查看器只在 CI 构建（本地 Rust 工具链损坏，勿在本机跑 wasm-pack）。

```bash
pnpm install

# 开发预览（:3000）
pnpm dev

# 类型检查 / Lint / 测试
pnpm vue-tsc
pnpm lint
pnpm test

# SSG 构建 → .output/public（预渲染全部路由）
pnpm build

# 预览构建产物
pnpm preview
```

`.env.example` → `.env`，显式配置必需的 `NUXT_PUBLIC_*`（见 [docs/configuration.md](docs/configuration.md)）。缺失时构建会直接失败，避免自部署误连官方服务。

## 配置说明

- **构建期环境变量**（`NUXT_PUBLIC_*`）：`NUXT_PUBLIC_API_BASE` / `NUXT_PUBLIC_AUTH_BASE` / `NUXT_PUBLIC_SITE_URL` 等，参考 [`.env.example`](.env.example)。
- **运行时配置**：`nuxt.config.ts` 的 `runtimeConfig.public`（apiBase / authBase / siteUrl / analytics / pushVapidPublicKey / appVersion）。
- 完整变量表见 [docs/configuration.md](docs/configuration.md)。

## 许可证

HSN Phira+ Frontend 采用 **Apache License, Version 2.0** — 详见 [LICENSE](LICENSE)。`viewer/` 内 vendor 的 Rust 代码源自 [phira-web-monitor](https://github.com/HyperSynapseNetwork/phira-web-monitor) 与 [phira-mp](https://github.com/TeamFlos/phira-mp)，同为 Apache-2.0。
