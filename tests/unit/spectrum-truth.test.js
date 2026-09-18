// THE SPECTRUM PAGE MAY NOT SAY A THING THE PRODUCT DOES NOT DO.
//
// This is surface-claims-truth.test.js's rule applied to the one page built from
// a MOCK. "UIL4B - Spectrum.dc.html" is the visual and structural source for
// src/pages/Spectrum.jsx and it carries invented prices, an invented plan
// ladder, four invented proof numbers and four exports the panel cannot build.
// Every one of those was a sentence that would have shipped on the front door by
// copying the prototype faithfully, which is exactly what a faithful port is for.
//
// The shape is the repo's: read the claim back out of the surface, read the fact
// out of the module that decides it, and fail when they disagree. Where the fact
// can change — a format going live, a tool group shipping, quarterly reaching
// checkout — the assertion reads the FLAG, so shipping the feature retires the
// check instead of breaking it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { assertStripperWorks, read, stripComments } from './helpers/source-text.js'

import {
  ASSURANCES,
  COMPARE,
  FAQS,
  FREE_POINTS,
  LADDER,
  LIBRARY_COUNTS,
  PROOF,
  PRO_POINTS,
  TOOL_COUNT,
  numberWord,
} from '../../src/components/spectrum/spectrumFacts.js'
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../../src/config/plans.js'
import { PLAN_LADDER } from '../../src/config/planLadder.js'
import { EXPORT_FORMATS, unbuiltFormats } from '../../src/config/exportFormats.js'
import { createTools } from '../../src/data/toolTree.js'
import { HERO_HEADLINE, heroHeadlineText } from '../../src/data/positioning.js'
import { GALLERY_GRADIENTS } from '../../src/data/gradientGallery.js'
import { LIBRARY_PALETTES } from '../../src/data/paletteLibrary.js'
// WHERE THE SHEET IS TODAY, FOUND RATHER THAN TYPED.
// It sits in `styles/deferred/` while the old Home page is still routed (see the
// long note on the import in Spectrum.jsx) and moves to `styles/pages/` on the
// commit that makes Spectrum the front door. Both are legitimate; a test that
// pinned one of them would go red on a move that is not a defect. It throws if
// the sheet is in NEITHER place, which is the only state that is actually wrong.
const SPECTRUM_CSS_PATH = ['src/styles/deferred/spectrum.css', 'src/styles/pages/spectrum.css']
  .find((p) => fs.existsSync(p))
if (!SPECTRUM_CSS_PATH) throw new Error('spectrum.css is in neither src/styles/deferred/ nor src/styles/pages/')

const PAGE = stripComments(read('src/pages/Spectrum.jsx'))
const FACTS = stripComments(read('src/components/spectrum/spectrumFacts.js'))
const BENCH = stripComments(read('src/components/spectrum/SpectrumBench.jsx'))
// CSS COMMENTS ARE STRIPPED BEFORE ANY OF THIS IS ASSERTED.
// #332's rule, one language over: a check that passes because a COMMENT still
// names the old value is not an assertion — and the inverse bit this file on the
// first run, because spectrum.css's own header comment says the words
// "#2A60E8 appears nowhere in this file" and "never `outline:none`", which made
// two correct sheets fail. Both directions are the same defect: the comment is
// not the code.
const stripCss = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '')
const CSS = stripCss(read(SPECTRUM_CSS_PATH))
const ALL_JSX = PAGE + FACTS + BENCH
  + stripComments(read('src/components/spectrum/SpectrumFooter.jsx'))
  + stripComments(read('src/components/spectrum/SpectrumRamp.jsx'))
  + stripComments(read('src/components/spectrum/SpectrumWords.jsx'))
  + stripComments(read('src/components/spectrum/SpectrumIcon.jsx'))

test('the stripper still works, so every source read below can be trusted', () => {
  assertStripperWorks(assert)
})

/* ── the headline is the founder's, to the character ───────────────────────── */

test('the hero renders the approved headline from positioning.js, not a typed one', () => {
  // POSITIVE CONTROL: the page reaches for the module at all.
  assert.ok(PAGE.includes('heroHeadlineText()'),
    'Spectrum.jsx no longer renders heroHeadlineText(); this check is reading nothing')
  assert.ok(PAGE.includes('HERO_HEADLINE.mark'),
    'the highlighted run is no longer HERO_HEADLINE.mark, so the accent can land on a phrase he never approved')

  // The prototype's own h1. It is CLOSE to the approved sentence, which is
  // precisely why it needs a named check: a near-miss of a sentence the founder
  // signed off on 2026-09-10 reads as a typo, not as a rewrite, and ships.
  assert.ok(!PAGE.includes('from one place'),
    "Spectrum.jsx types the prototype's headline (\"…UI and brand kits from one place.\"). "
    + `The approved sentence is "${heroHeadlineText()}" and positioning-truth.test.js pins it.`)
  assert.ok(!PAGE.includes(HERO_HEADLINE.lead),
    'Spectrum.jsx types the headline out rather than reading it from positioning.js')
})

/* ── prices ────────────────────────────────────────────────────────────────── */

test('no price is typed anywhere on this page', () => {
  // The prototype's ladder, all three cadences. Each is a literal a careless
  // port would have carried across, and each is wrong.
  for (const wrong of ['$3.60', '$3.33', 'was $4', '3.60', '3.33']) {
    assert.ok(!ALL_JSX.includes(wrong),
      `the Spectrum page carries the prototype's "${wrong}". The ladder is planLadder.js: `
      + PLAN_LADDER.map((p) => `${p.id} $${p.approvedTotal}`).join(' · '))
  }
  // And the page renders the ladder's own formatted label rather than any
  // number at all.
  assert.ok(PAGE.includes('plan.perMonthLabel'),
    'Spectrum.jsx no longer renders plan.perMonthLabel — something else is producing the price')
})

test('the page offers no cadence that cannot reach checkout', () => {
  const unbuyable = PLAN_LADDER.filter((p) => !p.checkoutPlan)
  // POSITIVE CONTROL. If every tier becomes buyable this check guards nothing,
  // and it must say so rather than pass silently.
  assert.ok(unbuyable.length >= 1,
    'every plan tier now has a checkoutPlan; delete this test with the commit that shipped the last one')
  const ids = LADDER.map((p) => p.id)
  for (const plan of unbuyable) {
    assert.ok(!ids.includes(plan.id),
      `the Spectrum pricing band offers "${plan.id}", which planLadder.js gives checkoutPlan:null — `
      + 'create-checkout would resolve no price and answer 503, so the button dead-ends')
  }
  assert.ok(LADDER.length >= 1, 'the pricing band has no cadence at all')
})

/* ── claims the rest of the app has already retracted ──────────────────────── */

test('the page does not promise a cancellation the portal cannot do', () => {
  // /plans deleted "cancel any time" under a founder flag because the Stripe
  // Customer Portal has no cancellation flow enabled. Re-adding it on the front
  // page retracts nothing. The prototype says it twice — an assurance chip and
  // an FAQ answer ("From the dashboard, in two clicks, no email required").
  for (const phrase of [/cancel (?:pro )?any ?time/i, /in two clicks/i]) {
    assert.ok(!phrase.test(ALL_JSX),
      `the Spectrum page says ${phrase} again. That is the claim /plans removed by name; `
      + 'the portal has no cancellation flow until [stripe-retention-config] is finished.')
  }
})

test('the page sells no export the panel cannot build', () => {
  const unbuilt = unbuiltFormats()
  assert.ok(unbuilt.length >= 1,
    'every named format is live, so this sweep guards nothing; delete it with the commit that built them')
  // The prototype's chip row — "PDF · Figma · React · Tokens" — and its Free
  // bullet, "Copy as CSS, JSON, Tailwind or OKLCH", sold four formats between
  // them. `export…FORMAT` inside one sentence is the same regex
  // surface-claims-truth.test.js uses; per-tool COPY is deliberately not caught,
  // because the tools really do have Copy buttons.
  const exportOf = (word) => new RegExp(`\\bexport(?:s|ed|ing)?\\b[^.]*\\b${word}\\b`, 'i')
  const WORD = { css: 'CSS', tailwind: 'Tailwind', json: 'JSON' }
  for (const f of unbuilt) {
    if (!WORD[f.id]) continue
    assert.ok(!exportOf(WORD[f.id]).test(ALL_JSX),
      `the Spectrum page tells a visitor it exports ${WORD[f.id]}, and exportFormats.js has `
      + `\`${f.id}\` with no live flag — a Soon badge over a disabled button.`)
  }
  for (const invented of ['Figma', 'React']) {
    assert.ok(!ALL_JSX.includes(invented),
      `the Spectrum page carries the prototype's "${invented}" export chip. `
      + `EXPORT_FORMATS has: ${EXPORT_FORMATS.map((f) => f.id).join(', ')} — and no ${invented}.`)
  }
})

test('the page claims no feature that does not exist', () => {
  // "90 days of version history" appears in the prototype's Pro card AND its
  // comparison table. Nothing in this repository stores a version history.
  assert.ok(!/version history/i.test(ALL_JSX),
    'the Spectrum page sells version history. Nothing in src/ or api/ stores one — '
    + 'if that shipped, delete this check with the commit that built it.')
})

/* ── proof ─────────────────────────────────────────────────────────────────── */

test('not one of the prototype\'s proof numbers survives', () => {
  // "138 kits exported since we opened the toolkit · 27 designers building with
  // it every week · 4 studios using it on client work · 9,176 palettes
  // generated". None of those is measured anywhere in this repo, and the
  // analytics this app has could not produce three of them.
  for (const figure of ['138', '9,176', '9176', '27 designers', '4 studios']) {
    assert.ok(!ALL_JSX.includes(figure),
      `the Spectrum page carries the prototype's placeholder proof figure "${figure}"`)
  }
  for (const phrase of [/designers building with it/i, /studios using it/i, /don't just take it from us/i]) {
    assert.ok(!phrase.test(ALL_JSX),
      `the Spectrum page carries the prototype's social-proof copy ${phrase}. `
      + 'There is no measurement behind it and no testimonial to replace it yet.')
  }
  // And what stands in that slot makes no claim about other people at all.
  assert.ok(PROOF.length >= 3, 'the terms band has lost its rows')
  for (const item of PROOF) {
    assert.ok(!/\b(users?|designers?|studios?|customers?|teams?)\b/i.test(item.claim),
      `the terms band row "${item.claim}" makes a claim about other people, which is the `
      + 'thing the proof stats were removed for')
  }
})

/* ── counts ────────────────────────────────────────────────────────────────── */

test('the tool count is counted off the tree, not typed', () => {
  const live = createTools().filter((t) => !t.soon && !t.beta)
  assert.equal(TOOL_COUNT, live.length)
  // Today that is thirteen, which is what the prototype says — so the check that
  // matters is not the value but that nothing typed it.
  //
  // BOTH FILES, and that is the point: a first pass of this check only looked at
  // Spectrum.jsx, and a deliberate mutation that spelled "thirteen" into
  // spectrumFacts.js — where four of the page's count sentences are actually
  // built — went straight through it. The count must be derived wherever it is
  // written, so both sources are read.
  //
  // NUMBER_WORDS is excised before the scan, and has to be: it is the spelling
  // TABLE — every English number from zero to twenty, "thirteen" among them —
  // and banning the word without cutting the table out first fails the correct
  // implementation. That is the same class of false failure as reading a
  // stylesheet's comments.
  const withoutTable = FACTS.replace(/const NUMBER_WORDS = \[[\s\S]*?\n\]/, '')
  assert.ok(!withoutTable.includes("'thirteen'"), 'the NUMBER_WORDS excision did not work; this scan is unreliable')
  for (const [file, src] of Object.entries({ 'src/pages/Spectrum.jsx': PAGE, 'src/components/spectrum/spectrumFacts.js': withoutTable })) {
    assert.ok(!/\bthirteen\b/i.test(src),
      `${file} types the tool count. It is derived: shipping the UI Component Builder must `
      + 'change these sentences on the next build without an edit here.')
  }
  assert.ok(PAGE.includes('numberWord(TOOL_COUNT'),
    'Spectrum.jsx no longer renders the count through numberWord(TOOL_COUNT)')
  assert.ok(FACTS.includes('numberWord(TOOL_COUNT)'),
    'spectrumFacts.js no longer builds its count sentences through numberWord(TOOL_COUNT)')
  assert.equal(numberWord(13, { capital: true }), 'Thirteen')
})

test('the library counts are counted off the arrays', () => {
  assert.equal(LIBRARY_COUNTS.palettes, LIBRARY_PALETTES.length)
  assert.equal(LIBRARY_COUNTS.gradients, GALLERY_GRADIENTS.length)
  // The prototype's own figures, which were invented.
  for (const wrong of ['48 PALETTES', '36 GRADIENTS', '1,240 ICONS']) {
    assert.ok(!ALL_JSX.includes(wrong), `the Spectrum page carries the prototype's "${wrong}"`)
  }
})

/* ── limits ────────────────────────────────────────────────────────────────── */

test('every plan figure on the page is the figure plans.js carries', () => {
  const freeText = FREE_POINTS.join(' | ')
  const proText = PRO_POINTS.join(' | ')
  assert.match(freeText, new RegExp(`${AI_LIMITS.free.daily} AI generations a day, ${AI_LIMITS.free.monthly} a month`))
  assert.match(proText, new RegExp(`${AI_LIMITS.pro.daily} AI generations a day, ${AI_LIMITS.pro.monthly} a month`))
  assert.match(freeText, new RegExp(`${FREE_SAVE_LIMITS.projects} saved projects and ${FREE_SAVE_LIMITS.customIcons} custom icons`))

  const compareText = COMPARE.map((r) => `${r.label}:${r.free}:${r.pro}`).join(' | ')
  assert.match(compareText, new RegExp(`Saved projects:${FREE_SAVE_LIMITS.projects}:Unlimited`))
  assert.match(compareText, new RegExp(`Custom icons:${FREE_SAVE_LIMITS.customIcons}:Unlimited`))

  // MUTATION GUARD: the assertions above would pass against any string that
  // happened to contain the digits, so pin that the numbers came from the module
  // by checking the module is interpolated rather than spelled.
  assert.ok(FACTS.includes('AI_LIMITS.free.daily') && FACTS.includes('FREE_SAVE_LIMITS.projects'),
    'spectrumFacts.js no longer interpolates the limits; something typed them')
})

test('the FAQ answers quote figures rather than typing them', () => {
  const formats = FAQS.find((f) => /export formats/i.test(f.q))
  assert.ok(formats, 'the export-formats question is gone from the Spectrum FAQ')
  // Every unbuilt format is NAMED as Soon in that answer rather than omitted —
  // the same disclosure /plans makes.
  for (const f of unbuiltFormats()) {
    const short = /\(([^)]+)\)\s*$/.exec(f.name)?.[1] || f.name
    assert.ok(formats.a.includes(short),
      `the Spectrum FAQ's export answer does not mention ${short}, which exportFormats.js marks unbuilt`)
  }
  assert.ok(/Soon/.test(formats.a), 'the export answer no longer says the unbuilt formats are Soon')
})

test('the assurance row states nothing the product cannot honour', () => {
  assert.ok(ASSURANCES.length >= 2, 'the assurance row has been gutted')
  const text = ASSURANCES.map((a) => a.label).join(' | ')
  assert.ok(!/cancel/i.test(text), 'the assurance row promises a cancellation again')
  // The privacy assurance must not be the absolute one: AltTextGenerator.jsx
  // posts the image itself to /api/ai, so "files stay in your browser" is false
  // for the AI tools. surface-claims-truth.test.js bans that exact phrasing on
  // the pages in its lane, and the front door is not exempt.
  const altText = stripComments(read('src/pages/AltTextGenerator.jsx'))
  const postsImage = altText.includes("fetch('/api/ai'") && /\bimage:\s*item\.base64/.test(altText)
  if (postsImage) {
    assert.ok(!/files stay in your browser/i.test(text),
      'the Spectrum assurance row says "Files stay in your browser" while AltTextGenerator.jsx '
      + 'posts the image to /api/ai. The honest claim is scoped to image and video work.')
  }
})

/* ── the accent stays swappable ────────────────────────────────────────────── */

test('the stylesheet hardcodes no accent colour', () => {
  // Premium theme templates work by changing `--accent` alone. A literal blue
  // anywhere in this sheet is a hole in that mechanism, not a style nit.
  assert.ok(!/#2A60E8/i.test(CSS), 'spectrum.css carries the prototype\'s accent #2A60E8')
  assert.ok(!/#0F6FFF|#6FA8FF/i.test(CSS),
    'spectrum.css hardcodes the brand blue. It must read --accent so a theme template can move it.')

  // Every hex in the sheet, minus the ones that are legitimately fixed.
  const ALLOWED = new Set([
    // The three window dots in the panel title bar: a picture of an operating
    // system window, not a product colour. The design ships these exact values.
    '#ED6A5E', '#F4BF4F', '#61C554',
    // Neutral, and only inside a shadow/drop-shadow on a generated fill.
    '#fff',
  ])
  const hexes = [...CSS.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0])
  const unexpected = hexes.filter((h) => !ALLOWED.has(h) && !ALLOWED.has(h.toUpperCase()))
  assert.deepEqual(unexpected, [],
    `spectrum.css carries unexpected literal colours: ${unexpected.join(', ')}. `
    + 'Everything but the window dots resolves from the token layer.')

  // POSITIVE CONTROL: the sheet really does use the derived family, so the
  // assertion above is not passing on an empty stylesheet.
  for (const token of ['--accent-mid', '--accent-text', '--accent-bright', '--accent-wash']) {
    assert.ok(CSS.includes(`var(${token})`), `spectrum.css never reads ${token}`)
  }
})
