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
  shareToken?: string
}>()

const identifier = computed(() => props.roundUuid ?? props.shareToken ?? '')
const canvasId = `replay-viewer-canvas-${Math.random().toString(36).slice(2, 10)}`
const canvasRef = ref<HTMLCanvasElement | null>(null)
const seekValue = ref(0)

const {
  status,
  error,
  isPlaying,
  load,
  play,
  pause,
  seek,
} = useReplayViewer(identifier, canvasRef)

onMounted(() => {
  if (identifier.value)
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
    <p v-if="!identifier" class="text-sm text-slate-400">
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
          <BaseButton size="sm" variant="ghost" @click="load">
            {{ $t('viewer.replayPlay') }}
          </BaseButton>
        </div>

        <div v-else-if="status === 'idle'" class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 px-6 text-center">
          <p class="text-sm text-slate-400">
            {{ $t('viewer.replayNoData') }}
          </p>
          <BaseButton size="sm" variant="primary" @click="load">
            {{ $t('viewer.replayPlay') }}
          </BaseButton>
        </div>
      </div>

      <div v-if="status === 'ready'" class="flex flex-wrap items-center gap-2">
        <BaseButton size="sm" variant="ghost" @click="togglePlay">
          {{ isPlaying ? $t('viewer.replayPause') : $t('viewer.replayPlay') }}
        </BaseButton>
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

      <p class="text-xs text-slate-500">
        {{ $t('viewer.replayNoRawDownload') }}
      </p>
    </template>
  </div>
</template>
