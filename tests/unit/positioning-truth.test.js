// The founder's value proposition is stated once, and the surfaces derive it.
//
// The `exportFormats.js` / `plans-truth.test.js` pattern, applied to
// positioning: a claim lives in one module, every surface reads it, and this
// test fails the build when a surface types a competing one instead.
//
// WHAT WENT WRONG WITHOUT IT. The hero, /plans, /help and llms.txt each wrote
// their own sentence about what UIL4B is. None was checkably wrong, no two
// agreed, and nothing recorded which the founder had actually approved — so
// every rewrite of any one of them was a fresh guess, and three salvages this
// week found agent "Option 1 — RECOMMENDED" drafts being mistaken for his.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  HERO_HEADLINE, SURFACE_LINE, VALUE_PROPOSITION, heroHeadlineText, line,
} from '../../src/data/positioning.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(path.join(root, rel), 'utf8')

// ── The record of what he said ──────────────────────────────────────────────
//
// These four strings are pinned HERE, a second time, on purpose. Asserting the
// module against itself would pass for any content at all; the point of this
// block is that changing a founder sentence has to be a deliberate two-file
// edit with a reason, not a tidy-up somebody makes in passing.
const FOUNDER = {
  'forget-the-app-name': 'No more trying to remember the name of the specific app for the tool you liked.',
  'bookmark-folders': 'Gone are the days of searching through bookmark folders upon bookmark folders to find each tool.',
  'build-and-export': 'Build and export UI and brand design kits and content for website building.',
  'one-unified-location': "All the design tools you're constantly searching for, in one unified location.",
}

test('the four founder lines are exactly what he said', () => {
  assert.equal(VALUE_PROPOSITION.length, 4, 'a line was added or removed — this array is a record of what the founder said, not a copy deck')
  for (const [id, text] of Object.entries(FOUNDER)) {
    assert.equal(line(id), text, `the founder line "${id}" has been edited`)
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
      `"${l.id}" has drifted from the founder's raw phrase by more than the two agreed `
      + 'proofreading edits — an agent has rewritten it',
    )
  }
})

test('an unknown line id throws rather than rendering nothing', () => {
  // The positive control for line(): it must actually be capable of failing.
  assert.throws(() => line('not-a-real-line'), /no founder line/)
})

// ── The hero headline is a splice, and the splice is checkable ──────────────

test('every word of the hero headline comes from a founder line', () => {
  const sources = HERO_HEADLINE.cutFrom.map((id) => line(id).toLowerCase())
  assert.ok(sources.length >= 1, 'the headline records no source lines')

  // The lead and the marked run must each appear VERBATIM inside one of the
  // sentences they claim to be cut from. This is what makes "built from his
  // words only" a fact rather than a comment.
  for (const part of [HERO_HEADLINE.lead, HERO_HEADLINE.mark]) {
    const bare = part.toLowerCase().replace(/[.,]$/, '').trim()
    assert.ok(
      sources.some((src) => src.includes(bare)),
      `the hero headline fragment "${part}" is not a verbatim run of any line it claims to be `
      + 'cut from. The founder chose "build one from my words only"; an agent has added words.',
    )
  }
})

test('the headline splice check can fail', () => {
  // Positive control. Without this, the test above passes for a headline that
  // happens to be empty, or for a `cutFrom` listing every line in the file.
  const sources = ['build and export ui and brand design kits and content for website building']
  const invented = 'the only design workspace you will ever need'
  assert.ok(
    !sources.some((src) => src.includes(invented)),
    'the splice check would accept an invented headline — it proves nothing',
  )
})

// ── The surfaces derive rather than restate ────────────────────────────────

test('the homepage renders its headline and sub from the module, not from typed strings', () => {
  const home = read('src/pages/Home.jsx')

  // The hero must reference the constants…
  assert.match(home, /HERO_HEADLINE\.lead/, 'the hero h1 no longer renders the assembled headline from positioning.js')
  assert.match(home, /HERO_HEADLINE\.mark/, 'the hero h1 no longer renders the highlighted run from positioning.js')
  assert.match(home, /line\(SURFACE_LINE\.homeHeroSub\)/, 'the hero sub-line no longer derives from positioning.js')
  assert.match(home, /line\(SURFACE_LINE\.toolsSectionHeading\)/, 'the tools section heading no longer derives from positioning.js')

  // …and must NOT also carry the sentences as literals. A page that renders
  // from the module AND keeps a typed copy is one edit away from disagreeing
  // with itself, which is the whole failure this file exists to stop.
  for (const [id, text] of Object.entries(FOUNDER)) {
    assert.ok(
      !home.includes(text),
      `Home.jsx types the founder line "${id}" as a literal as well as deriving it. Delete the `
      + 'literal — two copies of one sentence is how they drift apart.',
    )
  }
})

// The founder decided 2026-09-07 that EVERY sales surface reads from the
// module. Home.jsx was first; these are the rest. Same two-sided shape as the
// homepage test: the page must call line() with the id SURFACE_LINE assigns
// it, and must NOT also carry the sentence as a literal.
const DERIVED_SURFACES = [
  ['src/pages/Plans.jsx', 'plansFraming', "'../data/positioning'"],
  ['src/pages/HelpCentre.jsx', 'helpOpening', "'../data/positioning'"],
  ['scripts/llms-txt.mjs', 'llmsSummary', "'../src/data/positioning.js'"],
]

test('/plans, /help and the llms.txt generator derive their line from the module', () => {
  for (const [file, key, from] of DERIVED_SURFACES) {
    const src = read(file)
    assert.ok(src.includes(`line(SURFACE_LINE.${key})`),
      `${file} no longer renders line(SURFACE_LINE.${key}) — its positioning line is typed, or gone`)
    assert.ok(src.includes(`from ${from}`), `${file} does not import positioning.js`)
    for (const [id, text] of Object.entries(FOUNDER)) {
      assert.ok(!src.includes(text),
        `${file} types the founder line "${id}" as a literal as well as deriving it. Delete the `
        + 'literal — two copies of one sentence is how they drift apart.')
    }
  }
})

test('every SURFACE_LINE mapping has a surface that actually reads it', () => {
  // A mapping with no consumer is a promise the module makes and nothing keeps
  // — which is exactly what plansFraming, helpOpening and llmsSummary were for
  // a day: declared in SURFACE_LINE while the three surfaces still typed their
  // own sentence. Each key must be read, by name, by at least one file.
  const consumers = [
    'src/pages/Home.jsx',
    ...DERIVED_SURFACES.map(([file]) => file),
    'scripts/og-cards.mjs',
  ].map((file) => [file, read(file)])
  for (const key of Object.keys(SURFACE_LINE)) {
    const readBy = consumers.filter(([, src]) => src.includes(`SURFACE_LINE.${key}`)).map(([f]) => f)
    assert.ok(readBy.length > 0, `SURFACE_LINE.${key} is mapped in positioning.js but no surface reads it`)
    assert.ok(VALUE_PROPOSITION.some((l) => l.id === SURFACE_LINE[key]),
      `SURFACE_LINE.${key} names "${SURFACE_LINE[key]}", which is not a founder line`)
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
    cards.hero.sub, line(SURFACE_LINE.homeHeroSub),
    'the share card sub disagrees with the hero sub-line. Run `npm run og:cards`.',
  )
  assert.equal(
    cards.hero.kicker, null,
    'the share card has an eyebrow again — the "UI system toolkit" tagline was retired 2026-09-07.',
  )
})

test('the hero keeps exactly one highlighted run', () => {
  // design-language-v2.md budgets at most one --hi element per viewport, and
  // scripts/og-cards.mjs throws if the h1 stops highlighting a phrase.
  const marks = [HERO_HEADLINE.lead, HERO_HEADLINE.mark, HERO_HEADLINE.tail]
  assert.equal(marks.filter((m) => m === HERO_HEADLINE.mark).length, 1)
  assert.ok(HERO_HEADLINE.mark.trim().length > 0, 'the hero highlight is empty')
})
