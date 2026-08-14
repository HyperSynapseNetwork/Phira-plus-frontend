#!/usr/bin/env node
/**
 * Contract-consistency check (design `CONTRACT_CONSISTENCY_TEST.md`, Gate 0).
 *
 * Scans every `/api/v1/...` and `/ws/v1/...` call in `src/` and asserts it is
 * registered in PPB's OpenAPI (the HTTP source of truth). CI fails on any
 * miss (a frontend calling an unregistered endpoint, or PPB forgetting to
 * register one).
 *
 * Source of truth, in order:
 *   1. https://raw.githubusercontent.com/HyperSynapseNetwork/Phira-plus-Backend/
 *        main/contracts/openapi.json   (committed OpenAPI if present)
 *   2. .../main/contracts/types.ts     (openapi-typescript output; `paths`
 *        interface parsed for (method, path) templates)
 *
 * WS endpoints (`/ws/v1/...`) are checked against an explicit manifest (they
 * are not part of the OpenAPI `paths`).
 *
 * Dynamic template params (`${...}`) are normalized to a `{}` wildcard, so
 * `/api/v1/rooms/${id}/chat` matches `/api/v1/rooms/{room_id}/chat`.
 *
 * Usage: node scripts/check-contract-consistency.mjs [path-to-src]
 */
import fs from 'node:fs'
import path from 'node:path'

const REPO = 'HyperSynapseNetwork/Phira-plus-Backend'
const RAW = 'https://raw.githubusercontent.com'
const BRANCH = 'main'
const SRC_DIR = process.argv[2] ?? path.resolve(import.meta.dirname, '../src')

/** Explicit WS manifest (contract P-82 / §4). */
const WS_MANIFEST = [
  '/ws/v1/rooms/{room_id}/live',
  '/ws/v1/replays/{round_uuid}',
]

function normalizePath(p) {
  // Strip a trailing query-string interpolation (e.g. `${query}` → `?player_id=`).
  const cleaned = p.replace(/\$\{(?:query|qs|search)\}/g, '')
  return cleaned
    .replace(/\$\{[^}]*\}/g, '{param}') // template params -> {param}
    .split('?')[0] // drop query string
    .replace(/\{[^}]*\}/g, '{}') // any {name} -> {} wildcard
    .replace(/\/+$/, '') // trailing slash
}

/** Split a normalized path into non-empty segments. */
function segments(p) {
  return p.split('/').filter(Boolean)
}

/**
 * Segment-wise match: same method + same segment count, and each pair matches
 * where `{}` (a dynamic param on either side) matches any single segment.
 */
function pathMatches(callPath, knownPath) {
  const a = segments(callPath)
  const b = segments(knownPath)
  if (a.length !== b.length)
    return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    if (x !== y && x !== '{}' && y !== '{}')
      return false
  }
  return true
}

function extractFromOpenapi(openapi) {
  const out = []
  for (const [p, item] of Object.entries(openapi.paths ?? {})) {
    for (const m of ['get', 'post', 'put', 'patch', 'delete']) {
      if (item[m])
        out.push([m.toUpperCase(), p])
    }
  }
  return out
}

/** Parse the `export interface paths { ... }` block of types.ts. */
function extractFromTypes(text) {
  const out = []
  const start = text.indexOf('export interface paths')
  if (start < 0)
    return out
  const brace = text.indexOf('{', start)
  const block = text.slice(brace)
  const pathRe = /"(\/api\/v1[^"]*)":\s*\{/g
  let m
  while ((m = pathRe.exec(block))) {
    const p = m[1]
    // Entry opening brace is the LAST `{` in `"path": {` (the path may itself
    // contain `{param}` braces, e.g. `/me/preferences/{namespace}`).
    const entryStart = m.index + m[0].lastIndexOf('{')
    let depth = 0
    let j = entryStart
    while (j < block.length) {
      if (block[j] === '{')
        depth++
      else if (block[j] === '}')
        depth--
      if (depth === 0)
        break
      j++
    }
    const entry = block.slice(entryStart, j + 1)
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      // present if `method: operations[` (absent entries are `method?: never`)
      if (new RegExp(`\\b${method}:\\s*operations\\[`).test(entry))
        out.push([method.toUpperCase(), p])
    }
    pathRe.lastIndex = m.index + m[0].length
  }
  return out
}

async function fetchContractPaths() {
  const localOpenapi = path.resolve(import.meta.dirname, '../contracts/openapi.json')
  if (fs.existsSync(localOpenapi)) {
    const parsed = JSON.parse(fs.readFileSync(localOpenapi, 'utf8'))
    const paths = extractFromOpenapi(parsed)
    if (paths.length)
      return { source: localOpenapi, paths }
  }
  const urls = [
    `${RAW}/${REPO}/${BRANCH}/contracts/openapi.json`,
    `${RAW}/${REPO}/${BRANCH}/contracts/types.ts`,
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
      if (!res.ok)
        continue
      const text = await res.text()
      const paths = url.endsWith('.json')
        ? extractFromOpenapi(JSON.parse(text))
        : extractFromTypes(text)
      if (paths.length)
        return { source: url, paths }
    }
    catch {
      // try next
    }
  }
  throw new Error('Could not fetch PPB contract from any URL')
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(p, acc)
    }
    else if (/\.(ts|vue)$/.test(entry.name)) {
      acc.push(p)
    }
  }
  return acc
}

/** Heuristic scan: every `/api/v1`/`/ws/v1` string + method context. */
function scanCalls() {
  const calls = []
  const files = walk(SRC_DIR).filter(f =>
    !f.includes('generated.ts')
    && !f.includes('/public/')
    && !f.includes('/.nuxt/'),
  )
  const pathRe = /(\/api\/v1[^'"`]*|\/ws\/v1[^'"`]*)/g
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i]
      const trimmed = raw.trim()
      // Skip pure comment lines (doc comments can describe non-canonical paths).
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('<!--'))
        continue
      pathRe.lastIndex = 0
      let m
      while ((m = pathRe.exec(raw))) {
        let p = m[1].trim()
        // Ignore plain-english "api/v1" mentions not preceded by a slash-path start
        if (!p.startsWith('/api/v1') && !p.startsWith('/ws/v1'))
          continue
        // method context: look at this + next 2 lines
        const lookahead = lines.slice(i, i + 3).join(' ')
        const mm = lookahead.match(/method:\s*['"]([A-Z]+)['"]/)
        const method = mm ? mm[1].toUpperCase() : 'GET'
        calls.push({ method, path: p, file, line: i + 1, normalized: normalizePath(p) })
      }
    }
  }
  return calls
}

async function main() {
  const { source, paths } = await fetchContractPaths()
  const openapiPaths = paths.map(([m, p]) => ({ method: m, raw: p, normalized: normalizePath(p) }))
  const wsPaths = WS_MANIFEST.map(p => ({ method: 'GET', raw: p, normalized: normalizePath(p) }))

  const calls = scanCalls()
  const fails = []
  let hits = 0
  for (const call of calls) {
    const isWs = call.path.startsWith('/ws/')
    const pool = isWs ? wsPaths : openapiPaths
    const hit = pool.some(k => k.method === call.method && pathMatches(call.normalized, k.normalized))
    if (hit) {
      hits++
    }
    else {
      fails.push({ ...call })
    }
  }

  console.log(`contract-consistency: source=${source}`)
  console.log(`  known paths: ${openapiPaths.length} (api) + ${wsPaths.length} (ws)`)
  console.log(`  calls scanned: ${calls.length}, HITS: ${hits}, FAIL: ${fails.length}`)
  if (fails.length) {
    console.log('\nFAIL (not registered in PPB OpenAPI):')
    for (const f of fails)
      console.log(`  [${f.method}] ${f.path}  (${path.relative(process.cwd(), f.file)}:${f.line})`)
    process.exit(1)
  }
  console.log('  OK — every call is registered.')
}

main().catch((err) => {
  console.error(`contract-consistency: ${err.message}`)
  process.exit(2)
})
