# 部署（Deployment）

> PPF 是纯静态 SSG，部署即「构建 → 把 `.output/public` 丢给任意静态托管 / 反代」。域名固定 `phira.htadiy.com`（contract §11）。

## 构建

```bash
pnpm install
pnpm build      # → .output/public
```

产物自检：

```bash
test -f .output/public/index.html
test -f .output/public/robots.txt
test -f .output/public/sitemap_index.xml
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
        try_files $uri $uri/ =404;   # 纯 SSG：找不到即 404
    }
}
```

> [!NOTE]
> 若选择把动态路由也交给 SPA fallback（`try_files $uri $uri/ /index.html;`），记得保留 `/en/` 等真实目录的直出。对动态路由走 SPA fallback 的取舍由部署者决定。

## 方式 B：Tauri 2 桌面 / 移动壳（Phase D）

`src-tauri/` 是 Tauri 2 应用壳（Windows + Android），`frontendDist` 指向 `../.output/public`：

```bash
pnpm generate    # 或 pnpm build → .output/public
```

- **本壳目前是配置/占位**：本地原生工具链损坏，勿跑 `cargo tauri dev`；打包仅走 CI 且依赖 Owner 提供签名密钥。
- **远程推送待凭据**：Windows WNS（Package SID + client secret + 代码签名证书）、Android FCM（`google-services.json` + signing keystore）。到货前浏览器 Web Push 通道（`src/public/sw.js` + `src/plugins/push.client.ts`）是唯一生效的推送路径。
- 详见 [`src-tauri/README.md`](../src-tauri/README.md)。

## CI（design §26.3）

[`.github/workflows/build.yml`](../.github/workflows/build.yml) 两个独立 job：

| Job | 内容 |
|---|---|
| `quality` | frozen-lockfile 安装 → ESLint → vue-tsc → Vitest → Nuxt SSG 构建 → 链接/静态产物 sanity（index/robots/sitemap + 关键文本） |
| `wasm` | `wasm-pack --target web` 构建 vendor 查看器到 `src/public/viewer/`，校验 `.wasm` + `.js` 存在，上传 `viewer-wasm` artifact（独立运行，不让前端 CI 被 Rust 工具链阻塞） |

Tauri Windows/Android 原生流水线为后续工作（design §17），不在当前 CI。

## 生产注意

- `apiBase`/`authBase` 默认指向生产 PPB；自部署时用 `NUXT_PUBLIC_API_BASE` 覆盖并重新构建。
- 站点 `robots.txt` + `sitemap` 由构建期生成，改动 SEO 后需重新构建。
- CSP、安全响应头、`X-Robots-Tag` 建议在反代层强制（design §23.4）。
