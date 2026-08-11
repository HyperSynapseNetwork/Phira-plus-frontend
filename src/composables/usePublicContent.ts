import type { Paginated, PublicAnnouncement, PublicDownload, PublicMeta, PublicNode, ServerSummary } from '~/utils/api/types'
import { withQuery } from './useApi'

/**
 * Public content endpoints (`/api/v1/public/*`, contract §1/§9/§24.4).
 * All fetches are client-only with graceful fallback to empty/default values —
 * PPB Phase B may not be ready, so callers never see a hard failure.
 */

const EMPTY_META: PublicMeta = {
  version: '0.0.0',
  api_version: 1,
  capabilities: [],
  pmp: { connected: false, version: '', capabilities: [] },
}

export function usePublicMeta() {
  return useApiData<PublicMeta>('ppf:public-meta', '/api/v1/public/meta', EMPTY_META)
}

export function useServerSummary() {
  return useApiData<ServerSummary>('ppf:server-summary', '/api/v1/public/meta?view=summary', {})
}

export function useAnnouncements(params: { page?: number, pageNum?: number } = {}) {
  const path = withQuery('/api/v1/public/announcements', params)
  return useApiData<Paginated<PublicAnnouncement>>(`ppf:announcements:${params.page ?? 1}`, path, { items: [], total: 0, page: 1, pageNum: 20 })
}

export function useDownloads(params: { page?: number, pageNum?: number } = {}) {
  const path = withQuery('/api/v1/public/downloads', params)
  return useApiData<Paginated<PublicDownload>>(`ppf:downloads:${params.page ?? 1}`, path, { items: [], total: 0, page: 1, pageNum: 20 })
}

/** External nodes — display source + latency, never infer IP (audit §2.10). */
export function useNodes() {
  return useApiData<Paginated<PublicNode>>('ppf:nodes', '/api/v1/public/nodes', { items: [], total: 0, page: 1, pageNum: 100 })
}
