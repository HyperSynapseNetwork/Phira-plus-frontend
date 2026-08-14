# 快速开始（Getting Started）

> PPF = Phira+ Frontend：Nuxt 3 SSG 公开伴生站。本页覆盖本地开发、测试、SSG 构建与 WASM 查看器说明。

## 前置条件

- Node ≥ 22
- pnpm ≥ 11（仓库 `packageManager: pnpm@11.8.0`）
- Rust stable + `wasm32-unknown-unknown` target
- `wasm-pack`（clean-source / release 构建 Viewer 必需）
- 可访问的 PPB 实例；必须在 `.env` 中显式配置 API/Auth/Site URL

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
pnpm build:full  # clean-source：构建 WASM Viewer + Nuxt SSG → .output/public
```

clean clone 的发布/验收构建以 `pnpm build:full` 为准；`pnpm build` 只用于 Viewer artifact 已由 CI 或前一步产生的场景。

## SSG 构建产物

`pnpm build:full` 最终调用 `nuxt build`，使用 `nitro.preset: 'static'`，预渲染全部静态路由到 `.output/public/`：

- 首页、`/rooms`、`/charts`、`/community`、`/replays`、`/downloads`、`/terms`、`/profile`、`/notifications`、`/login`、`/404` 等
- 动态路由（`/room/[room_id]`、`/chart/[id]`、`/user/[phira_id]`、`/replay/share/[token]`）作为客户端渲染路由
- `robots.txt` + `sitemap_index.xml` 由 `@nuxtjs/seo` 在构建期生成
- `/en/` 前缀的英文路由同样预渲染（`lang="en-US"`）

## WASM 查看器

`viewer/` 是随仓库固定的 Rust workspace，包含 `monitor-common`、`monitor-client` 与 vendored `phira-mp` path dependency。clean-source 发布构建必须先产生 Viewer artifact：

```sh
pnpm build:full
```

该命令执行 `wasm-pack build --target web`，把 `monitor_client.js` 与 `monitor_client_bg.wasm` 写入 `src/public/viewer/`，再运行 Nuxt SSG。CI 也可先构建并下载同一 Viewer artifact 后执行 `pnpm build`。发布镜像不允许缺 Viewer artifact。

## 本地配置

复制 `.env.example` → `.env` 并按需覆盖 `NUXT_PUBLIC_*`（默认已指向生产 PPB）。完整变量表见 [configuration.md](./configuration.md)。
