<script setup lang="ts">
import ReplayList from '~/components/myphira/ReplayList.vue'
import UserAvatar from '~/components/myphira/UserAvatar.vue'
import { sendFriendRequest } from '~/composables/useCommunity'

/**
 * Public profile is an environment, not a profile card. PPB owns visibility:
 * private/friends-only fields (including background) are omitted server-side.
 */
const { t } = useI18n()
const notice = useNotice()
const route = useRoute()
const phiraId = computed(() => String(route.params.phira_id))

const { user, pending, error: userError, refresh } = useUserProfile(phiraId)
const replayPlayerId = computed(() => {
  const value = Number(phiraId.value)
  return Number.isFinite(value) ? value : undefined
})
const { replays, error: replaysError, pending: replaysPending, refresh: refreshReplays } = useReplayList(replayPlayerId)

usePageSeo(() => ({
  title: user.value?.username ?? t('nav.community'),
  description: user.value?.bio ?? t('community.empty'),
  image: user.value?.avatar ?? null,
  type: 'profile',
  noindex: user.value?.profile_visibility === 'private',
  jsonLd: user.value && user.value.profile_visibility !== 'private'
    ? {
        '@context': 'https://schema.org',
        '@type': 'Person',
        'name': user.value.username,
        'identifier': String(user.value.phira_id),
        'image': user.value.avatar ?? undefined,
        'description': user.value.bio ?? undefined,
      }
    : undefined,
}))

const isPrivate = computed(() => user.value?.profile_visibility === 'private')
const stats = computed(() => user.value?.stats)
const summaryItems = computed(() => {
  if (!user.value || isPrivate.value)
    return []
  return [
    user.value.rks != null ? { label: t('myphira.rks'), value: String(user.value.rks) } : null,
    stats.value?.plays != null ? { label: t('myphira.plays'), value: String(stats.value.plays) } : null,
    stats.value?.avg_accuracy != null ? { label: t('myphira.avgAccuracy'), value: String(stats.value.avg_accuracy) } : null,
    stats.value?.best_score != null ? { label: t('myphira.bestScore'), value: String(stats.value.best_score) } : null,
    user.value.friends_count != null ? { label: t('community.friends'), value: String(user.value.friends_count) } : null,
  ].filter((item): item is { label: string, value: string } => Boolean(item))
})

const onlineKey = computed(() => {
  if (user.value?.online_status === 'online')
    return 'user.online'
  if (user.value?.online_status === 'offline')
    return 'user.offline'
  return 'user.onlineHidden'
})
const onlineTone = computed(() => user.value?.online_status === 'online' ? 'bg-emerald-400' : 'bg-slate-500')

const requestSent = ref(false)
const busy = ref(false)
async function addFriend(): Promise<void> {
  if (busy.value)
    return
  busy.value = true
  try {
    await sendFriendRequest(phiraId.value)
    requestSent.value = true
    notice.success('notice.friendRequestSent', { dedupKey: `friend-request:${phiraId.value}` })
  }
  catch (error) {
    notice.errorFromApi(error, { dedupKey: `friend-request:${phiraId.value}:error` })
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex items-center justify-between gap-3">
      <h1 class="text-xl font-semibold text-[var(--pp-text-primary)]">
        {{ t('nav.community') }}
      </h1>
      <NuxtLink to="/community" class="min-h-11 py-3 text-sm text-[var(--pp-text-secondary)] hover:text-accent">
        ← {{ t('user.backToCommunity') }}
      </NuxtLink>
    </header>

    <p v-if="pending" class="py-12 text-sm text-[var(--pp-text-secondary)]">
      {{ t('common.loading') }}
    </p>

    <div v-else-if="userError || !user" class="border-y border-[var(--pp-border-subtle)] py-8" role="alert">
      <p class="text-sm text-rose-300">
        {{ t('common.error') }}
      </p>
      <PPButton weight="quiet" size="sm" class="mt-3" @click="refresh()">
        {{ t('common.retry') }}
      </PPButton>
    </div>

    <template v-else>
      <section class="profile-environment relative isolate min-h-72 overflow-hidden rounded-[var(--pp-radius-window)] border border-[var(--pp-border-subtle)]">
        <img
          v-if="user.background_url && !isPrivate"
          :src="user.background_url"
          alt=""
          class="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        >
        <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,9,14,.88)_0%,rgba(4,9,14,.68)_48%,rgba(4,9,14,.42)_100%)]" aria-hidden="true" />
        <div class="flex min-h-72 flex-col justify-end p-6 sm:p-8">
          <div class="flex flex-wrap items-end gap-5">
            <UserAvatar :name="user.username" :avatar="user.avatar" size="lg" />
            <div class="min-w-0 flex-1 pb-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="truncate text-2xl font-semibold text-white">
                  {{ user.username }}
                </h2>
                <span v-if="user.online_status" class="inline-flex items-center gap-1.5 text-xs text-white/70">
                  <span class="h-2 w-2 rounded-full" :class="onlineTone" aria-hidden="true" />
                  {{ t(onlineKey) }}
                </span>
                <span v-if="isPrivate" class="rounded-full border border-amber-300/30 bg-black/25 px-2 py-0.5 text-xs text-amber-100">
                  {{ t('user.privateProfile') }}
                </span>
              </div>
              <p class="mt-1 text-sm text-white/60">
                #{{ user.phira_id }}
              </p>
              <p v-if="user.bio && !isPrivate" class="mt-3 max-w-2xl text-sm leading-6 text-white/80">
                {{ user.bio }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2 pb-1">
              <span v-if="user.is_blocked" class="px-3 py-2 text-sm text-rose-200">{{ t('user.isBlocked') }}</span>
              <span v-else-if="user.is_friend" class="px-3 py-2 text-sm text-emerald-200">{{ t('user.isFriend') }}</span>
              <PPButton v-else weight="primary" size="sm" :disabled="busy || requestSent" @click="addFriend">
                {{ requestSent ? t('user.friendRequestSent') : t('user.addFriend') }}
              </PPButton>
            </div>
          </div>
        </div>
      </section>

      <section v-if="!isPrivate && summaryItems.length" class="border-y border-[var(--pp-border-subtle)] py-4">
        <dl class="flex flex-wrap gap-x-8 gap-y-3">
          <div v-for="item in summaryItems" :key="item.label" class="min-w-24">
            <dt class="text-xs text-[var(--pp-text-tertiary)]">
              {{ item.label }}
            </dt>
            <dd class="mt-1 text-lg font-semibold text-[var(--pp-text-primary)]">
              {{ item.value }}
            </dd>
          </div>
        </dl>
      </section>

      <p v-if="isPrivate" class="border-y border-[var(--pp-border-subtle)] py-6 text-sm text-[var(--pp-text-secondary)]">
        {{ t('user.privateProfile') }}
      </p>

      <section v-else>
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--pp-text-secondary)]">
            {{ t('user.publicReplays') }}
          </h2>
        </div>
        <p v-if="replaysPending" class="py-5 text-sm text-[var(--pp-text-secondary)]">
          {{ t('common.loading') }}
        </p>
        <div v-else-if="replaysError" class="border-y border-[var(--pp-border-subtle)] py-5">
          <p class="text-sm text-rose-300">
            {{ t('common.error') }}
          </p>
          <PPButton weight="quiet" size="sm" class="mt-3" @click="refreshReplays()">
            {{ t('common.retry') }}
          </PPButton>
        </div>
        <ReplayList v-else :replays="replays" />
      </section>
    </template>
  </div>
</template>
