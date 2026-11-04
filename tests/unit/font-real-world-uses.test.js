// The "In use" tab's data: each entry links to the page that documents the use,
// and an entry that cannot name its documenting page is not drawn.
//
// Link-only entries are the normal case. An image is optional, but only with
// its alt text, author and licence together; a picture is never shown without
// all three.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  IMAGE_USE_FIELDS, REAL_WORLD_USES, REQUIRED_USE_FIELDS, isHttpsUrl, isShowable, usesFor,
} from '../../src/data/fontRealWorldUses.js'
import { stripJs as stripComments } from '../helpers/strip-comments.js'

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')

const LINK_ONLY = {
  title: 'A brand identity',
  where: 'The family is used on the brand’s website.',
  credit: 'Fonts In Use',
  url: 'https://fontsinuse.com/uses/1/a-brand-identity',
}

const WITH_IMAGE = {
  ...LINK_ONLY,
  image: '/font-uses/example.jpg',
  alt: 'A folded card menu on a dark table, its headings set in a high-contrast serif',
  author: 'A photographer',
  licence: 'CC BY-SA 4.0',
}

test('a link-only entry is showable', () => {
  assert.equal(isShowable(LINK_ONLY), true, 'a link-only entry is refused')
  assert.equal(isShowable({ ...LINK_ONLY, year: 2020 }), true)
  assert.equal(isShowable({ ...LINK_ONLY, year: '2020' }), true)
})

test('an entry with a year that is not four digits is refused', () => {
  assert.equal(isShowable({ ...LINK_ONLY, year: 'last year' }), false)
  assert.equal(isShowable({ ...LINK_ONLY, year: 99 }), false)
})

test('every required field is required, individually', () => {
  assert.deepEqual(REQUIRED_USE_FIELDS, ['title', 'where', 'credit', 'url'])
  for (const field of REQUIRED_USE_FIELDS) {
    const missing = { ...LINK_ONLY }
    delete missing[field]
    assert.equal(isShowable(missing), false, `an entry with no ${field} was allowed through`)
    assert.equal(isShowable({ ...LINK_ONLY, [field]: '' }), false, `an empty ${field} was allowed through`)
    assert.equal(isShowable({ ...LINK_ONLY, [field]: '   ' }), false, `a blank ${field} was allowed through`)
    assert.equal(isShowable({ ...LINK_ONLY, [field]: 42 }), false, `a non-string ${field} was allowed through`)
  }
})

test('a missing or non-https URL is refused', () => {
  const noUrl = { ...LINK_ONLY }
  delete noUrl.url
  assert.equal(isShowable(noUrl), false)
  for (const bad of ['http://fontsinuse.com/uses/1', 'fontsinuse.com/uses/1', '//fontsinuse.com/uses/1',
    'javascript:alert(1)', 'ftp://example.com/x', 'not a url']) {
    assert.equal(isShowable({ ...LINK_ONLY, url: bad }), false, `${bad} was allowed through as a link`)
  }
})

test('an image without its alt text, author or licence is refused', () => {
  assert.equal(isShowable(WITH_IMAGE), true, 'a fully credited image entry is refused')
  assert.deepEqual(IMAGE_USE_FIELDS, ['image', 'alt', 'author', 'licence'])
  for (const field of IMAGE_USE_FIELDS) {
    const missing = { ...WITH_IMAGE }
    delete missing[field]
    assert.equal(isShowable(missing), false, `an image entry with no ${field} was allowed through`)
    assert.equal(isShowable({ ...WITH_IMAGE, [field]: '  ' }), false, `a blank ${field} was allowed through`)
  }
  // An image path must be a local file under public/, never a hot link.
  assert.equal(isShowable({ ...WITH_IMAGE, image: 'https://example.com/x.jpg' }), false)
  assert.equal(isShowable({ ...WITH_IMAGE, image: '//example.com/x.jpg' }), false)
})

test('it fails closed on anything that is not an entry at all', () => {
  for (const junk of [null, undefined, 'a string', 42, [], true]) {
    assert.equal(isShowable(junk), false, `${JSON.stringify(junk)} was treated as a showable use`)
  }
})

test('every shipped entry is showable, is https, and has no image yet', () => {
  const families = Object.keys(REAL_WORLD_USES)
  assert.ok(families.length > 0, 'no family has a documented use')
  for (const family of families) {
    const rows = REAL_WORLD_USES[family]
    assert.ok(Array.isArray(rows) && rows.length > 0, `${family} has an empty list`)
    for (const use of rows) {
      assert.equal(isShowable(use), true, `${family}: "${use && use.title}" would not be drawn`)
      assert.equal(isHttpsUrl(use.url), true, `${family}: "${use.title}" is not an https link`)
      assert.ok(new URL(use.url).hostname, `${family}: "${use.title}" has no host`)
      // If an image is ever added it must exist as a local file.
      if (use.image) {
        assert.ok(fs.existsSync(path.join(process.cwd(), 'public', use.image)),
          `${family}: ${use.image} is not in public/`)
      }
    }
    // No family lists the same page twice.
    const urls = rows.map(use => use.url)
    assert.equal(new Set(urls).size, urls.length, `${family} lists a link twice`)
  }
})

test('a family with no documented use returns an empty list', () => {
  for (const family of ['Lora', 'Lato', 'Oswald', 'Noto Sans', 'Raleway']) {
    assert.deepEqual(usesFor(family), [], `${family} unexpectedly has entries`)
  }
})

test('usesFor always returns an array, and drops incomplete rows rather than half-drawing them', () => {
  for (const family of [undefined, null, '', '   ', 'Not A Family', 42, 'constructor', '__proto__', 'toString']) {
    assert.deepEqual(usesFor(family), [], `usesFor(${JSON.stringify(family)}) did not return []`)
  }
  const mixed = { ...LINK_ONLY }
  delete mixed.credit
  REAL_WORLD_USES.TestFamily = [LINK_ONLY, mixed, null, { ...WITH_IMAGE, licence: '' }]
  try {
    assert.deepEqual(usesFor('TestFamily'), [LINK_ONLY])
  } finally {
    delete REAL_WORLD_USES.TestFamily
  }
  assert.equal(usesFor('TestFamily').length, 0, 'the fixture leaked into the shipped registry')
})

test('the data module explains the code only', () => {
  const raw = read('src/data/fontRealWorldUses.js')
  const header = raw.slice(0, raw.indexOf('export const REAL_WORLD_USES'))
  assert.ok(header.length > 200, 'the header comment is missing')
  assert.ok(!/\b(19|20)\d{2}-\d{2}-\d{2}\b/.test(header), 'the header carries a dated history')
  assert.ok(!/founder|backlog|\[fonts-in-use-surface\]/i.test(header), 'the header carries project history')
})

test('the empty tab talks about OUR LIST, never about the typeface', () => {
  // An empty tab called "In use" is a line away from saying nobody uses the
  // face, which would be a false claim about someone's work.
  const src = stripComments(read('src/components/FontDossier.jsx'))
  const panel = src.slice(src.indexOf('export function FontInUsePanel'))
  assert.ok(panel.length > 400, 'the In-use panel is missing — this assertion is vacuous')
  assert.match(panel, /We have not added any documented uses of \{font\.family\} yet/,
    'the empty heading no longer says the gap is in what WE have listed')
  assert.match(panel, /not a statement about the typeface/,
    'the panel no longer says outright that an empty tab is not a claim about the family')
  for (const wrong of [/No uses of \{font\.family\}/, /is not used/, /nobody uses/i]) {
    assert.ok(!wrong.test(panel), `the empty state makes a claim about the typeface: ${wrong}`)
  }
})

test('the empty state still offers fontsinuse only as a search, with the miss case stated', () => {
  // A fontsinuse.com miss returns HTTP 200 reading "No Uses found" with
  // unrelated popular uses underneath, so it can only be offered as a search.
  const src = stripComments(read('src/components/FontDossier.jsx'))
  const panel = src.slice(src.indexOf('export function FontInUsePanel'))
  assert.match(panel, /search fontsinuse\.com for \{font\.family\}/)
  assert.match(panel, /may return nothing/)
  assert.ok(!/See \{font\.family\} in use/.test(panel),
    'the link promises a result set that cannot be guaranteed')
})

test('a use renders as a new-tab link with an accessible label, plus the report link', () => {
  const src = stripComments(read('src/components/FontDossier.jsx'))
  const panel = src.slice(src.indexOf('export function FontInUsePanel'))
  assert.match(panel, /href=\{use\.url\}/, 'the entry does not link to its documenting page')
  assert.match(panel, /target="_blank"\s+rel="noopener"/, 'the entry link lost target or rel')
  assert.match(panel, /\(opens in a new tab\)/, 'the entry link does not say it opens a new tab')
  assert.match(panel, /Report a wrong or unwanted entry/, 'the report link is missing')
  assert.match(panel, /href="\/feedback"/, 'the report link no longer falls back to the feedback route')
  // An image is drawn only through the entry that carries its provenance.
  assert.match(panel, /alt=\{use\.alt\}/)
  assert.match(panel, /use\.author/)
  assert.match(panel, /use\.licence/)
})
