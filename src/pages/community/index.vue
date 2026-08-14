<script setup lang="ts">
import FriendCards from '~/components/myphira/FriendCards.vue'
import FriendRequestList from '~/components/myphira/FriendRequestList.vue'
import { useUserSearch } from '~/composables/useCommunity'

/**
 * Community hub (design §16.6): friends, friend requests, and a "find users"
 * prompt. NOT a forum / chat / feed platform.
 * API load failures remain distinct from authoritative empty friend/request lists.
 */

const { t } = useI18n()
const notice = useNotice()
useHead({ title: computed(() => t('nav.community')) })

const { data: friendData, refresh: refreshFriends } = useFriendList()
const { data: requestData, refresh: refreshRequests } = useFriendRequests()
const userSearch = ref('')
const { users: searchResults, error: searchError, pending: searchPending, refresh: runSearch } = useUserSearch(userSearch)

async function submitSearch(): Promise<void> {
  if (userSearch.value.trim())
    await runSearch()
}

async function refreshCommunity(): Promise<void> {
  await Promise.allSettled([refreshFriends(), refreshRequests()])
}

async function onRemoveFriend(phiraId: number): Promise<void> {
  try {
    await removeFriend(phiraId)
    notice.success('notice.actionCompleted', undefined, { dedupKey: `friend:${phiraId}:remove` })
    await refreshFriends()
  }
  catch (err) {
    notice.errorFromApi(err, { dedupKey: `friend:${phiraId}:remove:error` })
    throw err
  }
}

async function onBlockUser(phiraId: number): Promise<void> {
  try {
    await blockUser(phiraId)
    notice.success('notice.actionCompleted', { dedupKey: `friend:${phiraId}:block` })
    await refreshFriends()
  }
  catch (err) {
    notice.errorFromApi(err, { dedupKey: `friend:${phiraId}:block:error` })
    throw err
  }
}
</script>

<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-slate-50">
        {{ t('nav.community') }}
      </h1>
    </header>

    <PPSurface as="section" class="p-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
          {{ t('community.friends') }}
        </h2>
        <span class="text-xs text-slate-500">
          {{ friendData.total }}
        </span>
      </div>
      <div class="mt-4">
        <FriendCards :friends="friendData.items" :on-remove="onRemoveFriend" :on-block="onBlockUser" />
      </div>
    </PPSurface>

    <PPSurface as="section" class="p-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
          {{ t('community.friendRequests') }}
        </h2>
        <span class="text-xs text-slate-500">
          {{ requestData.total }}
        </span>
      </div>
      <div class="mt-4">
        <FriendRequestList :requests="requestData.items" @changed="refreshCommunity" />
      </div>
    </PPSurface>

    <PPSurface as="section" class="p-6">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
        {{ t('community.findUsers') }}
      </h2>
      <form class="mt-3 flex gap-2" @submit.prevent="submitSearch">
        <PPInput
          v-model="userSearch"
          type="search"
          :placeholder="t('community.searchPlaceholder')"
          class="min-w-0 flex-1"
          :aria-label="t('community.searchPlaceholder')"
        />
        <PPButton type="submit" :disabled="!userSearch.trim() || searchPending">
          {{ searchPending ? t('common.loading') : t('common.search') }}
        </PPButton>
      </form>
      <p class="mt-2 text-sm text-slate-400">
        {{ t('community.findUsersHint') }}
      </p>
      <p v-if="searchError" class="mt-3 text-sm text-rose-300">
        {{ t('common.error') }}
      </p>
      <ul v-else-if="searchResults.length" class="mt-4 divide-y divide-white/10">
        <li v-for="user in searchResults" :key="user.phira_id">
          <NuxtLink
            :to="`/user/${user.phira_id}`"
            class="flex items-center gap-3 rounded-[var(--pp-radius-control)] px-2 py-3 transition-colors hover:bg-[var(--pp-surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <UserAvatar :name="user.username" :src="user.avatar" size="sm" />
            <span class="min-w-0 flex-1 truncate text-sm text-slate-100">{{ user.username }}</span>
            <span class="text-xs text-slate-500">#{{ user.phira_id }}</span>
          </NuxtLink>
        </li>
      </ul>
    </PPSurface>
  </div>
</template>
