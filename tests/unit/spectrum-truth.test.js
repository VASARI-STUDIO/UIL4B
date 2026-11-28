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
import { HERO_HEADLINE } from '../../src/data/positioning.js'
import { SPECTRUM_HERO } from '../../src/components/spectrum/spectrumHero.js'
import { GALLERY_GRADIENTS } from '../../api/_lib/library/gradientGallery.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'
import { BOOKMARK_COUNT } from '../../src/components/home/bookmarkFolders.js'
import { PROOF_ROWS, STATS } from '../../src/components/home/proofStats.js'
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
// The page with each mounted homepage section (`<HomeX />`) replaced by its own
// source, so copy a section renders itself is read as part of the landing.
const MOUNTED = PAGE.replace(/<(Home[A-Z]\w*)[^>]*\/>/g, (tag, name) => {
  const file = `src/components/home/${name}.jsx`
  return fs.existsSync(file) ? stripComments(read(file)) : tag
})
const HERO = stripComments(read('src/components/home/HomeHero.jsx'))
const FACTS = stripComments(read('src/components/spectrum/spectrumFacts.js'))
// CSS COMMENTS ARE STRIPPED BEFORE ANY OF THIS IS ASSERTED.
// #332's rule, one language over: a check that passes because a COMMENT still
// names the old value is not an assertion — and the inverse bit this file on the
// first run, because spectrum.css's own header comment says the words
// "#2A60E8 appears nowhere in this file" and "never `outline:none`", which made
// two correct sheets fail. Both directions are the same defect: the comment is
// not the code.
const stripCss = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '')
const CSS = stripCss(read(SPECTRUM_CSS_PATH))
const ALL_JSX = PAGE + HERO + FACTS
  + stripComments(read('src/components/spectrum/SpectrumFooter.jsx'))
  + stripComments(read('src/components/spectrum/SpectrumRamp.jsx'))
  + stripComments(read('src/components/spectrum/SpectrumWords.jsx'))
  + stripComments(read('src/components/spectrum/SpectrumIcon.jsx'))
  // The landing's remaining pieces: the search wrapper, the hero copy module and the design's tables.
  + stripComments(read('src/components/spectrum/SpectrumSearch.jsx'))
  + stripComments(read('src/components/spectrum/OpenPill.jsx'))
  + stripComments(read('src/components/home/HomeProof.jsx'))
  + stripComments(read('src/components/home/proofStats.js'))
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
  // The headline lives in spectrumHero.js, which the hero component and the
  // served shell both read; the hero must read it and must not type it.
  assert.equal(SPECTRUM_HERO.text, 'Your UI and brand kit, from one app.')
  assert.equal(SPECTRUM_HERO.mark, 'one app')
  assert.ok(HERO.includes('SPECTRUM_HERO.lead') && HERO.includes('SPECTRUM_HERO.mark') && HERO.includes('SPECTRUM_HERO.tail'),
    'HomeHero.jsx no longer renders the headline from spectrumHero.js; this check is reading nothing')
  for (const [name, src] of Object.entries({ 'Spectrum.jsx': PAGE, 'HomeHero.jsx': HERO })) {
    assert.ok(!src.includes(HERO_HEADLINE.lead) && !src.includes(HERO_HEADLINE.mark),
      `${name} types the headline out rather than reading it from spectrumHero.js`)
  }
  assert.ok(PAGE.includes('<HomeHero'), 'Spectrum.jsx no longer mounts the hero component')
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
  const plansLinks = (MOUNTED + HERO).match(/to="\/plans"/g) || []
  assert.ok(plansLinks.length >= 2, 'the landing no longer links its hero and its plans section to /plans')
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

test('the page does not promise a two-click cancellation', () => {
  // The Stripe portal does cancel, at the end of the paid period, so "cancel
  // any time" is true. The prototype's FAQ answer ("From the dashboard, in two
  // clicks, no email required") counts steps nobody has counted.
  assert.ok(!/in two clicks/i.test(ALL_JSX),
    'the Spectrum page promises a cancellation "in two clicks" again; count the real path first')
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
  const WORD = { css: 'CSS', tailwind: 'Tailwind', json: 'JSON', assets: 'asset bundle' }
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

test('not one of the prototype\'s proof numbers survives, and the bar\'s figures are accounted for', () => {
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
  // THE BAR SHIPS THREE PLACEHOLDER COUNTS ON PURPOSE, AND THEY ARE CONFINED.
  // They are the only unmeasured figures on the page and sit in the one STATS
  // array, so real counts replace them in a single edit (change the first
  // assertion with that edit). The fourth figure is a fact about the product,
  // derived rather than typed.
  assert.deepEqual(STATS.map((s) => s.n), [186, 540, 72],
    'a proof count changed; the three that ship are the ones in STATS')
  assert.equal(PROOF_ROWS.length, 4, 'the proof bar no longer carries four figures')
  assert.equal(PROOF_ROWS[3].n, createTools().filter((t) => !t.soon && !t.beta).length,
    'the tools figure is no longer the count of the live tools')
  assert.equal(PROOF_ROWS[3].label, `tools in place of ${BOOKMARK_COUNT} bookmarks`,
    'the bookmarks figure is no longer the total of the bookmark folders')
  // MUTATION GUARD: the derived figures are read, not typed.
  const ROWS_SRC = stripComments(read('src/components/home/proofStats.js'))
  assert.ok(ROWS_SRC.includes('n: TOOL_COUNT') && ROWS_SRC.includes('${BOOKMARK_COUNT}'),
    'proofStats.js no longer derives its tools figure; something typed it')
  assert.ok(stripComments(read('src/components/home/HomeProof.jsx')).includes('PROOF_ROWS.map'),
    'HomeProof.jsx no longer renders the proof rows')
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
  for (const [file, src] of Object.entries({ 'src/pages/Spectrum.jsx and its sections': MOUNTED, 'src/components/spectrum/spectrumFacts.js': withoutTable })) {
    assert.ok(!/\bthirteen\b/i.test(src),
      `${file} types the tool count. It is derived: shipping the UI Component Builder must `
      + 'change these sentences on the next build without an edit here.')
  }
  assert.ok(/TOOL_COUNT/.test(MOUNTED),
    'the landing no longer renders the tool count from TOOL_COUNT')
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

test('the icon-group shelf data is sound, and the page claims nothing about icon sets it cannot back', () => {
  // The shelf shows real icon groups: every group a signed-out visitor can
  // open, each with four of its own glyphs. The homepage has no Discover
  // section to hold it; whichever section shows the shelf asserts its own
  // markup and count.
  const groups = listIconGroups({ tier: 'anon' })
  const open = groups.filter((g) => !g.locked).map((g) => g.id)
  const shelf = Object.keys(ICON_GROUP_SHELF)
  assert.ok(shelf.length >= 2, 'the Icon sets shelf is nearly empty')
  for (const id of shelf) {
    assert.ok(open.includes(id), `the shelf shows ${id}, which a signed-out visitor cannot open`)
    assert.equal(ICON_GROUP_SHELF[id].length, 4, `${id} does not carry four of its own glyphs`)
    for (const body of ICON_GROUP_SHELF[id]) assert.match(body, /stroke="currentColor"/, `${id} carries a glyph that is not an outline`)
  }
  // The groups draw on other people's packs, so nothing on the page may
  // say every set here is made by UI L4B.
  assert.ok(!/Every set here is made by UI L4B/.test(ALL_JSX),
    'the page claims the icon packs are made by UI L4B')
  assert.ok(!PAGE.includes('id="discover"'), 'the homepage carries the Discover section again')
})

/* ── limits ────────────────────────────────────────────────────────────────── */

test('every plan figure on the page is the figure plans.js carries', () => {
  const freeText = FREE_POINTS.join(' | ')
  const proText = PRO_POINTS.join(' | ')
  assert.match(freeText, new RegExp(`${AI_LIMITS.free.daily} AI generations a day, ${AI_LIMITS.free.monthly} a month`))
  assert.match(proText, new RegExp(`${AI_LIMITS.pro.daily} AI generations a day, ${AI_LIMITS.pro.monthly} a month`))
  assert.match(freeText, new RegExp(`${FREE_SAVE_LIMITS.projects} saved projects, with ${FREE_SAVE_LIMITS.customIcons} icons in each`))

  const compareText = COMPARE.map((r) => `${r.label}:${r.free}:${r.pro}`).join(' | ')
  assert.match(compareText, new RegExp(`Saved projects:${FREE_SAVE_LIMITS.projects}:Unlimited`))
  assert.match(compareText, new RegExp(`Icons per project:${FREE_SAVE_LIMITS.customIcons}:Unlimited`))

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
    // The design's ground is the spec:
    // the design's dark ink and ink-hover, and its light page / card / ink /
    // ink-hover. All neutrals; the dark page and card are the app's own tokens.
    '#EFEEEA', '#D5D4CE', '#F5F5F2', '#FFFFFF', '#121418', '#2C313B',
  ])
  const hexes = [...CSS.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0])
  const unexpected = hexes.filter((h) => !ALLOWED.has(h) && !ALLOWED.has(h.toUpperCase()))
  assert.deepEqual(unexpected, [],
    `spectrum.css carries unexpected literal colours: ${unexpected.join(', ')}. `
    + 'Everything else resolves from the token layer.')

  // POSITIVE CONTROL: the sheet really does use the derived family, so the
  // assertion above is not passing on an empty stylesheet.
  for (const token of ['--accent', '--accent-mid', '--accent-text', '--accent-ink']) {
    assert.ok(CSS.includes(`var(${token})`), `spectrum.css never reads ${token}`)
  }
})
