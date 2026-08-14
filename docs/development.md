# 开发指南（Development）

> 面向 PPF 贡献者：目录结构、页面、API 客户端、查看器、测试。跨仓契约见 `contracts/README.md`。

## 目录结构

```
ppf/
├── nuxt.config.ts               # SSG（ssr:true + nitro.preset:'static'）、runtimeConfig、模块
├── pnpm-workspace.yaml          # allowBuilds（esbuild/sharp/vue-demi）+ @intlify override
├── .env.example                 # NUXT_PUBLIC_* 构建期变量
├── docs/                        # 本文档集
├── src/                         # srcDir
│   ├── app.vue
│   ├── assets/css/main.css      #   @heroui/styles + PPF 设计 token（accent oklch ≈ #00F7FF）
│   ├── layouts/default.vue      #   页面骨架（AppHeader 桌面 / MobileNav 底部）
│   ├── pages/                   #   路由页面
│   ├── components/
│   │   ├── layout/  ui/  background/  context/  consent/
│   │   ├── charts/  rooms/  live/  viewer/  push/  myphira/  preferences/
│   ├── composables/             #   useApi / usePreferences / useSession / useRooms / useCharts /
│   │                           #   useCommunity / useNotifications / usePush / useConsent /
│   │                           #   useAnalytics / usePageSeo / useVisitCount / useContextWindow /
│   │                           #   useLowPerformance / useReducedTransparency ...
│   ├── stores/preferences.ts    #   Guest 偏好（Pinia）
│   ├── utils/api/{types,errors,client}.ts   # 冻结错误契约 + 分页 + capability helpers
│   ├── viewer/                  #   WASM 集成层（loader / sources / useChartPlayer / useGameMonitor /
│   │                           #   useReplayViewer / useJoinIntent / liveStream）
│   ├── plugins/{preferences,push}.client.ts
│   ├── types/preferences.ts
│   ├── i18n/{zh,en}.json
│   └── public/                  #   favicon.svg / social-card.svg / sw.js / viewer/
├── viewer/                      # WASM 查看器 workspace（Rust，仅 CI 构建）
│   ├── monitor-common/          #   谱面结构、bincode (ChartInfo, Chart)、LiveEvent
│   ├── monitor-client/          #   ChartPlayer / GameMonitor（wasm-bindgen）
│   └── phira-mp/                #   phira-mp-common/phira-mp-macros 固定快照（commit c59f9868）
├── src-tauri/                   # Tauri 2 Windows/Android 壳（Native release gates 独立验证）
└── tests/                       # Vitest（error-envelope / preferences / use-api / context-window / viewer-sources / preferences-merge）
```

## 页面（`src/pages/`）

| 路由 | 说明 |
|---|---|
| `/` | 首页（`/public/meta` 探测 + 离线降级） |
| `/login` | 跳转 PPB Auth 网关 |
| `/rooms` `/room/[room_id]` | 房间列表 / 房间详情 + Live 标签 |
| `/charts` `/chart/[id]` | 谱面列表 / 谱面详情 + Chart Preview |
| `/community` | 社区 |
| `/replays` `/replay/share/[token]` | Replay 列表 / 分享 Replay |
| `/user/[phira_id]` | 用户页 |
| `/profile` | 个人偏好面板（Guest prefs） |
| `/notifications` | 通知 |
| `/downloads` `/terms` `/404` | 下载 / 条款 / 404 |

## API 客户端与错误契约

- `src/utils/api/client.ts`：`$fetch`/`ofetch` 向 `NUXT_PUBLIC_API_BASE` 发起 credentialed CORS 请求；`useApi()` 返回 `{ data, error, ... }`。
- `src/utils/api/errors.ts`：按冻结错误契约 `error.code`（UPPER_SNAKE_CASE）处理；`ApiError` 保留服务端 code 原样，UI 按 code 精确本地化。
- `src/utils/api/types.ts`：分页 `{items, total, page, pageNum}`、capability helpers（`hasCapability` / `hasPmpCapability`）。

> 权威 Permission Manifest / Capabilities 永远来自 PPB；前端不硬编码全集。

## 偏好合并规则（contract §7）

- **Guest 偏好**：localStorage 承载，命名空间 `common` / `ppf` / `device`。
- **Device 偏好**（geometry / render_scale / cache_size / low_performance）只存本机。
- **账户偏好**（`common` / `ppf` 等）来自 PPB `user_preferences`（JSONB + revision 乐观并发）；登录后按字段合并，不粗暴覆盖设备设置。Account prefs 禁止只塞 localStorage。

## 查看器（WASM）

- CI job `wasm` 把 `viewer/monitor-client` 构建为 web target，产物落 `src/public/viewer/`。
- TS 集成层 `src/viewer/*` 动态 import WASM；`loader.ts` 在 WASM 缺失时优雅降级。
- Chart blob：bincode `(ChartInfo, Chart)` varint（`monitor-common`）；Live/Replay 帧：JSON 信封（contract §4 / §19，字段以 PPB `live/routes.rs` 为准）。

## 测试

`tests/*.spec.ts` 在 vitest `node` 环境跑，`tests/setup.ts` stub 掉 Nuxt 自动导入（`useState` / `watch` 等）。当前覆盖：

- `error-envelope.spec.ts`（错误契约解析）
- `preferences.spec.ts` / `preferences-merge.spec.ts`（Guest / device 偏好合并）
- `use-api.spec.ts`（API 客户端）
- `context-window.spec.ts`（Context Window 管理器，depth ≤ 2）
- `viewer-sources.spec.ts`（查看器资源来源）

## 质量门禁

```bash
pnpm lint
pnpm vue-tsc
pnpm test
pnpm build
```

> [!NOTE]
> `tests/setup.ts` 里把 Nuxt 环境 bootstrap 改成 `node` 是因为 vitest 4 + Nuxt 3 下 `environment:'nuxt'` 加载失败（见 `docs/history/PHASE_A_PLAN.md` 记录）。改动测试环境需谨慎。
