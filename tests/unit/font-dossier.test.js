import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DOSSIER_TABS, facesThinCatalogue, fontFacts, nameList, yearOf,
} from '../../src/utils/fontDossier.js'

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

test('the dossier offers exactly the three tabs the founder asked for', () => {
  assert.deepEqual(DOSSIER_TABS.map(t => t.id), ['specimen', 'about', 'examples'])
})

test('a fully-described family states every fact the catalogue holds', () => {
  const facts = Object.fromEntries(fontFacts(playfair).map(r => [r.k, r.v]))
  assert.equal(facts.Classification, 'Serif')
  assert.equal(facts.Designer, 'Claus Eggers Sørensen')
  assert.equal(facts.Weights, '6 — Regular 400 to Black 900')
  assert.equal(facts.Styles, 'Roman and italic')
  assert.equal(facts['Variable axes'], 'Weight')
  assert.equal(facts.Licence, 'Open source')
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
