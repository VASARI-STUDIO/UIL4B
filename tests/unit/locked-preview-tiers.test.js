// Three rungs, not two — and the cap that makes the third one real.
//
// Founder instruction, 2026-09-18: "for the galleries non logged in users get 3
// free ones logged in get 10 and paid get full". tests/unit/locked-library-tease
// .test.js already proves the OLD half of this gate: that a locked row's payload
// never reaches a preview, and that only an exact `true` opens it. This file
// proves the new half, and the new half is where the danger is:
//
//   A COUNT IS NOT A GATE IF THE USER OWNS THE ORDER. That is the exact defect
//   this repo has already paid for once — the prompt library locked everything
//   past the twelfth of the FILTERED list, so typing a phrase only a locked
//   prompt contained brought it back at index 0, unlocked. A tier cap is a
//   count, so shipping one without pinning WHAT it counts down would rebuild
//   that bug with a nicer name.
//
// So the assertions below are about three things and nothing else:
//   1. the numbers are the founder's, and the ladder only ever climbs on an
//      exact `true`;
//   2. the cap is applied to the CANONICAL library, inside the splitter, before
//      any control on the page can reach the data;
//   3. what the pages then SAY about the withheld rows is arithmetic on the
//      split, never a literal — a wall that lies about its own size is the
//      cheapest possible way to lose trust.
//
// Source assertions strip comments first, because a comment that still names an
// old shape would let a test pass on prose.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  splitLockedLibrary,
  accountTierGain,
  galleryLimit,
  galleryTier,
  GALLERY_TIER_LIMITS,
} from '../../src/utils/lockedPreview.js'
import { LIBRARY_PALETTES } from '../../src/data/paletteLibrary.js'
import { GALLERY_GRADIENTS } from '../../src/data/gradientGallery.js'
import { COMMUNITY_PROMPTS } from '../../src/data/communityPrompts.js'
import { BRAND_PALETTES } from '../../src/data/brandPalettes.js'
import { stripJs as stripComments } from '../helpers/strip-comments.js'

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')

const PAGES = {
  palettes: 'src/pages/PaletteGallery.jsx',
  gradients: 'src/pages/GradientGallery.jsx',
  prompts: 'src/pages/PromptLibrary.jsx',
}

// The three gated libraries and the predicate each one gates on. `isOpen` is
// copied from the page deliberately rather than imported: if a page changes its
// predicate, these expectations should stop matching and be re-decided, not
// follow along silently.
const LIBRARIES = [
  { name: 'palettes', items: LIBRARY_PALETTES, isOpen: (p) => p.pro !== true },
  { name: 'gradients', items: GALLERY_GRADIENTS, isOpen: () => true },
  { name: 'prompts', items: COMMUNITY_PROMPTS, isOpen: (p) => p.free === true },
]

const preview = (item) => ({ id: item.id, label: item.name, slots: 3 })

// ── 0. The fixtures discriminate ────────────────────────────────────────────

test('every gated library is bigger than the caps, or these assertions are vacuous', () => {
  for (const { name, items, isOpen } of LIBRARIES) {
    const eligible = items.filter(isOpen).length
    assert.ok(items.length > GALLERY_TIER_LIMITS.free,
      `${name} holds ${items.length} rows — no bigger than the free cap, so nothing here can fail`)
    assert.ok(eligible > GALLERY_TIER_LIMITS.anonymous,
      `${name} has only ${eligible} eligible rows — the anonymous cap would not bite`)
  }
})

// ── 1. The numbers, and the ladder ──────────────────────────────────────────

test('the tier limits are the ones the founder set: 3, 10, everything', () => {
  // Pinned as literals on purpose. These are a PRICING decision, not an
  // implementation detail, so changing one has to be a deliberate edit to a
  // test that says so — the same reasoning as the pinned free-prompt set.
  assert.equal(GALLERY_TIER_LIMITS.anonymous, 3, 'a signed-out visitor gets three')
  assert.equal(GALLERY_TIER_LIMITS.free, 10, 'a free account gets ten')
  assert.equal(GALLERY_TIER_LIMITS.pro, Infinity, 'a paid account gets all of it')
  assert.ok(GALLERY_TIER_LIMITS.anonymous < GALLERY_TIER_LIMITS.free,
    'the ladder must climb — an account that opens no more than no account is not a rung')
})

test('the ladder only ever climbs on an exact true', () => {
  // undefined is the case that matters: it is what BOTH lookups return while
  // they are still resolving, and a gate that opens during a load is a gate
  // anyone can win by being fast.
  for (const value of [undefined, null, false, 0, 1, 'true', 'yes', {}, []]) {
    assert.equal(galleryTier({ isPro: value, signedIn: value }), 'anonymous',
      `isPro/signedIn ${JSON.stringify(value)} climbed a rung it had not earned`)
  }
  assert.equal(galleryTier({ isPro: false, signedIn: true }), 'free')
  assert.equal(galleryTier({ isPro: true, signedIn: false }), 'pro', 'entitlement outranks the session')
  assert.equal(galleryTier({}), 'anonymous', 'no answer at all is the bottom rung')
  assert.equal(galleryTier(), 'anonymous', 'not even an argument is the bottom rung')
})

test('an unknown tier gets the tightest cap, not the loosest', () => {
  // A typo or a rung somebody adds and forgets to wire must show LESS.
  for (const tier of ['team', 'trial', '', undefined, null]) {
    assert.equal(galleryLimit(tier), GALLERY_TIER_LIMITS.anonymous, `galleryLimit(${tier}) opened too much`)
  }
  assert.equal(galleryLimit('pro'), Infinity)
  assert.equal(galleryLimit('free'), 10)
})

// ── 2. The cap, applied where the data is produced ──────────────────────────

test('each rung opens exactly min(cap, eligible) rows of each library', () => {
  for (const { name, items, isOpen } of LIBRARIES) {
    const eligible = items.filter(isOpen).length
    for (const tier of ['anonymous', 'free', 'pro']) {
      const { open, remaining } = splitLockedLibrary(items, {
        unlocked: tier === 'pro',
        isOpen,
        preview,
        limit: galleryLimit(tier),
      })
      const expected = tier === 'pro' ? items.length : Math.min(galleryLimit(tier), eligible)
      assert.equal(open.length, expected, `${name} at the ${tier} rung opened ${open.length}, expected ${expected}`)
      assert.equal(remaining, items.length - open.length,
        `${name} at the ${tier} rung mis-states how many rows are withheld`)
    }
  }
})

test('the cap counts down the list it was given, from the top', () => {
  // The open set is the FIRST n eligible rows of the caller's array. That is
  // what makes "hand in the canonical library" a meaningful instruction: the
  // answer is a property of the data file's order, which an author controls,
  // and not of any control a reader can press.
  const { open } = splitLockedLibrary(LIBRARY_PALETTES, {
    unlocked: false,
    isOpen: (p) => p.pro !== true,
    preview,
    limit: 3,
  })
  assert.deepEqual(
    open.map((p) => p.id),
    LIBRARY_PALETTES.filter((p) => p.pro !== true).slice(0, 3).map((p) => p.id),
    'the cap did not take the first three eligible rows in library order',
  )
})

test('WHICH list the cap is given decides the answer — the reason the source assertion below exists', () => {
  // The Prompt Library's Sort control, simulated at the splitter. "Newest"
  // reverses the library; if that reversed array were what the gate saw, three
  // DIFFERENT prompts would fall open, and a visitor could collect six out of a
  // three-prompt allowance by toggling one control.
  //
  // This is the fixture for the source assertion further down: it establishes
  // that handing over a view instead of the library is a real disclosure and
  // not a stylistic preference. Sorting the OPEN set afterwards, which is what
  // the page now does, cannot reach the boundary at all.
  const gate = { unlocked: false, isOpen: (p) => p.free === true, preview, limit: 3 }
  const ids = (list) => list.map((p) => p.id).sort()
  const canonical = splitLockedLibrary(COMMUNITY_PROMPTS, gate).open
  const reversed = splitLockedLibrary([...COMMUNITY_PROMPTS].reverse(), gate).open
  assert.equal(canonical.length, 3, 'the cap did not bite — the rest of this test is vacuous')
  assert.notDeepEqual(ids(reversed), ids(canonical),
    'reordering the input did not change the open set, so this suite cannot see the defect it was written for')
  // And the harmless half: re-ordering what the gate RETURNED moves nothing.
  const popular = [...canonical].sort((a, b) => (b.saves || 0) - (a.saves || 0))
  assert.deepEqual(ids(popular), ids(canonical), 'sorting the open set changed which prompts are open')
})

test('the flag still dominates: no cap, however wide, opens a locked row', () => {
  // The cap narrows the free tier and can never widen it. A prompt that never
  // declared `free: true` is locked at every rung below Pro, which is the
  // fail-closed default the data file relies on.
  const { open } = splitLockedLibrary(COMMUNITY_PROMPTS, {
    unlocked: false,
    isOpen: (p) => p.free === true,
    preview,
    limit: 9999,
  })
  assert.ok(open.length > 0, 'nothing opened — this assertion would be vacuous')
  assert.ok(open.every((p) => p.free === true), 'a cap wide enough to reach them opened flag-locked prompts')
  assert.equal(open.length, COMMUNITY_PROMPTS.filter((p) => p.free === true).length)
})

test('a cap that arrives broken shows nothing, not everything', () => {
  // Same reflex as `unlocked`: a limit that is null, unparseable or negative is
  // an unanswered question, and an unanswered question locks. Infinity is the
  // only way to ask for no cap at all, and it is the default.
  for (const limit of [null, NaN, -1, -50, 'ten', {}]) {
    const { open, remaining } = splitLockedLibrary(LIBRARY_PALETTES, {
      unlocked: false,
      isOpen: (p) => p.pro !== true,
      preview,
      limit,
    })
    assert.equal(open.length, 0, `limit ${JSON.stringify(limit)} opened ${open.length} rows`)
    assert.equal(remaining, LIBRARY_PALETTES.length, 'a closed gate must still count the whole library')
  }
})

test('with no limit the splitter behaves exactly as the two-tier callers expect', () => {
  // PaletteBuilder's brands panel and any other flag-only gate pass no `limit`.
  // They must be untouched by this change: every free brand open, every paid
  // one withheld.
  const { open, remaining } = splitLockedLibrary(BRAND_PALETTES, {
    unlocked: false,
    isOpen: (b) => b.free === true,
    preview: (b) => ({ id: b.id, label: b.name, slots: b.colors.length }),
  })
  const free = BRAND_PALETTES.filter((b) => b.free === true)
  assert.equal(open.length, free.length, 'the default limit narrowed a caller that asked for no cap')
  assert.equal(remaining, BRAND_PALETTES.length - free.length)
  assert.ok(free.length > GALLERY_TIER_LIMITS.anonymous,
    'the free brand set is smaller than the anonymous cap, so this test could not see the difference')
  // Checked again on a library BIGGER than the free cap, which is the only way
  // to tell "no cap" apart from "the free cap": the brand list has seven free
  // rows, so a default of ten would look identical there and this test would
  // pass on a module that had silently started metering every caller.
  const wide = splitLockedLibrary(LIBRARY_PALETTES, {
    unlocked: false,
    isOpen: (p) => p.pro !== true,
    preview,
  })
  const eligible = LIBRARY_PALETTES.filter((p) => p.pro !== true).length
  assert.ok(eligible > GALLERY_TIER_LIMITS.free, 'the palette library no longer exceeds the free cap')
  assert.equal(wide.open.length, eligible, 'a caller that passed no limit was capped anyway')
})

// ── 3. The rows the cap withholds are withheld like any other ───────────────

test('a row the CAP withholds leaks no more than a row the flag withholds', () => {
  // The overflow is teased from the same sanitiser. A careless mapper handing
  // over the payload must be stripped here too — the cap must not become a
  // second, softer class of locked row.
  const { locked } = splitLockedLibrary(LIBRARY_PALETTES, {
    unlocked: false,
    isOpen: (p) => p.pro !== true,
    preview: (p) => ({ id: p.id, label: p.name, slots: p.colors.length, colors: p.colors, text: 'secret' }),
    limit: 3,
  })
  assert.ok(locked.length > 0, 'nothing was teased — this assertion would be vacuous')
  const serialised = JSON.stringify(locked).toUpperCase()
  // The teased rows here are the CAPPED ones — free-tier palettes, not paid
  // brands — so their own hexes are the oracle.
  const withheld = LIBRARY_PALETTES.filter((p) => p.pro !== true).slice(3, 6)
  for (const palette of withheld) {
    for (const hex of palette.colors) {
      assert.ok(!serialised.includes(hex.toUpperCase()), `a capped preview leaked ${hex}`)
      assert.ok(!serialised.includes(hex.toUpperCase().slice(1)), `a capped preview leaked ${hex} without its hash`)
    }
  }
  assert.ok(!JSON.stringify(locked).includes('secret'), 'the whitelist let an unlisted key through under a cap')
})

test('the tease is drawn from the next rows, so it reads as the library continuing', () => {
  const { locked } = splitLockedLibrary(LIBRARY_PALETTES, {
    unlocked: false,
    isOpen: (p) => p.pro !== true,
    preview: (p) => ({ id: p.id, label: p.name, slots: p.colors.length }),
    limit: 10,
  })
  const next = LIBRARY_PALETTES.filter((p) => p.pro !== true).slice(10, 13).map((p) => p.id)
  assert.deepEqual(locked.map((p) => p.id), next,
    'the placeholders are not the rows immediately past the cap')
})

test('eligible is a fact about the library and never a row', () => {
  const { eligible } = splitLockedLibrary(COMMUNITY_PROMPTS, {
    unlocked: false,
    isOpen: (p) => p.free === true,
    preview,
    limit: 3,
  })
  assert.equal(eligible, COMMUNITY_PROMPTS.filter((p) => p.free === true).length,
    'eligible must count every row that passes the flag, cap or no cap')
  assert.equal(typeof eligible, 'number', 'eligible is a count, not a list')
})

// ── 4. The honest number on the signed-out wall ─────────────────────────────

test('accountTierGain says how many more an ACCOUNT opens, never how many Pro opens', () => {
  // The untruth this prevents: a signed-out visitor told "another 98 with Pro"
  // when seven of those arrive with a free account that costs nothing.
  assert.equal(accountTierGain({ tier: 'anonymous', eligible: 71, shown: 3 }), 7)
  // Never more than exists. A library with five eligible rows cannot promise
  // seven more.
  assert.equal(accountTierGain({ tier: 'anonymous', eligible: 5, shown: 3 }), 2)
  assert.equal(accountTierGain({ tier: 'anonymous', eligible: 3, shown: 3 }), 0)
  // Never negative, whatever arithmetic arrives.
  assert.equal(accountTierGain({ tier: 'anonymous', eligible: 2, shown: 9 }), 0)
  // Zero above the bottom rung: from there the next step is Pro, and the Pro
  // wall states the true remaining count itself. Asserted with a gap the
  // arithmetic alone would fill — `shown: 3` at the free rung — because
  // `shown: 10` returns zero either way, so it cannot tell a rung check from a
  // coincidence.
  assert.equal(accountTierGain({ tier: 'free', eligible: 71, shown: 3 }), 0,
    'a signed-in viewer was offered an account they already have')
  assert.equal(accountTierGain({ tier: 'free', eligible: 71, shown: 10 }), 0)
  assert.equal(accountTierGain({ tier: 'pro', eligible: 71, shown: 101 }), 0)
  assert.equal(accountTierGain(), 0, 'no answer at all promises nothing')
})

test('the three libraries add up at every rung', () => {
  // The arithmetic each wall prints, checked against the data: what is shown,
  // plus what an account adds, plus what only Pro opens, is the whole library.
  for (const { name, items, isOpen } of LIBRARIES) {
    const eligible = items.filter(isOpen).length
    const { open, remaining } = splitLockedLibrary(items, {
      unlocked: false, isOpen, preview, limit: GALLERY_TIER_LIMITS.anonymous,
    })
    const adds = accountTierGain({ tier: 'anonymous', eligible, shown: open.length })
    assert.equal(open.length + adds, Math.min(GALLERY_TIER_LIMITS.free, eligible),
      `${name}: what a signed-out visitor is promised does not equal what the free rung actually opens`)
    assert.equal(open.length + remaining, items.length, `${name}: the counts do not sum to the library`)
  }
})

// ── 5. The pages are wired to it, and their counts are derived ──────────────

test('every gated gallery derives its rung and passes that rung as the cap', () => {
  for (const [name, file] of Object.entries(PAGES)) {
    const src = stripComments(read(file))
    assert.ok(/galleryTier\(\{\s*isPro,\s*signedIn:/.test(src),
      `${name} must derive its rung from galleryTier(isPro, signedIn)`)
    assert.ok(/limit:\s*galleryLimit\(tier\)/.test(src),
      `${name} must hand the rung's cap to splitLockedLibrary`)
    // The cap alone is not the gate. `unlocked` stays an exact identity check,
    // so Pro is answered before any counting happens.
    assert.ok(/unlocked:\s*isPro === true/.test(src), `${name} must still gate on an exact isPro === true`)
  }
})

test('the prompt gate is handed the library, not the view of it the reader built', () => {
  // THE REGRESSION THIS EXISTS FOR. Before the tier cap, this call was given
  // `sortedCommunity` — the list AFTER the Sort control had reordered it. A
  // flag-only gate did not care. A COUNTED gate would: flipping Sort to Newest
  // reverses the array, hands the cap a different first three, and three more
  // prompts fall open. The splitter must see COMMUNITY_PROMPTS, and the sort
  // must run on what it returned.
  const src = stripComments(read(PAGES.prompts))
  assert.ok(/splitLockedLibrary\(COMMUNITY_PROMPTS,/.test(src),
    'the splitter must be given the canonical prompt library')
  assert.ok(!/splitLockedLibrary\(sorted/.test(src),
    'the splitter is being given a sorted view — the Sort control can move the gate')
  const split = src.indexOf('splitLockedLibrary(')
  const sort = src.indexOf('[...openCommunity]')
  assert.ok(split > -1 && sort > -1, 'the page no longer splits then sorts — re-read this test')
  assert.ok(split < sort, 'the sort runs before the gate — the reader owns the boundary again')
})

test('the gradient gallery filters and searches the split output, closing its hex oracle', () => {
  // The gradient haystack indexes every stop's hex, so filtering the FULL
  // collection would let a signed-out visitor confirm a withheld gradient's
  // colours by typing them — and read its name out of the result.
  const src = stripComments(read(PAGES.gradients))
  assert.ok(src.includes('browsable.filter('), 'the search must run over the split output')
  assert.ok(!/GALLERY_GRADIENTS\.filter\(/.test(src), 'the full collection must not be the filter source')
})

test('no wall writes a tier number as a literal', () => {
  // Same rule the Pro walls already follow: a hard-coded "another 7" goes stale
  // the moment a row is added, and the cap makes these numbers move more often
  // than the library does.
  for (const [name, file] of Object.entries(PAGES)) {
    const src = stripComments(read(file))
    assert.ok(/Another \$\{accountAdds\}/.test(src), `${name}'s account wall must interpolate its own count`)
    assert.ok(/Another \$\{locked/.test(src), `${name}'s Pro wall must interpolate the remaining count`)
    assert.ok(/accountTierGain\(\{/.test(src), `${name} must compute the account gain rather than assume it`)
  }
})

test('the signed-out wall offers the free account, and the paid wall offers Pro', () => {
  // The rung mismatch this prevents: selling a purchase to somebody whose next
  // step costs nothing. `free: true` is what makes the dialog present an
  // account rather than a checkout — the same flag useExportGate passes.
  for (const [name, file] of Object.entries(PAGES)) {
    const src = stripComments(read(file))
    assert.ok(src.includes('Create your free account'), `${name} has no account rung on its wall`)
    assert.ok(/requireLogin\('[a-z ]+', \{ free: true, signup: true \}\)/.test(src),
      `${name}'s account wall must open the free-account dialog, not a checkout`)
    assert.ok(src.includes('See what Pro includes'), `${name} lost its Pro wall`)
    assert.ok(/tier === 'anonymous'/.test(src) || /anonymous =\s*tier === 'anonymous'/.test(src),
      `${name} does not branch on the rung, so one of its two walls is unreachable`)
  }
})

test('the Community tab counts what it will show', () => {
  // A badge reading 20 over a grid of three is the one number on the page that
  // disagrees with the page. Its sibling tab counts the prompts you have.
  const src = stripComments(read(PAGES.prompts))
  assert.ok(/pl-tab-count">\{browsableCommunity\.length\}/.test(src),
    'the Community tab count must be the browsable set, not the whole library')
})

test('no placeholder is stamped with a price the row does not carry', () => {
  // LockedPaletteCard and LockedPromptCard hard-code a "Pro" pill. At the
  // anonymous rung the next rows are NOT Pro's — they come with a free account
  // — so those cards may not be rendered there. If that component ever takes a
  // tier-aware label, this test is the thing to come back and relax.
  for (const [name, file] of Object.entries(PAGES)) {
    const src = stripComments(read(file))
    const anon = src.indexOf("=== 'anonymous'")
    const card = src.search(/Locked(Palette|Prompt)Card key=/)
    assert.ok(anon > -1, `${name} does not identify the anonymous rung`)
    assert.ok(card > -1, `${name} renders no placeholders at all — this assertion is vacuous`)
    assert.ok(anon < card,
      `${name} renders its placeholders before it has branched on the rung, so a signed-out visitor sees "Pro" on rows a free account opens`)
  }
})
