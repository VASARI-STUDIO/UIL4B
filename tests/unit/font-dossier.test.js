import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  DOSSIER_TABS, LICENCES, facesThinCatalogue, fontFacts, fontLicence, licenceKey, nameList, yearOf,
} from '../../src/utils/fontDossier.js'

// The committed table the pop-up loads, read from disk the way the build ships it.
const realTable = JSON.parse(
  fs.readFileSync(new URL('../../src/data/fontLicences.json', import.meta.url), 'utf8'),
)

// The About tab states facts about real typefaces and real people who drew
// them. Every test here is guarding against the same failure — the panel
// claiming something the catalogue never said.

const playfair = {
  family: 'Playfair Display',
  category: 'serif',
  variants: [400, 500, 600, 700, 800, 900],
  subsets: ['menu', 'cyrillic', 'latin', 'latin-ext', 'vietnamese'],
  popularity: 17,
  designers: ['Claus Eggers Sørensen'],
  dateAdded: '2011-11-16',
  italics: true,
  axes: ['wght'],
  openSource: true,
}

const rowFor = (font, key) => fontFacts(font).find(r => r.k === key)

test('the dossier offers exactly the four tabs the founder asked for, in order', () => {
  // FOUR now, not three. The founder asked for the example half to be SPLIT
  // (2026-09-05): "1 tab showing Usage examples using some made mockup use
  // cases, but ... a tab showing real world use applications for each font and
  // an image to show it".
  //
  // The order is load-bearing and is pinned here rather than left to whoever
  // edits the array next: the two example tabs sit ADJACENT, so a reader meets
  // the invented one and the photographed one as two halves of one question
  // instead of finding them either side of the family's facts.
  assert.deepEqual(DOSSIER_TABS.map(t => t.id), ['specimen', 'about', 'examples', 'inuse'])
  const labels = Object.fromEntries(DOSSIER_TABS.map(t => [t.id, t.label]))
  assert.equal(labels.examples, 'Examples')
  assert.equal(labels.inuse, 'In use')
  // The two must not read as the same kind of thing from the strip alone.
  assert.notEqual(labels.examples, labels.inuse)
})

test('a fully-described family states every fact the catalogue holds', () => {
  const facts = Object.fromEntries(fontFacts(playfair, realTable).map(r => [r.k, r.v]))
  assert.equal(facts.Classification, 'Serif')
  assert.equal(facts.Designer, 'Claus Eggers Sørensen')
  assert.equal(facts.Weights, '6 — Regular 400 to Black 900')
  assert.equal(facts.Styles, 'Roman and italic')
  assert.equal(facts['Variable axes'], 'Weight')
  // The licence is its own block in the panel, never a row in this list.
  assert.equal(facts.Licence, undefined)
  // Rank is 1-based for a reader; the catalogue index is 0-based.
  assert.equal(facts.Popularity, '#18 by use on Google Fonts')
})

// THE ONE THAT MATTERS MOST. `dateAdded` is the day the family was published to
// Google Fonts, NOT the year the typeface was designed — for a revival of a
// metal face the two are decades apart. Labelling it "Released" or "Designed"
// would be a quiet fabrication about a real designer's work, so the wording is
// pinned here rather than left to whoever edits the panel next.
test('the date is labelled as when Google Fonts got it, never as a release date', () => {
  const keys = fontFacts(playfair).map(r => r.k)
  assert.ok(keys.includes('Added to Google Fonts'))
  for (const forbidden of ['Released', 'Release date', 'Designed', 'Year', 'Published']) {
    assert.ok(
      !keys.includes(forbidden),
      `"${forbidden}" would claim something the catalogue's dateAdded does not say`,
    )
  }
  assert.equal(rowFor(playfair, 'Added to Google Fonts').v, '2011')
})

test('a field the catalogue does not supply is omitted, never guessed', () => {
  // The bundled fallback catalogue shape: no designer, no date, no axes, no
  // licence flag, and no idea whether the family ships italics.
  const thin = {
    family: 'Roboto',
    category: 'sans-serif',
    variants: [100, 300, 400, 500, 700, 900],
    subsets: ['latin'],
  }
  const keys = fontFacts(thin).map(r => r.k)

  for (const absent of ['Designer', 'Designers', 'Added to Google Fonts', 'Variable axes', 'Licence', 'Styles', 'Popularity']) {
    assert.ok(!keys.includes(absent), `${absent} must be omitted when unknown, not defaulted`)
  }
  // What it CAN say, it still says. Note Popularity is absent too: this fixture
  // carries no rank, and "#1" would be an invented ranking rather than a
  // missing one.
  assert.deepEqual(keys, ['Classification', 'Weights', 'Scripts'])
  assert.equal(facesThinCatalogue(thin), true)
  assert.equal(facesThinCatalogue(playfair), false)
})

test('"Roman only" is a claim, so it is made only when italics are actually known', () => {
  // Absent → silence.
  assert.equal(rowFor({ ...playfair, italics: undefined }, 'Styles'), undefined)
  // Known false → stated.
  assert.equal(rowFor({ ...playfair, italics: false }, 'Styles').v, 'Roman only')
  assert.equal(rowFor({ ...playfair, italics: true }, 'Styles').v, 'Roman and italic')
})

test('menu is a subsetting artefact and is never listed as a script', () => {
  const scripts = rowFor(playfair, 'Scripts').v
  assert.ok(!/menu/i.test(scripts), 'the "menu" subset is not a script anyone reads in')
  assert.equal(scripts, 'Cyrillic, Latin, Latin Extended, Vietnamese')
})

test('designers are credited as English, and every one of them is named', () => {
  assert.equal(nameList(['Ana']), 'Ana')
  assert.equal(nameList(['Ana', 'Bo']), 'Ana and Bo')
  assert.equal(nameList(['Ana', 'Bo', 'Cy']), 'Ana, Bo and Cy')
  assert.equal(nameList([]), '')
  assert.equal(nameList(undefined), '')
  // The label agrees with the count — "Designer: Ana and Bo" reads as one person.
  assert.equal(rowFor({ ...playfair, designers: ['Ana', 'Bo'] }, 'Designers').v, 'Ana and Bo')
  assert.equal(rowFor({ ...playfair, designers: ['Ana', 'Bo'] }, 'Designer'), undefined)
})

test('a single-weight family is not described as a range', () => {
  assert.equal(rowFor({ ...playfair, variants: [400] }, 'Weights').v, '1 — Regular 400')
})

test('a malformed date yields no date row rather than a wrong one', () => {
  assert.equal(yearOf(''), '')
  assert.equal(yearOf(undefined), '')
  assert.equal(yearOf('not-a-date'), '')
  assert.equal(yearOf('2011-11-16'), '2011')
  assert.equal(rowFor({ ...playfair, dateAdded: 'soon' }, 'Added to Google Fonts'), undefined)
})

test('a missing font produces no claims at all', () => {
  assert.deepEqual(fontFacts(null), [])
  assert.deepEqual(fontFacts(undefined), [])
})

// ── Licence ───────────────────────────────────────────────────────────────

const OPEN_SOURCE = /open[\s-]*source/i

test('Inter is named under the SIL Open Font License 1.1, with its link and summary', () => {
  const licence = fontLicence({ family: 'Inter' }, realTable)
  assert.equal(licence.id, 'OFL-1.1')
  assert.equal(licence.heading, 'SIL Open Font License 1.1')
  assert.equal(licence.href, 'https://openfontlicense.org')
  assert.equal(
    licence.summary,
    'Free to use in personal and commercial work, including apps and logos. You can\u2019t sell the font files on their own.',
  )
  assert.equal(licence.linkLabel, 'Read the licence \u2197')
  assert.equal(fontFacts({ ...playfair, family: 'Inter' }, realTable).find(r => r.k === 'Licence'), undefined)
})

test('each licence the table can hold has its own heading and link', () => {
  const table = { aaa: 'OFL-1.1', bbb: 'Apache-2.0', ccc: 'UFL-1.0' }
  const got = ['aaa', 'bbb', 'ccc'].map(family => fontLicence({ family }, table))
  assert.deepEqual(got.map(l => l.heading), [
    'SIL Open Font License 1.1', 'Apache License 2.0', 'Ubuntu Font Licence 1.0',
  ])
  assert.deepEqual(got.map(l => l.href), [
    'https://openfontlicense.org',
    'https://www.apache.org/licenses/LICENSE-2.0',
    'https://ubuntu.com/legal/font-licence',
  ])
  assert.equal(new Set(got.map(l => l.summary)).size, 3, 'three licences, three different summaries')
  assert.deepEqual(Object.keys(LICENCES), ['OFL-1.1', 'Apache-2.0', 'UFL-1.0'])
})

test('the committed table names Ubuntu under the Ubuntu Font Licence', () => {
  assert.equal(fontLicence({ family: 'Ubuntu' }, realTable).heading, 'Ubuntu Font Licence 1.0')
})

test('a family missing from the table falls back to its Google Fonts page and asserts no licence', () => {
  const licence = fontLicence({ family: 'Not A Real Family' }, realTable)
  assert.equal(licence.id, null)
  assert.equal(licence.heading, 'Licence on Google Fonts')
  assert.equal(licence.href, 'https://fonts.google.com/specimen/Not+A+Real+Family')
  assert.equal(licence.summary, 'Check the licence on Google Fonts before you ship.')
  // Even a family the catalogue flags as open source gets no licence name from that flag.
  const row = rowFor({ ...playfair, family: 'Not A Real Family', openSource: true }, 'Licence')
  assert.equal(row, undefined)
})

test('an id the module has no text for is treated as unknown, not passed through', () => {
  const licence = fontLicence({ family: 'Odd' }, { odd: 'MIT' })
  assert.equal(licence.id, null)
  assert.equal(licence.heading, 'Licence on Google Fonts')
})

test('until the table has loaded there is no licence claim at all', () => {
  for (const table of [undefined, null, 'x']) {
    assert.equal(fontLicence({ family: 'Inter' }, table), null)
    assert.equal(fontFacts({ ...playfair, family: 'Inter' }, table).find(r => r.k === 'Licence'), undefined)
  }
  assert.equal(fontLicence(null, realTable), null)
  assert.equal(fontLicence({}, realTable), null)
})

test('family names are matched the way the repository folders are named', () => {
  assert.equal(licenceKey('Open Sans'), 'opensans')
  assert.equal(licenceKey('IBM Plex Sans'), 'ibmplexsans')
  assert.equal(licenceKey('Rock 3D'), 'rock3d')
  assert.equal(fontLicence({ family: 'Open Sans' }, realTable).id, 'OFL-1.1')
  assert.equal(fontLicence({ family: 'OPEN SANS' }, realTable).id, 'OFL-1.1')
  // A name that is also an Object.prototype key must not read a licence off it.
  assert.equal(fontLicence({ family: 'constructor' }, realTable).id, null)
})

test('the committed table only holds licences the pop-up has text for, and is not a stub', () => {
  const ids = new Set(Object.values(realTable))
  for (const id of ids) assert.ok(Object.hasOwn(LICENCES, id), `${id} has no heading`)
  assert.ok(Object.keys(realTable).length > 1500)
  for (const key of Object.keys(realTable)) assert.equal(key, licenceKey(key), `${key} is not in normalised form`)
})

test('"Open source" appears in nothing the licence code produces', () => {
  const families = [...Object.keys(realTable), 'Not A Real Family']
  for (const table of [undefined, realTable]) {
    for (const family of families) {
      const font = { ...playfair, family, openSource: true }
      const out = JSON.stringify([fontFacts(font, table), fontLicence(font, table)])
      assert.ok(!OPEN_SOURCE.test(out), `${family} produced "Open source"`)
    }
  }
  assert.ok(!OPEN_SOURCE.test(JSON.stringify(LICENCES)))
})
