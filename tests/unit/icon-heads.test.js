// The committed head of every pack (src/data/iconHeads/<pack>.json) is what the
// default "All packs" grid lists instead of asking the rate-limited /collection
// endpoint. These pin its shape; scripts/snapshot-icon-heads.mjs writes it.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { ICON_PACK_TIERS, anonPerPack } from '../../src/data/iconPackTiers.js'
import { ANON_ICON_CEILING } from '../../src/data/iconGridRows.js'
import { matchesRegular } from '../../src/data/iconRegularRules.js'
import { stripJs as strip } from '../helpers/strip-comments.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIR = path.join(ROOT, 'src', 'data', 'iconHeads')
const PACKS = Object.keys(ICON_PACK_TIERS).filter((p) => p !== 'logodev' && !ICON_PACK_TIERS[p].animated)
const read = (pack) => JSON.parse(fs.readFileSync(path.join(DIR, `${pack}.json`), 'utf8'))

test('every Iconify pack in the tier table has a head, and no head is left over', () => {
  assert.deepEqual(fs.readdirSync(DIR).map((f) => f.replace(/\.json$/, '')).sort(), [...PACKS].sort())
})

test('each head is a title and unique, Regular-weight names, at most 250', () => {
  for (const pack of PACKS) {
    const { title, names } = read(pack)
    assert.ok(typeof title === 'string' && title, `${pack} has a title`)
    assert.ok(names.length > 0 && names.length <= 250, `${pack} holds ${names.length} names`)
    assert.equal(new Set(names).size, names.length, `${pack} repeats a name`)
    for (const n of names) {
      assert.ok(typeof n === 'string' && /^[a-z0-9][a-z0-9._-]*$/i.test(n), `${pack}: "${n}" is not an icon name`)
      assert.ok(matchesRegular(pack, n), `${pack}: ${n} is not a Regular-weight name`)
    }
  }
})

test('heads are long enough for the grids built from them', () => {
  // The signed-out lists take the ceiling's share of names from each of its packs
  // (the grid trims them to whole rows), and a pack that opens the grid must fill
  // the first page of 120 on its own.
  const need = anonPerPack(PACKS, ANON_ICON_CEILING)
  for (const pack of PACKS.filter((p) => ICON_PACK_TIERS[p].tier === 'anon')) {
    assert.ok(read(pack).names.length >= need, `${pack} is shorter than the signed-out cap of ${need}`)
  }
  assert.ok(read('lucide').names.length >= 120, 'lucide leads the grid and fills its first page')
})

test('the default listing never asks /collection for a Regular-weight pack', () => {
  const page = strip(fs.readFileSync(path.join(ROOT, 'src', 'pages', 'IconLibrary.jsx'), 'utf8'))
  const browseAll = page.slice(page.indexOf('const browseAll = useCallback'), page.indexOf('const refuseScope = useCallback'))
  assert.ok(browseAll.includes('defaultPackNames('), 'browseAll lists packs through defaultPackNames')
  assert.doesNotMatch(browseAll, /getCollectionNames\(/, 'browseAll must not request /collection per pack: that burst is what the API refuses')
  const regular = page.slice(page.indexOf('function defaultPackNames'), page.indexOf("if (!WEIGHT_RULES[weight]"))
  assert.match(regular, /loadPackHead\(pack\)/)
  assert.doesNotMatch(regular, /getCollectionNames\(/)
})
