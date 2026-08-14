import { chromium } from 'playwright-core'

const base = process.env.PPF_E2E_BASE ?? 'http://127.0.0.1:18080'
const routes = [
  '/room/direct-route-smoke',
  '/chart/1',
  '/user/1',
  '/replay/share/direct-route-smoke',
]

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  for (const path of routes) {
    const response = await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' })
    if (!response || response.status() >= 400)
      throw new Error(`${path}: HTTP ${response?.status() ?? 'no response'}`)
    if (!await page.locator('#__nuxt').count())
      throw new Error(`${path}: Nuxt root missing`)
    await page.reload({ waitUntil: 'domcontentloaded' })
    if (!await page.locator('#__nuxt').count())
      throw new Error(`${path}: Nuxt root missing after refresh`)
  }
  console.log(`direct-route Chromium smoke passed for ${routes.length} routes`)
}
finally {
  await browser.close()
}
