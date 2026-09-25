// Record the real glyph data behind every icon in src/data/iconGroups.js.
//
//   node scripts/snapshot-icon-groups.mjs
//
// Writes tests/unit/fixtures/icon-groups-snapshot.json: for each pack a group
// uses, the facts tests/unit/icon-groups.test.js needs to check the style rule
// on real data — whether each id exists (and what it aliases to), its viewBox,
// its stroke weights, caps and joins, and whether it is stroked on
// currentColor. Bodies are not stored; the facts are enough and stay small.
//
// Source: the Iconify API's batched endpoint, `/{pack}.json?icons=a,b,c` — the
// same request the group view makes. When the API refuses (it rate-limits per
// IP), the script falls back to the @iconify-json/{pack} package on jsdelivr,
// which is the data the API itself serves, and records which source answered.
//
// Exits non-zero when any id is missing, so a renamed icon fails here before
// it fails in the browser.

import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PREMADE_ICON_GROUPS, parseIconRef } from '../src/data/iconGroups.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(root, 'tests', 'unit', 'fixtures', 'icon-groups-snapshot.json')

async function fromApi(pack, names) {
  const url = `https://api.iconify.design/${pack}.json?icons=${names.map(encodeURIComponent).join(',')}`
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!r.ok) throw new Error(`${url} answered ${r.status}`)
  return { data: await r.json(), source: 'api.iconify.design' }
}

async function fromPackage(pack) {
  const meta = await fetch(`https://cdn.jsdelivr.net/npm/@iconify-json/${pack}/package.json`, { signal: AbortSignal.timeout(30000) })
  const { version } = await meta.json()
  const r = await fetch(`https://cdn.jsdelivr.net/npm/@iconify-json/${pack}@${version}/icons.json`, { signal: AbortSignal.timeout(60000) })
  if (!r.ok) throw new Error(`@iconify-json/${pack} answered ${r.status}`)
  return { data: await r.json(), source: `@iconify-json/${pack}@${version}` }
}

const uniq = (list) => [...new Set(list)].sort()
const attrs = (body, name) => uniq([...body.matchAll(new RegExp(`${name}="([^"]+)"`, 'g'))].map((m) => m[1]))

function facts(data, name) {
  let cur = name
  let alias = null
  for (let hop = 0; hop < 8; hop += 1) {
    const icon = data.icons?.[cur]
    if (icon) {
      const body = icon.body || ''
      return {
        ...(alias ? { alias } : {}),
        width: icon.width || data.width || 16,
        height: icon.height || data.height || 16,
        stroked: /stroke="currentColor"/.test(body),
        strokeWidth: attrs(body, 'stroke-width'),
        cap: attrs(body, 'stroke-linecap'),
        join: attrs(body, 'stroke-linejoin'),
      }
    }
    const next = data.aliases?.[cur]?.parent
    if (!next) return null
    alias = next
    cur = next
  }
  return null
}

const byPack = new Map()
for (const g of PREMADE_ICON_GROUPS) {
  for (const ref of g.icons) {
    const { pack, name } = parseIconRef(ref)
    if (!byPack.has(pack)) byPack.set(pack, new Set())
    byPack.get(pack).add(name)
  }
}

const out = { packs: {} }
const missing = []
for (const [pack, set] of [...byPack].sort(([a], [b]) => a.localeCompare(b))) {
  const names = [...set].sort()
  let answer
  try {
    answer = await fromApi(pack, names)
  } catch (err) {
    console.warn(`${pack}: ${err.message}; reading the package instead`)
    answer = await fromPackage(pack)
  }
  const icons = {}
  for (const name of names) {
    const f = facts(answer.data, name)
    if (f) icons[name] = f
    else missing.push(`${pack}:${name}`)
  }
  out.packs[pack] = { source: answer.source, icons }
}

// One icon per line, so a diff of a refreshed snapshot names the icons that changed.
const packLines = Object.entries(out.packs).map(([pack, { source, icons }]) => {
  const rows = Object.entries(icons).map(([name, f]) => `      ${JSON.stringify(name)}: ${JSON.stringify(f)}`)
  return `    ${JSON.stringify(pack)}: {\n      "source": ${JSON.stringify(source)},\n      "icons": {\n  ${rows.join(',\n  ')}\n      }\n    }`
})
await writeFile(OUT, `{\n  "packs": {\n${packLines.join(',\n')}\n  }\n}\n`)
console.log(`wrote ${path.relative(root, OUT)}: ${[...byPack.values()].reduce((n, s) => n + s.size, 0)} icons across ${byPack.size} packs`)
if (missing.length) {
  console.error(`missing from their packs:\n  ${missing.join('\n  ')}`)
  process.exit(1)
}
