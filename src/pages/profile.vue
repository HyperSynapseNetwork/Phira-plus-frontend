<script setup lang="ts">
import FriendCards from '~/components/myphira/FriendCards.vue'
import FriendRequestList from '~/components/myphira/FriendRequestList.vue'
import ReplayList from '~/components/myphira/ReplayList.vue'
import UserAvatar from '~/components/myphira/UserAvatar.vue'

/**
 * MyPhira (design §16.5): Overview / Replay / Friends / Settings.
 * Client-only session + community data with graceful empty fallbacks —
 * PPB Phase B may not be finished (replay/aggregation endpoints pending).
 */

const { t } = useI18n()
useHead({ title: computed(() => t('nav.profile')) })

const { pending, authenticated, profile, identities, requiresReauth, logout } = useSession()

type TabKey = 'overview' | 'replay' | 'friends' | 'settings'
const activeTab = ref<TabKey>('overview')
const tabs: { key: TabKey, label: string }[] = [
  { key: 'overview', label: 'myphira.tabOverview' },
  { key: 'replay', label: 'myphira.tabReplay' },
  { key: 'friends', label: 'myphira.tabFriends' },
  { key: 'settings', label: 'myphira.tabSettings' },
]

function selectTab(key: TabKey): void {
  activeTab.value = key
}

// Unauthenticated while the session probe settles → guest panel.
const showGuest = computed(() => !pending.value && !authenticated.value)

const { data: friendData, pending: friendsPending, refresh: refreshFriends } = useFriendList()
const { data: requestData, pending: requestsPending, refresh: refreshRequests } = useFriendRequests()

async function refreshCommunity(): Promise<void> {
  await Promise.allSettled([refreshFriends(), refreshRequests()])
}

async function onRemoveFriend(phiraId: number): Promise<void> {
  try {
    await removeFriend(phiraId)
  }
  catch {
    // PPB may be unready — keep the list unchanged rather than crash.
  }
  await refreshFriends()
}

async function onBlockUser(phiraId: number): Promise<void> {
  try {
    await blockUser(phiraId)
  }
  catch {
    // Best-effort.
  }
  await refreshFriends()
}

const profileVisibilityKey: Record<'public' | 'friends' | 'private', string> = {
  public: 'myphira.visibilityPublic',
  friends: 'myphira.visibilityFriends',
  private: 'myphira.visibilityPrivate',
}

const profileBadge = computed(() => {
  const visibility = profile.value?.profile_visibility
  if (!visibility)
    return undefined
  return {
    label: profileVisibilityKey[visibility] ?? 'myphira.visibilityPublic',
    cls: 'bg-accent/15 text-accent ring-accent/40',
  }
})

/** Fields PPB hasn't frozen for MeProfile yet — render honest `—`. */
const placeholderStats: { label: string, value: string }[] = [
  { label: 'myphira.plays', value: '—' },
  { label: 'myphira.avgAccuracy', value: '—' },
  { label: 'myphira.bestScore', value: '—' },
]

function identityLabel(identity: { provider: string, provider_name?: string }): string {
  return identity.provider_name || identity.provider
}
</script>

<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-slate-50">
        {{ t('nav.profile') }}
      </h1>
    </header>

    <!-- Guest state (design §21.3): login CTA + guest display prefs -->
    <section v-if="showGuest" class="content-surface p-6">
      <p class="text-sm text-slate-400">
        {{ t('profile.empty') }}
      </p>
      <BaseButton variant="primary" class="mt-4" as="NuxtLink" to="/login">
        {{ t('profile.loginCta') }}
      </BaseButton>
      <div class="mt-6 border-t border-white/10 pt-6">
        <PreferencesPanel />
      </div>
    </section>

    <template v-else>
      <!-- MyPhira tab bar -->
      <nav class="glass-focusable flex flex-wrap gap-1 rounded-lg bg-white/5 p-1" aria-label="MyPhira tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="activeTab === tab.key ? 'bg-accent/15 text-accent ring-1 ring-accent/50' : 'text-slate-300 hover:text-slate-100'"
          @click="selectTab(tab.key)"
        >
          {{ t(tab.label) }}
        </button>
      </nav>

      <!-- ============================ Overview ============================ -->
      <div v-if="activeTab === 'overview'" class="space-y-4">
        <section class="content-surface p-6">
          <div class="flex flex-wrap items-start gap-4">
            <UserAvatar :name="profile?.username" :avatar="profile?.avatar" size="lg" />
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-slate-50">
                {{ profile?.username || '—' }}
              </h2>
              <p class="text-sm text-slate-400">
                #{{ profile?.phira_id ?? '—' }}
              </p>
              <p v-if="profile?.status" class="mt-1 text-sm text-slate-300">
                {{ profile.status }}
              </p>
              <p v-if="profile?.bio" class="mt-1 text-sm text-slate-400">
                {{ profile.bio }}
              </p>
              <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span class="rounded-full bg-white/5 px-2 py-0.5 text-slate-300 ring-1 ring-white/10">
                  {{ t('myphira.rks') }}: —
                </span>
                <span
                  v-if="profileBadge"
                  class="rounded-full px-2 py-0.5 ring-1"
                  :class="profileBadge.cls"
                >
                  {{ t(profileBadge.label) }}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div
              v-for="stat in placeholderStats"
              :key="stat.label"
              class="rounded-lg bg-white/5 p-3"
            >
              <p class="text-xs text-slate-400">
                {{ t(stat.label) }}
              </p>
              <p class="mt-1 text-lg font-semibold text-slate-100">
                {{ stat.value }}
              </p>
            </div>
          </div>
        </section>

        <div class="grid gap-4 lg:grid-cols-2">
          <section class="content-surface p-6">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
              {{ t('myphira.bestRecent') }}
            </h3>
            <p class="mt-2 text-sm text-slate-400">
              {{ t('myphira.bestRecentPlaceholder') }}
            </p>
          </section>
          <section class="content-surface p-6">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
              {{ t('myphira.multiplayer') }}
            </h3>
            <p class="mt-2 text-sm text-slate-400">
              {{ t('myphira.multiplayerPlaceholder') }}
            </p>
          </section>
        </div>

        <section class="content-surface p-6">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
            {{ t('myphira.recentReplay') }}
          </h3>
          <div class="mt-3">
            <ReplayList :replays="[]" />
          </div>
          <p class="mt-2 text-sm text-slate-400">
            {{ t('myphira.replayPlaceholder') }}
          </p>
        </section>

        <div class="grid gap-4 lg:grid-cols-2">
          <section class="content-surface p-6">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
              {{ t('community.friends') }}
            </h3>
            <p class="mt-2 text-2xl font-semibold text-slate-100">
              {{ friendData.total }}
            </p>
          </section>
          <section class="content-surface p-6">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
              {{ t('community.friendRequests') }}
            </h3>
            <p class="mt-2 text-2xl font-semibold text-slate-100">
              {{ requestData.total }}
            </p>
          </section>
        </div>
      </div>

      <!-- ============================= Replay ============================= -->
      <section v-else-if="activeTab === 'replay'" class="content-surface p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
          {{ t('myphira.tabReplay') }}
        </h2>
        <div class="mt-3">
          <ReplayList :replays="[]" />
        </div>
        <p class="mt-2 text-sm text-slate-400">
          {{ t('myphira.replayPlaceholder') }}
        </p>
        <p class="mt-1 text-sm text-slate-400">
          {{ t('myphira.replayVisibility') }}
        </p>
      </section>

      <!-- ============================ Friends ============================= -->
      <div v-else-if="activeTab === 'friends'" class="space-y-4">
        <section class="content-surface p-6">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
              {{ t('community.friends') }}
            </h2>
            <span class="text-xs text-slate-500">
              {{ friendsPending ? t('common.loading') : friendData.total }}
            </span>
          </div>
          <div class="mt-4">
            <FriendCards :friends="friendData.items" @remove="onRemoveFriend" @block="onBlockUser" />
          </div>
        </section>

        <section class="content-surface p-6">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
              {{ t('community.friendRequests') }}
            </h2>
            <span class="text-xs text-slate-500">
              {{ requestsPending ? t('common.loading') : requestData.total }}
            </span>
          </div>
          <div class="mt-4">
            <FriendRequestList :requests="requestData.items" @changed="refreshCommunity" />
          </div>
        </section>
      </div>

      <!-- ============================ Settings ============================ -->
      <div v-else class="space-y-4">
        <section class="content-surface p-6">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
            {{ t('myphira.identities') }}
          </h2>

          <p
            v-if="requiresReauth"
            class="mt-3 flex items-center gap-2 rounded-md bg-amber-500/15 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-400/30"
          >
            {{ t('myphira.reauthRequired') }}
          </p>

          <ul v-if="identities.length" class="mt-3 space-y-2">
            <li
              v-for="identity in identities"
              :key="identity.provider_id"
              class="flex items-center gap-2 text-sm text-slate-300"
            >
              <span class="rounded bg-white/5 px-2 py-0.5 text-xs uppercase text-slate-400">
                {{ identity.provider }}
              </span>
              <span>{{ identityLabel(identity) }}</span>
            </li>
          </ul>

          <div class="mt-4 space-y-3 border-t border-white/10 pt-4">
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="text-slate-400">{{ t('myphira.githubBinding') }}</span>
              <span class="text-xs text-slate-500">—</span>
            </div>
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="text-slate-400">{{ t('myphira.sessions') }}</span>
              <span class="text-xs text-slate-500">—</span>
            </div>
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="text-slate-400">{{ t('myphira.privacy') }}</span>
              <span class="text-xs text-slate-500">—</span>
            </div>
          </div>
        </section>

        <section class="content-surface p-6">
          <PushSettingsPanel />
        </section>

        <section class="content-surface p-6">
          <PreferencesPanel />
        </section>

        <section class="content-surface p-6">
          <BaseButton variant="danger" @click="logout()">
            {{ t('myphira.signOut') }}
          </BaseButton>
        </section>
      </div>
    </template>
  </div>
</template>
