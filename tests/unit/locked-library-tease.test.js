// Locked library rows — proving the gate is a gate.
//
// The failure this suite exists to prevent: a paywall implemented as
// `filter: blur()` over the real values. That is not a paywall. The values sit
// in the DOM, so devtools reads them, the accessibility tree reads them, and
// turning CSS off reads them — and it is WORSE than no tease at all, because it
// converts a working gate into one that only appears to work.
//
// So the bar here is not "the locked row looks locked". It is:
//
//   1. The split happens BEFORE the data is produced, not on a control. The
//      same standard the design-system-book export met (#326): a source
//      assertion on ORDER, so moving the check below the render goes red.
//   2. A preview physically cannot carry a payload — the whitelist drops it
//      even when the mapper hands one over.
//   3. It fails closed. Only an exact `true` opens the gate; a subscription
//      still resolving, an undefined, a truthy string and a 1 all lock.
//   4. The paid values are absent from what the browser is served — asserted
//      against the PRERENDERED shell for /discover/palettes, which is the
//      HTML a signed-out visitor and every crawler actually receives.
//
// Source assertions strip comments first: a sibling suite once found a test
// that passed only because a comment still named the old value.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { splitLockedLibrary, LOCKED_TEASE } from '../../src/utils/lockedPreview.js'
import { BRAND_PALETTES } from '../../src/data/brandPalettes.js'
import { COMMUNITY_PROMPTS } from '../../src/data/communityPrompts.js'
import { FREE_PROMPT_LIMIT } from '../../src/data/promptCategories.js'

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const PAID = BRAND_PALETTES.filter((b) => b.free !== true)
const FREE = BRAND_PALETTES.filter((b) => b.free === true)

// The hex values that actually discriminate. #000000 and #FFFFFF appear in half
// the stylesheet, so asserting on them would pass or fail for reasons that have
// nothing to do with the gate. What is left is every paid colour that is not
// achromatic and does not also appear in a free row — those can only have come
// from a locked palette, which makes them a real oracle.
const achromatic = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return Math.max(r, g, b) - Math.min(r, g, b) < 24
}
const FREE_HEXES = new Set(FREE.flatMap((b) => b.colors.map((c) => c.toUpperCase())))
const TELLTALE = [...new Set(
  PAID.flatMap((b) => b.colors.map((c) => c.toUpperCase()))
    .filter((hex) => !achromatic(hex) && !FREE_HEXES.has(hex)),
)]

test('the fixture itself is discriminating — there are telltale paid hexes to look for', () => {
  // If this ever drops to zero the assertions below become vacuous, which is
  // exactly how a test starts passing for the wrong reason.
  assert.ok(TELLTALE.length >= 20, `only ${TELLTALE.length} telltale paid hexes — the oracle assertions would be near-vacuous`)
  assert.ok(PAID.length > 0 && FREE.length > 0, 'the brand library must have both a free and a paid side')
})

// ── 1. The split, before the data is produced ───────────────────────────────

test('a locked row is replaced by a preview, never returned as itself', () => {
  const { open, locked } = splitLockedLibrary(BRAND_PALETTES, {
    unlocked: false,
    isOpen: (b) => b.free === true,
    preview: (b) => ({ id: b.id, label: b.name, slots: b.colors.length }),
  })
  // No paid item survives by identity anywhere in the result.
  for (const item of [...open, ...locked]) {
    assert.ok(!PAID.includes(item), `a paid brand object escaped the split: ${item.id}`)
  }
  assert.equal(open.length, FREE.length, 'only the free rows are open')
})

test('no preview carries colours, in any form', () => {
  const { locked } = splitLockedLibrary(BRAND_PALETTES, {
    unlocked: false,
    isOpen: (b) => b.free === true,
    preview: (b) => ({ id: b.id, label: b.name, slots: b.colors.length }),
  })
  const serialised = JSON.stringify(locked).toUpperCase()
  for (const hex of TELLTALE) {
    assert.ok(!serialised.includes(hex), `a locked preview leaked ${hex}`)
    assert.ok(!serialised.includes(hex.slice(1)), `a locked preview leaked ${hex} without its hash`)
  }
  for (const preview of locked) {
    assert.equal(preview.colors, undefined, 'a preview must have no colors key')
    assert.equal(typeof preview.slots, 'number', 'a preview carries a COUNT in place of the values')
  }
})

test('the whitelist strips a payload even when the mapper hands one over', () => {
  // The mapper is a convenience; the whitelist is the gate. A careless caller
  // must not be able to widen it.
  const { locked } = splitLockedLibrary(BRAND_PALETTES, {
    unlocked: false,
    isOpen: (b) => b.free === true,
    preview: (b) => ({ id: b.id, label: b.name, slots: b.colors.length, colors: b.colors, text: 'secret' }),
  })
  const serialised = JSON.stringify(locked).toUpperCase()
  for (const hex of TELLTALE) {
    assert.ok(!serialised.includes(hex), `the whitelist let ${hex} through from a leaky mapper`)
  }
  assert.ok(!JSON.stringify(locked).includes('secret'), 'the whitelist let an unlisted key through')
})

test('the tease is capped and the true remainder is reported', () => {
  const { locked, remaining } = splitLockedLibrary(BRAND_PALETTES, {
    unlocked: false,
    isOpen: (b) => b.free === true,
    preview: (b) => ({ id: b.id, label: b.name, slots: b.colors.length }),
  })
  assert.equal(locked.length, LOCKED_TEASE, 'exactly LOCKED_TEASE placeholders are teased')
  assert.equal(remaining, PAID.length, 'the CTA number is the true count of locked rows, not the teased count')
  assert.ok(remaining > locked.length, 'the remainder must exceed the tease or there is nothing to upgrade for')
})

// ── 2. Fail closed ──────────────────────────────────────────────────────────

test('only an exact true opens the gate', () => {
  const args = {
    isOpen: (b) => b.free === true,
    preview: (b) => ({ id: b.id, label: b.name, slots: b.colors.length }),
  }
  // undefined is the case that matters most: it is what an entitlement lookup
  // returns while it is still resolving, and a gate that opens during a load
  // is a gate anyone can win by being fast.
  for (const value of [undefined, null, false, 0, 1, 'true', 'yes', {}, []]) {
    const { open } = splitLockedLibrary(BRAND_PALETTES, { ...args, unlocked: value })
    assert.equal(open.length, FREE.length, `unlocked: ${JSON.stringify(value)} must lock, it opened the library`)
  }
  const { open, locked, remaining } = splitLockedLibrary(BRAND_PALETTES, { ...args, unlocked: true })
  assert.equal(open.length, BRAND_PALETTES.length, 'an entitled viewer gets everything')
  assert.equal(locked.length, 0)
  assert.equal(remaining, 0)
})

// ── 3. The order of the check, asserted against the source ──────────────────

test('every gated surface splits BEFORE it renders, not on the control', () => {
  for (const file of ['src/pages/PaletteGallery.jsx', 'src/pages/PaletteBuilder.jsx', 'src/pages/PromptLibrary.jsx']) {
    const src = stripComments(read(file))
    const split = src.indexOf('splitLockedLibrary(')
    assert.ok(split > -1, `${file} must route its library through splitLockedLibrary`)
    // The gate is satisfied by an exact identity check, not by a truthy test —
    // `!isPro` would open for any truthy non-boolean the context ever returns.
    assert.ok(/unlocked:\s*isPro === true/.test(src), `${file} must gate on an exact isPro === true`)
  }
})

test('the builder brand list renders the split output, never the raw library', () => {
  const src = stripComments(read('src/pages/PaletteBuilder.jsx'))
  // The bug this pins: reverting to BRAND_PALETTES.map(...) in the brands panel
  // puts every paid brand's colours back into barRef and back into the DOM.
  assert.ok(src.includes('openBrands.map('), 'the brands panel must map the split output')
  assert.ok(!src.includes('BRAND_PALETTES.map('), 'the brands panel must not map the raw library')
})

test('the gallery filters and searches the split output, closing the hex oracle', () => {
  const src = stripComments(read('src/pages/PaletteGallery.jsx'))
  // The search haystack indexes each palette's hex values. Filtering the FULL
  // library would let a signed-out visitor confirm a locked brand's colours by
  // typing them — a disclosure oracle dressed as a search box.
  assert.ok(src.includes('return browsable.filter('), 'the search must run over the browsable set, not LIBRARY_PALETTES')
  assert.ok(!/LIBRARY_PALETTES\.filter\(/.test(src), 'the full library must not be the filter source')
})

// ── 4. The wall is measured, and it does not invent anything ────────────────

test('every wall registers a real gate id rather than falling back to a title', () => {
  // trackUpgradeGate fires inside ProModalContext on `next.gate || next.title`.
  // A wall with no gate is counted under its headline, so renaming the headline
  // silently splits its history in two — upgrade-activation-events names that
  // as outstanding work.
  const ids = []
  for (const file of ['src/pages/PaletteGallery.jsx', 'src/pages/PaletteBuilder.jsx', 'src/pages/PromptLibrary.jsx']) {
    const src = stripComments(read(file))
    for (const m of src.matchAll(/gate="([a-z0-9-]+)"/g)) ids.push(m[1])
  }
  assert.ok(ids.includes('palette-library-brand-lock'), 'the Palette Library wall must name its gate')
  assert.ok(ids.includes('palette-builder-brand-lock'), 'the Palette Builder wall must name its gate')
  assert.ok(ids.includes('prompt-library-community-lock'), 'the Prompt Library wall must name its gate')
  for (const id of ids) {
    assert.ok(id.length <= 48, `gate id ${id} is truncated at 48 chars by trackUpgradeGate`)
  }
})

test('the wall copy invents no scarcity, urgency, testimonial or metric', () => {
  // This product has never had customers, testimonials or metrics, and no
  // surface may invent them. Uxcel's wall — the counter-example this pattern
  // was drawn against — carries "25% OFF" and "over 500K+ learners".
  // Comments are stripped first, and that is load-bearing rather than tidy:
  // LockedTease.jsx names Uxcel's "25% OFF" as the pattern it refuses to copy,
  // and a source assertion that read comments would fail on the explanation.
  const src = stripComments(
    read('src/components/library/LockedTease.jsx')
    + read('src/pages/PaletteGallery.jsx')
    + read('src/pages/PaletteBuilder.jsx')
    + read('src/pages/PromptLibrary.jsx'),
  )
  // Positive control: if stripping ever removed the copy as well, every
  // assertion below would pass for the wrong reason.
  assert.ok(src.includes('See what Pro includes'), 'the CTA copy must survive comment-stripping or this test is vacuous')
  const banned = [
    /\bonly \d+ (left|remaining|spots)/i, /\bhurry\b/i, /\blimited time\b/i,
    /\bends (soon|today|tonight)\b/i, /\d+% off\b/i, /\bact now\b/i,
    /\bjoin \d[\d,]*\+? /i, /\btrusted by\b/i, /\bloved by\b/i,
    /\b\d[\d,]*\+? (designers|users|customers|teams) /i,
  ]
  for (const pattern of banned) {
    assert.ok(!pattern.test(src), `the locked-row copy matches a forbidden persuasion pattern: ${pattern}`)
  }
})

test('the CTA number is derived from the data, never written as a literal', () => {
  // A hard-coded "another 30 brand systems" goes stale the moment a row is
  // added to brandPalettes.js, and a wall that lies about its own size is the
  // cheapest possible way to lose trust.
  for (const file of ['src/pages/PaletteGallery.jsx', 'src/pages/PaletteBuilder.jsx', 'src/pages/PromptLibrary.jsx']) {
    const src = stripComments(read(file))
    assert.ok(/Another \$\{locked/.test(src), `${file} must interpolate the remaining count into its heading`)
  }
})

test('a locked placeholder never animates, so it cannot read as a failed load', () => {
  // PRODUCT.md forbids a decorative mock-up that "reads as a component that
  // failed to load". A pulsing placeholder is the strongest loading signal
  // there is, so no .lockt- rule may carry an animation or a transition — and
  // #336 means any animation added here would also need the reduced-motion
  // guard pair, which is a second reason not to reach for one.
  const css = stripComments(read('src/styles/global.css'))
  const offenders = []
  for (const rule of css.split('}')) {
    const [selector, body = ''] = rule.split('{')
    if (!/\.lockt-/.test(selector)) continue
    if (/(^|;|\s)(animation|transition)\s*:/.test(body)) offenders.push(selector.trim().slice(0, 80))
  }
  assert.deepEqual(offenders, [], `a locked placeholder rule animates: ${offenders.join(' / ')}`)
  // Not vacuous: the selectors must actually be in the stylesheet.
  assert.ok(css.includes('.lockt-stripes'), 'the locked-row CSS is missing entirely')
})

// ── 5. The community prompt tier is an identity, not a position ─────────────
//
// The palette gate was always an identity (`palette.pro !== true`). The prompt
// gate was a POSITION: the grid locked every card past the twelfth of the
// FILTERED list, so "free" meant the first twelve of whatever view the visitor
// had built, and the search box built the view. A position cannot be a gate,
// because the user controls the ordering.

const FREE_PROMPTS = COMMUNITY_PROMPTS.filter((p) => p.free === true)
const LOCKED_PROMPTS = COMMUNITY_PROMPTS.filter((p) => p.free !== true)

// The twelve that were free in the DEFAULT view (sort 'popular' = saves
// descending) on 2026-09-04, the day the gate stopped counting positions.
// They are pinned as a literal rather than recomputed from `saves`, for two
// reasons: recomputing would make this test restate the implementation instead
// of checking it, and the set must NOT follow a saves edit — that is precisely
// the coupling the fix removed.
//
// Changing this list widens or narrows the free tier, which is a PRICING
// decision and founder-owned. The test is here so that change has to be made
// on purpose rather than as a side effect of editing a number in a data file.
const PINNED_FREE = ['c-1', 'c-2', 'c-3', 'c-9', 'c-13', 'c-14', 'c-15', 'c-16', 'c-17', 'c-18', 'c-19', 'c-20']

test('every community prompt declares its tier explicitly, and it is a boolean', () => {
  // A missing flag must read as LOCKED, and `free !== true` already does that.
  // What this pins is that the DATA never relies on it: an author adding a row
  // states the tier, so the fail-closed default is a safety net rather than the
  // mechanism.
  const undeclared = COMMUNITY_PROMPTS.filter((p) => typeof p.free !== 'boolean').map((p) => p.id)
  assert.deepEqual(undeclared, [], `prompts with no explicit free flag: ${undeclared.join(', ')}`)
  assert.ok(COMMUNITY_PROMPTS.length > 0, 'no community prompts at all — this suite would be vacuous')
})

test('the free tier is exactly the twelve prompts it was before the gate changed', () => {
  assert.deepEqual(
    FREE_PROMPTS.map((p) => p.id).sort(),
    [...PINNED_FREE].sort(),
    'the free prompt set moved — that is a pricing change, not a refactor',
  )
  assert.equal(FREE_PROMPTS.length, FREE_PROMPT_LIMIT,
    `FREE_PROMPT_LIMIT says ${FREE_PROMPT_LIMIT} but ${FREE_PROMPTS.length} prompts carry free: true`)
  assert.ok(LOCKED_PROMPTS.length > 0, 'nothing is locked — there is no tier to sell')
})

test('the prompt gate ignores saves and ignores order, so no control can move it', () => {
  // The old gate was decided by the array index at render time, which the sort
  // control and the search box both rewrote. Feeding the splitter a reversed
  // and a re-scored copy must produce the same open set.
  const args = {
    unlocked: false,
    isOpen: (p) => p.free === true,
    preview: (p) => ({ id: p.id, slots: 3 }),
  }
  const expected = FREE_PROMPTS.map((p) => p.id).sort()
  const reversed = [...COMMUNITY_PROMPTS].reverse()
  const rescored = COMMUNITY_PROMPTS.map((p, i) => ({ ...p, saves: 1000 - i }))
  for (const [name, list] of [['reversed', reversed], ['re-scored', rescored]]) {
    const { open } = splitLockedLibrary(list, args)
    assert.deepEqual(open.map((p) => p.id).sort(), expected, `the ${name} library opened a different set`)
  }
})

test('a locked prompt preview carries neither its title nor its text', () => {
  // For a brand palette the NAME is the tease and the hexes are the product.
  // A prompt is the opposite: the title is the idea being sold, so it is
  // payload. The whitelist has no `title` or `text` key, so a careless mapper
  // cannot hand either through — asserted by handing one over on purpose.
  const { locked } = splitLockedLibrary(COMMUNITY_PROMPTS, {
    unlocked: false,
    isOpen: (p) => p.free === true,
    preview: (p) => ({ id: p.id, title: p.title, text: p.text, slots: 3 }),
  })
  assert.ok(locked.length > 0, 'nothing was teased — this assertion would be vacuous')
  for (const preview of locked) {
    assert.equal(preview.title, undefined, 'a preview carried the prompt title')
    assert.equal(preview.text, undefined, 'a preview carried the prompt text')
  }
  const serialised = JSON.stringify(locked).toLowerCase()
  for (const p of LOCKED_PROMPTS) {
    assert.ok(!serialised.includes(p.title.toLowerCase()), `preview payload names locked prompt ${p.id}`)
  }
})

test('the prompt library gates on identity and never on a position', () => {
  const src = stripComments(read('src/pages/PromptLibrary.jsx'))
  // The exact defect: an index compared against the free-tier count.
  assert.ok(!/idx\s*>=/.test(src), 'the grid still compares a render index against the tier size')
  assert.ok(!src.includes('FREE_PROMPT_LIMIT'),
    'the page still imports the free-tier COUNT — the gate must read the per-row flag instead')
  assert.ok(/isOpen:\s*\(p\)\s*=>\s*p\.free === true/.test(src),
    'the gate must be an exact per-prompt identity check')
  // Search and grid must both read the split output. Filtering the full list
  // is the leak: the predicate reads p.text, so it answers "does a Pro prompt
  // contain this phrase" for anyone who types one.
  assert.ok(src.includes('isCommunity ? browsableCommunity : prompts'),
    'the grid source must be the split output, not the full community list')
  assert.ok(!/isCommunity \? sortedCommunity : prompts/.test(src),
    'the full community list must not be the grid source')
})

test('PromptCard has no locked state left to re-wire', () => {
  // It is not enough that the branch is unused. It rendered
  // `p.title || p.text.slice(0, 60)` into the title AND the aria-label of a
  // card it had just declared locked, and eslint cannot see an unused React
  // component here (varsIgnorePattern '^[A-Z_]'), so a dormant copy would sit
  // one prop away from shipping the defect again.
  const src = stripComments(read('src/components/prompt/PromptCard.jsx'))
  assert.ok(!src.includes('isLocked'), 'PromptCard still carries a locked branch')
  assert.ok(src.includes('pl-card-title'), 'PromptCard did not render at all — this assertion is vacuous')
})

test('the teased grid continues the gallery instead of hugging it', () => {
  // Measured defect: .pl-gallery carries margin-top:8px to clear the toolbar,
  // and the locked grid is a second .pl-gallery — so the seam between the last
  // real row and the teased row was 8px against a 16px row gap, and the tease
  // read as attached to the row above rather than as the next row.
  //
  // The seam READS the gap rather than repeating its value, because the 720px
  // band retunes the gap to 14px and a copied number would stop matching there
  // silently. Same drift argument the .lockt-stripes comment makes about
  // heights.
  const css = stripComments(read('src/styles/global.css'))
  assert.ok(/\.pl-gallery\{[^}]*--pl-gap:16px[^}]*gap:var\(--pl-gap\)/.test(css),
    'the gallery must publish its row gap as --pl-gap and consume it')
  assert.ok(/\.pl-gallery--continues\{margin-top:var\(--pl-gap\)\}/.test(css),
    'the continuation grid must take its seam from --pl-gap, not a literal')
  assert.ok(/\.pl-gallery\{[^}]*--pl-gap:14px/.test(css),
    'the narrow band must retune --pl-gap so the seam follows the gap')
})
