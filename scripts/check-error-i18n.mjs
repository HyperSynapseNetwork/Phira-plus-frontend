import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(scriptDir, '..')
const manifestPath = path.join(root, 'contracts/error-codes.json')
const defaultLocaleDir = fs.existsSync(path.join(root, 'src/i18n')) ? path.join(root, 'src/i18n') : path.join(root, 'i18n')
const localeDir = process.env.ERROR_LOCALE_DIR || defaultLocaleDir
const sourceDir = process.env.ERROR_SOURCE_DIR || (fs.existsSync(path.join(root, 'src')) ? path.join(root, 'src') : root)
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const clientCodes = manifest.client_only ?? ['NETWORK_ERROR', 'INVALID_RESPONSE', 'UNKNOWN_ERROR']
const serverCodes = manifest.codes ?? []
let failures = 0

function get(obj, dotted) {
  let v = obj
  for (const key of dotted.split('.')) v = v?.[key]
  return typeof v === 'string' && v.trim() ? v : undefined
}

for (const lang of ['zh', 'en']) {
  const file = path.join(localeDir, `${lang}.json`)
  const locale = JSON.parse(fs.readFileSync(file, 'utf8'))
  for (const code of serverCodes) {
    if (!get(locale, `errors.api.${code}`)) {
      console.error(`FAIL ${lang}: missing errors.api.${code}`)
      failures++
    }
  }
  for (const code of clientCodes) {
    if (!get(locale, `errors.client.${code}`)) {
      console.error(`FAIL ${lang}: missing errors.client.${code}`)
      failures++
    }
  }
}

const skipped = new Set(['node_modules', '.nuxt', '.output', 'dist', '.git', 'coverage', 'generated.ts', 'scripts', 'tests', 'contracts'])
const allowedFiles = new Set(['utils/api/errors.ts', 'utils/api-error.ts'])
function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) { walk(full); continue }
    if (!/\.(vue|ts|tsx|js|mjs)$/.test(entry.name)) continue
    const rel = path.relative(root, full).replaceAll('\\', '/')
    if ([...allowedFiles].some(suffix => rel.endsWith(suffix))) continue
    const text = fs.readFileSync(full, 'utf8')
    // Formal UI may not render raw backend Error.message. Internal logging/tests are excluded by source scope.
    if (/\b(?:err|error)\.message\b/.test(text)) {
      console.error(`FAIL raw server/client message render candidate: ${rel}`)
      failures++
    }
  }
}
walk(sourceDir)

if (failures) {
  console.error(`error-i18n gate failed: ${failures}`)
  process.exit(1)
}
console.log(`error-i18n gate passed: ${serverCodes.length} server codes × 2 locales; ${clientCodes.length} client codes × 2 locales`)
