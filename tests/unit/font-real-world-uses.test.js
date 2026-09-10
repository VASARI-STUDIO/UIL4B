// The "In use" tab's data slot: it ships EMPTY, and an entry cannot be drawn
// without saying where it came from.
//
// [fonts-in-use-surface] is blocked on imagery rights — who owns the pictures,
// under what licence they may be shown, who curates them, what provenance is
// displayed — and nothing here unblocks it. What this file guards is that the
// tab cannot quietly acquire an uncredited photograph, which is the takedown
// surface that item exists to keep the product away from.
//
// TWO ASSERTIONS ARE ABOUT EMPTINESS AND THAT IS DELIBERATE. The founder chose
// "build it empty and he fills it", so a placeholder image or an invented
// example is a defect here, not a nicety — and the ordinary way one arrives is
// somebody adding a sample row "just to see the layout". These fail if that
// happens.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  REAL_WORLD_USES, REQUIRED_USE_FIELDS, isShowable, usesFor,
} from '../../src/data/fontRealWorldUses.js'
import { stripJs as stripComments } from '../helpers/strip-comments.js'

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')

const COMPLETE = {
  image: '/font-uses/example.jpg',
  alt: 'A folded card menu on a dark table, its headings set in a high-contrast serif',
  title: 'Wine list for a neighbourhood bar',
  credit: 'A studio',
  source: 'https://example.com/where-it-came-from',
  licence: 'Used with permission of the studio',
}

test('the registry ships empty — no placeholder image, no invented example', () => {
  // The founder's own call. A sample row here would be either somebody's work
  // used without permission or a picture of something that does not exist.
  assert.deepEqual(Object.keys(REAL_WORLD_USES), [],
    'the real-world uses registry is no longer empty; every row needs cleared rights')
})

test('no image path is referenced anywhere in the module', () => {
  // Belt to the braces above: an entry could be added as a nested value, or a
  // path could be spliced in by some helper, and Object.keys would miss it.
  // Comments are stripped first — the documented EXAMPLE entry lives in one and
  // must not be read as a shipped row.
  const src = stripComments(read('src/data/fontRealWorldUses.js'))
  assert.ok(!/\.(?:jpg|jpeg|png|webp|avif|gif|svg)\b/i.test(src),
    'an image file is referenced in the uses registry; it must ship with none')
  assert.ok(!/https?:\/\//.test(src),
    'a URL is referenced in the uses registry; a source link belongs to a cleared entry only')
})

test('every one of the six provenance fields is required, individually', () => {
  // Tested one at a time rather than as a set: a single missing field is the
  // realistic failure (a row pasted in a hurry), and an assertion over the
  // whole object would pass while five of six were checked.
  assert.equal(isShowable(COMPLETE), true, 'a complete entry is refused — the rule is inverted')
  assert.equal(REQUIRED_USE_FIELDS.length, 6)
  for (const field of REQUIRED_USE_FIELDS) {
    const missing = { ...COMPLETE }
    delete missing[field]
    assert.equal(isShowable(missing), false, `an entry with no ${field} was allowed through`)
    assert.equal(isShowable({ ...COMPLETE, [field]: '' }), false, `an empty ${field} was allowed through`)
    assert.equal(isShowable({ ...COMPLETE, [field]: '   ' }), false, `a blank ${field} was allowed through`)
    assert.equal(isShowable({ ...COMPLETE, [field]: 42 }), false, `a non-string ${field} was allowed through`)
  }
})

test('it fails closed on anything that is not an entry at all', () => {
  for (const junk of [null, undefined, 'a string', 42, [], true]) {
    assert.equal(isShowable(junk), false, `${JSON.stringify(junk)} was treated as a showable use`)
  }
})

test('usesFor always returns an array, and drops incomplete rows rather than half-drawing them', () => {
  // The panel branches on length, so an undefined here is a crash on a tab a
  // reader opened out of curiosity.
  for (const family of [undefined, null, '', '   ', 'Not A Family', 42]) {
    assert.deepEqual(usesFor(family), [], `usesFor(${JSON.stringify(family)}) did not return []`)
  }
  // With a mixed list, only the complete rows survive — there is no "image with
  // a missing credit" state, because that state is the defect.
  const mixed = { ...COMPLETE }
  delete mixed.credit
  REAL_WORLD_USES.TestFamily = [COMPLETE, mixed, null]
  try {
    assert.deepEqual(usesFor('TestFamily'), [COMPLETE])
  } finally {
    delete REAL_WORLD_USES.TestFamily
  }
  assert.deepEqual(Object.keys(REAL_WORLD_USES), [], 'the fixture leaked into the shipped registry')
})

test('the empty tab talks about the LIBRARY, never about the typeface', () => {
  // The one sentence this panel must not say. An empty tab called "In use" is
  // a line away from telling a reader that nobody uses this face — a false and
  // damaging claim about a real person's work, made from a table this product
  // has never filled in.
  const src = stripComments(read('src/components/FontDossier.jsx'))
  const panel = src.slice(src.indexOf('export function FontInUsePanel'))
  assert.ok(panel.length > 400, 'the In-use panel is missing — this assertion is vacuous')
  assert.match(panel, /No cleared photographs of \{font\.family\} yet/,
    'the empty heading no longer says the gap is in what WE have cleared')
  assert.match(panel, /not a statement about the typeface/,
    'the panel no longer says outright that an empty tab is not a claim about the family')
  // The shapes that would make it a claim about the family.
  for (const wrong of [/No uses of \{font\.family\}/, /is not used/, /nobody uses/i]) {
    assert.ok(!wrong.test(panel), `the empty state makes a claim about the typeface: ${wrong}`)
  }
})

test('the outbound link is still a search, with the miss case stated', () => {
  // Same trap as the Examples tab and it is measured, not assumed: a
  // fontsinuse.com miss returns HTTP 200 reading "No Uses found" AND 47
  // unrelated popular uses underneath, so the miss case is a page that still
  // looks full. It can only ever be offered as a search.
  const src = stripComments(read('src/components/FontDossier.jsx'))
  const panel = src.slice(src.indexOf('export function FontInUsePanel'))
  assert.match(panel, /search fontsinuse\.com for \{font\.family\}/,
    'the link no longer reads as a search')
  assert.match(panel, /may return nothing/,
    'the panel no longer states that the search can come back empty')
  assert.match(panel, /rel="noopener noreferrer nofollow"/,
    'the third-party link convention was dropped')
  assert.ok(!/See \{font\.family\} in use/.test(panel),
    'the link promises a result set that cannot be guaranteed')
})

test('a cleared photograph would render its provenance beside it, not in a footnote', () => {
  const src = stripComments(read('src/components/FontDossier.jsx'))
  const panel = src.slice(src.indexOf('export function FontInUsePanel'))
  for (const field of ['title', 'credit', 'licence', 'alt']) {
    assert.ok(panel.includes(`use.${field}`), `a cleared entry would not render its ${field}`)
  }
  assert.match(panel, /alt=\{use\.alt\}/, 'the photograph would render without alt text')
  assert.match(panel, /href=\{use\.source\}/, 'the photograph would render with no source link')
})
