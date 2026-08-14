import type { PublicSiteInfo } from '~/utils/api/types'
import { useApiData } from '~/composables/useApi'

/**
 * Privacy-friendly website visit count (design §16.10 / §23.3).
 *
 * Uses only the server-aggregated `visit_count` from `GET /api/v1/public/site` —
 * no client-side fingerprinting. Missing/unavailable counts return `null` and
 * are omitted from the UI rather than rendered as a fake placeholder.
 */
interface PublicSiteStats extends PublicSiteInfo {
  visit_count?: number
}

export function useVisitCount() {
  const { data, error, pending } = useApiData<PublicSiteStats>('ppf:site-info', '/api/v1/public/site', { name: '' })

  const count = computed<number | null>(() =>
    typeof data.value.visit_count === 'number' ? data.value.visit_count : null,
  )

  return { count, error, pending }
}
