<script setup lang="ts">
import type { Replay, ReplayVisibility } from '~/utils/api/types'

/**
 * Presentational replay list (design §16.5 / §12.3).
 * Callers pass replays directly — PPB replay endpoints may be unready, so an
 * empty array renders a graceful fallback (`myphira.noReplays`).
 */
const props = defineProps<{
  replays: Replay[]
}>()

const { t, locale } = useI18n()

const visibilityKey: Record<ReplayVisibility, string> = {
  public: 'myphira.visibilityPublic',
  friends: 'myphira.visibilityFriends',
  unlisted: 'myphira.visibilityUnlisted',
  private: 'myphira.visibilityPrivate',
}

const visibilityClass: Record<ReplayVisibility, string> = {
  public: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
  friends: 'bg-accent/15 text-accent ring-accent/40',
  unlisted: 'bg-slate-500/15 text-slate-300 ring-slate-400/30',
  private: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
}

const rows = computed(() => props.replays.map(replay => ({
  replay,
  visibilityLabel: visibilityKey[replay.visibility] ?? 'myphira.visibilityPublic',
  visibilityClass: visibilityClass[replay.visibility] ?? 'bg-slate-500/15 text-slate-300 ring-slate-400/30',
})))

const copiedId = ref<string | null>(null)

function formatDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime()))
    return '—'
  return new Intl.DateTimeFormat(locale.value === 'en' ? 'en-US' : 'zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

function formatScore(value: number | undefined): string {
  return value === undefined ? '—' : value.toLocaleString(locale.value)
}

function formatAccuracy(value: number | undefined): string {
  if (value === undefined)
    return '—'
  // Contract doesn't fix the accuracy scale — treat ≤1 as a 0..1 fraction.
  const pct = value <= 1 ? value * 100 : value
  return `${pct.toFixed(2)}%`
}

async function copyShareLink(replay: Replay): Promise<void> {
  if (!replay.share_token)
    return
  const url = `${window.location.origin}/replay/share/${encodeURIComponent(replay.share_token)}`
  try {
    if (navigator.clipboard && window.isSecureContext)
      await navigator.clipboard.writeText(url)
    else
      fallbackCopy(url)
    copiedId.value = replay.id
    window.setTimeout(() => {
      if (copiedId.value === replay.id)
        copiedId.value = null
    }, 2000)
  }
  catch {
    // Clipboard is best-effort — ignore failures.
  }
}

function fallbackCopy(text: string): void {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}
</script>

<template>
  <div class="space-y-2">
    <p v-if="!rows.length" class="text-sm text-slate-400">
      {{ t('myphira.noReplays') }}
    </p>
    <ul v-else class="space-y-2">
      <li
        v-for="row in rows"
        :key="row.replay.id"
        class="glass-focusable rounded-lg border border-white/10 bg-white/5 p-3"
      >
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-slate-100">
              {{ row.replay.chart_name || '—' }}
            </p>
            <p class="mt-0.5 text-xs text-slate-400">
              {{ row.replay.player?.username || '—' }} · {{ formatDate(row.replay.created_at) }}
            </p>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <span class="text-slate-300">{{ formatScore(row.replay.score) }}</span>
            <span class="text-slate-600">/</span>
            <span class="text-slate-300">{{ formatAccuracy(row.replay.accuracy) }}</span>
            <span
              class="rounded-full px-2 py-0.5 text-xs ring-1"
              :class="row.visibilityClass"
            >
              {{ t(row.visibilityLabel) }}
            </span>
            <BaseButton
              v-if="row.replay.share_token"
              size="sm"
              variant="ghost"
              @click="copyShareLink(row.replay)"
            >
              {{ copiedId === row.replay.id ? t('myphira.copied') : t('myphira.share') }}
            </BaseButton>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
