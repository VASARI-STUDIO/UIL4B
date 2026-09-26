// The value proposition is stated once, and the surfaces derive it.
//
// The `exportFormats.js` / `plans-truth.test.js` pattern, applied to
// positioning: a claim lives in one module, every surface reads it, and this
// test fails the build when a surface types a competing one instead.
//
// WHAT WENT WRONG WITHOUT IT. The hero, /plans, /help and llms.txt each wrote
// their own sentence about what UIL4B is. None was checkably wrong, no two
// agreed, and nothing recorded which one was approved — so every rewrite of
// any one of them was a fresh guess.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  HERO_HEADLINE, SURFACE_LINE, VALUE_PROPOSITION, heroHeadlineText, line,
} from '../../src/data/positioning.js'
import { SPECTRUM_HERO_SUB } from '../../src/components/spectrum/spectrumHero.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(path.join(root, rel), 'utf8')

// ── The pinned lines ────────────────────────────────────────────────────────
//
// These strings are pinned HERE, a second time, on purpose. Asserting the
// module against itself would pass for any content at all; the point of this
// block is that changing a positioning sentence has to be a deliberate
// two-file edit with a reason, not a tidy-up somebody makes in passing.
const PINNED = {
  'forget-the-app-name': 'No more trying to remember the name of the specific app for the tool you liked.',
  'bookmark-folders': 'Gone are the days of searching through bookmark folders upon bookmark folders to find each tool.',
  'build-and-export': 'Build and export UI and brand design kits and content for website building.',
  'one-unified-location': "All the design tools you're constantly searching for, in one unified location.",
  // The successor to `one-unified-location` on the surfaces that displayed it.
  // "1 tool websites" is deliberately not corrected to "one-tool".
  // `one-unified-location` stays above it, so a splice that names it in
  // `cutFrom` still traces to real text.
  'one-tool-websites': 'No more trying to remember the names of the 1 tool websites.',
}

test('the five positioning lines are exactly as approved', () => {
  assert.equal(VALUE_PROPOSITION.length, 5, 'a line was added or removed — this array is approved copy, not a copy deck')
  for (const [id, text] of Object.entries(PINNED)) {
    assert.equal(line(id), text, `the positioning line "${id}" has been edited`)
  }
})

test('every line still traces to the raw phrase it was proofread from', () => {
  // The only permitted edits are "your" → "you're" and sentence case with a
  // closing stop. Verified mechanically rather than trusted: lower-case both,
  // strip the full stop and the apostrophe difference, and the two must match.
  const norm = (s) => s.toLowerCase().replace(/[.,]/g, '').replace(/you're/g, 'your').trim()
  for (const l of VALUE_PROPOSITION) {
    assert.equal(
      norm(l.text), norm(l.source),
      `"${l.id}" has drifted from its raw phrase by more than the two agreed `
      + 'proofreading edits — it has been rewritten',
    )
  }
})

test('an unknown line id throws rather than rendering nothing', () => {
  // The positive control for line(): it must actually be capable of failing.
  assert.throws(() => line('not-a-real-line'), /no positioning line/)
})

// ── The hero headline records where it came from ────────────────────────────
//
// The headline is either a whole sentence taken from a design, in which case
// it names that design in `source`, or a SPLICE of positioning lines, in which
// case every fragment must be a verbatim run of a line it names in `cutFrom`.

test('the hero headline is either a whole design sentence or a checkable splice', () => {
  if (HERO_HEADLINE.cutFrom.length === 0) {
    assert.match(HERO_HEADLINE.source || '', /Spectrum\.dc\.html/,
      'the headline is not a splice, so it must name the design it was taken from')
    return
  }
  const sources = HERO_HEADLINE.cutFrom.map((id) => line(id).toLowerCase())
  for (const part of [HERO_HEADLINE.lead, HERO_HEADLINE.mark]) {
    const bare = part.toLowerCase().replace(/[.,]$/, '').trim()
    assert.ok(
      sources.some((src) => src.includes(bare)),
      `the hero headline fragment "${part}" is not a verbatim run of any line it claims to be `
      + 'cut from — words have been added.',
    )
  }
})

test('the headline splice check can fail', () => {
  // Positive control, kept for the day a splice comes back.
  const sources = ['build and export ui and brand design kits and content for website building']
  const invented = 'the only design workspace you will ever need'
  assert.ok(
    !sources.some((src) => src.includes(invented)),
    'the splice check would accept an invented headline — it proves nothing',
  )
})

// ── The approved sentence, pinned word for word ─────────────────────────────
//
// What was approved is a STRING, not a recipe — so the string is pinned here, a
// second time. Changing the headline is then a deliberate two-file edit.
const APPROVED_HEADLINE = 'Build and export UI and brand kits from one place.'
const APPROVED_PARTS = Object.freeze({
  lead: 'Build and export UI and brand kits from',
  mark: 'one place',
  tail: '.',
})

test('the hero headline is the exact approved sentence', () => {
  assert.equal(
    heroHeadlineText(), APPROVED_HEADLINE,
    'the hero headline has been changed. It is the Spectrum design’s sentence — the '
    + 'first sentence a visitor reads. Do not move this pin to match an edit: get the new '
    + 'wording approved, then change src/data/positioning.js and this pin together.',
  )
  // The pieces separately, because a join can hide a swap: moving a word into
  // the mark leaves the sentence identical and changes WHICH RUN THE PAGE
  // HIGHLIGHTS, on the hero and on the share card.
  for (const [key, value] of Object.entries(APPROVED_PARTS)) {
    assert.equal(HERO_HEADLINE[key], value,
      `HERO_HEADLINE.${key} has been edited — the highlighted run is part of the approved headline.`)
  }
  assert.deepEqual([...HERO_HEADLINE.cutFrom], [], 'the headline claims to be a splice again')
})

test('the headline pin can fail', () => {
  assert.notEqual(
    APPROVED_HEADLINE, `${APPROVED_PARTS.lead} in one place${APPROVED_PARTS.tail}`,
    'the pin would accept a reworded headline — it proves nothing',
  )
})

// ── The surfaces derive rather than restate ────────────────────────────────

test('the homepage renders its headline and sub from the module, not from typed strings', () => {
  // The front door is src/pages/Spectrum.jsx.
  const home = read('src/pages/Spectrum.jsx')

  // The front door's hero is the Spectrum headline and sub-line. The headline
  // lives in positioning.js (HERO_HEADLINE) and reaches the page through
  // src/components/spectrum/spectrumHero.js, which the page and
  // scripts/home-shell.mjs both read — the same "render from the module,
  // never type it" rule. The share card reads HERO_HEADLINE directly.
  const hero = read('src/components/spectrum/spectrumHero.js')
  assert.match(home, /SPECTRUM_HERO\.text/, 'the hero h1 no longer renders SPECTRUM_HERO.text')
  assert.match(home, /SPECTRUM_HERO\.mark/, 'the hero h1 no longer renders the highlighted run SPECTRUM_HERO.mark')
  assert.match(home, /\{SPECTRUM_HERO_SUB\}/, 'the hero sub-line no longer renders SPECTRUM_HERO_SUB')
  assert.match(hero, /from '\.\.\/\.\.\/data\/positioning\.js'/,
    'spectrumHero.js no longer reads the headline from positioning.js')
  for (const sentence of [/Build and export UI and brand kits/, /Pick your colours, type, icons and imagery/]) {
    assert.ok(!sentence.test(home), `Spectrum.jsx types ${sentence} instead of reading spectrumHero.js`)
  }

  // …and must NOT also carry the sentences as literals. A page that renders
  // from the module AND keeps a typed copy is one edit away from disagreeing
  // with itself, which is the whole failure this file exists to stop.
  for (const [id, text] of Object.entries(PINNED)) {
    assert.ok(
      !home.includes(text),
      `Spectrum.jsx types the positioning line "${id}" as a literal as well as deriving it. Delete the `
      + 'literal — two copies of one sentence is how they drift apart.',
    )
  }
})

// EVERY sales surface reads from the module. Same two-sided shape as the
// homepage test: the page must call line() with the id SURFACE_LINE assigns
// it, and must NOT also carry the sentence as a literal.
//
// /plans is not in this list: it is the design's Pricing screen, whose h1 and
// sub-line come from the design, not from VALUE_PROPOSITION. The guard that it
// does not ALSO type a positioning line is kept below, on its own.
const DERIVED_SURFACES = [
  ['src/pages/HelpCentre.jsx', 'helpOpening', "'../data/positioning'"],
  ['scripts/llms-txt.mjs', 'llmsSummary', "'../src/data/positioning.js'"],
]

test('/help and the llms.txt generator derive their line from the module', () => {
  for (const [file, key, from] of DERIVED_SURFACES) {
    const src = read(file)
    assert.ok(src.includes(`line(SURFACE_LINE.${key})`),
      `${file} no longer renders line(SURFACE_LINE.${key}) — its positioning line is typed, or gone`)
    assert.ok(src.includes(`from ${from}`), `${file} does not import positioning.js`)
    for (const [id, text] of Object.entries(PINNED)) {
      assert.ok(!src.includes(text),
        `${file} types the positioning line "${id}" as a literal as well as deriving it. Delete the `
        + 'literal — two copies of one sentence is how they drift apart.')
    }
  }
})

test('/plans does not type a positioning line as a literal', () => {
  const src = read('src/pages/Pricing.jsx')
  assert.ok(src.includes('less than 1 coffee'),
    'Pricing.jsx no longer carries the design’s pricing h1 — this check is reading the wrong file')
  for (const [id, text] of Object.entries(PINNED)) {
    assert.ok(!src.includes(text),
      `src/pages/Pricing.jsx types the positioning line "${id}" as a literal. Read it from positioning.js by id.`)
  }
})

test('every SURFACE_LINE mapping has a surface that actually reads it', () => {
  // A mapping with no consumer is a promise the module makes and nothing keeps.
  // Each key must be read, by name, by at least one file.
  const consumers = [
    'src/pages/Spectrum.jsx',
    'src/components/spectrum/spectrumFacts.js',
    ...DERIVED_SURFACES.map(([file]) => file),
    'scripts/og-cards.mjs',
  ].map((file) => [file, read(file)])
  for (const key of Object.keys(SURFACE_LINE)) {
    const readBy = consumers.filter(([, src]) => src.includes(`SURFACE_LINE.${key}`)).map(([f]) => f)
    assert.ok(readBy.length > 0, `SURFACE_LINE.${key} is mapped in positioning.js but no surface reads it`)
    assert.ok(VALUE_PROPOSITION.some((l) => l.id === SURFACE_LINE[key]),
      `SURFACE_LINE.${key} names "${SURFACE_LINE[key]}", which is not a positioning line`)
  }
})

test('the share card says what the hero says', () => {
  // The card is generated from the same module the hero renders from, so the
  // check is that the GENERATED artefact agrees — cards.json is committed, and
  // a stale one means somebody changed the headline without running og:cards.
  const cards = JSON.parse(read('public/previews/cards.json'))
  const cardHeadline = cards.hero.headline.map((r) => r.text).join('').trim()
  assert.equal(
    cardHeadline, heroHeadlineText(),
    'public/previews/cards.json disagrees with the hero headline. Run `npm run og:cards`.',
  )
  assert.equal(
    cards.hero.sub, SPECTRUM_HERO_SUB,
    'the share card sub disagrees with the hero sub-line. Run `npm run og:cards`.',
  )
  assert.equal(
    cards.hero.kicker, null,
    'the share card has an eyebrow again — the "UI system toolkit" tagline is retired.',
  )
})

test('the hero keeps exactly one highlighted run', () => {
  // design-language-v2.md budgets at most one --hi element per viewport, and
  // scripts/og-cards.mjs throws if the h1 stops highlighting a phrase.
  const marks = [HERO_HEADLINE.lead, HERO_HEADLINE.mark, HERO_HEADLINE.tail]
  assert.equal(marks.filter((m) => m === HERO_HEADLINE.mark).length, 1)
  assert.ok(HERO_HEADLINE.mark.trim().length > 0, 'the hero highlight is empty')
})
