<script setup lang="ts">
/**
 * Chart Preview (design §12.7) — lazy WASM `ChartPlayer` canvas.
 *
 * Nothing is downloaded until the user clicks "Load preview". The WASM bundle
 * is fetched on demand; if it is absent (dev / SSG without the CI artifact)
 * the composable reports `available=false` and we render the unavailable
 * state instead of breaking the page.
 */
import { VIEWER_NOMINAL_DURATION } from '~/viewer/loader'
import { useChartPlayer } from '~/viewer/useChartPlayer'

const props = defineProps<{
  chartId: number | string
}>()

const emit = defineEmits<{
  loaded: []
  error: [message: string]
}>()

const started = ref(false)
const seekValue = ref(0)
const canvasId = `chart-preview-canvas-${Math.random().toString(36).slice(2, 10)}`
const canvasRef = ref<HTMLCanvasElement | null>(null)

const {
  available,
  loading: viewerLoading,
  error,
  isPaused,
  lowPerf,
  volume,
  muted,
  seek,
  toggleFullscreen,
  togglePlay,
  loadAndPlay,
} = useChartPlayer(() => props.chartId, canvasRef)

async function startPreview(): Promise<void> {
  started.value = true
  await nextTick()
  const ok = await loadAndPlay()
  if (ok)
    emit('loaded')
  else
    emit('error', error.value ?? 'viewer.error')
}

function onSeek(event: Event): void {
  const ratio = Number((event.target as HTMLInputElement).value)
  seekValue.value = ratio
  seek(ratio * VIEWER_NOMINAL_DURATION)
}
</script>

<template>
  <div>
    <!-- Lazy load placeholder — no download until the user clicks. -->
    <div
      v-if="!started"
      class="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/10 bg-white/[0.03] px-4 text-center"
    >
      <p class="text-sm text-slate-400">
        {{ $t('viewer.dataSource') }}
      </p>
      <BaseButton variant="primary" size="md" @click="startPreview">
        {{ $t('viewer.loadPreview') }}
      </BaseButton>
    </div>

    <!-- Viewer stage -->
    <div v-else>
      <div class="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-black/40">
        <canvas
          :id="canvasId"
          ref="canvasRef"
          class="h-full w-full"
          :class="lowPerf ? 'opacity-90' : ''"
        />
        <div v-if="viewerLoading" class="absolute inset-0 grid place-items-center bg-black/40">
          <p class="text-sm text-slate-300">
            {{ $t('viewer.loading') }}
          </p>
        </div>
        <div v-else-if="!available" class="absolute inset-0 grid place-items-center bg-black/40 px-6 text-center">
          <p class="text-sm text-slate-400">
            {{ $t('viewer.unavailable') }}
          </p>
        </div>
        <div v-else-if="error" class="absolute inset-0 grid place-items-center bg-black/40 px-6 text-center">
          <p class="text-sm text-slate-400">
            {{ $t(error || 'viewer.error') }}
          </p>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <BaseButton size="sm" variant="ghost" :disabled="!available || !!error || viewerLoading" @click="togglePlay">
          {{ isPaused ? $t('viewer.play') : $t('viewer.pause') }}
        </BaseButton>

        <label class="flex min-w-0 flex-1 items-center gap-2 text-xs text-slate-400">
          <span class="shrink-0">{{ $t('viewer.seek') }}</span>
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

        <!-- Volume: the WASM ChartPlayer has no gain API yet — the slider is
             disabled and only the mute state is tracked locally. -->
        <span class="inline-flex items-center gap-1.5" :title="$t('viewer.volumeUnsupported')">
          <BaseButton size="sm" variant="ghost" @click="muted = !muted">
            {{ muted ? $t('viewer.muted') : $t('viewer.volume') }}
          </BaseButton>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            disabled
            :value="volume"
            :aria-label="$t('viewer.volume')"
            class="h-1.5 w-16 accent-accent opacity-40"
          >
        </span>

        <BaseButton size="sm" variant="ghost" @click="toggleFullscreen">
          {{ $t('viewer.fullscreen') }}
        </BaseButton>

        <span
          v-if="lowPerf"
          class="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent ring-1 ring-accent/30"
        >
          {{ $t('viewer.lowPerf') }}
        </span>
      </div>
    </div>
  </div>
</template>
