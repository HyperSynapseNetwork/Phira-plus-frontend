import tailwindcss from '@tailwindcss/vite'
import { defineNuxtConfig } from 'nuxt/config'

/**
 * Phira+ PPF — Nuxt 3 SSG public site (Phase A scaffold)
 *
 * Reference: DESIGN/PP-B-F-P_V3_总体设计规范.md §3.2, §16, §22, §23, §26.3
 * Frozen cross-repo contract: contracts/README.md (Contract-Freeze v0)
 */
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  srcDir: 'src',

  devtools: { enabled: true },

  /**
   * SSG static site.
   * - `ssr: true` (Nuxt default) + `nitro.preset: 'static'` => pre-rendered HTML.
   * - Static preset implies no Nitro server output (pure static deployment).
   */
  ssr: true,
  nitro: {
    preset: 'static',
  },

  /**
   * Runtime public config.
   * - Defaults are overridable at runtime/build via `NUXT_PUBLIC_*` env vars
   *   (Nuxt auto-maps `NUXT_PUBLIC_API_BASE` → `runtimeConfig.public.apiBase`).
   * - Auth is delegated to the PPB auth gateway; the client never sees Phira tokens.
   */
  runtimeConfig: {
    public: {
      apiBase: 'https://api-phira.htadiy.com',
      authBase: 'https://api-phira.htadiy.com',
      siteUrl: 'https://phira.htadiy.com',
    },
  },

  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/i18n',
    '@nuxtjs/seo',
    '@nuxt/image',
  ],

  /**
   * Tailwind CSS v4 via the official Vite plugin.
   * Design tokens live in src/assets/css/main.css (imports @heroui/styles).
   * NOTE: `@nuxtjs/tailwindcss` intentionally NOT used — it pins Tailwind v3.
   */
  vite: {
    plugins: [tailwindcss()],
  },

  css: [
    '~/assets/css/main.css',
  ],

  typescript: {
    strict: true,
    typeCheck: false,
  },

  imports: {
    dirs: [
      'composables',
      'stores',
      'utils',
    ],
  },

  /**
   * Register components by filename only (no directory prefix), so
   * `components/layout/AppHeader.vue` is `<AppHeader>`, not `<LayoutAppHeader>`.
   */
  components: [
    { path: '~/components', pathPrefix: false },
  ],

  app: {
    head: {
      htmlAttrs: {
        lang: 'zh-CN',
      },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#00F7FF' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  i18n: {
    // Keep locale files in `srcDir/i18n/` (langDir relative to srcDir).
    // Disabling the v9 `restructureDir` avoids relocating files to <root>/i18n.
    restructureDir: false,
    locales: [
      { code: 'zh', language: 'zh-CN', name: '简体中文', file: 'zh.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
    ],
    defaultLocale: 'zh',
    strategy: 'prefix_except_default',
    lazy: true,
    langDir: 'i18n/',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'ppf_i18n_redirected',
      redirectOn: 'root',
    },
  },

  /**
   * SEO module (@nuxtjs/seo) — site identity + robots/sitemap.
   * OG-image module disabled for the Phase A scaffold to keep the static
   * build light and avoid downloading font/image rendering toolchains in CI.
   */
  site: {
    url: 'https://phira.htadiy.com',
    name: 'Phira+',
    description: 'Phira+ 公共伴生站 — 房间、谱面、社区与 Replay（PPF）',
    defaultLocale: 'zh',
  },
  ogImage: false,
  linkChecker: {
    enabled: false,
  },
})
