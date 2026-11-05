// A SEARCH THAT MATCHES MORE THAN THE VIEWER MAY OPEN SAYS SO, WITHOUT FETCHING THE MATCHES.
//
// The rules and the words live in src/utils/iconSearchTease.js (SEARCH_TEASE_COPY),
// and are asserted here without rendering anything:
//
//   lockedSearchPacks     which packs the one count request asks about
//   searchTeaseKey        what a remembered answer is keyed on
//   summariseLockedMatches  what is counted, and what is thrown away on arrival
//   searchTeaseNeed/Where  which way in, and where the matches sit
//   searchTeaseBand       which band, if any, and where it goes
//
// Each test names the rule it holds, so a change to that rule turns it red.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { ICON_PACK_TIERS, canSeePack, tierOf } from '../../src/data/iconPackTiers.js'
import { stripJs as strip } from '../helpers/strip-comments.js'
import {
  SEARCH_TEASE_COPY,
  lockedSearchPacks, searchTeaseBand, searchTeaseKey, searchTeaseNeed, searchTeaseWhere, summariseLockedMatches,
} from '../../src/utils/iconSearchTease.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

// Every pack in the tier table, plus two the block-list refuses, so "left out" is observable.
const PACKS = [...Object.keys(ICON_PACK_TIERS), 'ri', 'streamline-flex']
const label = (p) => `L:${p}`

// ── which packs to ask about ────────────────────────────────────────────────

test('a signed-out viewer is asked about every pack above them, and nothing they may browse', () => {
  const asked = lockedSearchPacks({ packs: PACKS, tier: 'anon' })
  assert.ok(asked.includes('mdi'), 'an account-tier pack is locked for them')
  assert.ok(asked.includes('simple-icons'), 'a Pro pack is locked for them')
  assert.ok(!asked.includes('lucide'), 'a pack they browse is not asked about')
  for (const p of asked) assert.equal(canSeePack(p, 'anon'), false, `${p} is not browsable signed out`)
})

test('a free viewer is asked about the Pro packs only', () => {
  const asked = lockedSearchPacks({ packs: PACKS, tier: 'free' })
  assert.ok(asked.includes('simple-icons'))
  assert.ok(!asked.includes('mdi'), 'an account opens mdi, so it is not locked for a free viewer')
  assert.ok(asked.every((p) => tierOf(p) === 'paid'))
})

test('animated sets and blocked sets are never asked about', () => {
  for (const tier of ['anon', 'free']) {
    const asked = lockedSearchPacks({ packs: PACKS, tier })
    for (const p of ['line-md', 'svg-spinners', 'meteocons', 'ri', 'streamline-flex']) {
      assert.ok(!asked.includes(p), `${p} left out for ${tier}`)
    }
  }
})

test('no request for a Pro viewer, a single pack filter, or an unknown tier', () => {
  assert.deepEqual(lockedSearchPacks({ packs: PACKS, tier: 'paid' }), [])
  assert.deepEqual(lockedSearchPacks({ packs: PACKS, tier: 'free', packFilter: 'lucide' }), [])
  assert.deepEqual(lockedSearchPacks({ packs: PACKS, tier: undefined }), [])
  assert.deepEqual(lockedSearchPacks({ tier: 'free' }), [])
})

test('a group chip narrows the question to its own packs', () => {
  const groupPacks = ['simple-icons', 'logos', 'lucide']
  assert.deepEqual(lockedSearchPacks({ packs: PACKS, tier: 'free', groupPacks }).sort(), ['logos', 'simple-icons'])
  assert.deepEqual(lockedSearchPacks({ packs: PACKS, tier: 'free', groupPacks: ['lucide', 'mdi'] }), [],
    'a chip whose packs the viewer already opens asks nothing')
})

// ── the cache key ───────────────────────────────────────────────────────────

test('the key changes with the tier, the chip, the weight and the query, and folds case', () => {
  const base = { tier: 'free', group: null, weight: 'regular', query: 'arrow' }
  const key = searchTeaseKey(base)
  assert.notEqual(searchTeaseKey({ ...base, tier: 'anon' }), key, 'tier')
  assert.notEqual(searchTeaseKey({ ...base, group: 'flags' }), key, 'chip')
  assert.notEqual(searchTeaseKey({ ...base, weight: 'bold' }), key, 'weight')
  assert.notEqual(searchTeaseKey({ ...base, query: 'arrows' }), key, 'query')
  assert.equal(searchTeaseKey({ ...base, query: '  ARROW ' }), key, 'case and padding do not make a new question')
})

// ── what is counted ─────────────────────────────────────────────────────────

const probed = ['mdi', 'simple-icons', 'logos', 'carbon']
const run = (over) => summariseLockedMatches({ tier: 'anon', probed, limit: 999, labelOf: label, ...over })

test('matches are split by the tier that opens them, and the labels are distinct', () => {
  const s = run({ probeIds: ['mdi:arrow', 'mdi:arrow-up', 'simple-icons:arrow', 'logos:arrow-kit'] })
  assert.equal(s.free, 2, 'an account opens the mdi matches')
  assert.equal(s.paid, 2, 'Pro opens the brand matches')
  assert.equal(s.total, 4)
  assert.deepEqual(s.labels, ['L:mdi', 'L:simple-icons', 'L:logos'], 'distinct, the busiest pack first')
})

test('a Pro-only name inside an account pack counts as Pro', () => {
  const s = run({ probeIds: ['carbon:logo-github', 'carbon:arrow'] })
  assert.equal(s.paid, 1)
  assert.equal(s.free, 1)
})

test('ids from a pack that was not asked about are dropped on arrival', () => {
  const s = run({ probeIds: ['mdi:arrow', 'twemoji:arrow', 'lucide:arrow', 'ri:arrow'] })
  assert.equal(s.total, 1, 'only the pack the probe named is kept')
  assert.deepEqual(s.labels, ['L:mdi'])
})

test('a pack the viewer can browse is dropped from the probe even if it was named', () => {
  const s = summariseLockedMatches({
    tier: 'free', probed: ['mdi', 'simple-icons'], probeIds: ['mdi:arrow', 'simple-icons:arrow'], limit: 999,
  })
  assert.equal(s.total, 1, 'mdi is open to a free account, so it is not a locked match')
})

test('malformed ids and repeats are not counted', () => {
  const s = run({ probeIds: ['mdi:arrow', 'mdi:arrow', 'mdi:', ':arrow', 'mdi', 42, null, {}] })
  assert.equal(s.total, 1)
})

test('the visible packs\' Pro-only names the grid dropped are counted, other names are not', () => {
  const s = summariseLockedMatches({
    tier: 'free', probed: [], probeIds: [], mainIds: ['carbon:logo-github', 'carbon:logo-x', 'carbon:arrow', 'lucide:arrow'],
    limit: 999, labelOf: label,
  })
  assert.equal(s.paid, 2)
  assert.equal(s.free, 0)
  assert.deepEqual(s.labels, ['L:carbon'])
})

test('the weight filter that trims the grid trims the count', () => {
  const s = run({ probeIds: ['mdi:arrow', 'mdi:arrow-outline', 'simple-icons:arrow'], accept: (p, n) => !n.endsWith('-outline') })
  assert.equal(s.total, 2)
})

test('an answer that fills the limit is a floor, not a total', () => {
  const ids = Array.from({ length: 5 }, (_, i) => `mdi:a${i}`)
  assert.equal(run({ probeIds: ids, limit: 5 }).capped, true)
  assert.equal(run({ probeIds: ids, limit: 6 }).capped, false)
  assert.equal(run({ probeIds: ids, limit: 0 }).capped, false, 'no limit, no floor')
})

test('nothing locked, a Pro viewer, or a bad answer is no summary', () => {
  assert.equal(run({ probeIds: [] }), null)
  assert.equal(run({ probeIds: 'not a list' }), null)
  assert.equal(run({ probeIds: ['mdi:arrow'], tier: 'paid' }), null, 'a Pro viewer has nothing locked')
})

test('the summary holds counts and labels only, never a name or markup', () => {
  const s = run({ probeIds: ['mdi:secret-glyph'] })
  assert.deepEqual(Object.keys(s).sort(), ['capped', 'free', 'labels', 'paid', 'total'])
  assert.doesNotMatch(JSON.stringify(s), /secret-glyph/)
})

// ── the way in ──────────────────────────────────────────────────────────────

test('any match that needs Pro makes the way in Pro', () => {
  assert.equal(searchTeaseNeed({ free: 5, paid: 1 }), 'paid')
  assert.equal(searchTeaseNeed({ free: 0, paid: 3 }), 'paid')
  assert.equal(searchTeaseNeed({ free: 4, paid: 0 }), 'free', 'only account-tier matches: a login is enough')
})

test('where the matches sit follows the split', () => {
  assert.equal(searchTeaseWhere({ free: 0, paid: 2 }), 'paid')
  assert.equal(searchTeaseWhere({ free: 2, paid: 0 }), 'free')
  assert.equal(searchTeaseWhere({ free: 1, paid: 1 }), 'both')
})

// ── which band ──────────────────────────────────────────────────────────────

const summary = { free: 0, paid: 3, total: 3, capped: false, labels: ['A'] }

test('nothing found in the viewer\'s own sets: the band replaces the empty message', () => {
  assert.equal(searchTeaseBand({ summary, tier: 'free', endKind: null, searchEmpty: true }), 'empty')
  assert.equal(searchTeaseBand({ summary, tier: 'anon', endKind: null, searchEmpty: true }), 'empty')
})

test('results that have run out: a free viewer gets the search band, a signed-out viewer extends theirs', () => {
  assert.equal(searchTeaseBand({ summary, tier: 'free', endKind: 'free', searchEmpty: false }), 'end')
  assert.equal(searchTeaseBand({ summary, tier: 'anon', endKind: 'anon', searchEmpty: false }), 'anon')
})

test('no band while results are still arriving, for Pro, or with nothing locked', () => {
  assert.equal(searchTeaseBand({ summary, tier: 'free', endKind: null, searchEmpty: false }), null, 'more to load')
  assert.equal(searchTeaseBand({ summary, tier: 'paid', endKind: null, searchEmpty: true }), null, 'Pro')
  assert.equal(searchTeaseBand({ summary: null, tier: 'free', endKind: 'free', searchEmpty: false }), null, 'no summary')
  assert.equal(searchTeaseBand({ summary: { ...summary, total: 0 }, tier: 'free', endKind: 'free' }), null, 'zero')
})

// ── the words ───────────────────────────────────────────────────────────────

const { heading, body, sentence, action } = SEARCH_TEASE_COPY

test('the heading gives the exact count and where the matches are', () => {
  assert.equal(heading(12, false, 'arrow', 'paid', true), '12 more icons match “arrow” in Pro sets')
  assert.equal(heading(12, false, 'arrow', 'paid', false), '12 icons match “arrow” in Pro sets', 'no results on screen: no "more"')
  assert.equal(heading(1, false, 'arrow', 'paid', true), '1 more icon matches “arrow” in Pro sets')
  assert.equal(heading(1234, false, 'a b', 'free', false), '1,234 icons match “a b” in sets a free account opens')
  assert.equal(heading(9, false, 'x', 'both', false), '9 icons match “x” in sets that need an account or Pro')
})

test('a count that hit the limit says "More than"', () => {
  assert.equal(heading(999, true, 'arrow', 'paid', true), 'More than 999 icons match “arrow” in Pro sets')
})

test('the body names up to three sets and counts the rest', () => {
  assert.equal(body(['Phosphor'], false), 'In Phosphor.')
  assert.equal(body(['Phosphor', 'Fluent'], false), 'In Phosphor and Fluent.')
  assert.equal(body(['Phosphor', 'Fluent', 'Material Symbols'], false), 'In Phosphor, Fluent and Material Symbols.')
  assert.equal(body(['A', 'B', 'C', 'D'], false), 'In A, B, C and 1 more set.')
  assert.equal(body(['A', 'B', 'C', 'D', 'E'], false), 'In A, B, C and 2 more sets.')
})

test('with nothing in the viewer\'s own sets the body says so', () => {
  assert.equal(body(['A', 'B'], true), 'Nothing matches in the sets you can open. The matches are in A and B.')
})

test('the signed-out band takes the count as two whole sentences', () => {
  assert.equal(sentence(3, false, 'arrow', 'paid', ['A', 'B']), '3 more icons match “arrow” in Pro sets. In A and B.')
})

test('the action is the one way in: Pro, or a login', () => {
  assert.equal(action.paid, 'See Pro')
  assert.equal(action.free, 'Log in')
})

test('the copy has no "unlock", no exclamation mark, no em dash', () => {
  const all = [
    heading(12, false, 'arrow', 'paid', true), heading(12, true, 'arrow', 'both', false), heading(1, false, 'a', 'free', true),
    body(['A', 'B', 'C', 'D'], true), body(['A'], false), sentence(2, false, 'a', 'free', ['A']), action.paid, action.free,
  ].join(' ')
  assert.doesNotMatch(all, /unlock/i)
  assert.doesNotMatch(all, /!/)
  assert.doesNotMatch(all, /—/)
})

// ── the markup rule ─────────────────────────────────────────────────────────

test('the util builds no request and no glyph address', () => {
  const src = strip(fs.readFileSync(path.join(ROOT, 'src/utils/iconSearchTease.js'), 'utf8'))
  assert.doesNotMatch(src, /\bfetch\b|\.svg|icons=|\.json/, 'names only: nothing here asks for a drawing')
})

test('the page asks once, for non-Pro viewers with no pack filter, and reports the gate under its own name', () => {
  const src = strip(fs.readFileSync(path.join(ROOT, 'src/pages/IconLibrary.jsx'), 'utf8'))
  assert.match(src, /if \(tier === 'paid' \|\| packFilter \|\| cdnOk\.current === false\) return/)
  assert.match(src, /reportUpgradeGate\('icon-search-pro'\)/)
  assert.match(src, /params\.set\('prefixes', probed\.join\(','\)\)/)
})
