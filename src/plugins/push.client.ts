import type { PushApi, PushState } from '~/composables/usePush'
import { apiFetch } from '~/utils/api/client'

/**
 * Client-only Web Push plugin (design §14.7, contract §8).
 *
 * - Registers `/sw.js` on the client when service workers are available in a
 *   secure context. Additive: on unsupported browsers `supported` stays
 *   `false` and the site keeps working. Everything is wrapped in try/catch —
 *   this plugin never throws.
 * - Exposes reactive status under `useState('ppf:push')` and imperative
 *   actions via `nuxtApp.$push` (read through `usePush()`).
 * - The VAPID public key is owned by PPB (NOT PPF) and arrives via runtime
 *   config `public.pushVapidPublicKey` (`NUXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY`).
 *   Until PPB configures it, `subscribe()` reports `push.vapidMissing`.
 * - Server sync uses `POST /api/v1/me/push-endpoints` (contract §19 / frozen
 *   `PushEndpointBody { channel, device_id, platform?, subscription }`).
 *   Failures degrade gracefully (4xx / network → `push.syncFailed`, false).
 *
 * Errors stored in state are i18n KEYS under `push.*` so the UI can localize
 * them (`$t(pushError)`).
 */

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++)
    bytes[i] = raw.charCodeAt(i)
  return bytes
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++)
    binary += String.fromCharCode(bytes[i]!)
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const DEVICE_ID_KEY = 'ppf:device-id'

/**
 * Stable per-device identifier for push registration. PPB keys the push
 * endpoint on `(user_id, device_id)` (ON CONFLICT upsert), so this must be
 * persistent across visits. Falls back to a per-session id when storage or
 * `crypto.randomUUID` is unavailable (the endpoint re-registers next visit).
 */
function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing)
      return existing
    const id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
    return id
  }
  catch {
    return `web-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

export default defineNuxtPlugin(() => {
  // The `.client.ts` suffix already guarantees client-only, but keep the guard
  // explicit per design §14.7.
  if (!import.meta.client)
    return

  const state = useState<PushState>('ppf:push', () => ({
    supported: false,
    enabled: false,
    subscription: null,
    error: null,
  }))

  const registration = ref<ServiceWorkerRegistration | null>(null)

  async function ensureRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      state.value.supported = false
      return null
    }
    state.value.supported = true
    try {
      if (!registration.value) {
        const existing = await navigator.serviceWorker.getRegistration('/sw.js')
        registration.value = existing ?? await navigator.serviceWorker.register('/sw.js')
      }
      const reg = registration.value
      if (reg) {
        // Restore an existing subscription (browser persists it across loads).
        const existingSub = await reg.pushManager.getSubscription()
        if (existingSub) {
          state.value.subscription = existingSub
          state.value.enabled = true
        }
      }
      return reg
    }
    catch {
      return null
    }
  }

  async function subscribeToPush(): Promise<PushSubscription | null> {
    const reg = await ensureRegistration()
    if (!reg) {
      state.value.error = null
      return null
    }

    const config = useRuntimeConfig()
    const vapidKey = (config.public as unknown as Record<string, unknown>).pushVapidPublicKey as string | undefined
    if (!vapidKey) {
      state.value.error = 'push.vapidMissing'
      return null
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        state.value.error = 'push.permissionDenied'
        return null
      }

      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
      }

      state.value.subscription = sub
      state.value.enabled = true
      state.value.error = null
      return sub
    }
    catch {
      state.value.error = 'push.subscribeFailed'
      return null
    }
  }

  async function unsubscribeFromPush(): Promise<boolean> {
    try {
      const reg = await ensureRegistration()
      const sub = state.value.subscription ?? await reg?.pushManager.getSubscription()
      if (sub) {
        const ok = await sub.unsubscribe()
        state.value.enabled = !ok
        if (ok) {
          state.value.subscription = null
          state.value.error = null
        }
        return ok
      }
      state.value.enabled = false
      state.value.subscription = null
      state.value.error = null
      return true
    }
    catch {
      return false
    }
  }

  async function syncSubscriptionToServer(): Promise<boolean> {
    const sub = state.value.subscription
    if (!sub) {
      state.value.error = 'push.syncFailed'
      return false
    }

    const p256dh = sub.getKey('p256dh')
    const auth = sub.getKey('auth')
    if (!p256dh || !auth) {
      state.value.error = 'push.syncFailed'
      return false
    }

    try {
      // Frozen contract §19 / generated `PushEndpointBody`: `{ channel,
      // device_id, platform?, subscription: { endpoint, p256dh, auth } }`.
      // Failures are reported but never thrown.
      await apiFetch('/api/v1/me/push-endpoints', {
        method: 'POST',
        body: {
          channel: 'web_push',
          device_id: getDeviceId(),
          platform: 'web',
          subscription: {
            endpoint: sub.endpoint,
            p256dh: arrayBufferToBase64Url(p256dh),
            auth: arrayBufferToBase64Url(auth),
          },
        },
      })
      state.value.error = null
      return true
    }
    catch {
      state.value.error = 'push.syncFailed'
      return false
    }
  }

  const push: PushApi = {
    subscribeToPush,
    unsubscribeFromPush,
    syncSubscriptionToServer,
  }

  return {
    provide: {
      push,
    },
  }
})
