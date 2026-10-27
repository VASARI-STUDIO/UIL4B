// Record the first names of every Iconify pack the library lists.
//
//   node scripts/snapshot-icon-heads.mjs [--only=lucide,tabler] [--source=npm]
//
// Writes src/data/iconHeads/<pack>.json ({ title, names }) for each pack the
// default "All packs" grid can list: the first HEAD_SIZE names of the pack's
// /collection answer, in the order the grid shows them, with the Regular-weight
// rule already applied (src/data/iconRegularRules.js, the same one the page uses).
//
// /collection is the API's rate-limited endpoint, and a request made while it is
// refusing restarts the refusal. With --source=npm the same answer is rebuilt
// from the pack's published @iconify-json package on jsDelivr instead: the
// categories come from metadata.json, every visible icon in none of them is
// uncategorised, and the title from info.json, which is how /collection builds
// it. Nothing is written for a pack that did not answer, so a failed run leaves
// the committed heads as they were.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ICON_PACK_TIERS } from '../src/data/iconPackTiers.js'
import { matchesRegular } from '../src/data/iconRegularRules.js'
import { collectionToNames } from '../src/utils/iconifyCollectionCache.js'

const HEAD_SIZE = 250
const GAP_MS = 2500
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(root, 'src', 'data', 'iconHeads')

// The Iconify packs the page lists: every tier-table pack except the animated sets
// (served by the server's Pro check) and Logo.dev (not an Iconify pack).
export const HEAD_PACKS = Object.keys(ICON_PACK_TIERS).filter((p) => p !== 'logodev' && !ICON_PACK_TIERS[p].animated)

const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice('--only='.length).split(',').filter(Boolean)
const packs = only.length ? HEAD_PACKS.filter((p) => only.includes(p)) : HEAD_PACKS

const fromNpm = process.argv.includes('--source=npm')
const npm = async (pack, file, fallback) => {
  // jsDelivr refuses files over its size limit (the largest sets), so unpkg serves those.
  let r = await fetch(`https://cdn.jsdelivr.net/npm/@iconify-json/${pack}/${file}.json`, { signal: AbortSignal.timeout(30000) })
  if (r.status === 403) r = await fetch(`https://unpkg.com/@iconify-json/${pack}/${file}.json`, { signal: AbortSignal.timeout(60000) })
  if (r.ok) return r.json()
  if (fallback !== undefined && r.status === 404) return fallback
  throw new Error(`${pack}: @iconify-json ${file}.json answered ${r.status}`)
}

async function collectionFromNpm(pack) {
  const [info, meta, set] = await Promise.all([npm(pack, 'info'), npm(pack, 'metadata', {}), npm(pack, 'icons')])
  const visible = Object.keys(set.icons || {}).filter((n) => !set.icons[n].hidden)
  const categories = meta.categories || {}
  const listed = new Set(Object.values(categories).flat())
  return { title: info.name, categories, uncategorized: visible.filter((n) => !listed.has(n)) }
}

async function collectionFromApi(pack) {
  const r = await fetch(`https://api.iconify.design/collection?prefix=${pack}&info=1`, { signal: AbortSignal.timeout(20000) })
  if (r.status === 429) throw new Error(`${pack}: refused (429), Retry-After ${r.headers.get('retry-after') ?? 'unknown'}s. Run it again later.`)
  if (!r.ok) throw new Error(`${pack}: /collection answered ${r.status}`)
  return r.json()
}

async function head(pack) {
  const d = fromNpm ? await collectionFromNpm(pack) : await collectionFromApi(pack)
  const names = collectionToNames(d).filter((n) => matchesRegular(pack, n)).slice(0, HEAD_SIZE)
  if (!names.length) throw new Error(`${pack}: /collection listed no Regular-weight names`)
  return { title: d.title || pack, names }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await mkdir(OUT, { recursive: true })
  for (const [i, pack] of packs.entries()) {
    if (i) await new Promise((resolve) => setTimeout(resolve, GAP_MS))
    const data = await head(pack)
    await writeFile(path.join(OUT, `${pack}.json`), `${JSON.stringify(data)}\n`)
    console.log(`${pack}: ${data.names.length} names`)
  }
}
