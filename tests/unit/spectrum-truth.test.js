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
  PROOF_STATS,
  PRO_POINTS,
  TOOL_COUNT,
  numberWord,
} from '../../src/components/spectrum/spectrumFacts.js'
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../../src/config/plans.js'
import { PLAN_LADDER } from '../../src/config/planLadder.js'
import { EXPORT_FORMATS, unbuiltFormats } from '../../src/config/exportFormats.js'
import { createTools } from '../../src/data/toolTree.js'
import { HERO_HEADLINE } from '../../src/data/positioning.js'
import { SPECTRUM_HERO } from '../../src/components/spectrum/spectrumHero.js'
import { GALLERY_GRADIENTS } from '../../src/data/gradientGallery.js'
import { LIBRARY_PALETTES } from '../../src/data/paletteLibrary.js'
import { ICON_PACK_TIERS } from '../../src/data/iconPackTiers.js'
import { ICON_GROUP_SHELF } from '../../src/components/spectrum/iconGroupShelf.js'
import { listIconGroups } from '../../src/data/iconGroups.js'
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
  // The landing's new pieces: the four bench windows, the exports
  // stack, the search wrapper, the hero copy module and the design's tables.
  + stripComments(read('src/components/spectrum/BenchConverter.jsx'))
  + stripComments(read('src/components/spectrum/SpectrumExports.jsx'))
  + stripComments(read('src/components/spectrum/SpectrumSearch.jsx'))
  + stripComments(read('src/components/spectrum/OpenPill.jsx'))
  + stripComments(read('src/components/spectrum/SpectrumProof.jsx'))
  + stripComments(read('src/components/spectrum/spectrumHero.js'))
  + stripComments(read('src/components/spectrum/spectrumKit.js'))
// The same text with the JS `export` keyword removed. The export sweep below
// looks for a SENTENCE that says the page exports a format; `export const
// EX_FMTS = [['CSS', …` is a declaration, not a claim, and would otherwise read
// as one.
const PROSE = ALL_JSX.replace(/\bexport\s+(?:default\s+)?(?:const|function|let)\b/g, '')

test('the stripper still works, so every source read below can be trusted', () => {
  assertStripperWorks(assert)
})

/* ── the headline is the design's, to the character ────────────────────────── */

test('the hero renders the Spectrum headline from its module, not a typed one', () => {
  // The front door uses the Spectrum design's lines ("Build and export UI and
  // brand kits from one place."). They live in
  // spectrumHero.js, which the page and the served shell both read; the page
  // must read them and must not type them.
  assert.equal(SPECTRUM_HERO.text, 'Build and export UI and brand kits from one place.')
  assert.equal(SPECTRUM_HERO.mark, 'one place')
  assert.ok(PAGE.includes('SPECTRUM_HERO.text') && PAGE.includes('SPECTRUM_HERO.mark'),
    'Spectrum.jsx no longer renders the headline from spectrumHero.js; this check is reading nothing')
  assert.ok(!PAGE.includes('brand kits from one place'),
    'Spectrum.jsx types the headline out rather than reading it from spectrumHero.js')
  // The 09-10 sentence is not on the landing any more; its share card still is
  // (positioning.js), which is a separate decision.
  assert.ok(!PAGE.includes(HERO_HEADLINE.lead) && !PAGE.includes('heroHeadlineText()'),
    'Spectrum.jsx renders the retired 09-10 headline again')
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
  // THE LANDING QUOTES NO PRICE AT ALL. Pricing is the design's
  // own screen, built at /plans; the landing's plan CTAs go there.
  // So no dollar amount may appear in the landing's sources, and every plans
  // link is /plans — never checkout, never the login popup.
  assert.ok(!/\$\d/.test(PAGE), 'Spectrum.jsx quotes a price again; pricing lives on /plans')
  assert.ok(!PAGE.includes('/checkout') && !PAGE.includes('login?signup=1'),
    'a landing CTA goes to checkout or the sign-up route instead of /plans')
  const plansLinks = PAGE.match(/to="\/plans"/g) || []
  assert.ok(plansLinks.length >= 2, 'the landing no longer links "View plans" and "See the plans" to /plans')
})

test('the page offers no cadence that cannot reach checkout', () => {
  // Every tier has a checkoutPlan, so "no unbuyable tier is offered" is asserted as
  // its positive form: every cadence this page offers carries a checkoutPlan,
  // and a tier without one is not offered.
  const ids = LADDER.map((p) => p.id)
  assert.ok(LADDER.length >= 1, 'the pricing band has no cadence at all')
  for (const plan of PLAN_LADDER) {
    if (!plan.checkoutPlan) {
      assert.ok(!ids.includes(plan.id),
        `the Spectrum pricing band offers "${plan.id}", which planLadder.js gives checkoutPlan:null — `
        + 'create-checkout would resolve no price and answer 503, so the button dead-ends')
    }
  }
  for (const plan of LADDER) {
    assert.ok(plan.checkoutPlan, `the pricing band offers "${plan.id}" with no checkoutPlan`)
  }
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
  // One sentence INSIDE ONE STRING OR TEXT RUN: the match may not cross a full
  // stop or a quote. Without the quote bound, the Icon panel's glyph table
  // (`['export', 'Export'] … ['brackets-curly', 'JSON']`) read as a claim —
  // two neighbouring labels, not a sentence.
  const exportOf = (word) => new RegExp(`\\bexport(?:s|ed|ing)?\\b[^.'"\`]*\\b${word}\\b`, 'i')
  const WORD = { css: 'CSS', tailwind: 'Tailwind', json: 'JSON' }
  for (const f of unbuilt) {
    if (!WORD[f.id]) continue
    assert.ok(!exportOf(WORD[f.id]).test(PROSE),
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

test('not one of the prototype\'s proof numbers survives, and the band\'s figures are counted', () => {
  // "138 kits exported since we opened the toolkit · 27 designers building with
  // it every week · 4 studios using it on client work · 9,176 palettes
  // generated". None of those is measured anywhere in this repo, and the
  // analytics this app has could not produce three of them.
  for (const figure of ['138', '9,176', '9176', '27 designers', '4 studios']) {
    assert.ok(!ALL_JSX.includes(figure),
      `the Spectrum page carries the prototype's placeholder proof figure "${figure}"`)
  }
  for (const phrase of [/designers building with it/i, /studios using it/i, /kits exported since/i]) {
    assert.ok(!phrase.test(ALL_JSX),
      `the Spectrum page carries the prototype's social-proof copy ${phrase}. `
      + 'There is no measurement behind it.')
  }
  // HIS BAND IS BACK: "you are forgetting
  // about the don't just take it from us section". Rebuilt as drawn, with FOUR
  // REAL FIGURES, each the length of the array that decides it — and none of
  // them a claim about other people, which is what the prototype's were.
  assert.equal(PROOF_STATS.length, 4, 'the proof band no longer carries four figures')
  assert.deepEqual(PROOF_STATS.map((s) => s.value), [
    createTools().filter((t) => !t.soon && !t.beta).length,
    LIBRARY_PALETTES.length,
    GALLERY_GRADIENTS.length,
    Object.keys(ICON_PACK_TIERS).length,
  ], 'a proof figure is no longer the count of the array it names')
  for (const s of PROOF_STATS) {
    assert.ok(!/\b(users?|designers?|studios?|customers?|teams?|people)\b/i.test(s.label),
      `the proof figure "${s.label}" makes a claim about other people, which nothing measures`)
  }
  // MUTATION GUARD: the module interpolates rather than types the figures.
  assert.ok(FACTS.includes('LIBRARY_PALETTES.length') && FACTS.includes('Object.keys(ICON_PACK_TIERS).length'),
    'spectrumFacts.js no longer counts its proof figures; something typed them')
  assert.ok(stripComments(read('src/components/spectrum/SpectrumProof.jsx')).includes('PROOF_STATS.map'),
    'SpectrumProof.jsx no longer renders PROOF_STATS')
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

test('the Icon sets tab shows the premade icon groups, counted, and says nothing it cannot', () => {
  // The third Discover tab shows real icon groups: every group a signed-out
  // visitor can open, each with four of its own glyphs; the gallery count is
  // every group, Pro included.
  const groups = listIconGroups({ tier: 'anon' })
  const open = groups.filter((g) => !g.locked).map((g) => g.id)
  const shelf = Object.keys(ICON_GROUP_SHELF)
  assert.ok(shelf.length >= 2, 'the Icon sets shelf is nearly empty')
  for (const id of shelf) {
    assert.ok(open.includes(id), `the shelf shows ${id}, which a signed-out visitor cannot open`)
    assert.equal(ICON_GROUP_SHELF[id].length, 4, `${id} does not carry four of its own glyphs`)
    for (const body of ICON_GROUP_SHELF[id]) assert.match(body, /stroke="currentColor"/, `${id} carries a glyph that is not an outline`)
  }
  assert.ok(PAGE.includes('listIconGroups('), 'the Icon sets tab no longer reads the icon groups')
  assert.ok(PAGE.includes('ICON_GROUPS.length'), 'the icon-group count is no longer counted')
  assert.ok(PAGE.includes('g.route'), 'a group card no longer links to its group')
  // The groups draw on other people's packs, so the Discover footer may not
  // say every set here is made by UI L4B.
  assert.ok(!/Every set here is made by UI L4B/.test(PAGE),
    'the Discover footer claims the icon packs are made by UI L4B')
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
    // The design's ground is the spec:
    // the design's dark ink and ink-hover, and its light page / card / ink /
    // ink-hover. All neutrals; the dark page and card are the app's own tokens.
    '#EFEEEA', '#D5D4CE', '#F5F5F2', '#FFFFFF', '#121418', '#2C313B',
    // A mask, not a colour: the converter's tab row fades out at its edge.
    '#000',
    // The converter's dimension badge: light text on a fixed dark scrim over
    // a photograph, the same in both themes because the photo is.
    '#F4F6FA',
    // The exported UI kit drawn in the second exports card: its paper, inks and
    // swatch fills are the FILE's own colours, fixed in both themes because the
    // card is a picture of a document (as the window dots are a picture of a
    // window). None of them is an accent.
    '#F7F6F1', '#18221E', '#5C6B63', '#3A4A42', '#203C35', '#DBD0EB', '#3A3050', '#221B33', '#E4E8DE',
  ])
  const hexes = [...CSS.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0])
  const unexpected = hexes.filter((h) => !ALLOWED.has(h) && !ALLOWED.has(h.toUpperCase()))
  assert.deepEqual(unexpected, [],
    `spectrum.css carries unexpected literal colours: ${unexpected.join(', ')}. `
    + 'Everything but the window dots resolves from the token layer.')

  // POSITIVE CONTROL: the sheet really does use the derived family, so the
  // assertion above is not passing on an empty stylesheet.
  for (const token of ['--accent', '--accent-mid', '--accent-text', '--accent-bright', '--accent-ink']) {
    assert.ok(CSS.includes(`var(${token})`), `spectrum.css never reads ${token}`)
  }
})
