<script setup lang="ts">
import type { AppNotification } from '~/utils/api/types'
import { isApiError } from '~/composables/useApi'
/**
 * Notification center (design §16.7, contract §8).
 *
 * - Inbox with unread count
 * - Per-notification topic/source icon, action buttons, optional chat/text reply
 * - Actions re-authenticate on the server every time (contract §8); PPF never
 *   trusts a client capability flag.
 *
 * PPB may be unready → graceful empty state. Authenticated state is probed via
 * useSession; unauthenticated users see the empty inbox + login hint.
 */
import { dismissNotification, markNotificationRead, runNotificationAction, sendNotificationInput, useNotifications } from '~/composables/useNotifications'
import { useReauth } from '~/composables/useReauth'
import { useSession } from '~/composables/useSession'

useHead({ title: '通知' })

const { t } = useI18n()

const { inbox, error, pending, refresh } = useNotifications()
const { authenticated } = useSession()
const { withReauth } = useReauth()

const unread = computed(() => inbox.value.unread)
const items = computed(() => inbox.value.items)

const replyOpen = ref<Record<string, string>>({})

const actionBusy = ref<Record<string, boolean>>({})
/** Inline toast-ish result of the last action / reply / dismiss. */
const lastActionResult = ref<{ kind: 'success' | 'error', message: string } | null>(null)

function setActionError(err: unknown): void {
  lastActionResult.value = {
    kind: 'error',
    message: isApiError(err) ? err.message : String(err),
  }
}

function fmtTime(iso?: string): string {
  if (!iso)
    return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

function isRead(n: AppNotification): boolean {
  return Boolean(n.read_at)
}

async function onRead(n: AppNotification): Promise<void> {
  if (isRead(n))
    return
  try {
    await markNotificationRead(n.id)
    await refresh()
  }
  catch {
    // Non-fatal — inbox will reconcile on next refresh.
  }
}

async function onDismiss(n: AppNotification): Promise<void> {
  lastActionResult.value = null
  try {
    await dismissNotification(n.id)
    await refresh()
    lastActionResult.value = { kind: 'success', message: t('notifications.actionSuccess') }
  }
  catch (err) {
    setActionError(err)
  }
}

async function onAction(n: AppNotification, actionId: string): Promise<void> {
  actionBusy.value[`${n.id}:${actionId}`] = true
  lastActionResult.value = null
  try {
    // Elevated reauth is required for notification actions (contract §20/P11).
    await withReauth(token => runNotificationAction(n.id, actionId, token))
    await refresh()
    lastActionResult.value = { kind: 'success', message: t('notifications.actionSuccess') }
  }
  catch (err) {
    setActionError(err)
  }
  finally {
    actionBusy.value[`${n.id}:${actionId}`] = false
  }
}

async function onSubmitReply(n: AppNotification): Promise<void> {
  const text = (replyOpen.value[n.id] ?? '').trim()
  if (!text)
    return
  actionBusy.value[`${n.id}:input`] = true
  lastActionResult.value = null
  try {
    // Elevated reauth is required for notification input (contract §20/P11).
    await withReauth(token => sendNotificationInput(n.id, text, token))
    replyOpen.value[n.id] = ''
    await refresh()
    lastActionResult.value = { kind: 'success', message: t('notifications.replySent') }
  }
  catch (err) {
    setActionError(err)
  }
  finally {
    actionBusy.value[`${n.id}:input`] = false
  }
}

/** Relative PPF deep links use SPA navigation; absolute/external stay `<a>`. */
function isExternalDeepLink(href: string): boolean {
  return !href.startsWith('/')
}

/** Deep-link clicks also mark the notification read (mirrors `li` click). */
async function onDeepLink(n: AppNotification): Promise<void> {
  await onRead(n)
}
</script>

<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-slate-50">
          {{ $t('nav.notifications') }}
        </h1>
        <span
          v-if="unread > 0"
          class="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent"
        >
          {{ $t('notifications.unread', { count: unread }) }}
        </span>
      </div>
      <NuxtLink to="/profile" class="text-xs text-accent hover:underline">
        {{ $t('notifications.prefShortcut') }}
      </NuxtLink>
    </header>

    <p
      v-if="lastActionResult"
      class="text-sm"
      :class="lastActionResult.kind === 'success' ? 'text-emerald-400' : 'text-rose-400'"
      role="status"
    >
      {{ lastActionResult.message }}
    </p>

    <p v-if="!authenticated && items.length === 0" class="text-sm text-slate-400">
      {{ $t('notifications.loginHint') }}
    </p>
    <p v-else-if="pending" class="text-sm text-slate-400">
      {{ $t('common.loading') }}
    </p>
    <p v-else-if="items.length === 0" class="text-sm text-slate-400">
      {{ $t('notifications.empty') }}
    </p>

    <ul v-else class="space-y-3">
      <li
        v-for="n in items"
        :key="n.id"
        class="content-surface p-4"
        :class="isRead(n) ? 'opacity-70' : 'ring-1 ring-accent/20'"
        @click="onRead(n)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span class="rounded bg-white/5 px-1.5 py-0.5 font-mono">{{ n.type }}</span>
              <span v-if="n.priority === 'high'" class="text-amber-400">!</span>
              <span>{{ fmtTime(n.created_at) }}</span>
            </div>
            <h2 class="mt-1 text-sm font-semibold text-slate-100">
              {{ n.title }}
            </h2>
            <p v-if="n.body" class="mt-1 text-sm text-slate-400">
              {{ n.body }}
            </p>
            <p v-if="n.actor" class="mt-1 text-xs text-slate-500">
              {{ n.actor.username }}
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-1.5">
            <button
              v-if="!isRead(n)"
              type="button"
              class="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
              @click.stop="onRead(n)"
            >
              {{ $t('notifications.markRead') }}
            </button>
            <button
              type="button"
              class="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white/10"
              @click.stop="onDismiss(n)"
            >
              {{ $t('notifications.dismiss') }}
            </button>
          </div>
        </div>

        <!-- Action buttons -->
        <div v-if="n.actions?.length" class="mt-3 flex flex-wrap gap-2">
          <BaseButton
            v-for="act in n.actions"
            :key="act.id"
            :variant="act.danger ? 'danger' : 'default'"
            size="sm"
            :disabled="actionBusy[`${n.id}:${act.id}`]"
            :as="act.href ? 'a' : 'button'"
            :href="act.href"
            :to="act.href?.startsWith('/') ? act.href : undefined"
            @click="!act.href && onAction(n, act.id)"
          >
            {{ act.label }}
          </BaseButton>
        </div>

        <!-- Chat / text reply input -->
        <div v-if="n.input" class="mt-3 flex gap-2">
          <input
            v-model="replyOpen[n.id]"
            type="text"
            :placeholder="n.input.placeholder || $t('notifications.replyPlaceholder')"
            class="glass-focusable flex-1 rounded-md bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
            :disabled="actionBusy[`${n.id}:input`]"
            @keydown.enter="onSubmitReply(n)"
          >
          <BaseButton size="sm" :disabled="actionBusy[`${n.id}:input`]" @click="onSubmitReply(n)">
            {{ $t('notifications.send') }}
          </BaseButton>
        </div>

        <!-- Deep link (SPA navigation for relative links; new tab for external) -->
        <NuxtLink
          v-if="n.deep_link && !isExternalDeepLink(n.deep_link)"
          :to="n.deep_link"
          class="mt-3 inline-block text-xs text-accent hover:underline"
          @click.stop="onDeepLink(n)"
        >
          {{ $t('notifications.open') }} →
        </NuxtLink>
        <a
          v-else-if="n.deep_link"
          :href="n.deep_link"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-3 inline-block text-xs text-accent hover:underline"
          @click.stop="onDeepLink(n)"
        >
          {{ $t('notifications.open') }} →
        </a>
      </li>
    </ul>

    <p v-if="error" class="text-xs text-slate-500">
      <button type="button" class="text-accent hover:underline" @click="() => refresh()">
        {{ $t('common.retry') }}
      </button>
    </p>
  </div>
</template>
