/**
 * Phira+ PPF — in-app / Web Push channel service worker (design §14.7).
 *
 * This is the BROWSER push channel only (in-app / Web Push). Remote push that
 * must survive a full app exit on Windows / Android is handled by the Tauri 2
 * native adapter (design §17.2): FCM on Android, WNS on Windows.
 *
 * Served from `/sw.js` (lives under src/public/ so the Nuxt SSG build copies
 * it to the site root). Dependency-free on purpose — no imports, no build step.
 */
globalThis.addEventListener('install', () => {
  globalThis.skipWaiting()
})

globalThis.addEventListener('activate', (event) => {
  event.waitUntil(globalThis.clients.claim())
})

globalThis.addEventListener('push', (event) => {
  let data = {}
  try {
    data = (event.data && event.data.json()) || {}
  }
  catch {
    data = {}
  }

  const title = data.title || 'Phira+'
  const options = {
    body: data.body || '',
    icon: data.icon || undefined,
    badge: data.badge || undefined,
    data: { url: data.url || '/' },
  }

  event.waitUntil(globalThis.registration.showNotification(title, options))
})

globalThis.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    globalThis.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client)
          return client.focus()
      }
      return globalThis.clients.openWindow(url)
    }),
  )
})
