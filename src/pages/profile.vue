<script setup lang="ts">
import AppearanceContext from '~/components/myphira/AppearanceContext.vue'
import SessionsContext from '~/components/myphira/SessionsContext.vue'
import PrivacyContext from '~/components/myphira/PrivacyContext.vue'
import PushContext from '~/components/myphira/PushContext.vue'
import RedemptionContext from '~/components/myphira/RedemptionContext.vue'
import UserAvatar from '~/components/myphira/UserAvatar.vue'
import PPWorkspaceTabs from '~/components/patterns/PPWorkspaceTabs.vue'
import MyPhiraFriendsWorkspace from '~/features/account/components/MyPhiraFriendsWorkspace.vue'
import MyPhiraMultiplayerWorkspace from '~/features/account/components/MyPhiraMultiplayerWorkspace.vue'
import MyPhiraOverview from '~/features/account/components/MyPhiraOverview.vue'
import MyPhiraReplayWorkspace from '~/features/account/components/MyPhiraReplayWorkspace.vue'
import MyPhiraSettingsWorkspace from '~/features/account/components/MyPhiraSettingsWorkspace.vue'
import { apiFetch, getApiBase } from '~/utils/api/client'

/** MyPhira page: session, identity hero, tab routing, and feature composition only. */
const { t } = useI18n()
const notice = useNotice()
useHead({ title: computed(() => t('nav.profile')) })

const { pending, error: sessionError, authenticated, profile, identities, refreshIdentities, logout } = useSession()
const contextWindow = useContextWindow()
const githubIdentity = computed(() => identities.value.find(identity => identity.provider === 'github'))
const apiBase = getApiBase()

async function bindGithub(): Promise<void> {
  window.location.href = `${apiBase}/api/v1/auth/github/start`
}
async function unbindGithub(): Promise<void> {
  try { await apiFetch('/api/v1/auth/github/unbind', { method: 'POST' }); await refreshIdentities(); notice.success('notice.saved') }
  catch (err) { notice.errorFromApi(err) }
}

type TabKey = 'overview' | 'replay' | 'multiplayer' | 'friends' | 'settings'
const activeTab = ref<TabKey>('overview')
const tabs: { key: TabKey, label: string }[] = [
  { key: 'overview', label: 'myphira.tabOverview' },
  { key: 'replay', label: 'myphira.tabReplay' },
  { key: 'multiplayer', label: 'myphira.tabMultiplayer' },
  { key: 'friends', label: 'myphira.tabFriends' },
  { key: 'settings', label: 'myphira.tabSettings' },
]

function openAccountContext(kind: 'sessions' | 'privacy' | 'redemption' | 'push' | 'appearance'): void {
  const definitions = {
    sessions: { title: t('myphira.sessions'), component: SessionsContext },
    privacy: { title: t('myphira.privacy'), component: PrivacyContext },
    redemption: { title: t('myphira.redemptionCode'), component: RedemptionContext },
    push: { title: t('myphira.pushTitle'), component: PushContext },
    appearance: { title: t('preferences.title'), component: AppearanceContext },
  } as const
  contextWindow.open({ ...definitions[kind], mobileMode: 'sheet' })
}

const showGuest = computed(() => !pending.value && !sessionError.value && !authenticated.value)
const { data: friendData, pending: friendsPending, refresh: refreshFriends } = useFriendList()
const { data: requestData, pending: requestsPending, refresh: refreshRequests } = useFriendRequests()
const { replays, error: replaysError, pending: replaysPending, refresh: refreshReplays } = useMyReplayList()
const { data: multiplayer, error: multiplayerError, pending: multiplayerPending, refresh: refreshMultiplayer } = useMyMultiplayer()

async function refreshCommunity(): Promise<void> {
  await Promise.allSettled([refreshFriends(), refreshRequests()])
}
async function signOut(): Promise<void> {
  try { await logout(); notice.success('notice.signedOut', undefined, { dedupKey: 'session:logout' }) }
  catch (err) { notice.errorFromApi(err, { dedupKey: 'session:logout:error' }) }
}
async function onRemoveFriend(phiraId: number): Promise<void> {
  try { await removeFriend(phiraId); notice.success('notice.actionCompleted', undefined, { dedupKey: `profile:friend:${phiraId}:remove` }); await refreshFriends() }
  catch (err) { notice.errorFromApi(err, { dedupKey: `profile:friend:${phiraId}:remove:error` }); throw err }
}
async function onBlockUser(phiraId: number): Promise<void> {
  try { await blockUser(phiraId); notice.success('notice.actionCompleted', undefined, { dedupKey: `profile:friend:${phiraId}:block` }); await refreshFriends() }
  catch (err) { notice.errorFromApi(err, { dedupKey: `profile:friend:${phiraId}:block:error` }); throw err }
}

const overviewSummary = computed(() => [
  profile.value?.rks != null ? { label: t('myphira.rks'), value: String(profile.value.rks) } : null,
  { label: t('community.friends'), value: String(friendData.value.total) },
  { label: t('myphira.roundsTotal'), value: multiplayer.value ? String(multiplayer.value.rounds_total) : undefined },
  { label: t('myphira.completedRounds'), value: multiplayer.value ? String(multiplayer.value.completed_rounds) : undefined },
].filter((item): item is { label: string, value: string | undefined } => Boolean(item)))
</script>

<template>
  <div class="space-y-5">
    <header class="flex items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-[var(--pp-text-primary)]">{{ t('nav.profile') }}</h1>
    </header>

    <div v-if="!pending && sessionError" class="border-y border-[var(--pp-border-subtle)] py-6" role="alert">
      <p class="text-sm text-rose-300">{{ t('common.error') }}</p>
      <p class="mt-1 text-xs text-[var(--pp-text-tertiary)]">{{ t('profile.sessionUnavailable') }}</p>
    </div>

    <section v-else-if="showGuest" class="border-y border-[var(--pp-border-subtle)] py-6">
      <p class="text-sm text-[var(--pp-text-secondary)]">{{ t('profile.empty') }}</p>
      <PPButton weight="primary" class="mt-4" as="NuxtLink" to="/login">{{ t('profile.loginCta') }}</PPButton>
      <div class="mt-6 border-t border-[var(--pp-border-subtle)] pt-6"><PreferencesPanel /></div>
    </section>

    <p v-if="pending" class="py-8 text-sm text-[var(--pp-text-secondary)]">{{ t('common.loading') }}</p>

    <template v-else-if="authenticated">
      <section class="relative isolate overflow-hidden rounded-[var(--pp-radius-window)] border border-[var(--pp-border-subtle)]">
        <img v-if="profile?.background_url" :src="profile.background_url" alt="" class="absolute inset-0 h-full w-full object-cover" aria-hidden="true">
        <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,9,14,.9),rgba(4,9,14,.58))]" aria-hidden="true" />
        <div class="flex min-h-56 flex-wrap items-end gap-5 p-6 sm:p-8">
          <UserAvatar :name="profile?.username" :avatar="profile?.avatar" size="lg" />
          <div class="min-w-0 flex-1 pb-1">
            <h2 class="truncate text-2xl font-semibold text-white">{{ profile?.username }}</h2>
            <p v-if="profile?.phira_id != null" class="mt-1 text-sm text-white/60">#{{ profile.phira_id }}</p>
            <p v-if="profile?.bio" class="mt-3 max-w-2xl text-sm leading-6 text-white/80">{{ profile.bio }}</p>
          </div>
        </div>
      </section>

      <PPWorkspaceTabs v-model="activeTab" :tabs="tabs.map(tab => ({ key: tab.key, label: t(tab.label) }))" label="MyPhira" />

      <MyPhiraOverview
        v-if="activeTab === 'overview'"
        :summary="overviewSummary"
        :replays="replays"
        :replays-pending="replaysPending"
        :replays-error="replaysError"
        :multiplayer="multiplayer"
        :multiplayer-pending="multiplayerPending"
        :multiplayer-error="multiplayerError"
        @open="activeTab = $event"
        @refresh-replays="refreshReplays()"
        @refresh-multiplayer="refreshMultiplayer()"
      />
      <MyPhiraReplayWorkspace v-else-if="activeTab === 'replay'" :replays="replays" :pending="replaysPending" :error="replaysError" @refresh="refreshReplays()" />
      <MyPhiraMultiplayerWorkspace v-else-if="activeTab === 'multiplayer'" :data="multiplayer" :pending="multiplayerPending" :error="multiplayerError" @refresh="refreshMultiplayer()" />
      <MyPhiraFriendsWorkspace
        v-else-if="activeTab === 'friends'"
        :friends="friendData.items"
        :friend-total="friendData.total"
        :requests="requestData.items"
        :request-total="requestData.total"
        :friends-pending="friendsPending"
        :requests-pending="requestsPending"
        :on-remove="onRemoveFriend"
        :on-block="onBlockUser"
        :on-refresh="refreshCommunity"
      />
      <MyPhiraSettingsWorkspace
        v-else
        :github-identity="githubIdentity"
        @bind-github="bindGithub"
        @unbind-github="unbindGithub"
        @open-privacy="openAccountContext('privacy')"
        @open-sessions="openAccountContext('sessions')"
        @open-push="openAccountContext('push')"
        @open-appearance="openAccountContext('appearance')"
        @open-redemption="openAccountContext('redemption')"
        @sign-out="signOut"
      />
    </template>
  </div>
</template>
