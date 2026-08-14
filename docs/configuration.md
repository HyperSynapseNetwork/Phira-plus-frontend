# 配置参考（Configuration）

> PPF 是纯前端，**没有运行时密钥**。所有可配置项要么是构建期环境变量（`NUXT_PUBLIC_*`），要么来自 PPB API。**切勿**在 `.env` 或前端任何位置放置 Phira token / PPB session JWT / GitHub client secret / push 密钥。

## 构建期环境变量（`.env` → `NUXT_PUBLIC_*`）

Nuxt 自动把 `NUXT_PUBLIC_API_BASE` 映射到 `runtimeConfig.public.apiBase`（其余同理）。参考 [`.env.example`](../.env.example)。

| 变量 | 默认 | 说明 |
|---|---|---|
| `NUXT_PUBLIC_API_BASE` | **必填** | PPB REST API 基础 URL（credentialed CORS） |
| `NUXT_PUBLIC_AUTH_BASE` | **必填** | PPB Auth 网关基础 URL（login/reauth/refresh/root） |
| `NUXT_PUBLIC_SITE_URL` | **必填** | 站点权威 URL（`@nuxtjs/seo` 用于 sitemap/OG/canonical） |

## `runtimeConfig.public`（`nuxt.config.ts`）

| 键 | 默认 | 说明 |
|---|---|---|
| `apiBase` | 无默认值 | 同 `NUXT_PUBLIC_API_BASE` |
| `authBase` | 无默认值 | 同 `NUXT_PUBLIC_AUTH_BASE` |
| `siteUrl` | 无默认值 | 同 `NUXT_PUBLIC_SITE_URL` |

三项 URL 均在 Nuxt 配置载入时校验；缺失或不是绝对 HTTP(S) URL 时，开发服务器与构建均 fail-fast。
| `analytics.provider` | `''` | `''` \| `plausible` \| `ga4`；仅在用户授予同意后激活，凭据/聊天永不发送 |
| `analytics.plausibleDomain` | `''` | Plausible 域名 |
| `analytics.gaId` | `''` | GA4 测量 ID |
| `pushVapidPublicKey` | `''` | Web Push VAPID 公钥（由 PPB 提供） |
| `appVersion` | `0.1.0` | 页脚展示的构建/版本号（可用 `NUXT_PUBLIC_APP_VERSION` 覆盖，需与 package.json 同步） |

## SEO 相关（构建期环境）

| 变量 | 说明 |
|---|---|
| `NUXT_SITE_SEARCH_VERIFICATION_GOOGLE` | Google 站点验证码（未设则不输出 verification meta） |
| `NUXT_SITE_SEARCH_VERIFICATION_BING` | Bing 站点验证码（同上） |

## 说明

- **i18n**：默认 `zh`（简体中文），`en` 跟随；策略 `prefix_except_default`（英文走 `/en/` 前缀）；浏览器语言探测 cookie：`ppf_i18n_redirected`。
- **SSG 特有**：`nitro.preset:'static'` 意味着没有 Nitro 服务端输出；`runtimeConfig.public` 在构建期就内联进产物，改动需重新构建。
- **vite 插件**：Tailwind v4 通过 `@tailwindcss/vite` 注入（刻意不用 `@nuxtjs/tailwindcss`，避免其锁定 Tailwind v3）。
