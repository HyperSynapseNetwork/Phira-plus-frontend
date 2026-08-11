/**
 * Web Push composable (design §14.7, contract §8) — wraps the state and
 * imperative API provided by the client-only plugin
 * (`src/plugins/push.client.ts`).
 *
 * - Reads reactive status from `useState('ppf:push')`.
 * - Reaches the plugin's actions via `nuxtApp.$push`.
 * - Degrades silently when the plugin is absent (SSR, unsupported browser):
 *   `supported` stays `false`, actions become no-ops.
 */

export interface PushState {
  supported: boolean
  enabled: boolean
  subscription: PushSubscription | null
  /** i18n KEY under `push.*` (localized by the consuming UI), or null. */
  error: string | null
}

export interface PushApi {
  subscribeToPush: () => Promise<PushSubscription | null>
  unsubscribeFromPush: () => Promise<boolean>
  syncSubscriptionToServer: () => Promise<boolean>
}

const DEFAULT_STATE: PushState = {
  supported: false,
  enabled: false,
  subscription: null,
  error: null,
}

export function usePush() {
  const state = useState<PushState>('ppf:push', () => ({ ...DEFAULT_STATE }))
  const api = (useNuxtApp() as { $push?: PushApi }).$push

  const supported = computed(() => state.value.supported)
  const enabled = computed(() => state.value.enabled)
  const subscription = computed(() => state.value.subscription)
  const error = computed(() => state.value.error)

  async function subscribe(): Promise<PushSubscription | null> {
    return api?.subscribeToPush() ?? null
  }

  async function unsubscribe(): Promise<boolean> {
    return api?.unsubscribeFromPush() ?? false
  }

  async function syncToServer(): Promise<boolean> {
    return api?.syncSubscriptionToServer() ?? false
  }

  return {
    supported,
    enabled,
    subscription,
    error,
    subscribe,
    unsubscribe,
    syncToServer,
  }
}
