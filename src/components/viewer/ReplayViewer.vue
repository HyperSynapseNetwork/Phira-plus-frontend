<script setup lang="ts">
/**
 * Replay Viewer (design §12.2 / §12.5) — ChartPlayer-based presentational
 * viewer fed by the PPB replay viewer blob. No raw replay file download
 * (contract §12.2); share access always goes through PPB's viewer stream.
 */
import { VIEWER_NOMINAL_DURATION } from '~/viewer/loader'
import { useReplayViewer } from '~/viewer/useReplayViewer'

const props = defineProps<{
  roundUuid?: string
  playerPhiraId?: number
  shareToken?: string
}>()

const identifier = computed(() => props.roundUuid ?? '')
const canvasId = `replay-viewer-canvas-${Math.random().toString(36).slice(2, 10)}`
const canvasRef = ref<HTMLCanvasElement | null>(null)
const seekValue = ref(0)

const {
  status,
  error,
  isPlaying,
  analysis,
  load,
  play,
  pause,
  seek,
} = useReplayViewer(identifier, canvasRef, () => props.playerPhiraId, () => props.shareToken)

const maxBucket = computed(() => Math.max(1, ...(analysis.value?.buckets.map(bucket => bucket.count) ?? [1])))

onMounted(() => {
  if (identifier.value || props.shareToken)
    void load()
})

function onSeek(event: Event): void {
  const ratio = Number((event.target as HTMLInputElement).value)
  seekValue.value = ratio
  seek(ratio * VIEWER_NOMINAL_DURATION)
}

async function togglePlay(): Promise<void> {
  if (isPlaying.value)
    pause()
  else
    await play()
}
</script>

<template>
  <div class="space-y-3">
    <p v-if="!identifier && !shareToken" class="text-sm text-slate-400">
      {{ $t('viewer.replayNoData') }}
    </p>

    <template v-else>
      <div class="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-black/40">
        <canvas :id="canvasId" ref="canvasRef" class="h-full w-full" />

        <div v-if="status === 'unavailable'" class="absolute inset-0 grid place-items-center bg-black/40 px-6 text-center">
          <p class="text-sm text-slate-400">
            {{ $t('viewer.replayUnavailable') }}
          </p>
        </div>

        <div v-else-if="status === 'loading'" class="absolute inset-0 grid place-items-center bg-black/40">
          <p class="text-sm text-slate-300">
            {{ $t('viewer.loading') }}
          </p>
        </div>

        <div v-else-if="status === 'error'" class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 px-6 text-center">
          <p class="text-sm text-slate-400">
            {{ $t(error || 'viewer.replayNoData') }}
          </p>
          <PPButton size="sm" weight="quiet" @click="load">
            {{ $t('viewer.replayPlay') }}
          </PPButton>
        </div>

        <div v-else-if="status === 'idle'" class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 px-6 text-center">
          <p class="text-sm text-slate-400">
            {{ $t('viewer.replayNoData') }}
          </p>
          <PPButton size="sm" weight="primary" @click="load">
            {{ $t('viewer.replayPlay') }}
          </PPButton>
        </div>
      </div>

      <div v-if="status === 'ready'" class="flex flex-wrap items-center gap-2">
        <PPButton size="sm" weight="quiet" @click="togglePlay">
          {{ isPlaying ? $t('viewer.replayPause') : $t('viewer.replayPlay') }}
        </PPButton>
        <label class="flex min-w-0 flex-1 items-center gap-2 text-xs text-slate-400">
          <span class="shrink-0">{{ $t('viewer.replaySeek') }}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            :value="seekValue"
            class="h-1.5 min-w-0 flex-1 accent-accent"
            @input="onSeek"
          >
        </label>
      </div>

      <section v-if="analysis" class="rounded-lg border border-white/10 bg-white/5 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-slate-100">
            {{ $t('viewer.offsetDistribution') }}
          </h3>
          <span class="text-xs text-slate-400">
            {{ $t('viewer.frameCounts', { touches: analysis.touches, judges: analysis.judges }) }}
          </span>
        </div>
        <p class="mt-1 text-xs text-slate-400">
          {{ $t('viewer.meanOffset', { value: analysis.meanOffsetMs == null ? '—' : analysis.meanOffsetMs.toFixed(1) }) }}
        </p>
        <div class="mt-4 grid grid-cols-5 items-end gap-2" role="img" :aria-label="$t('viewer.offsetDistribution')">
          <div v-for="bucket in analysis.buckets" :key="bucket.key" class="flex min-w-0 flex-col items-center gap-1">
            <span class="text-xs tabular-nums text-slate-300">{{ bucket.count }}</span>
            <div class="flex h-20 w-full items-end rounded-sm bg-black/20">
              <div
                class="w-full rounded-sm bg-accent/70"
                :style="{ height: `${Math.max(bucket.count ? 8 : 0, bucket.count / maxBucket * 100)}%` }"
              />
            </div>
            <span class="truncate text-[10px] text-slate-500">{{ $t(`viewer.bucket.${bucket.key}`) }}</span>
          </div>
        </div>
        <p v-if="analysis.unmatched" class="mt-3 text-xs text-amber-300">
          {{ $t('viewer.unmatchedJudges', { count: analysis.unmatched }) }}
        </p>
      </section>

      <p class="text-xs text-slate-500">
        {{ $t('viewer.replayNoRawDownload') }}
      </p>
    </template>
  </div>
</template>
