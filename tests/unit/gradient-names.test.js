// T22: generated gradient names and descriptions (spec section 10).
import test from 'node:test'
import assert from 'node:assert/strict'
import { STYLES, curtainColours } from '../../src/utils/gradientStyles.js'
import { rollDesign } from '../../src/utils/gradientHarmony.js'
import { BANNED_WORDS, NEUTRAL_NOUNS, NOUNS, colourNoun, generateName } from '../../src/utils/gradientNames.js'

const COUNT = 10000
const WINDOW = 30

const lexicon = [...NEUTRAL_NOUNS, ...NOUNS.flat(2)].map((w) => w.toLowerCase())

// What the description may say: the long noun of each stop, with the optional
// paler/deeper lead-in, and the curtain colours for Curtains.
function allowedNouns(d) {
  const hexes = d.style === 'curtains' ? [...d.stops, ...curtainColours(d.stops)] : d.stops
  return [...new Set(hexes.map((h) => colourNoun(h).long))]
}

function nounsInside(description, allowed) {
  let rest = description.toLowerCase()
  for (const phrase of [...allowed].sort((a, b) => b.length - a.length)) rest = rest.split(phrase).join(' ')
  rest = rest.replace(/\b(paler|deeper|dusty|misty)\b/g, ' ')
  return lexicon.filter((w) => new RegExp(`\\b${w}\\b`).test(rest))
}

test('T22: 10,000 designs: names and descriptions follow the rules', () => {
  const recent = []
  for (let i = 1; i <= COUNT; i++) {
    const style = STYLES[i % STYLES.length]
    const d = rollDesign(style, i)
    const finishes = { grain: i % 3 === 0 ? 4.5 : 0, glass: i % 7 === 0 ? {} : null }
    const input = { style, stops: d.stops, params: d.params, finishes, seed: i, taken: recent }
    const { name, description } = generateName(input)
    const tag = `${i} ${style} ${d.stops.join(',')}: "${name}" / "${description}"`

    assert.equal(name.split(' ').length, 2, `two words: ${tag}`)
    assert.ok(name.length <= 24, `name length: ${tag}`)
    assert.ok(!/\d/.test(name), `digit in name: ${tag}`)
    assert.ok(/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(name), `Title Case: ${tag}`)
    assert.ok(description.length <= 60, `description length: ${tag}`)
    assert.ok(/^[A-Z]/.test(description), `sentence case: ${tag}`)
    const text = `${name} ${description}`.toLowerCase()
    for (const w of BANNED_WORDS) assert.ok(!text.includes(w), `banned word ${w}: ${tag}`)
    assert.ok(!/[—!]/.test(text), `em dash or exclamation: ${tag}`)
    assert.ok(!/colour|color|\bgray\b|\bcenter\b/.test(text.replace(/colour/g, '')), `spelling: ${tag}`)
    assert.deepEqual(nounsInside(description, allowedNouns(d)), [], `description names a colour no stop has: ${tag}`)

    assert.deepEqual(generateName(input), { name, description }, `not repeatable: ${tag}`)
    assert.ok(!recent.includes(name), `repeats within ${WINDOW}: ${tag}`)
    recent.push(name)
    if (recent.length > WINDOW) recent.shift()
  }
})

test('T22: the spec examples read as the spec says', () => {
  const g = (style, stops, params = {}, finishes = {}) => generateName({ style, stops, params, finishes, seed: 1 })
  assert.equal(colourNoun('#2a50c8').name, 'Cobalt')
  assert.match(g('curtains', ['#0a0b0a', '#3fb98a']).description, /curtains over a night sky$/)
  assert.match(g('steps', ['#e98724', '#201810'], { shape: 'arches', steps: 10 }).description, /stepping down to .* in 10 arches$/)
  assert.match(g('mesh', ['#fed4d9', '#f1587c'], {}, { grain: 4.5 }).description, /pooling with/)
})
