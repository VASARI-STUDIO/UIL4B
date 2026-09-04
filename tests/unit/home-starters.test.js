// THE HOMEPAGE STOPPED ADVERTISING FOUR COMPETITORS.
//
// The strip under "What other people have published" rendered six rows of
// COMMUNITY_DESIGNS: twelve `target=_blank rel=nofollow` links to dribbble.com,
// awwwards.com, behance.net and mobbin.com, each with `{design.saves} saves`
// printed beneath it, and every one of those counts was zero.
//
// Two separate harms on the surface a first-time visitor sees. The links sent
// them to four competitors. The metric printed a zero next to each one, which
// reads as "nobody uses this" no matter how honest the surrounding copy is.
//
// The strip points inward now, at gradients and palettes this product already
// ships, and the assertions below are the two halves of that: the SUBTRACTIVE
// one (the homepage may not name an outbound host, a colour, a URL or a saves
// count) and the DERIVED one (every artefact it advertises is real, and its
// link is the gallery's own hand-off rather than a second encoding of it).
//
// WHAT IS DELIBERATELY NOT ASSERTED HERE. Nothing about /community. That page
// still seeds from COMMUNITY_DESIGNS, still marks every curated row as curated,
// and is the surface where "until real submissions exist" is a true thing to
// say. tests/unit/community-seed.test.js still owns it. This file is only about
// what the FRONT PAGE claims.
//
// Backlog: homepage-community-points-outward.
import test from 'node:test'
import assert from 'node:assert/strict'
import { GALLERY_GRADIENTS } from '../../src/data/gradientGallery.js'
import { LIBRARY_PALETTES } from '../../src/data/paletteLibrary.js'
import { arrayBlock, assertStripperWorks, read, stripComments } from './helpers/source-text.js'

const HOME = 'src/pages/Home.jsx'

/** The {kind, id} pairs the homepage advertises, read out of its own source. */
function starterSpec() {
  const block = arrayBlock(HOME, 'HOME_STARTER_SPEC')
  return [...block.matchAll(/kind: '([a-z]+)', id: '([a-z0-9-]+)'/g)]
    .map((m) => ({ kind: m[1], id: m[2] }))
}

test('the comment stripper works, so the source reads below can be trusted', () => {
  assertStripperWorks(assert)
  const block = arrayBlock(HOME, 'HOME_STARTER_SPEC')
  assert.ok(block.includes("kind: 'gradient'"), 'stripping ate the spec own code')
  assert.ok(!block.includes('PRESENTATION'),
    'a comment survived stripping — the assertions below would read prose as data')
})

test('THE ONE THAT MATTERS: the homepage links nothing outward', () => {
  // The whole point of the item. Read as source rather than as data, because
  // the harm was markup — target=_blank on a competitor's domain — not a value.
  const src = stripComments(read(HOME))
  assert.ok(src.includes('hcomm-card-link'), 'stripping ate the homepage own JSX')

  for (const host of ['dribbble', 'awwwards', 'behance', 'mobbin']) {
    assert.ok(!src.includes(host), `the homepage names ${host} again`)
  }
  assert.ok(!/https?:\/\//.test(src), 'the homepage carries an absolute URL again')
  assert.ok(!src.includes('nofollow'), 'a nofollow outbound link is back on the homepage')
  assert.ok(!src.includes("target=\"_blank\""), 'the homepage opens a new tab again')
  assert.ok(!src.includes('COMMUNITY_DESIGNS'),
    'the homepage reads the outbound community seed again — that data seeds /community, not the front page')
})

test('no card prints a social metric', () => {
  // `{design.saves} saves` was zero on all twelve rows. A zero is honest and
  // still the weakest thing you can say about yourself on a front page; the fix
  // is to stop making a social claim, not to find a better number.
  const src = stripComments(read(HOME))
  // The English word survives in honest body copy elsewhere on this page
  // ("Nothing saves, downloads or counts against a plan"), so this asserts the
  // BINDING and the element that rendered it, not the word.
  assert.ok(!/\.saves\b/.test(src), 'the homepage binds a saves count again')
  assert.ok(!src.includes('card-saves'), 'the saves element is back on the card')
  assert.ok(!/\.curated\b/.test(src), 'the homepage binds a curated flag again')
  assert.ok(!src.includes('card-tag'), 'the Curated tag is back on the card')
})

test('every artefact the homepage advertises is real, at the gallery own values', () => {
  // Derives both sides: the spec says which ids, the galleries say what exists.
  const spec = starterSpec()
  assert.equal(spec.length, 6, `the homepage advertises ${spec.length} artefacts, not six`)

  const gradients = new Set(GALLERY_GRADIENTS.map((g) => g.id))
  const palettes = new Set(LIBRARY_PALETTES.map((p) => p.id))
  for (const { kind, id } of spec) {
    assert.ok(kind === 'gradient' || kind === 'palette', `unknown artefact kind "${kind}"`)
    const pool = kind === 'gradient' ? gradients : palettes
    assert.ok(pool.has(id),
      `the homepage advertises ${kind} "${id}", which is not in the gallery that owns it`)
  }
  assert.ok(spec.some((s) => s.kind === 'gradient'), 'no gradient is advertised')
  assert.ok(spec.some((s) => s.kind === 'palette'), 'no palette is advertised')
})

test('the starter spec cannot write a colour, a URL or a name down', () => {
  // Same split HOME_SATELLITE_SPEC makes in toolTree.js: the spec owns WHICH and
  // in what order, the gallery owns everything else. A spec that could name a
  // colour could show a swatch the tool would not open, which is the defect the
  // old cards had — a decorative gradient standing in for an artefact elsewhere.
  const block = arrayBlock(HOME, 'HOME_STARTER_SPEC')
  assert.ok(!block.includes('#'), 'HOME_STARTER_SPEC names a colour')
  assert.ok(!block.includes('/create/'), 'HOME_STARTER_SPEC names a tool URL')
  assert.ok(!block.includes('name:'), 'HOME_STARTER_SPEC names an artefact by label')
  assert.ok(!block.includes('http'), 'HOME_STARTER_SPEC names a URL')
})

test('the hand-off URLs are the galleries own, not a second encoding', () => {
  // #332's defect, one level over: a surface that rebuilds a tool URL by hand
  // drifts from the tool that parses it. The homepage calls the same two
  // builders the Discover galleries call.
  const src = stripComments(read(HOME))
  assert.match(src, /gradientToolUrl\(/, 'the homepage no longer uses the gradient gallery hand-off')
  assert.match(src, /paletteBuilderUrl\(/, 'the homepage no longer uses the palette hand-off')
  assert.ok(!/\?gs=/.test(src), 'the homepage hand-builds a gradient hand-off URL')
  assert.ok(!/\?c=/.test(src), 'the homepage hand-builds a palette hand-off URL')
})
