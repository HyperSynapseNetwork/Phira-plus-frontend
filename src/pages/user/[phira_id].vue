<script setup lang="ts">
import ReplayList from '~/components/myphira/ReplayList.vue'
import UserAvatar from '~/components/myphira/UserAvatar.vue'
import { sendFriendRequest } from '~/composables/useCommunity'

/**
 * Public community profile at `/user/:phira_id` (design §16.6 / §7).
 * Honest to the `UserProfile` type: online status respects the user's own
 * privacy (`hidden`), private profiles gate content, and friend-request
 * actions degrade gracefully while PPB Phase B is unready.
 */

const { t } = useI18n()

const route = useRoute()
const phiraId = computed(() => String(route.params.phira_id))

const { user, pending, refresh } = useUserProfile(phiraId)

usePageSeo(() => ({
  title: user.value?.username ?? t('nav.community'),
  description: user.value?.bio ?? t('community.empty'),
  image: user.value?.avatar ?? null,
  type: 'profile',
  // Respect privacy: private profiles are not indexed in detail.
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

const showLoading = computed(() => pending.value)
const showError = computed(() => !pending.value && !user.value)
const showContent = computed(() => Boolean(user.value))

const isPrivate = computed(() => user.value?.profile_visibility === 'private')

const onlineKey = computed(() => {
  const status = user.value?.online_status
  if (status === 'online')
    return 'user.online'
  if (status === 'offline')
    return 'user.offline'
  return 'user.onlineHidden'
})

const onlineDot = computed(() => {
  const status = user.value?.online_status
  if (status === 'online')
    return 'bg-emerald-400'
  if (status === 'offline')
    return 'bg-slate-500'
  return 'bg-slate-600'
})

const requestSent = ref(false)
const busy = ref(false)

async function addFriend(): Promise<void> {
  if (busy.value)
    return
  busy.value = true
  try {
    await sendFriendRequest(phiraId.value)
    requestSent.value = true
  }
  catch {
    // PPB may be unready — keep the action retryable.
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-slate-50">
        {{ t('nav.community') }}
      </h1>
      <NuxtLink to="/community" class="text-sm text-slate-400 hover:text-accent">
        ← {{ t('user.backToCommunity') }}
      </NuxtLink>
    </header>

    <p v-if="showLoading" class="text-sm text-slate-400">
      {{ t('common.loading') }}
    </p>

    <section v-else-if="showContent && user" class="content-surface p-6">
      <div class="flex flex-wrap items-start gap-4">
        <UserAvatar :name="user.username" :avatar="user.avatar" size="lg" />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-semibold text-slate-50">
              {{ user.username }}
            </h2>
            <span
              v-if="user.online_status"
              class="flex items-center gap-1.5 text-xs text-slate-400"
            >
              <span class="h-2 w-2 rounded-full" :class="onlineDot" />
              {{ t(onlineKey) }}
            </span>
            <span
              v-if="user.profile_visibility === 'private'"
              class="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-200 ring-1 ring-amber-400/30"
            >
              {{ t('user.privateProfile') }}
            </span>
          </div>
          <p class="mt-1 text-sm text-slate-400">
            #{{ user.phira_id }}
          </p>

          <!-- Friend relationship actions (respect privacy) -->
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <span
              v-if="user.is_blocked"
              class="rounded-full bg-rose-500/15 px-3 py-1 text-sm text-rose-200 ring-1 ring-rose-400/30"
            >
              {{ t('user.isBlocked') }}
            </span>
            <span
              v-else-if="user.is_friend"
              class="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-200 ring-1 ring-emerald-400/30"
            >
              {{ t('user.isFriend') }}
            </span>
            <BaseButton
              v-else
              variant="primary"
              size="sm"
              :disabled="busy || requestSent"
              @click="addFriend"
            >
              {{ requestSent ? t('user.friendRequestSent') : t('user.addFriend') }}
            </BaseButton>
          </div>
        </div>
      </div>

      <template v-if="!isPrivate">
        <p v-if="user.bio" class="mt-4 text-sm text-slate-300">
          <span class="text-slate-500">{{ t('user.bio') }}:</span> {{ user.bio }}
        </p>

        <div class="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span class="rounded-full bg-white/5 px-2 py-0.5 text-slate-300 ring-1 ring-white/10">
            {{ t('myphira.rks') }}: {{ user.rks ?? '—' }}
          </span>
          <span v-if="user.friends_count !== undefined">
            {{ t('user.friendsCount', { count: user.friends_count }) }}
          </span>
        </div>

        <div v-if="user.stats" class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="rounded-lg bg-white/5 p-3">
            <p class="text-xs text-slate-400">
              {{ t('myphira.plays') }}
            </p>
            <p class="mt-1 text-lg font-semibold text-slate-100">
              {{ user.stats.plays ?? '—' }}
            </p>
          </div>
          <div class="rounded-lg bg-white/5 p-3">
            <p class="text-xs text-slate-400">
              {{ t('myphira.avgAccuracy') }}
            </p>
            <p class="mt-1 text-lg font-semibold text-slate-100">
              {{ user.stats.avg_accuracy ?? '—' }}
            </p>
          </div>
          <div class="rounded-lg bg-white/5 p-3">
            <p class="text-xs text-slate-400">
              {{ t('myphira.bestScore') }}
            </p>
            <p class="mt-1 text-lg font-semibold text-slate-100">
              {{ user.stats.best_score ?? '—' }}
            </p>
          </div>
        </div>
      </template>

      <p v-else class="mt-4 text-sm text-slate-400">
        {{ t('user.privateProfile') }}
      </p>
    </section>

    <!-- Public replays (presentational placeholder — PPB replay endpoints pending) -->
    <section v-if="showContent && user && !isPrivate" class="content-surface p-6">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
        {{ t('user.publicReplays') }}
      </h2>
      <div class="mt-3">
        <ReplayList :replays="[]" />
      </div>
      <p class="mt-2 text-sm text-slate-400">
        {{ t('user.publicReplaysPlaceholder') }}
      </p>
    </section>

    <section v-else-if="showError" class="content-surface p-6">
      <p class="text-sm text-slate-400">
        {{ t('common.error') }}
      </p>
      <BaseButton variant="primary" size="sm" class="mt-4" @click="refresh()">
        {{ t('common.retry') }}
      </BaseButton>
    </section>
  </div>
</template>
