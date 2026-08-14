import type { Replay } from '~/utils/api/types'
import { apiFetch, getApiBase } from '~/utils/api/client'
import { withQuery } from './useApi'

function normalizeReplayList(raw: unknown): Replay[] {
  if (!raw || typeof raw !== 'object')
    return []
  const record = raw as Record<string, unknown>
  const playerId = typeof record.player_id === 'number' ? record.player_id : undefined
  const values = Array.isArray(record.items) ? record.items : Array.isArray(record.replays) ? record.replays : []
  return values.flatMap((item): Replay[] => {
    if (typeof item === 'string') {
      return [{
        id: `${item}:${playerId ?? 0}`,
        round_uuid: item,
        player_phira_id: playerId ?? 0,
        visibility: 'public',
        created_at: '',
      }]
    }
    if (!item || typeof item !== 'object')
      return []
    const value = item as Record<string, unknown>
    const roundUuid = typeof value.round_uuid === 'string' ? value.round_uuid : ''
    if (!roundUuid)
      return []
    const visibility = ['inherit', 'public', 'friends', 'unlisted', 'private', 'custom'].includes(String(value.visibility))
      ? value.visibility as Replay['visibility']
      : 'public'
    return [{
      id: typeof value.id === 'string' ? value.id : `${roundUuid}:${playerId ?? 0}`,
      round_uuid: roundUuid,
      player_phira_id: typeof value.player_phira_id === 'number' ? value.player_phira_id : playerId ?? 0,
      chart_id: typeof value.chart_id === 'number' ? value.chart_id : undefined,
      chart_name: typeof value.chart_name === 'string' ? value.chart_name : undefined,
      room_id: typeof value.room_id === 'string' ? value.room_id : undefined,
      score: typeof value.score === 'number' ? value.score : undefined,
      accuracy: typeof value.accuracy === 'number' ? value.accuracy : undefined,
      visibility,
      created_at: typeof value.created_at === 'string'
        ? value.created_at
        : typeof value.played_at === 'number'
          ? new Date(value.played_at).toISOString()
          : '',
      share_links: Array.isArray(value.share_links)
        ? value.share_links.flatMap((raw): NonNullable<Replay['share_links']> => {
            if (!raw || typeof raw !== 'object')
              return []
            const link = raw as Record<string, unknown>
            return typeof link.id === 'string' ? [{ id: link.id, expires_at: typeof link.expires_at === 'string' ? link.expires_at : null, revoked_at: typeof link.revoked_at === 'string' ? link.revoked_at : null }] : []
          })
        : undefined,
    }]
  })
}

export function useReplayList(playerId: MaybeRefOrGetter<number | undefined>) {
  const id = computed(() => toValue(playerId))
  const path = computed(() => withQuery('/api/v1/replays', { player_id: id.value ?? 0 }))
  const { data, error, pending, refresh } = useFetch<unknown>(path, {
    baseURL: getApiBase(),
    credentials: 'include',
    retry: 0,
    server: false,
    lazy: true,
    immediate: false,
  })
  watch(id, (value) => {
    if (value != null)
      void refresh()
  }, { immediate: true })
  return { replays: computed(() => normalizeReplayList(data.value)), error, pending, refresh }
}

export function useMyReplayList() {
  const { data, error, pending, refresh } = useFetch<unknown>('/api/v1/me/replays', {
    baseURL: getApiBase(),
    credentials: 'include',
    retry: 0,
    server: false,
    lazy: true,
  })
  return { replays: computed(() => normalizeReplayList(data.value)), error, pending, refresh }
}

export async function setReplayVisibility(roundUuid: string, playerId: number, visibility: Replay['visibility']): Promise<void> {
  await apiFetch(`/api/v1/replays/${encodeURIComponent(roundUuid)}/visibility?player_id=${playerId}`, { method: 'POST', body: { visibility } })
}

export async function createReplayShareLink(roundUuid: string, playerId: number): Promise<{ link: { id: string, expires_at?: string | null }, token: string }> {
  return apiFetch(`/api/v1/replays/${encodeURIComponent(roundUuid)}/share?player_id=${playerId}`, { method: 'POST', body: {} })
}

export async function revokeReplayShareLink(roundUuid: string, playerId: number, linkId: string): Promise<void> {
  await apiFetch(`/api/v1/replays/${encodeURIComponent(roundUuid)}/share/${encodeURIComponent(linkId)}?player_id=${playerId}`, { method: 'DELETE' })
}
