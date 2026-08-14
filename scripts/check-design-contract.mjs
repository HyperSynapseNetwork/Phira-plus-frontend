import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const root = path.resolve(path.dirname(scriptPath), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const kind = pkg.name === 'phira-plus-panel' ? 'panel' : 'ppf'
const contractDir = path.join(root, 'contracts/frontend-design')
const version = JSON.parse(fs.readFileSync(path.join(contractDir, 'version.json'), 'utf8'))
const readJson = rel => JSON.parse(fs.readFileSync(path.join(contractDir, rel), 'utf8'))

let hash = crypto.createHash('sha256')
for (const name of version.files) {
  const p = path.join(contractDir, name)
  if (!fs.existsSync(p)) throw new Error(`missing design-contract file ${name}`)
  hash.update(name); hash.update('\0'); hash.update(fs.readFileSync(p))
}
const actualHash = hash.digest('hex')
if (actualHash !== version.sha256) throw new Error(`frontend design contract hash mismatch: ${actualHash} != ${version.sha256}`)
if (version.version !== 2 || version.revision !== 4) throw new Error(`frontend design contract version must be 2.4, got ${version.version}.${version.revision ?? 0}`)

const common = readJson('primitives/common.json')
const appSpecific = readJson(`primitives/${kind}.json`)
const states = readJson('primitives/states.json')
const notice = readJson('patterns/notice.json')
const context = readJson('patterns/context-window.json')
const surfaceContract = readJson('patterns/surface.json')
const overlayContract = readJson('patterns/overlay.json')
const touchContract = readJson('foundation/touch.json')
const propContract = readJson('primitives/props.json')
const statusContract = readJson('semantics/status.json')
const exceptions = readJson('quality/exceptions.json')
const icons = readJson('semantics/icons.json')
const tokenContract = readJson('foundation/tokens.json')
const forbidden = readJson('quality/forbidden-patterns.json')
const automated = new Set(readJson('quality/automated-rules.json').rules)
const manual = new Set(readJson('quality/manual-review.json').rules)

const failures = []
if (surfaceContract.contentSurface?.publicBoundary !== 'PPSurface') failures.push('surface pattern: contentSurface public boundary must be PPSurface')
const staticRules = forbidden.rules.filter(r => r.mode === 'static').map(r => r.id)
const manualRules = forbidden.rules.filter(r => r.mode === 'manual-review').map(r => r.id)
for (const id of staticRules) if (!automated.has(id)) failures.push(`quality contract: static rule ${id} lacks automated implementation declaration`)
for (const id of manualRules) if (!manual.has(id)) failures.push(`quality contract: manual rule ${id} lacks manual-review declaration`)

const excluded = new Set(['node_modules','.nuxt','.output','dist','.git','coverage','contracts','scripts','docs','public','.github'])
const runtimeFiles = []
function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(vue|ts|tsx|css)$/.test(e.name) && e.name !== 'generated.ts') runtimeFiles.push(p)
  }
}
walk(root)

const uiDir = path.join(root, kind === 'panel' ? 'components/ui' : 'src/components/ui')
const actualComponents = fs.existsSync(uiDir)
  ? fs.readdirSync(uiDir).filter(n => /^PP[A-Za-z0-9]+\.vue$/.test(n)).map(n => n.replace(/\.vue$/, '')).sort()
  : []
const allowedComponents = new Set([...common.required, ...common.optional, ...appSpecific.public])
for (const name of common.required) if (!actualComponents.includes(name)) failures.push(`missing required common primitive file ${name}.vue`)
for (const name of appSpecific.public) if (!actualComponents.includes(name)) failures.push(`missing declared ${kind}-specific primitive file ${name}.vue`)
for (const name of actualComponents) if (!allowedComponents.has(name)) failures.push(`undeclared public primitive ${name}.vue`)

const businessText = runtimeFiles
  .filter(f => !f.startsWith(uiDir + path.sep))
  .filter(f => f.endsWith('.vue') || f.endsWith('.ts') || f.endsWith('.tsx'))
  .map(f => fs.readFileSync(f, 'utf8')).join('\n')
for (const name of common.required) {
  const re = new RegExp(`<${name}\\b`, 'g')
  const count = [...businessText.matchAll(re)].length
  if (count === 0) failures.push(`required common primitive ${name} has 0 runtime consumers`)
}

const buttonSource = fs.readFileSync(path.join(uiDir, 'PPButton.vue'), 'utf8').replace(/\s/g, '')
if (!buttonSource.includes("weight:'secondary'")) failures.push('PPButton default weight must be secondary')
if (!buttonSource.includes("size:'md'")) failures.push('PPButton default size must be md')
if (!buttonSource.includes("type:'button'")) failures.push('PPButton default type must be button')
for (const legacy of propContract.PPButton.forbiddenLegacy) { const re = new RegExp(`<PPButton\\b[^>]*[:]?${legacy}\\s*=`, 'g'); if (re.test(businessText)) failures.push(`PPButton legacy/undeclared prop ${legacy}`) }
if (!buttonSource.includes('pp-touch-target')) failures.push('PPButton must participate in touch hit-target contract')

const tokenFile = kind === 'panel' ? path.join(root, 'assets/css/tokens.css') : path.join(root, 'src/assets/css/main.css')
const tokenCss = fs.readFileSync(tokenFile, 'utf8')
for (const token of tokenContract.requiredCssVariables) if (!tokenCss.includes(`${token}:`)) failures.push(`${path.relative(root, tokenFile)}: missing ${token}`)
if (!tokenCss.includes('--pp-material-blur: 0px')) failures.push('reduced-transparency must disable material blur through semantic token')
if (kind === 'panel') { const globalCss = fs.readFileSync(path.join(root, 'assets/css/main.css'), 'utf8'); if (/opacity\s*:\s*1\s*!important/.test(globalCss)) failures.push('Panel reduced-transparency must not force global opacity:1!important') }

const noticeComposable = fs.readFileSync(path.join(root, kind === 'panel' ? 'composables/useNotice.ts' : 'src/composables/useNotice.ts'), 'utf8').replace(/\s/g, '')
for (const [tone, ms] of Object.entries(notice.durationsMs)) {
  const needle = `${tone}:${ms === null ? 'null' : ms}`
  if (!noticeComposable.includes(needle)) failures.push(`useNotice: timing drift ${needle}`)
}
if (!noticeComposable.includes('update(') && notice.promise === 'update-same-item') failures.push('useNotice: promise contract requires in-place update')
const noticeHost = fs.readFileSync(path.join(root, kind === 'panel' ? 'components/notice/PPNoticeHost.vue' : 'src/components/notice/PPNoticeHost.vue'), 'utf8')
for (const marker of ['<details', 'requestId', 'common.copy', 'PPIcon name="close"', '--pp-radius-window', '--pp-shadow-window', '--pp-material-thick', 'px-4 py-3 pl-5', 'w-1']) if (!noticeHost.includes(marker)) failures.push(`PPNotice anatomy missing ${marker}`)

const typeFile = fs.readFileSync(path.join(root, kind === 'panel' ? 'types/ui.ts' : 'src/types/ui.ts'), 'utf8')
const typeNames = new Set([...typeFile.matchAll(/'([a-z][a-z0-9-]*)'/g)].map(m => m[1]))
const iconSource = fs.readFileSync(path.join(uiDir, 'PPIcon.vue'), 'utf8')
const iconKeys = new Set([...iconSource.matchAll(/^\s{2}([a-z][A-Za-z0-9]*):\s*\[/gm)].map(m => m[1]))
const contractIcons = new Set(icons.names)
for (const name of contractIcons) {
  if (!typeNames.has(name)) failures.push(`icon type missing ${name}`)
  if (!iconKeys.has(name)) failures.push(`PPIcon paths missing ${name}`)
}
for (const name of iconKeys) if (!contractIcons.has(name)) failures.push(`PPIcon has undeclared icon ${name}`)

function rel(f) { return path.relative(root, f).replaceAll(path.sep, '/') }
for (const f of runtimeFiles) {
  const r = rel(f)
  let s = fs.readFileSync(f, 'utf8')
  const isUi = f.startsWith(uiDir + path.sep)
  if (kind === 'panel' && !isUi && /(?:<|\b)(?:UButton|UCard|UBadge|UInput|UModal|UPagination|USelect|USwitch|UTabs|UTextarea)\b/.test(s)) failures.push(`${r}: legacy U* public UI`)
  if (kind === 'ppf' && /(?:<|\b)(?:BaseButton|GlassSurface)\b/.test(s)) failures.push(`${r}: legacy PPF public UI`)
  if (/__localized__|literalMessage/.test(s)) failures.push(`${r}: private PPNotice protocol`)
  if (f.endsWith('.vue') && /<PPButton\b[^>]*\b(?::)?(?:variant|color|intent|tone)\s*=/.test(s)) failures.push(`${r}: PPButton uses legacy/undeclared semantic prop`)

  // Global z layers must use --pp-z-* tokens. Local negative/positive numeric stacking is also disallowed in product source.
  if (/\bz-\d+\b|\b-z-\d+\b|z-\[[0-9]+\]|zIndex\s*:\s*[0-9]+|z-index\s*:\s*[0-9]+/.test(s)) failures.push(`${r}: numeric z-index bypasses design contract`)

  if (f.endsWith('.vue') && /\b(?:err|error)\.message\b/.test(s)) failures.push(`${r}: raw error.message in UI source`)
  if (/(Phase\s+[A-Z]|PROPOSED|Skeleton|scaffold|即将上线|后续版本)/i.test(s)) failures.push(`${r}: live source contains phase/scaffold/proposed language`)
  if (/const\s+(?:msg|actionMsg|batchMsg|mutationMessage|statusMessage)\s*=\s*ref\b/.test(s)) failures.push(`${r}: page-local mutation feedback state`)

  if (kind === 'ppf' && !isUi && !f.endsWith('.css')) {
    for (const match of s.matchAll(/\bclass\s*=\s*[\"']([^\"']*)[\"']/g)) {
      const tokens = match[1].split(/\s+/).filter(Boolean)
      if (tokens.some(token => ['content-surface', 'glass-focusable', 'pp-material'].includes(token))) {
        failures.push(`${r}: business source uses internal visual semantic class`)
        break
      }
    }
  }

  if (!isUi && f.endsWith('.vue')) {
    for (const m of s.matchAll(/<(input|select|textarea)\b([\s\S]*?)>/g)) {
      const tag = m[1]
      const attrs = m[2]
      const type = attrs.match(/\btype\s*=\s*["']([^"']+)["']/)?.[1] ?? ''
      let allowed = false
      if (tag === 'input' && type === 'checkbox') allowed = true
      if (kind === 'ppf' && r.includes('/viewer/') && tag === 'input' && type === 'range') allowed = true
      if (kind === 'ppf' && r.endsWith('components/preferences/PreferencesPanel.vue') && tag === 'input' && type === 'color') allowed = true
      if (!allowed) failures.push(`${r}: formal native <${tag}${type ? ` type=${type}` : ''}> must use PP primitive`)
    }
  }
}

if (kind === 'ppf') {
  const cw = fs.readFileSync(path.join(root, 'src/components/context/ContextWindow.vue'), 'utf8')
  if (!cw.includes('z-[var(--pp-z-context)]')) failures.push('ContextWindow must consume --pp-z-context')
  if (!cw.includes("'--pp-context-layer-index': index")) failures.push('ContextWindow stack index must be a CSS variable')
  if (/<svg\b/.test(cw)) failures.push('ContextWindow close icon must use Icon Registry/PPIcon')
  if (!cw.includes('<PPIcon name="close"')) failures.push('ContextWindow close icon missing PPIcon close')
  if (!cw.includes("sizeClass[entry.size ?? 'md']")) failures.push('ContextWindow must implement contract size intent')
}


// v2.2 interaction-foundation checks.
function hasCriticalTouchMarker(source, marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const a = new RegExp(`<[^>]*data-pp-touch-critical=[\"']${escaped}[\"'][^>]*class=[\"'][^\"']*pp-touch-target[^\"']*[\"'][^>]*>`)
  const b = new RegExp(`<[^>]*class=[\"'][^\"']*pp-touch-target[^\"']*[\"'][^>]*data-pp-touch-critical=[\"']${escaped}[\"'][^>]*>`)
  return a.test(source) || b.test(source)
}
const criticalTouchSource = runtimeFiles.filter(f => f.endsWith('.vue')).map(f => fs.readFileSync(f, 'utf8')).join('\n')
for (const marker of touchContract.criticalSemanticMarkers?.[kind] ?? []) {
  if (!hasCriticalTouchMarker(criticalTouchSource, marker)) failures.push(`critical touch control ${marker} missing semantic marker + pp-touch-target`)
}
const overlayManagerPath = path.join(root, kind === 'panel' ? 'composables/useOverlayManager.ts' : 'src/composables/useOverlayManager.ts')
if (!fs.existsSync(overlayManagerPath)) failures.push('OverlayManager implementation missing')
else {
  const om = fs.readFileSync(overlayManagerPath, 'utf8')
  for (const marker of ['isTopmost', "document.body.style.overflow = 'hidden'", 'restoreFocus']) if (!om.includes(marker)) failures.push(`OverlayManager missing ${marker}`)
}
if (kind === 'ppf') {
  const reauth = fs.readFileSync(path.join(root, 'src/components/ui/ReauthDialog.vue'), 'utf8')
  const header = fs.readFileSync(path.join(root, 'src/components/layout/AppHeader.vue'), 'utf8')
  const roomRow = fs.readFileSync(path.join(root, 'src/components/rooms/RoomListRow.vue'), 'utf8')
  const contextComposable = fs.readFileSync(path.join(root, 'src/composables/useContextWindow.ts'), 'utf8')
  if (!reauth.includes('useOverlayManager') || !reauth.includes("'reauth'")) failures.push('PPF Reauth must use shared OverlayManager reauth layer')
  if (!contextComposable.includes("reason: 'MAX_CONTEXT_DEPTH'") || /next\.splice\(0/.test(contextComposable)) failures.push('Context depth limit must reject explicitly, never silently drop oldest')
  if (!contextComposable.includes('entry.onClose?.()') || !contextComposable.includes('for (const entry of [...stack.value].reverse())')) failures.push('Context close/closeAll must preserve onClose callbacks')
  if (!contextComposable.includes('opener?: HTMLElement') || !contextComposable.includes('currentOpener()')) failures.push('Context entries must preserve opener for nested focus restore')
  if (!roomRow.includes('h-11 w-11')) failures.push('Room full-page action must expose 44px critical hit target')
}
if (kind === 'panel') {
  const modal = fs.readFileSync(path.join(root, 'components/ui/PPModal.vue'), 'utf8')
  const shell = fs.readFileSync(path.join(root, 'components/layout/AppShell.vue'), 'utf8')
  const topbar = fs.readFileSync(path.join(root, 'components/layout/AppTopBar.vue'), 'utf8')
  const desktop = fs.readFileSync(path.join(root, 'components/experimental/DesktopWindow.vue'), 'utf8')
  if (!modal.includes('useOverlayManager') || !modal.includes('isTopmost')) failures.push('PPModal must use shared OverlayManager/topmost ownership')
  if (!shell.includes('useOverlayManager') || !shell.includes('trapTab')) failures.push('Mobile Drawer must participate in OverlayManager/focus trap')
  if (!desktop.includes('--pp-z-desktop-window-base') || !desktop.includes('<PPIcon name="close"')) failures.push('Experimental DesktopWindow must stay in workspace z-band and use Icon Registry')
  const statePages = ['pages/jobs.vue','pages/automation.vue','pages/rooms/index.vue','pages/server.vue','pages/audit.vue','pages/coupons.vue']
  for (const relPath of statePages) { const s = fs.readFileSync(path.join(root, relPath), 'utf8'); if (/<PPBadge\b[^>]*(?:stateTone|statusTone|runStatusTone|resultTone|updateTone)/.test(s)) failures.push(`${relPath}: runtime state must use PPStatus, not PPBadge`) }
}

if (failures.length) {
  console.error(`frontend-design v2.3 gate failed (${kind}):\n${[...new Set(failures)].join('\n')}`)
  process.exit(1)
}
console.log(`frontend-design v2.4 gate passed (${kind}): contract ${version.sha256}; actual public primitives=${actualComponents.join(',')}; automated rules=${staticRules.length}; manual-review rules=${manualRules.length}`)
