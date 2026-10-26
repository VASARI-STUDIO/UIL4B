// Record the first names of every Iconify pack the library lists.
//
//   node scripts/snapshot-icon-heads.mjs [--only=lucide,tabler]
//
// Writes src/data/iconHeads/<pack>.json ({ title, names }) for each pack the
// default "All packs" grid can list: the first HEAD_SIZE names of the pack's
// /collection answer, in the order the grid shows them, with the Regular-weight
// rule already applied (src/data/iconRegularRules.js, the same one the page uses).
//
// /collection is the API's rate-limited endpoint, so this asks for one pack at a
// time, GAP_MS apart, and stops at the first refusal rather than waiting out a
// long Retry-After. Nothing is written for a pack that did not answer, so a
// refused run leaves the committed heads as they were; re-run it later.
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

async function head(pack) {
  const r = await fetch(`https://api.iconify.design/collection?prefix=${pack}&info=1`, { signal: AbortSignal.timeout(20000) })
  if (r.status === 429) throw new Error(`${pack}: refused (429), Retry-After ${r.headers.get('retry-after') ?? 'unknown'}s. Run it again later.`)
  if (!r.ok) throw new Error(`${pack}: /collection answered ${r.status}`)
  const d = await r.json()
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
