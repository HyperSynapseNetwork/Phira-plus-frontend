<script setup lang="ts">
/**
 * Replays list page (design §16.5 Replay).
 *
 * PPB replay list endpoints are not ready yet — this page renders a graceful
 * placeholder and the presentational `ReplayList` with an empty array so the
 * structure is in place for when the replay API lands.
 */
import type { Replay } from '~/utils/api/types'
import ReplayList from '~/components/myphira/ReplayList.vue'

const { t } = useI18n()

useHead({ title: () => t('replays.title') })

const replays: Replay[] = []
</script>

<template>
  <div class="space-y-4">
    <header>
      <h1 class="text-2xl font-bold text-slate-50">
        {{ $t('replays.title') }}
      </h1>
      <p class="mt-1 text-sm text-slate-400">
        {{ $t('replays.pending') }}
      </p>
    </header>

    <section class="content-surface p-6">
      <p class="text-sm text-slate-400">
        {{ $t('replays.empty') }}
      </p>
      <div class="mt-4">
        <ReplayList :replays="replays" />
      </div>
    </section>
  </div>
</template>
