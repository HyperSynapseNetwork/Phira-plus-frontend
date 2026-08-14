<script setup lang="ts">
const { visible, dismiss, runAction, renderMessage } = useNotice()
const { t } = useI18n()
async function copyRequestId(id: string) {
  if (import.meta.client)
    await navigator.clipboard?.writeText(id)
}

function roleFor(tone: string): 'alert' | 'status' {
  return tone === 'error' || tone === 'warning' ? 'alert' : 'status'
}

function railClass(tone: string): string {
  if (tone === 'error')
    return 'bg-rose-400/80'
  if (tone === 'warning')
    return 'bg-amber-300/80'
  if (tone === 'success')
    return 'bg-emerald-300/80'
  if (tone === 'loading')
    return 'bg-sky-300/70'
  return 'bg-slate-300/60'
}
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[var(--pp-z-notice)] flex flex-col items-stretch gap-2 sm:left-auto sm:right-4 sm:top-4 sm:w-[min(26rem,calc(100vw-2rem))]"
      :aria-label="t('a11y.notifications')"
    >
      <TransitionGroup name="pp-notice" tag="div" class="contents">
        <article
          v-for="item in visible"
          :key="item.id"
          class="pp-notice-card pointer-events-auto relative overflow-hidden rounded-[var(--pp-radius-window)] border border-[var(--pp-border-subtle)] bg-[var(--pp-material-thick)] shadow-[var(--pp-shadow-window)] backdrop-blur-[var(--pp-material-blur)]"
          :role="roleFor(item.tone)"
          :aria-live="roleFor(item.tone) === 'alert' ? 'assertive' : 'polite'"
        >
          <span class="absolute inset-y-0 left-0 w-1" :class="railClass(item.tone)" aria-hidden="true" />
          <div class="flex items-start gap-3 px-4 py-3 pl-5">
            <span v-if="item.tone === 'loading'" class="mt-1 h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-slate-400 border-t-slate-100" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <p v-if="item.titleKey" class="text-sm font-semibold text-slate-100">
                {{ t(item.titleKey) }}
              </p>
              <p class="text-sm leading-5 text-slate-200">
                {{ renderMessage(item) }}
              </p>
              <details v-if="item.requestId" class="mt-1.5 text-xs text-slate-500">
                <summary class="cursor-pointer select-none">
                  {{ t('common.details') }}
                </summary>
                <div class="mt-1 flex items-center gap-2">
                  <code class="break-all">{{ item.requestId }}</code><button type="button" class="inline-flex min-h-11 items-center text-accent hover:underline" @click="copyRequestId(item.requestId)">
                    {{ t('common.copy') }}
                  </button>
                </div>
              </details>
              <button
                v-if="item.action"
                type="button"
                class="mt-2 inline-flex min-h-11 items-center text-xs font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                @click="runAction(item)"
              >
                {{ t(item.action.labelKey) }}
              </button>
            </div>
            <button
              v-if="item.dismissible !== false"
              type="button"
              data-pp-touch-critical="notice-close"
              class="pp-touch-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--pp-radius-control)] text-slate-400 hover:bg-white/5 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              :aria-label="t('common.close')"
              @click="dismiss(item.id)"
            >
              <PPIcon name="close" class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
