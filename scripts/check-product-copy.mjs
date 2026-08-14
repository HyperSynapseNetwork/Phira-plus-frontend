import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const app = 'ppf'
const skipped = new Set(['node_modules','.nuxt','.output','dist','.git','coverage','contracts','scripts','tests','docs','public','.github'])
const files=[]
function walk(dir){ if(!fs.existsSync(dir)) return; for(const e of fs.readdirSync(dir,{withFileTypes:true})){ if(skipped.has(e.name)) continue; const p=path.join(dir,e.name); if(e.isDirectory()) walk(p); else if(/\.(vue|ts|tsx)$/.test(e.name) && e.name!=='generated.ts') files.push(p) } }
walk(root)

const commonTokens = new Set([
  'Phira+','HSN Phira+','Phira+ Panel','MyPhira','PMP','PPB','Phira','Phira ID','PPB UUID','UUID','IP','ID','UA','JSON','GA4','RKS','LIVE','Live','Replay','Replays','Console','ROOT','ROOT ONLY','DEFAULT','Google Analytics 4','Plausible','中文','EN','monitor',
])
const appTokens = app === 'panel' ? new Set(['Code','Action']) : new Set([])
const isExample = v => /^https?:\/\//.test(v) || /^G-[A-Z0-9X-]+$/.test(v) || /^\{.*\}$/.test(v) || /^(phira_id|chart id|system \/ room\.invite …)$/.test(v)
const allowedLiteral = v => commonTokens.has(v) || appTokens.has(v) || isExample(v)
const failures=[]
const domainContract = JSON.parse(fs.readFileSync(path.join(root,'contracts/frontend-design/semantics/domain-values.json'),'utf8'))
const localeFiles = ['src/i18n/zh.json','src/i18n/en.json']
const locales = localeFiles.map(p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8')))
const getPath=(obj,parts)=>parts.reduce((v,k)=>v && Object.prototype.hasOwnProperty.call(v,k) ? v[k] : undefined,obj)
for(const [domain,values] of Object.entries(domainContract.ppf ?? {})){
  for(const value of values){
    for(const [i,locale] of locales.entries()){
      const label=getPath(locale,['domainValues',domain,value])
      if(typeof label!=='string' || !label.trim()) failures.push(`domain value locale missing: ${domain}.${value} in ${localeFiles[i]}`)
    }
  }
}
for(const [i,locale] of locales.entries()){
  const blob=JSON.stringify(locale)
  if(/never appear in your browser|不会出现在浏览器中|Multiplayer history ships later|多人游玩历史将在后续提供/.test(blob)) failures.push(`${localeFiles[i]}: stale/deferred or factually incorrect product copy`)
}

for(const f of files){
  const rel=path.relative(root,f).replaceAll(path.sep,'/')
  const s=fs.readFileSync(f,'utf8')
  if(/useHead\s*\(\s*\{[^}]*title\s*:\s*['"`][^'"`]+['"`]/s.test(s)) failures.push(`${rel}: static useHead title bypasses i18n`)
  if(/PMP typed stats|Args schema \(JSON\)|Action Args \(JSON\)|Plausible domain|OWNER LATER|This page is a placeholder|本页面为占位内容|gateway route NOT yet frozen|PHASE_A_PLAN/i.test(s)) failures.push(`${rel}: development/placeholder product copy`)
  if(!f.endsWith('.vue')) continue
  if(/>\s*[×✕]\s*</.test(s)) failures.push(`${rel}: literal close glyph bypasses Icon Registry/i18n`)

  const startTag=s.indexOf('<template')
  const end=s.lastIndexOf('</template>')
  if(startTag<0 || end<startTag) continue
  const start=s.indexOf('>',startTag)+1
  let tpl=s.slice(start,end).replace(/<!--.*?-->/gs,'')
  if(/\{\{\s*n\.type\s*\}\}/.test(tpl)) failures.push(`${rel}: internal notification type exposed to ordinary user`)

  for(const m of tpl.matchAll(/>([^<>{}]*)</gs)){
    const value=m[1].replace(/\s+/g,' ').trim()
    if(!value || !/[A-Za-z\u3400-\u9fff]/.test(value) || allowedLiteral(value)) continue
    failures.push(`${rel}: visible literal text bypasses i18n: ${JSON.stringify(value)}`)
  }
  for(const m of tpl.matchAll(/(?<![:@\w-])(label|title|aria-label|placeholder|alt)\s*=\s*["']([^"']+)["']/g)){
    const value=m[2].trim()
    if(!/[A-Za-z\u3400-\u9fff]/.test(value) || allowedLiteral(value)) continue
    failures.push(`${rel}: static visible ${m[1]} bypasses i18n: ${JSON.stringify(value)}`)
  }
}

if(failures.length){ console.error(`product-copy v3 gate failed:\n${[...new Set(failures)].join('\n')}`); process.exit(1) }
console.log(`product-copy v3 gate passed: ${files.length} runtime source files; visible literals + registered domain values are localized; tech/product tokens are explicit`)
