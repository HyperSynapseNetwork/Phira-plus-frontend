import type { Chart, ChartDetail, ChartListParams, ChartRecord } from '~/features/charts/types'
import type { Paginated } from '~/features/common/types'
import { apiFetch, getApiBase } from '~/utils/api/client'
import { withQuery } from './useApi'

/**
 * Charts / Records (design §16.4). Phira API data is proxied by PPB;
 * `source` distinguishes Phira (official API) vs HSN Phira+ (PPB aggregated).
 *
 * Frozen REST mappings for `/api/v1/charts/*` and record queries:
 *   GET /api/v1/charts                → chart list (paginated)
 *   GET /api/v1/charts/{id}           → chart detail
 *   GET /api/v1/records/query/{chart} → global ranking for a chart
 */

function emptyCharts(): Paginated<Chart> {
  return { items: [], total: 0, page: 1, pageNum: 50 }
}

function normalizeChart(value: unknown): Chart | null {
  if (!value || typeof value !== 'object')
    return null
  const raw = value as Record<string, unknown>
  const id = typeof raw.id === 'number' ? raw.id : Number(raw.id)
  const name = typeof raw.name === 'string' ? raw.name : typeof raw.title === 'string' ? raw.title : ''
  if (!Number.isFinite(id) || !name)
    return null
  const number = (input: unknown) => typeof input === 'number' ? input : undefined
  const string = (input: unknown) => typeof input === 'string' ? input : undefined
  return {
    id,
    name,
    artist: string(raw.artist) ?? string(raw.composer),
    charter: string(raw.charter) ?? string(raw.author),
    difficulty: number(raw.difficulty),
    rating: number(raw.rating),
    level: string(raw.level),
    type: string(raw.type) ?? (typeof raw.type === 'number' ? String(raw.type) : undefined),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string') : undefined,
    cover_url: string(raw.illustration_url) ?? string(raw.cover_url) ?? string(raw.illustration),
    file_url: string(raw.file_url) ?? string(raw.file),
    play_count: number(raw.play_count),
    updated_at: string(raw.updated_at) ?? string(raw.updated),
  }
}

function normalizeChartList(raw: unknown, params: ChartListParams): Paginated<Chart> {
  const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null
  const list = Array.isArray(raw)
    ? raw
    : record && [record.items, record.results].find(Array.isArray)
  const items = Array.isArray(list) ? list.flatMap(item => normalizeChart(item) ?? []) : []
  return {
    items,
    total: typeof record?.total === 'number' ? record.total : items.length,
    page: params.page ?? 1,
    pageNum: params.pageNum ?? 50,
  }
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
    transform: raw => normalizeChartList(raw, params.value),
  })

  return {
    charts: computed(() => data.value?.items ?? []),
    total: computed(() => data.value?.total ?? 0),
    error,
    pending,
    refresh,
  }
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
