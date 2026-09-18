// WHO SEES WHICH ICON PACK — the table, and the page's agreement with it.
//
// src/data/iconPackTiers.js is the single editable answer to "may this viewer
// browse this pack". The founder moves a pack between tiers by changing one
// word on one line; nothing in src/pages/IconLibrary.jsx knows a pack name.
//
// THE TEST THIS FILE EXISTS FOR is the first one: the set of packs the library
// OFFERS and the set of packs the table DECIDES ON must be identical. Adding a
// pack to ICON_GROUPS or to the pack menu without giving it a tier is the one
// failure mode that would ship silently — the page would simply refuse it for
// everyone below Pro, or (worse, if the default had gone the other way) hand it
// to everyone — and neither shows up as an error anywhere. Here it is a red
// build.
//
// Source assertions are COMMENT-BLIND, the same rule iconify-stub.test.js
// follows: a rule about source is asserted against source with the comments
// stripped, so an explanatory comment cannot be what satisfies it. This file
// has a lot of prose in it and none of that prose may pass a test.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { stripJs as strip } from '../helpers/strip-comments.js'
import {
  ANON_ICON_CAP, ICON_GATE_COPY, ICON_PACK_TIERS, TIER_ORDER,
  anonPerPack, canSeePack, tierOf, viewerTier, visiblePacks,
} from '../../src/data/iconPackTiers.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const PAGE = 'src/pages/IconLibrary.jsx'

/** The Iconify prefixes ICON_GROUPS aggregates — the same parse iconify-stub.test.js uses. */
function groupPacks() {
  const src = read(PAGE)
  const groups = src.match(/const ICON_GROUPS = \{[\s\S]*?\n\}/)?.[0]
  assert.ok(groups, 'ICON_GROUPS is gone from IconLibrary.jsx — the tier table no longer knows what the page offers')
  return [...new Set([...groups.matchAll(/packs:\s*\[([^\]]*)\]/g)]
    .flatMap((m) => m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)))]
}

/** The prefixes the pack <select> offers as individual packs, PACK_MENU's first column. */
function menuPacks() {
  const src = read(PAGE)
  const menu = src.match(/const PACK_MENU = \[[\s\S]*?\n\]/)?.[0]
  assert.ok(menu, 'PACK_MENU is gone from IconLibrary.jsx — the pack menu can no longer be checked against the table')
  return [...new Set([...menu.matchAll(/\[\s*'([^']+)'\s*,\s*'/g)].map((m) => m[1]))]
}

test('every pack the library offers has exactly one tier, and the table decides on nothing else', () => {
  const offered = [...new Set([...groupPacks(), ...menuPacks()])]
  const decided = Object.keys(ICON_PACK_TIERS)

  assert.ok(offered.length >= 20, `expected the library to offer many packs; parsed ${offered.length}`)

  const undecided = offered.filter((p) => !(p in ICON_PACK_TIERS))
  assert.deepEqual(undecided, [],
    'These packs are browsable from /create/icons and have no line in src/data/iconPackTiers.js, '
    + 'so nothing has decided who may see them. Add a line with a tier and a justification:\n  '
    + undecided.join('\n  '))

  const orphaned = decided.filter((p) => !offered.includes(p))
  assert.deepEqual(orphaned, [],
    'These packs have a tier but the library no longer offers them. A stale row is a decision '
    + 'nobody can check; delete the line:\n  ' + orphaned.join('\n  '))

  // "Exactly once" is a property of an object literal only if no key is
  // written twice — the second silently wins and the first becomes a lie the
  // reader can still see. Compare the key count against the source's own.
  const table = read('src/data/iconPackTiers.js').match(/export const ICON_PACK_TIERS = \{[\s\S]*?\n\}/)[0]
  const written = [...strip(table).matchAll(/^\s*'?([a-z0-9-]+)'?:\s*\{\s*tier:/gm)].map((m) => m[1])
  assert.equal(written.length, decided.length,
    `the table is written with ${written.length} lines but resolves to ${decided.length} packs — a prefix is listed twice and the later line silently won`)
})

test('every line carries a tier the code understands and a justification a human can audit', () => {
  for (const [prefix, row] of Object.entries(ICON_PACK_TIERS)) {
    assert.ok(TIER_ORDER.includes(row.tier), `${prefix} has tier "${row.tier}", which is not one of ${TIER_ORDER.join(' | ')}`)
    assert.equal(typeof row.why, 'string', `${prefix} has no justification`)
    // The founder's rule is "does its creator run a free browser for it", so a
    // justification that names neither a browser nor the absence of one records
    // nothing. Short strings are how a row rots into an unexplained decision.
    assert.ok(row.why.trim().length >= 40,
      `${prefix}'s justification is too thin to audit — name the official browser, or say it has none:\n    ${row.why}`)
    assert.equal(tierOf(prefix), row.tier)
  }
  assert.equal(tierOf('no-such-pack'), null, 'a pack the table has never heard of must not resolve to a tier')
})

test('the signed-out sample is exactly the outlined packs', () => {
  // The founder's line for logged out is "a capped grid, outlined packs only".
  // That is a claim about a SET, so it is asserted as one rather than left to
  // five independent lines that could drift apart one at a time.
  const src = read(PAGE)
  const outlined = src.match(/outlined:\s*\{[^}]*packs:\s*\[([^\]]*)\]/)[1]
    .split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
  const anon = Object.entries(ICON_PACK_TIERS).filter(([, r]) => r.tier === 'anon').map(([p]) => p)
  assert.deepEqual([...anon].sort(), [...outlined].sort(),
    'The `anon` tier and the Outlined group have come apart. Signed out is "outlined packs only", '
    + 'so a pack in one and not the other is a rule nobody stated.')
})

test('the tiers widen, and an unknown pack is refused by everyone except Pro', () => {
  // anon ⊂ free ⊂ paid. Asserted as containment rather than by listing, so a
  // pack moved in the table moves here too and cannot be forgotten.
  const all = Object.keys(ICON_PACK_TIERS)
  const anon = all.filter((p) => canSeePack(p, 'anon'))
  const free = all.filter((p) => canSeePack(p, 'free'))
  const paid = all.filter((p) => canSeePack(p, 'paid'))

  assert.ok(anon.length > 0 && anon.length < free.length, 'anon must see something, and less than free')
  assert.ok(free.length < paid.length, 'free must see less than paid')
  assert.deepEqual(paid, all, 'paid sees every pack in the table')
  for (const p of anon) assert.ok(free.includes(p), `${p} is visible signed out but not signed in — the tiers do not widen`)
  for (const p of free) assert.ok(paid.includes(p), `${p} is visible free but not on Pro — the tiers do not widen`)

  // The concrete cases the founder named, so a refactor that inverts the
  // comparison cannot pass by being internally consistent.
  assert.equal(canSeePack('lucide', 'anon'), true, 'Lucide is the signed-out sample')
  assert.equal(canSeePack('material-symbols', 'anon'), false, 'a solid set needs an account')
  assert.equal(canSeePack('material-symbols', 'free'), true, 'Material Symbols has a free official browser, so an account opens it')
  assert.equal(canSeePack('simple-icons', 'free'), false, 'brand marks are the named exclusion')
  assert.equal(canSeePack('twemoji', 'free'), false, 'the emoji sets are paid')
  assert.equal(canSeePack('circle-flags', 'free'), false, 'the flag sets are paid')
  assert.equal(canSeePack('simple-icons', 'paid'), true)

  // FAIL CLOSED ON AN UNKNOWN PREFIX. /search can answer with a set that is not
  // in our list at all; below Pro that must be refused rather than waved
  // through, and on Pro it must be allowed, because an unscoped Pro search has
  // always reached the whole Iconify registry.
  assert.equal(canSeePack('mingcute', 'anon'), false)
  assert.equal(canSeePack('mingcute', 'free'), false)
  assert.equal(canSeePack('mingcute', 'paid'), true)
})

test('viewerTier fails closed — only an explicit Pro is Pro, and an unresolved session is signed out', () => {
  assert.equal(viewerTier({ user: null, isPro: false }), 'anon')
  assert.equal(viewerTier({}), 'anon')
  assert.equal(viewerTier(), 'anon', 'called with nothing at all, the answer is the narrowest tier')
  assert.equal(viewerTier({ user: { uid: 'u' }, isPro: false }), 'free')
  assert.equal(viewerTier({ user: { uid: 'u' }, isPro: undefined }), 'free', 'a subscription still loading is not Pro')
  assert.equal(viewerTier({ user: { uid: 'u' }, isPro: true }), 'paid')
  // Truthiness is not entitlement. A lookup that resolved to a string, an
  // object or a 1 is a bug upstream, and the safe reading of a bug is "no".
  for (const junk of ['true', 1, {}, [], 'pro']) {
    assert.equal(viewerTier({ user: { uid: 'u' }, isPro: junk }), 'free', `isPro=${JSON.stringify(junk)} must not open the paid tier`)
  }
  // Auth still resolving: there may or may not be an account, so neither is claimed.
  assert.equal(viewerTier({ user: { uid: 'u' }, isPro: true, resolving: true }), 'anon')
})

test('visiblePacks filters without reordering, because the grid paints in pack order', () => {
  const order = ['lucide', 'simple-icons', 'tabler', 'twemoji', 'ph']
  assert.deepEqual(visiblePacks(order, 'anon'), ['lucide', 'tabler', 'ph'],
    'the caller\'s order is the grid\'s pack-by-pack sort; filtering must not disturb it')
  assert.deepEqual(visiblePacks(order, 'paid'), order)
  assert.deepEqual(visiblePacks([], 'free'), [])
})

test('the signed-out cap spreads across every anon pack rather than slicing one', () => {
  const packs = Object.keys(ICON_PACK_TIERS)
  const anonCount = packs.filter((p) => tierOf(p) === 'anon').length
  const per = anonPerPack(packs)
  assert.ok(ANON_ICON_CAP > 0 && ANON_ICON_CAP <= 120,
    `the cap is ${ANON_ICON_CAP}; above PAGE_SIZE it would need a second tranche and stop being a cap`)
  assert.ok(per * anonCount >= ANON_ICON_CAP,
    `${per} per pack across ${anonCount} packs cannot fill a cap of ${ANON_ICON_CAP} — the sample would be short`)
  assert.ok(per < ANON_ICON_CAP,
    'the per-pack share must be smaller than the cap, or the first pack fills it alone and the other four never appear')
  assert.equal(anonPerPack([]), ANON_ICON_CAP, 'with no anon packs the share degrades to the cap rather than dividing by zero')
})

test('IconLibrary consults the table — it does not carry a second copy of the rule', () => {
  const page = strip(read(PAGE))

  assert.match(page, /from '\.\.\/data\/iconPackTiers'/, 'the page must import the tier table')
  assert.match(page, /canSeePack\(/, 'the page must ask the table rather than compare tiers itself')

  // THE FETCH PATHS MUST BE SCOPED. `browseAll` iterating ALL_PACKS is the line
  // that decides how many third-party requests a signed-out visit costs; if it
  // ever goes back to the unfiltered list, every gated pack is fetched again
  // and the gate becomes fetch-then-hide.
  assert.doesNotMatch(page, /ALL_PACKS\.forEach/,
    'browseAll must iterate the packs this viewer may have, not every pack in the library — '
    + 'iterating ALL_PACKS requests a /collection for packs the visitor cannot see.')
  assert.match(page, /allowedPacks\.forEach/, 'browseAll must iterate allowedPacks')
  assert.match(page, /allowedPacks\.every/, 'the warm-cache fast path must check the same scoped list')

  // No pack name may appear in a gate decision. The table is the only place a
  // prefix and an entitlement are allowed to meet.
  for (const brand of ['simple-icons', 'twemoji', 'circle-flags', 'flat-color-icons']) {
    const inCondition = new RegExp(`(?:if|\\?|&&|\\|\\|)[^\\n]{0,80}['"\`]${brand}['"\`]`)
    assert.doesNotMatch(page, inCondition,
      `"${brand}" appears inside a condition in ${PAGE}. Tiering is a table, not a conditional — `
      + 'the founder must be able to move a pack by editing one line of src/data/iconPackTiers.js.')
  }
})

test('a gated scope never becomes the refused-service state, and never the empty state', () => {
  const page = strip(read(PAGE))
  // Three different things go wrong on this surface and each has its own words:
  //   loadError → "Couldn't reach the icon service" (the network said no)
  //   gated     → the wall (the product said no)
  //   searchEmpty → "No icons match" (the catalogue has nothing)
  // Letting any two share a rendering is the defect #435 fixed for the first
  // pair; these assertions stop it being reintroduced through the third.
  assert.match(page, /\{loadError && !gated && \(/,
    'the "couldn\'t reach the icon service" notice must be suppressed for a gated scope — nothing was asked for, so nothing refused it')
  assert.match(page, /const searchEmpty = [^\n]*!gated/,
    '"No icons to show" must be suppressed for a gated scope — it blames the catalogue for a decision the product made')
  assert.match(page, /const capWall = [^\n]*!gated/,
    'the signed-out cap wall and a gated scope are different answers and must not stack')
})

test('the gate copy is complete, count-driven, and reuses the app\'s own action labels', () => {
  for (const key of ['anon', 'lockedFree', 'lockedPro']) {
    const c = ICON_GATE_COPY[key]
    assert.ok(c, `ICON_GATE_COPY.${key} is missing — a wall would render undefined`)
    assert.ok(c.action && c.action.trim(), `ICON_GATE_COPY.${key}.action is empty — the wall would have an unlabelled button`)
  }
  // "Log in" is the nav trigger's own word and "See what Pro includes" is what
  // the Palette and Prompt libraries already say. Neither is coined here.
  assert.equal(ICON_GATE_COPY.anon.action, 'Log in')
  assert.equal(ICON_GATE_COPY.lockedFree.action, 'Log in')
  assert.equal(ICON_GATE_COPY.lockedPro.action, 'See what Pro includes')

  // NO HARD-CODED NUMBER. Every count in a wall comes from the live table, so
  // moving a pack changes the sentence. A typed number would be a claim that
  // stops being true the first time the table is edited.
  assert.match(ICON_GATE_COPY.anon.heading(5), /\b5\b/, 'the heading must render the count it is handed')
  assert.match(ICON_GATE_COPY.anon.heading(1), /\bpack\b/, 'one pack is singular')
  assert.match(ICON_GATE_COPY.anon.heading(2), /\bpacks\b/, 'two packs are plural')
  assert.match(ICON_GATE_COPY.anon.body(ANON_ICON_CAP), new RegExp(`\\b${ANON_ICON_CAP}\\b`))
  assert.doesNotMatch(ICON_GATE_COPY.lockedPro.body, /\d/, 'a fixed sentence must not quote a count it cannot keep true')
  assert.doesNotMatch(ICON_GATE_COPY.lockedFree.body, /\d/)

  // The locked headings take a label, because a wall that does not name what
  // was clicked is a wall the visitor cannot connect to their own action.
  assert.match(ICON_GATE_COPY.lockedPro.heading('Simple Icons'), /Simple Icons/)
  assert.match(ICON_GATE_COPY.lockedFree.heading('Solar'), /Solar/)
})
