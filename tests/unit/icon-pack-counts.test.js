// THE ICON COUNT THE SIGNED-OUT GATE QUOTES STAYS IN STEP WITH THE PACK LISTS.
//
// "Log in to access N icons" prints N from src/data/iconPackCounts.generated.js, which
// scripts/emit-icon-pack-counts.mjs writes from public/iconify/collections/. If a snapshot is
// refreshed and the counts are not, the gate would quote a number the lists no longer back.
//
// HOW TO SEE IT FAIL: edit one count in iconPackCounts.generated.js, or add a name to a
// snapshot under public/iconify/collections/ without rerunning the emit script.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { ICON_PACK_COUNTS } from '../../src/data/iconPackCounts.generated.js'
import { proOnlyIconCount, visiblePacks } from '../../src/data/iconPackTiers.js'
import { iconsOpenTo } from '../../src/utils/iconEndBand.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIR = path.join(ROOT, 'public', 'iconify', 'collections')
const names = (d) => [...new Set([...(d.uncategorized || []), ...Object.values(d.categories || {}).flat()])]

test('every snapshot has a count, and each count matches the names the snapshot lists', () => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'))
  assert.ok(files.length >= 20, 'a vacuous pass: no snapshots found')
  assert.deepEqual(Object.keys(ICON_PACK_COUNTS).sort(), files.map((f) => f.slice(0, -5)).sort(),
    'run node scripts/emit-icon-pack-counts.mjs')
  for (const f of files) {
    const prefix = f.slice(0, -5)
    const list = names(JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')))
    assert.deepEqual(ICON_PACK_COUNTS[prefix], [list.length, proOnlyIconCount(prefix, list)], `${prefix} is out of step`)
  }
})

test('a free account opens more than the signed-out sample, and the figure is the sum of its packs', () => {
  const free = visiblePacks(Object.keys(ICON_PACK_COUNTS), 'free')
  const sum = free.reduce((n, p) => n + ICON_PACK_COUNTS[p][0] - ICON_PACK_COUNTS[p][1], 0)
  assert.equal(iconsOpenTo(Object.keys(ICON_PACK_COUNTS), 'free'), sum)
  assert.ok(sum > 50_000, `a free account opens ${sum} icons`)
})
