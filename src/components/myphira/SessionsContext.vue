<script setup lang="ts">
import type { MySessionItem, MySessionsResponse } from '~/utils/api/types'
import { apiFetch, getApiBase } from '~/utils/api/client'

const { t } = useI18n()
const notice = useNotice()
const { data, pending, error, refresh } = useFetch<MySessionsResponse>('/api/v1/me/sessions', {
  baseURL: getApiBase(),
  credentials: 'include',
  retry: 0,
  server: false,
  lazy: true,
  default: () => ({ items: [] }),
})
const busy = ref<string | null>(null)

function date(value?: string | null): string {
  if (!value)
    return t('common.unknown')
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? t('common.unknown') : parsed.toLocaleString()
}

async function revoke(session: MySessionItem): Promise<void> {
  if (session.current || busy.value)
    return
  busy.value = session.id
  try {
    await apiFetch(`/api/v1/me/sessions/${encodeURIComponent(session.id)}`, { method: 'DELETE' })
    notice.success('notice.actionCompleted', { dedupKey: `session:${session.id}:revoke` })
    await refresh()
  }
  catch (err) {
    notice.errorFromApi(err, { dedupKey: `session:${session.id}:revoke:error` })
  }
  finally {
    busy.value = null
  }
}
</script>

<template>
  <div class="space-y-3">
    <p v-if="pending" class="text-sm text-slate-400">
      {{ t('common.loading') }}
    </p>
    <div v-else-if="error" class="flex items-center justify-between gap-3 text-sm text-rose-300" role="alert">
      <span>{{ t('common.error') }}</span>
      <button type="button" class="text-accent hover:underline" @click="() => refresh()">
        {{ t('common.retry') }}
      </button>
    </div>
    <p v-else-if="!data.items.length" class="text-sm text-slate-400">
      {{ t('myphira.noSessions') }}
    </p>
    <ul v-else class="divide-y divide-white/10 border-y border-white/10">
      <li v-for="session in data.items" :key="session.id" class="flex flex-wrap items-center gap-3 py-3">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <strong class="text-sm text-slate-100">{{ session.device_name || session.client_type }}</strong>
            <span v-if="session.current" class="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">{{ t('myphira.currentSession') }}</span>
          </div>
          <p class="mt-1 text-xs text-slate-400">
            {{ session.client_type }} · {{ session.ip || t('common.unknown') }}
          </p>
          <p class="mt-1 text-xs text-slate-500">
            {{ t('myphira.lastSeen') }}: {{ date(session.last_seen_at || session.created_at) }}
          </p>
        </div>
        <PPButton v-if="!session.current" weight="quiet" size="sm" :disabled="busy === session.id" @click="revoke(session)">
          {{ t('myphira.revokeSession') }}
        </PPButton>
      </li>
    </ul>
  </div>
</template>
