# 快速开始（Getting Started）

> PPF = Phira+ Frontend：Nuxt 3 SSG 公开伴生站。本页覆盖本地开发、测试、SSG 构建与 WASM 查看器说明。

## 前置条件

- Node ≥ 22
- pnpm ≥ 11（仓库 `packageManager: pnpm@11.8.0`；registry 走 npmmirror，见 `.npmrc`）
- 可选的 PPB 实例（默认 `https://api-phira.htadiy.com`，无 PPB 时首页以离线降级展示）

## 安装与开发

```bash
pnpm install

# 开发预览（Nuxt dev server，:3000）
pnpm dev
```

> [!NOTE]
> `pnpm install` 的 `postinstall` 会执行 `nuxt prepare` 生成 `.nuxt/`。`pnpm-workspace.yaml` 里用 `allowBuilds` 只放行 `esbuild`/`sharp`/`vue-demi` 的构建脚本；`@intlify/shared@10` 被 override 到 `10.0.8` 以兼容 `@nuxtjs/i18n@9.5.6`（见仓库内注释）。

## 质量门禁

```bash
pnpm lint        # ESLint（@antfu/eslint-config）
pnpm vue-tsc     # 类型检查（vue-tsc --noEmit）
pnpm test        # Vitest 单元/组件测试
pnpm build       # Nuxt SSG 构建 → .output/public
```

四个门禁全部通过后即可提交（CI 同样跑这四步，见 [deployment.md](./deployment.md) 的 CI 章节）。

## SSG 构建产物

`pnpm build`（等价 `nuxt build`）使用 `nitro.preset: 'static'`，预渲染全部静态路由到 `.output/public/`：

- 首页、`/rooms`、`/charts`、`/community`、`/replays`、`/downloads`、`/terms`、`/profile`、`/notifications`、`/login`、`/404` 等
- 动态路由（`/room/[room_id]`、`/chart/[id]`、`/user/[phira_id]`、`/replay/share/[token]`）作为客户端渲染路由
- `robots.txt` + `sitemap_index.xml` 由 `@nuxtjs/seo` 在构建期生成
- `/en/` 前缀的英文路由同样预渲染（`lang="en-US"`）

## WASM 查看器（仅 CI）

`viewer/` 内是 vendor 的 Rust 查看器（`monitor-common` + `monitor-client` + 固定的 `phira-mp` 快照）。**只由 CI 构建**：

```sh
wasm-pack build --target web --out-dir "$GITHUB_WORKSPACE/src/public/viewer" viewer/monitor-client
```

产物（`monitor_client.js` + `monitor_client_bg.wasm`）由 CI 上传为 `viewer-wasm` artifact，发布打包时放入 `src/public/viewer/`。SSG 构建无该 artifact 时，TS 集成层（`src/viewer/*`）会优雅降级（查看器不可用，其余站点正常）。

> [!NOTE]
> 本地 Rust 工具链损坏，请勿在本机运行 `wasm-pack` / `cargo`（见 `viewer/README.md`）。

## 本地配置

复制 `.env.example` → `.env` 并按需覆盖 `NUXT_PUBLIC_*`（默认已指向生产 PPB）。完整变量表见 [configuration.md](./configuration.md)。
