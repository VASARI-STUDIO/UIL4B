import test from 'node:test'
import assert from 'node:assert/strict'
import { PAIRING_RULES, rankPairings } from '../../src/utils/fontPairing.js'

// A catalogue shaped like the real one: sans families dominate the popular end,
// which is precisely the condition under which the old global sort returned six
// sans suggestions and one repeated reason.
const catalogue = [
  { family: 'Inter', category: 'sans-serif', variants: [100, 400, 700, 900], popularity: 0 },
  { family: 'Roboto', category: 'sans-serif', variants: [100, 400, 700, 900], popularity: 1 },
  { family: 'Open Sans', category: 'sans-serif', variants: [300, 400, 700], popularity: 2 },
  { family: 'Montserrat', category: 'sans-serif', variants: [100, 400, 700, 900], popularity: 3 },
  { family: 'Poppins', category: 'sans-serif', variants: [100, 400, 700], popularity: 4 },
  { family: 'Lato', category: 'sans-serif', variants: [300, 400, 700], popularity: 5 },
  { family: 'Noto Sans', category: 'sans-serif', variants: [400, 700], popularity: 6 },
  { family: 'Raleway', category: 'sans-serif', variants: [100, 400, 700, 900], popularity: 7 },
  { family: 'Nunito', category: 'sans-serif', variants: [300, 400, 700], popularity: 8 },
  { family: 'Rubik', category: 'sans-serif', variants: [300, 400, 700, 900], popularity: 9 },
  // Every serif sits far down the popularity ranking, as in the real catalogue.
  { family: 'Playfair Display', category: 'serif', variants: [400, 700, 900], popularity: 17 },
  { family: 'Merriweather', category: 'serif', variants: [300, 400, 700], popularity: 24 },
  { family: 'Lora', category: 'serif', variants: [400, 500, 700], popularity: 31 },
  { family: 'JetBrains Mono', category: 'monospace', variants: [400, 700], popularity: 60 },
]

const heading = { family: 'Inter', category: 'sans-serif' }

test('a sans heading is offered the serif pairing its own rule promises', () => {
  const out = rankPairings(catalogue, heading, { limit: 6 })
  const categories = out.map(s => s.font.category)

  // THE REGRESSION THIS FILE EXISTS FOR. Before the interleave, every one of
  // these was 'sans-serif' — the serif rule was real, correct and unreachable
  // because 1/(popularity+1) swamped the 0.05 category nudge.
  assert.ok(
    categories.includes('serif'),
    'the canonical serif-under-sans pairing must actually be offered',
  )
  // The first-listed target leads, so the canonical pairing is the first card.
  assert.equal(categories[0], 'serif')
})

test('suggestions carry more than one reason', () => {
  const out = rankPairings(catalogue, heading, { limit: 6 })
  const reasons = new Set(out.map(s => s.reason))
  assert.ok(
    reasons.size > 1,
    'six cards repeating one sentence is a slot machine with a caption',
  )
  // And each card's reason belongs to that card's category, not to the heading's.
  const reasonFor = Object.fromEntries(PAIRING_RULES['sans-serif'])
  for (const s of out) assert.equal(s.reason, reasonFor[s.font.category])
})

test('the two target categories are interleaved, best of each first', () => {
  const out = rankPairings(catalogue, heading, { limit: 6 })
  assert.deepEqual(out.map(s => s.font.category), [
    'serif', 'sans-serif', 'serif', 'sans-serif', 'serif', 'sans-serif',
  ])
  // Within a category, ranking still applies: the most popular serif leads.
  assert.equal(out[0].font.family, 'Playfair Display')
  assert.equal(out[1].font.family, 'Inter' === heading.family ? 'Roboto' : 'Inter')
})

test('the heading family is never suggested as its own body face', () => {
  const out = rankPairings(catalogue, heading, { limit: 10 })
  assert.ok(!out.some(s => s.font.family === heading.family))
})

test('an exhausted category yields fewer suggestions rather than looping', () => {
  // Only one serif and one sans available; asking for six must terminate.
  const tiny = [
    { family: 'Lora', category: 'serif', variants: [400], popularity: 1 },
    { family: 'Inter', category: 'sans-serif', variants: [400], popularity: 0 },
  ]
  const out = rankPairings(tiny, { family: 'Other', category: 'sans-serif' }, { limit: 6 })
  assert.equal(out.length, 2)
  assert.deepEqual(out.map(s => s.font.family), ['Lora', 'Inter'])
})

test('an empty or malformed catalogue produces no suggestions, not a crash', () => {
  assert.deepEqual(rankPairings([], heading), [])
  assert.deepEqual(rankPairings(null, heading), [])
  assert.deepEqual(rankPairings(undefined, heading), [])
  assert.deepEqual(rankPairings([null, undefined], heading), [])
})

test('an unknown heading category falls back to the sans rules rather than empty', () => {
  const out = rankPairings(catalogue, { family: 'X', category: 'not-a-category' }, { limit: 2 })
  assert.equal(out.length, 2)
  assert.ok(out.every(s => s.reason))
})

test('every category rule offers at least two different body categories', () => {
  // A rule listing one target can only ever produce one reason, which is the
  // failure this whole change is about — guard the data, not just the ranker.
  for (const [category, rules] of Object.entries(PAIRING_RULES)) {
    const targets = rules.map(([c]) => c)
    assert.ok(rules.length >= 2, `${category} needs more than one pairing route`)
    assert.equal(new Set(targets).size, targets.length, `${category} lists a target twice`)
  }
})
