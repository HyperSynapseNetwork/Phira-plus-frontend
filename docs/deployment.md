# 部署（Deployment）

> PPF 是纯静态 SSG，部署即「构建 → 把 `.output/public` 丢给任意静态托管 / 反代」。域名固定 `phira.htadiy.com`（contract §11）。

## 构建

```bash
pnpm install
pnpm build:full # 构建 WASM Viewer 并生成 .output/public
```

产物自检：

```bash
test -f .output/public/index.html
test -f .output/public/robots.txt
test -f .output/public/sitemap_index.xml
test -f .output/public/viewer/monitor_client.js
test -f .output/public/viewer/monitor_client_bg.wasm
```

## 方式 A：静态托管（CDN / Nginx / S3）

把 `.output/public/` 上传到任意静态托管：

- 首页/列表页直接 serve；`/en/` 前缀路由同理。
- 动态路由（`/room/[room_id]` 等）为客户端渲染：静态托管需把未知路径回退到 `index.html`（SPA fallback）。
- 反代需加上站点的 `X-Robots-Tag`（若需）与安全响应头（CSP 由反代按 design §23.4 强制）。

### Nginx 示例（也见 ppb 仓库 `deploy/nginx/nginx.conf` 的 PPF 段）

```nginx
server {
    listen 443 ssl http2;
    server_name phira.htadiy.com;
    ssl_certificate     /etc/nginx/tls/phira.htadiy.com.pem;
    ssl_certificate_key /etc/nginx/tls/phira.htadiy.com.key;

    root /srv/ppf/dist;   # .output/public
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

该 fallback 是 `/room/:id`、`/chart/:id`、`/user/:id` 与 Replay 分享链接直接打开所必需的部署契约。

## 方式 B：Tauri 2 桌面 / 移动壳

`src-tauri/` 是 Tauri 2 应用壳（Windows + Android），`frontendDist` 指向 `../.output/public`：

```bash
pnpm generate    # 或 pnpm build → .output/public
```

- **本壳目前是配置/占位**：本地原生工具链损坏，勿跑 `cargo tauri dev`；打包仅走 CI 且依赖 Owner 提供签名密钥。
- **远程推送待凭据**：Windows WNS（Package SID + client secret + 代码签名证书）、Android FCM（`google-services.json` + signing keystore）。到货前浏览器 Web Push 通道（`src/public/sw.js` + `src/plugins/push.client.ts`）是唯一生效的推送路径。
- 详见 [`src-tauri/README.md`](../src-tauri/README.md)。

## CI（design §26.3）

[`.github/workflows/build.yml`](../.github/workflows/build.yml) 4 个 job：

| Job | 内容 |
|---|---|
| `quality` | frozen-lockfile 安装 → ESLint → vue-tsc → Vitest → Nuxt SSG 构建 → 链接/静态产物 sanity（index/robots/sitemap + 关键文本） |
| `wasm` | `wasm-pack --target web` 构建 vendor 查看器到 `src/public/viewer/`，校验 `.wasm` + `.js` 存在，上传 `viewer-wasm` artifact（独立运行，不让前端 CI 被 Rust 工具链阻塞） |
| `tauri-windows` | 下载 `viewer-wasm` → `pnpm build` → `tauri icon` 生成图标 → `tauri build --bundles nsis,msi`；有 `WINDOWS_CERT` secret 时用 signtool 签 exe/msi；上传 exe/msi + SHA256SUMS |
| `tauri-android` | 同上构建前端 + `tauri android init` → `tauri android build --apk`；有 `ANDROID_KEYSTORE` secret 时解 keystore 并配置 gradle release signing；上传 apk + SHA256SUMS |

两个 Tauri job 均 `needs: [quality, wasm]`，**签名步骤在对应 secrets 缺失时自动跳过**（不阻塞 CI）。

## 发布与签名（Gate 7）

发布签名密钥**由 Owner 保管**（Play Store / Windows 商店不可丢失）。CI 只读 GitHub Actions Secrets，缺失即跳过签名。

需要配置的 secrets（仓库 → Settings → Secrets and variables → Actions）：

| Secret | 用途 | 必填 |
|---|---|---|
| `ANDROID_KEYSTORE` | Android release 签名（`.jks` 的 base64） | 上架必填 |
| `ANDROID_KEYSTORE_PASSWORD` | keystore 密码 | 上架必填 |
| `ANDROID_KEY_ALIAS` | keystore alias | 上架必填 |
| `ANDROID_KEY_PASSWORD` | key 密码 | 上架必填 |
| `WINDOWS_CERT` | Windows 安装包代码签名（`.pfx` 的 base64） | 可选 |
| `WINDOWS_CERT_PASSWORD` | pfx 密码 | 可选 |
| `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Tauri updater 签名（暂无 updater 插件，可选） | 可选 |

生成 keystore 示例：

```bash
keytool -genkeypair -v -keystore phiraplus.keystore -alias phiraplus \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$(openssl rand -base64 18)" -keypass "$(openssl rand -base64 18)"
base64 -w0 phiraplus.keystore > phiraplus.keystore.b64
```

配置命令（需 repo admin token，`gh secret set` 要求 secrets 权限）：

```sh
gh secret set ANDROID_KEYSTORE < phiraplus.keystore.b64
gh secret set ANDROID_KEYSTORE_PASSWORD --body "store-password"
gh secret set ANDROID_KEY_ALIAS --body "phiraplus"
gh secret set ANDROID_KEY_PASSWORD --body "key-password"
# 可选 Windows 安装包签名
gh secret set WINDOWS_CERT < cert.pfx.b64
gh secret set WINDOWS_CERT_PASSWORD --body "pfx-password"
```

> [!WARNING]
> **备份 keystore**：`ANDROID_KEYSTORE` 一旦写入 GitHub Secret 便不可读取；请把 `phiraplus.keystore` 原文件 + 密码备份到安全位置，丢失即无法再对同一包名签名更新。
> **包名/签名发布后不可更改**：上架前确认 `tauri.conf.json` 的 `identifier`（当前 `com.htadiy.phiraplus`）与签名密钥。

## 生产注意

- `NUXT_PUBLIC_API_BASE`、`NUXT_PUBLIC_AUTH_BASE`、`NUXT_PUBLIC_SITE_URL` 均须在构建时显式注入；缺失会 fail-fast，官方 workflow 也显式写入官方域名。
- 站点 `robots.txt` + `sitemap` 由构建期生成，改动 SEO 后需重新构建。
- CSP、安全响应头、`X-Robots-Tag` 建议在反代层强制（design §23.4）。
