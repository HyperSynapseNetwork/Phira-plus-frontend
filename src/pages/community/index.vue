<script setup lang="ts">
import FriendCards from '~/components/myphira/FriendCards.vue'
import FriendRequestList from '~/components/myphira/FriendRequestList.vue'

/**
 * Community hub (design §16.6): friends, friend requests, and a "find users"
 * prompt. NOT a forum / chat / feed platform.
 * All data is client-fetched with graceful empty fallbacks (PPB Phase B may
 * not be finished).
 */

const { t } = useI18n()
useHead({ title: computed(() => t('nav.community')) })

const { data: friendData, refresh: refreshFriends } = useFriendList()
const { data: requestData, refresh: refreshRequests } = useFriendRequests()

async function refreshCommunity(): Promise<void> {
  await Promise.allSettled([refreshFriends(), refreshRequests()])
}
</script>

<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-slate-50">
        {{ t('nav.community') }}
      </h1>
    </header>

    <section class="content-surface p-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
          {{ t('community.friends') }}
        </h2>
        <span class="text-xs text-slate-500">
          {{ friendData.total }}
        </span>
      </div>
      <div class="mt-4">
        <FriendCards :friends="friendData.items" />
      </div>
    </section>

    <section class="content-surface p-6">
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
    </section>

    <section class="content-surface p-6">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
        {{ t('community.findUsers') }}
      </h2>
      <input
        type="search"
        :placeholder="t('community.searchPlaceholder')"
        class="glass-focusable mt-3 w-full rounded-md bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
        aria-label="Search users"
      >
      <p class="mt-2 text-sm text-slate-400">
        {{ t('community.findUsersHint') }}
      </p>
    </section>
  </div>
</template>
