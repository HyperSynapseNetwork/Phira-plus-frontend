import type { PublicSiteInfo } from '~/utils/api/types'
import { useApiData } from '~/composables/useApi'

/**
 * Privacy-friendly website visit count (design §16.10 / §23.3).
 *
 * Prefers a SERVER-AGGREGATED count from PPB (`GET /api/v1/public/site`,
 * proposed `visit_count` field) — no client-side fingerprinting. When PPB is
 * unready or omits the field, returns `null` and the UI shows "—".
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
