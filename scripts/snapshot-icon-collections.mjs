// Record each icon pack's list of icon names so the library can serve it from our own site.
//
//   node scripts/snapshot-icon-collections.mjs [--from-packages] [pack ...]
//
// Writes public/iconify/collections/<pack>.json for every Iconify pack the icon
// library offers (the keys of ICON_PACK_TIERS, less logodev, which is not an
// Iconify set, and fluent-emoji, which is live-only). Each file is the answer to Iconify's
// `/collection?prefix=<pack>&info=1`, the request IconLibrary.jsx makes, so the
// page reads the same names, categories, title and licence it would read live.
// With pack names, only those files are rewritten (a pack added later, or one
// the API refused on the last run); with none, every pack is. --from-packages
// does not call the API at all.
//
// Kept: prefix, title, total, categories, uncategorized, and from `info` the name,
// total, author and license (all the page reads). Dropped: aliases, hidden and the
// rest of `info` (samples, tags, palette, height, category), which nothing reads.
//
// Source: the API itself, one pack at a time. It rate-limits per IP and refuses
// for an hour once it has had enough, so after the first refusal the remaining
// packs are rebuilt from the @iconify-json/<pack> package on jsdelivr, which is the
// data the API serves (visible icons not in a category are `uncategorized`; the
// package's metadata.json holds the categories). A pack too large for the CDN
// (fluent-emoji) cannot be rebuilt that way, so it has no snapshot and the page
// asks Iconify for it live. Nothing is written unless every requested pack has an
// answer. Rerun it, commit the diff.

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ICON_PACK_TIERS } from '../src/data/iconPackTiers.js'
import { COLLECTION_SNAPSHOT_PATH, isCollectionAnswer } from '../src/utils/iconCollectionSnapshot.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(root, 'public', ...COLLECTION_SNAPSHOT_PATH.split('/').filter(Boolean))
const NOT_ICONIFY = new Set(['logodev'])
// Too large for the CDN route, so it has no snapshot and the page asks Iconify live.
const LIVE_ONLY = new Set(['fluent-emoji'])
const PAUSE_MS = 3000

const offered = Object.keys(ICON_PACK_TIERS).filter((p) => !NOT_ICONIFY.has(p) && !LIVE_ONLY.has(p)).sort()
const args = process.argv.slice(2)
const fromPackages = args.includes('--from-packages')
const asked = args.filter((a) => !a.startsWith('--'))
const liveOnly = asked.filter((p) => LIVE_ONLY.has(p))
if (liveOnly.length) {
  console.error(`${liveOnly.join(', ')} is served live and has no snapshot`)
  process.exit(1)
}
const unknown = asked.filter((p) => !offered.includes(p))
if (unknown.length) {
  console.error(`not an Iconify pack the library offers: ${unknown.join(', ')}`)
  process.exit(1)
}
const packs = asked.length ? [...new Set(asked)].sort() : offered

// What the page reads from an Iconify answer, and nothing else.
function slim(d) {
  const { prefix, title, total, categories, uncategorized, info } = d
  const out = { prefix, title, total }
  if (info && typeof info === 'object') {
    const { name, total: infoTotal, author, license } = info
    out.info = { name, total: infoTotal, author, license }
  }
  if (categories && Object.keys(categories).length) out.categories = categories
  if (uncategorized && uncategorized.length) out.uncategorized = uncategorized
  return JSON.parse(JSON.stringify(out))
}

class Refused extends Error {}

async function fromApi(pack) {
  const url = `https://api.iconify.design/collection?prefix=${encodeURIComponent(pack)}&info=1`
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (r.status === 429) throw new Refused(`retry after ${r.headers.get('retry-after') || '?'}s`)
  if (!r.ok) throw new Error(`${url} answered ${r.status}`)
  return r.json()
}

async function fromPackage(pack) {
  const cdn = 'https://cdn.jsdelivr.net/npm'
  const get = async (url, optional = false) => {
    const r = await fetch(url, { signal: AbortSignal.timeout(120000) })
    if (!r.ok) {
      if (optional && r.status === 404) return {}
      throw new Error(`${url} answered ${r.status}`)
    }
    return r.json()
  }
  const { version } = await get(`${cdn}/@iconify-json/${pack}/package.json`)
  const base = `${cdn}/@iconify-json/${pack}@${version}`
  const [set, info, meta] = await Promise.all([
    get(`${base}/icons.json`), get(`${base}/info.json`), get(`${base}/metadata.json`, true),
  ])
  const visible = Object.keys(set.icons || {}).filter((n) => !set.icons[n].hidden)
  const categories = meta.categories || {}
  const inCategory = new Set(Object.values(categories).flat())
  return {
    prefix: pack,
    total: info.total,
    title: info.name,
    info,
    categories,
    uncategorized: visible.filter((n) => !inCategory.has(n)),
  }
}

const results = new Map()
const sources = new Map()
let apiRefused = fromPackages
for (const pack of packs) {
  let d = null
  if (!apiRefused) {
    try {
      d = await fromApi(pack)
      sources.set(pack, 'api')
      await new Promise((resolve) => setTimeout(resolve, PAUSE_MS))
    } catch (err) {
      if (!(err instanceof Refused)) throw err
      apiRefused = true
      console.warn(`${pack}: the API refused (${err.message}); rebuilding the rest from the packages`)
    }
  }
  if (!d) {
    try {
      d = await fromPackage(pack)
      sources.set(pack, 'package')
    } catch (err) {
      const kept = await readFile(path.join(OUT_DIR, `${pack}.json`), 'utf8').then(JSON.parse, () => null)
      if (!kept || asked.includes(pack)) {
        console.error(`${pack}: no answer from the API or the package (${err.message}); nothing written. Rerun for this pack alone once the API allows requests again.`)
        process.exit(1)
      }
      console.warn(`${pack}: no answer from the package (${err.message}); keeping the committed file`)
      d = kept
      sources.set(pack, 'kept')
    }
  }
  if (!isCollectionAnswer(d) || d.prefix !== pack || !(d.title || d.info?.name)) {
    console.error(`${pack}: the answer is not a pack list; nothing written`)
    process.exit(1)
  }
  results.set(pack, slim(d))
}

await mkdir(OUT_DIR, { recursive: true })
// A full run also removes the snapshot of a pack that left the library.
if (!asked.length) {
  for (const f of await readdir(OUT_DIR)) {
    if (f.endsWith('.json') && !results.has(f.slice(0, -5))) await rm(path.join(OUT_DIR, f))
  }
}
let bytes = 0
for (const [pack, data] of results) {
  const text = JSON.stringify(data)
  bytes += text.length
  await writeFile(path.join(OUT_DIR, `${pack}.json`), text)
  console.log(`${pack}: ${sources.get(pack)}`)
}
console.log(`wrote ${results.size} packs to ${path.relative(root, OUT_DIR)} (${(bytes / 1024).toFixed(0)} KB)`)
