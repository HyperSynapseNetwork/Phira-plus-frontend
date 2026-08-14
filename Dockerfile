# syntax=docker/dockerfile:1.7

FROM rust:1-bookworm AS viewer
WORKDIR /work
RUN cargo install wasm-pack --locked
# The viewer workspace contains path dependencies (monitor-common and the
# vendored phira-mp snapshot). Copy the whole tree; copying monitor-client alone
# makes clean Docker builds fail before Cargo can resolve the workspace.
COPY viewer ./viewer
RUN wasm-pack build --target web --out-dir /out viewer/monitor-client
RUN test -f /out/monitor_client.js && test -f /out/monitor_client_bg.wasm

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
COPY --from=viewer /out ./src/public/viewer
ARG NUXT_PUBLIC_API_BASE
ARG NUXT_PUBLIC_AUTH_BASE
ARG NUXT_PUBLIC_SITE_URL
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE \
    NUXT_PUBLIC_AUTH_BASE=$NUXT_PUBLIC_AUTH_BASE \
    NUXT_PUBLIC_SITE_URL=$NUXT_PUBLIC_SITE_URL
RUN pnpm build
RUN test -f .output/public/index.html \
 && test -f .output/public/viewer/monitor_client.js \
 && test -f .output/public/viewer/monitor_client_bg.wasm

FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/.output/public /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
