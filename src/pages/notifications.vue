<script setup lang="ts">
import type { AppNotification } from '~/utils/api/types'
/**
 * Notification center (design §16.7, contract §8).
 *
 * - Inbox with unread count
 * - Per-notification topic/source icon, action buttons, optional chat/text reply
 * - Actions execute by stable server-frozen button id; clients cannot substitute
 *   a different action kind or arbitrary Action Registry id.
 * - Persistent notification semantic keys are localized here; admin free text
 *   remains literal.
 */
import { dismissNotification, markNotificationRead, runNotificationAction, sendNotificationInput, useNotifications } from '~/composables/useNotifications'
import { useSession } from '~/composables/useSession'

const { t } = useI18n()
useHead(() => ({ title: t('nav.notifications') }))

const notice = useNotice()

const { inbox, error, pending, refresh } = useNotifications()
const { authenticated } = useSession()

const unread = computed(() => inbox.value.unread)
const items = computed(() => inbox.value.items)

const replyOpen = ref<Record<string, string>>({})

const actionBusy = ref<Record<string, boolean>>({})
function fmtTime(iso?: string): string {
  if (!iso)
    return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

function isRead(n: AppNotification): boolean {
  return Boolean(n.read_at)
}

function notificationTitle(n: AppNotification): string {
  return n.title_key ? t(n.title_key, n.params ?? {}) : n.title
}

function notificationBody(n: AppNotification): string {
  return n.body_key ? t(n.body_key, n.params ?? {}) : n.body
}

function actionLabel(action: NonNullable<AppNotification['actions']>[number], n: AppNotification): string {
  return action.label_key ? t(action.label_key, n.params ?? {}) : action.label
}

function trustedInternalPath(path: string): boolean {
  return /^\/(?:room|chart|user|replay|profile|notifications)(?:\/|$)/.test(path)
}

async function onRead(n: AppNotification): Promise<void> {
  if (isRead(n))
    return
  try {
    await markNotificationRead(n.id)
    await refresh()
  }
  catch (err) {
    notice.errorFromApi(err, { dedupKey: `notification:${n.id}:read` })
  }
}

async function onDismiss(n: AppNotification): Promise<void> {
  try {
    await dismissNotification(n.id)
    await refresh()
    notice.success('notice.dismissed', { dedupKey: `notification:${n.id}:dismiss` })
  }
  catch (err) {
    notice.errorFromApi(err, { dedupKey: `notification:${n.id}:dismiss:error` })
  }
}

async function onAction(n: AppNotification, actionId: string): Promise<void> {
  actionBusy.value[`${n.id}:${actionId}`] = true
  try {
    const result = await runNotificationAction(n.id, actionId)
    if (result.status === 'navigate') {
      if (!trustedInternalPath(result.path))
        throw new Error('untrusted notification navigation path')
      await navigateTo(result.path)
    }
    await refresh()
    notice.success('notice.actionCompleted', { dedupKey: `notification:${n.id}:action` })
  }
  catch (err) {
    notice.errorFromApi(err, { dedupKey: `notification:${n.id}:${actionId}:error` })
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
  try {
    await sendNotificationInput(n.id, text)
    replyOpen.value[n.id] = ''
    await refresh()
    notice.success('notice.sent', { dedupKey: `notification:${n.id}:input` })
  }
  catch (err) {
    notice.errorFromApi(err, { dedupKey: `notification:${n.id}:input:error` })
  }
  finally {
    actionBusy.value[`${n.id}:input`] = false
  }
}

/** Persistent notification links are restricted to trusted relative PPF paths. */
function canOpenDeepLink(href: string): boolean {
  return trustedInternalPath(href)
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
      <PPSurface
        v-for="n in items"
        :key="n.id"
        as="li"
        class="p-4"
        :class="isRead(n) ? 'opacity-70' : 'ring-1 ring-accent/20'"
        @click="onRead(n)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span v-if="n.priority === 'high'" class="text-amber-400">!</span>
              <span>{{ fmtTime(n.created_at) }}</span>
            </div>
            <h2 class="mt-1 text-sm font-semibold text-slate-100">
              {{ notificationTitle(n) }}
            </h2>
            <p v-if="notificationBody(n)" class="mt-1 text-sm text-slate-400">
              {{ notificationBody(n) }}
            </p>
            <p v-if="n.actor" class="mt-1 text-xs text-slate-500">
              {{ n.actor.username }}
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-1.5">
            <button
              v-if="!isRead(n)"
              type="button"
              class="pp-touch-target rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
              @click.stop="onRead(n)"
            >
              {{ $t('notifications.markRead') }}
            </button>
            <button
              type="button"
              class="pp-touch-target rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white/10"
              @click.stop="onDismiss(n)"
            >
              {{ $t('notifications.dismiss') }}
            </button>
          </div>
        </div>

        <!-- Action buttons -->
        <div v-if="n.actions?.length" class="mt-3 flex flex-wrap gap-2">
          <PPButton
            v-for="act in n.actions"
            :key="act.id"
            :weight="act.danger ? 'dangerous' : 'secondary'"
            size="sm"
            :disabled="actionBusy[`${n.id}:${act.id}`]"
            @click="onAction(n, act.id)"
          >
            {{ actionLabel(act, n) }}
          </PPButton>
        </div>

        <!-- Chat / text reply input -->
        <div v-if="n.input" class="mt-3 flex gap-2">
          <PPInput
            v-model="replyOpen[n.id]"
            type="text"
            :placeholder="n.input.placeholder || $t('notifications.replyPlaceholder')"
            class="flex-1"
            :disabled="actionBusy[`${n.id}:input`]"
            @keydown.enter="onSubmitReply(n)"
          />
          <PPButton size="sm" :disabled="actionBusy[`${n.id}:input`]" @click="onSubmitReply(n)">
            {{ $t('notifications.send') }}
          </PPButton>
        </div>

        <!-- Persistent notification links never execute arbitrary URLs. -->
        <NuxtLink
          v-if="n.deep_link && canOpenDeepLink(n.deep_link)"
          :to="n.deep_link"
          class="mt-3 inline-block text-xs text-accent hover:underline"
          @click.stop="onDeepLink(n)"
        >
          {{ $t('notifications.open') }} →
        </NuxtLink>
      </PPSurface>
    </ul>

    <p v-if="error" class="text-xs text-slate-500">
      <button type="button" class="text-accent hover:underline" @click="() => refresh()">
        {{ $t('common.retry') }}
      </button>
    </p>
  </div>
</template>
