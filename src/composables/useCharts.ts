import type { Chart, ChartDetail, ChartListParams, ChartRecord, Paginated } from '~/utils/api/types'
import { apiFetch, getApiBase } from '~/utils/api/client'
import { withQuery } from './useApi'

/**
 * Charts / Records (design §16.4). Phira API data is proxied by PPB;
 * `source` distinguishes Phira (official API) vs Phira+ (PPB aggregated).
 *
 * Proposed REST mappings of the frozen `/api/v1/charts/*`, `/api/v1/records/*`:
 *   GET /api/v1/charts                → chart list (paginated)
 *   GET /api/v1/charts/{id}           → chart detail
 *   GET /api/v1/records/query/{chart} → global ranking for a chart
 */

function emptyCharts(): Paginated<Chart> {
  return { items: [], total: 0, page: 1, pageNum: 50 }
}

export function useChartList(query: MaybeRefOrGetter<ChartListParams>) {
  const params = computed(() => ({ pageNum: 50, ...toValue(query) }))
  const path = computed(() => withQuery('/api/v1/charts', params.value))

  const { data, error, pending, refresh } = useFetch<Paginated<Chart>>(path, {
    baseURL: getApiBase(),
    credentials: 'include',
    retry: 0,
    server: false,
    lazy: true,
    default: emptyCharts,
  })

  return { charts: computed(() => data.value?.items ?? []), error, pending, refresh }
}

export function useChart(chartId: MaybeRefOrGetter<number | string>) {
  const path = computed(() => `/api/v1/charts/${encodeURIComponent(String(toValue(chartId)))}`)
  const { data, error, pending, refresh } = useFetch<ChartDetail>(path, {
    baseURL: getApiBase(),
    credentials: 'include',
    retry: 0,
    server: false,
    lazy: true,
  })
  return { chart: data, error, pending, refresh }
}

/** Global ranking for a chart (`/api/v1/records/query/{chart}`). */
export function useChartRecords(chartId: MaybeRefOrGetter<number | string>) {
  const path = computed(() => `/api/v1/records/query/${encodeURIComponent(String(toValue(chartId)))}`)
  const { data, error, pending, refresh } = useFetch<ChartRecord[]>(path, {
    baseURL: getApiBase(),
    credentials: 'include',
    retry: 0,
    server: false,
    lazy: true,
    default: () => [],
  })
  return { records: data, error, pending, refresh }
}

/** Fetch a chart by id imperatively (used in mutation handlers). */
export async function fetchChart(chartId: number | string): Promise<ChartDetail> {
  return apiFetch<ChartDetail>(`/api/v1/charts/${encodeURIComponent(String(chartId))}`)
}
