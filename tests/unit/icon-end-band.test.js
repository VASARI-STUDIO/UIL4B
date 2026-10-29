// THE BAND AT THE END OF THE ICON GRID: who sees it, and which icons it blurs.
//
// Two pure rules live in src/utils/iconEndBand.js and are asserted here without
// rendering anything:
//
//   endBandKind     signed out / free / pro / loading / gated / My Icons /
//                   empty search
//   pickTeaseIcons  only packs the viewer may browse, never the brand pack,
//                   never a name already on screen
//
// The tease draws path strings compiled into the bundle. The reason to test the
// pick is that it is the only thing standing between a blurred row and a pack
// the viewer's tier does not include.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { canSeePack } from '../../src/data/iconPackTiers.js'
import { stripJs as strip } from '../helpers/strip-comments.js'
import {
  TEASE_PACKS, endBandKind, packsProAdds, pickTeaseIcons, teaseCellCount, teaseCellPlace, teaseColsFallback,
} from '../../src/utils/iconEndBand.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

// The state of a viewer sitting at the end of a settled, non-empty result list.
const settled = { authLoading: false, isMyIcons: false, gated: null, loading: false, resultCount: 60, hasMore: false }

// ── state selection ─────────────────────────────────────────────────────────

test('signed out gets the sign-in band, free gets the upgrade band, pro gets nothing', () => {
  assert.equal(endBandKind({ ...settled, tier: 'anon' }), 'anon')
  assert.equal(endBandKind({ ...settled, tier: 'free' }), 'free')
  assert.equal(endBandKind({ ...settled, tier: 'paid' }), null)
})

test('nothing renders while auth or the first page is still loading', () => {
  for (const tier of ['anon', 'free', 'paid']) {
    assert.equal(endBandKind({ ...settled, tier, authLoading: true }), null, `${tier} while auth resolves`)
    assert.equal(endBandKind({ ...settled, tier, loading: true }), null, `${tier} while loading`)
  }
})

test('a signed-in viewer sees no band until their plan is known', () => {
  for (const tier of ['free', 'paid']) {
    assert.equal(endBandKind({ ...settled, tier, planLoading: true }), null, `${tier} while the plan loads`)
  }
  assert.equal(endBandKind({ ...settled, tier: 'free', planLoading: false }), 'free', 'plan known: the free band returns')
})

test('a gated scope, My Icons and an empty search each own the screen, so there is no band', () => {
  for (const tier of ['anon', 'free']) {
    assert.equal(endBandKind({ ...settled, tier, gated: { need: 'free', label: 'Solar' } }), null, `${tier} gated`)
    assert.equal(endBandKind({ ...settled, tier, isMyIcons: true }), null, `${tier} My Icons`)
    assert.equal(endBandKind({ ...settled, tier, resultCount: 0 }), null, `${tier} empty search`)
  }
})

test('the free band waits for the true end of results; the signed-out band does not', () => {
  assert.equal(endBandKind({ ...settled, tier: 'free', hasMore: true }), null,
    'a free viewer mid-scroll is not at the end, so no standing banner')
  assert.equal(endBandKind({ ...settled, tier: 'anon', hasMore: true }), 'anon',
    'the signed-out grid is capped, so its band is always reachable')
})

test('an unknown tier or missing arguments never produce a band', () => {
  assert.equal(endBandKind({ ...settled, tier: undefined }), null)
  assert.equal(endBandKind({ ...settled, tier: 'enterprise' }), null)
  assert.equal(endBandKind(), null)
})

// ── icon picking ────────────────────────────────────────────────────────────

// A stand-in for window.icons: `{ n, c, p, d }`, eight of each built-in pack.
const BUILT_IN = ['L', 'T', 'I', 'H', 'S'].flatMap((p) =>
  Array.from({ length: 8 }, (_, i) => ({ n: `${p.toLowerCase()}-${i}`, c: 'x', p, d: `M${p}${i}` })))
const PREFIX_OF = { L: 'lucide', T: 'tabler', I: 'iconoir', H: 'heroicons', S: 'simple-icons' }
const canSeeAnon = (prefix) => canSeePack(prefix, 'anon')

test('the tease takes only packs a signed-out viewer may browse, and never the brand pack', () => {
  const picked = pickTeaseIcons({ icons: BUILT_IN, count: 100, canSee: canSeeAnon })
  assert.ok(picked.length > 0, 'a vacuous pass: the pick returned nothing')
  for (const cell of picked) {
    const code = cell.key.split(':')[0]
    assert.notEqual(code, 'S', `${cell.key} is from the brand pack, which is Pro`)
    assert.ok(canSeeAnon(PREFIX_OF[code]), `${cell.key} is from ${PREFIX_OF[code]}, which this tier may not browse`)
  }
})

test('the pick honours the tier table, not a list of its own', () => {
  // A viewer whose tier hides Tabler must get no Tabler, even though it is in
  // the tease's pack list. Moving a pack in the table moves the tease.
  const noTabler = (prefix) => prefix !== 'tabler' && canSeeAnon(prefix)
  const picked = pickTeaseIcons({ icons: BUILT_IN, count: 100, canSee: noTabler })
  assert.ok(picked.length > 0)
  assert.ok(!picked.some((c) => c.key.startsWith('T:')), 'a pack the viewer cannot see was drawn')
  assert.deepEqual(pickTeaseIcons({ icons: BUILT_IN, count: 10, canSee: () => false }), [],
    'a viewer who may browse nothing gets no tease')
})

test('the brand pack is excluded even if the tier check would let it through', () => {
  // A Pro-style check that says yes to everything must still not pull Simple
  // Icons into the tease: the pack list is the first filter, canSee the second.
  const picked = pickTeaseIcons({ icons: BUILT_IN, count: 100, canSee: () => true })
  assert.ok(!picked.some((c) => c.key.startsWith('S:')))
  assert.deepEqual(TEASE_PACKS.map(([code]) => code), ['L', 'T', 'I', 'H'])
})

test('the tease skips icons already on screen and is the same on every call', () => {
  const shownNames = ['l-0', 't-0', 'i-1']
  const a = pickTeaseIcons({ icons: BUILT_IN, shownNames, count: 12, canSee: canSeeAnon })
  const b = pickTeaseIcons({ icons: BUILT_IN, shownNames, count: 12, canSee: canSeeAnon })
  assert.deepEqual(a, b, 'the pick must be deterministic')
  for (const name of shownNames) {
    const code = name.split('-')[0].toUpperCase()
    assert.ok(!a.some((c) => c.key === `${code}:${name}`), `${name} is already on screen`)
  }
})

test('the tease alternates packs so every set shows, and returns what exists when asked for more', () => {
  const four = pickTeaseIcons({ icons: BUILT_IN, count: 4, canSee: canSeeAnon })
  assert.deepEqual(four.map((c) => c.key.split(':')[0]), ['L', 'T', 'I', 'H'])
  assert.equal(pickTeaseIcons({ icons: BUILT_IN, count: 1000, canSee: canSeeAnon }).length, 32,
    'four packs of eight')
})

test('the tease carries a path and a key and nothing else', () => {
  const [cell] = pickTeaseIcons({ icons: BUILT_IN, count: 1, canSee: canSeeAnon })
  assert.deepEqual(Object.keys(cell).sort(), ['d', 'key'], 'no name, pack or category reaches the DOM')
})

test('bad input gives an empty tease rather than a throw', () => {
  assert.deepEqual(pickTeaseIcons(), [])
  assert.deepEqual(pickTeaseIcons({ icons: null, count: 4, canSee: canSeeAnon }), [])
  assert.deepEqual(pickTeaseIcons({ icons: BUILT_IN, count: 0, canSee: canSeeAnon }), [])
  assert.deepEqual(pickTeaseIcons({ icons: BUILT_IN, count: 4 }), [])
})

// ── layout helpers ──────────────────────────────────────────────────────────

test('two rows of whatever the live grid has', () => {
  assert.equal(teaseCellCount(8), 8)
  assert.equal(teaseCellCount(3), 3)
  assert.equal(teaseCellCount(0), 0)
  assert.equal(teaseColsFallback(true), 3)
  assert.equal(teaseColsFallback(false), 8)
})

test('cell position drives the second-row fade and the chip clamp', () => {
  assert.deepEqual(teaseCellPlace(0, 4), { row: 0, edge: 'first' })
  assert.deepEqual(teaseCellPlace(1, 4), { row: 0, edge: null })
  assert.deepEqual(teaseCellPlace(3, 4), { row: 0, edge: 'last' })
  assert.deepEqual(teaseCellPlace(4, 4), { row: 1, edge: 'first' })
  assert.deepEqual(teaseCellPlace(7, 4), { row: 1, edge: 'last' })
})

test('the Pro pack count is derived from the table', () => {
  assert.equal(packsProAdds(['lucide', 'mdi', 'simple-icons', 'twemoji']), 2)
  assert.equal(packsProAdds(['lucide', 'mdi']), 0)
})

// ── the page wires the rules in ─────────────────────────────────────────────

test('the page renders the band only from endBandKind and the tease only from the picked cells', () => {
  const page = strip(fs.readFileSync(path.join(ROOT, 'src', 'pages', 'IconLibrary.jsx'), 'utf8'))
  assert.match(page, /endKind === 'anon'/)
  assert.match(page, /endKind === 'free'/)
  assert.match(page, /pickTeaseIcons\(\{/, 'the tease must come from the pick, not a list typed in the page')
  assert.match(page, /to="\/plans"/, 'the upgrade band goes to /plans')
  assert.match(page, /openGate\('free'\)/, 'sign-in uses the existing gate')
})
