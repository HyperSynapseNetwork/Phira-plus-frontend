import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

/**
 * Per-page SEO helper (design §23.1).
 *
 * Sets canonical, Open Graph / Twitter, JSON-LD, locale-aware hreflang
 * alternates, and optional noindex — all driven by build-time `site` config
 * (@nuxtjs/seo) so branding/SEO copy lives in one place.
 *
 * Usage in `<script setup>`:
 *   usePageSeo(() => ({
 *     title: t('chart.title'),
 *     description: t('chart.desc'),
 *     type: 'music.song',
 *     image: chart.cover_url,
 *     jsonLd: { '@type': 'MusicRecording', name: chart.name },
 *   }))
 */

const SOCIAL_FALLBACK = '/social-card.svg'

export interface PageSeoOptions {
  /** Localized page title (fed into the global titleTemplate). */
  title?: string
  /** Localized meta description. */
  description?: string
  /** Absolute URL or site-relative path for the social share image. */
  image?: string | null
  /** Open Graph type. */
  type?: 'website' | 'article' | 'profile' | 'music.song' | 'video.other' | 'music.album'
  /** Canonical path override (defaults to current route path). */
  canonicalPath?: string
  /** JSON-LD node(s) for semantically meaningful pages. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
  /** Exclude from search engines (e.g. authenticated-only pages). */
  noindex?: boolean
  /** Base64 data-URI or path override for the social fallback image. */
  socialImage?: string
}

export function usePageSeo(options: MaybeRefOrGetter<PageSeoOptions>): void {
  const site = useSiteConfig()
  const { locale } = useI18n()
  const localePath = useLocalePath()
  const route = useRoute()

  const resolved = computed<PageSeoOptions>(() => {
    const o = toValue(options)
    const path = o.canonicalPath ?? route.path
    return { type: 'website', socialImage: SOCIAL_FALLBACK, ...o, canonicalPath: path }
  })

  useHead(() => {
    const o = resolved.value
    const url = site.url.replace(/\/$/, '')
    const canonical = `${url}${o.canonicalPath ?? route.path}`
    const image = o.image
      ? (o.image.startsWith('http') ? o.image : `${url}${o.image}`)
      : `${url}${o.socialImage ?? SOCIAL_FALLBACK}`

    // hreflang alternates for the two supported locales.
    const localeCodes = ['zh', 'en'] as const
    const alternates = localeCodes.map(code => ({
      rel: 'alternate',
      hreflang: code,
      href: `${url}${localePath(o.canonicalPath ?? route.path, code as 'zh' | 'en')}`,
    }))

    const meta: Array<Record<string, string>> = []
    if (o.description)
      meta.push({ name: 'description', content: o.description })
    if (o.title) {
      meta.push({ property: 'og:title', content: o.title })
      meta.push({ name: 'twitter:title', content: o.title })
    }
    if (o.description) {
      meta.push({ property: 'og:description', content: o.description })
      meta.push({ name: 'twitter:description', content: o.description })
    }
    meta.push({ property: 'og:type', content: o.type ?? 'website' })
    meta.push({ property: 'og:url', content: canonical })
    meta.push({ property: 'og:image', content: image })
    meta.push({ property: 'og:locale', content: locale.value === 'en' ? 'en_US' : 'zh_CN' })
    meta.push({ name: 'twitter:card', content: 'summary_large_image' })
    meta.push({ name: 'twitter:image', content: image })
    if (o.noindex)
      meta.push({ name: 'robots', content: 'noindex, nofollow' })

    return {
      title: o.title,
      meta,
      link: [
        { rel: 'canonical', href: canonical },
        ...alternates,
      ],
      script: o.jsonLd
        ? [{ type: 'application/ld+json', children: JSON.stringify(o.jsonLd) }]
        : [],
    }
  })
}
