<script setup lang="ts">
/**
 * Replays list page (design §16.5 Replay).
 *
 * Uses PPB's public replay inventory and keeps authentication, loading, error,
 * and empty states distinct.
 */
import ReplayList from '~/components/myphira/ReplayList.vue'
import { useReplayList } from '~/composables/useReplays'

const { t } = useI18n()

useHead({ title: () => t('replays.title') })

const { profile, authenticated } = useSession()
const playerId = computed(() => profile.value?.phira_id)
const { replays, error, pending, refresh } = useReplayList(playerId)
</script>

<template>
  <div class="space-y-4">
    <header>
      <h1 class="text-2xl font-bold text-slate-50">
        {{ $t('replays.title') }}
      </h1>
      <p v-if="!authenticated" class="mt-1 text-sm text-slate-400">
        {{ $t('common.authRequired') }}
      </p>
    </header>

    <PPSurface as="section" class="p-6">
      <p v-if="pending" class="text-sm text-slate-400">
        {{ $t('common.loading') }}
      </p>
      <div v-else-if="error" class="space-y-3">
        <p class="text-sm text-rose-300">
          {{ $t('common.error') }}
        </p>
        <PPButton size="sm" weight="quiet" @click="() => refresh()">
          {{ $t('common.retry') }}
        </PPButton>
      </div>
      <ReplayList v-else :replays="replays" />
    </PPSurface>
  </div>
</template>
