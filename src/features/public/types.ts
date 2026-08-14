export interface PublicMeta {
  version: string
  api_version: number
  capabilities: string[]
  pmp: { connected: boolean, version: string, capabilities: string[] }
}
export interface PublicSiteInfo { name: string, description?: string, version?: string, server_name?: string, welcome?: string }
export interface PublicAnnouncement { id: string, title: string, body: string, published_at: string, pinned?: boolean }
export interface PublicDownload { id: string, platform: 'windows' | 'android' | 'other', label: string, url: string, version?: string, size_bytes?: number }
export interface PublicNode { id: string, label: string, source?: string, status?: 'up' | 'down' | 'unknown', latency_ms?: number | null, message?: string, updated_at?: string }
export interface ServerSummary { online_users?: number, rooms?: number, sessions?: number, at?: string }
