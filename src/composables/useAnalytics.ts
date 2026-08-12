import { useConsent } from './useConsent'

/**
 * Privacy-first analytics (design §23.3).
 *
 * - Tracking only activates when the user has granted analytics consent AND a
 *   provider is configured (runtime `public.analytics`).
 * - No credentials, session cookies, JWT, room chat content, or any PII are
 *   ever sent — only a lightweight pageview beacon.
 * - Provider is configurable at build/deploy time and can be disabled entirely.
 */

export type AnalyticsProvider = '' | 'plausible' | 'ga4'

export interface AnalyticsConfig {
  provider: AnalyticsProvider
  plausibleDomain?: string
  gaId?: string
}

function readConfig(): AnalyticsConfig {
  const config = useRuntimeConfig().public as unknown as {
    analytics?: AnalyticsConfig
  }
  const a = (config.analytics ?? {}) as AnalyticsConfig
  return {
    provider: a.provider ?? '',
    plausibleDomain: a.plausibleDomain,
    gaId: a.gaId,
  }
}

/** Is an analytics provider configured and enabled by consent? */
export function useAnalytics() {
  const { analyticsAllowed } = useConsent()
  const config = readConfig()

  const enabled = computed(() => analyticsAllowed.value && Boolean(config.provider))

  function trackPage(path: string, title?: string): void {
    if (!enabled.value || !import.meta.client)
      return
    try {
      if (config.provider === 'plausible' && config.plausibleDomain) {
        // Plausible beacon — domain + URL only, no cookies, no PII.
        navigator.sendBeacon(
          'https://plausible.io/api/event',
          new Blob([JSON.stringify({
            domain: config.plausibleDomain,
            name: 'pageview',
            url: `${location.origin}${path}`,
          })], { type: 'application/json' }),
        )
      }
      else if (config.provider === 'ga4' && config.gaId) {
        const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
        if (typeof gtag === 'function') {
          gtag('config', config.gaId, {
            page_path: path,
            page_title: title,
          })
        }
      }
      // Unconfigured providers are no-ops.
    }
    catch {
      // Tracking is best-effort — never breaks the page.
    }
  }

  return { enabled, provider: config.provider, trackPage }
}

/** Route-level pageview tracking — register once in the layout. */
export function trackPageViews(): void {
  if (!import.meta.client)
    return
  const analytics = useAnalytics()
  const route = useRoute()
  watch(() => route.fullPath, (path) => {
    analytics.trackPage(path)
  }, { immediate: true })
}
