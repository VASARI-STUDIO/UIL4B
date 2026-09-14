// A COLOUR'S NAME MAY NOT CONTRADICT THE COLOUR.
//
// colorTheme() picks the right BANK from the hue and that half was fixed on
// 2026-09-13. What stayed broken, and was recorded as broken, is the word
// inside the bank: the noun came off a hash across all eighteen, so a deep blue
// could draw "Teal" and a bronze could draw "Firebrick". The family was right
// and the word was not.
//
// It stopped being cosmetic when the Pro brand-guidelines export was generated
// on 2026-09-15 and printed #1C2792 as PRIMARY "Muted Teal" — in a document
// that then argues for the name: "Say “Muted Teal” in a review and the decision
// survives; say the hex and it does not." That file is what a customer sends to
// their client, which makes the primary's name the most expensive string in the
// product to get wrong.
//
// Every hue here is HCT, because every caller reads hexToHct(hex)[0] and the
// sRGB wheel is rotated from it by up to 45 degrees in the blues. Asserting on
// sRGB angles would be asserting on the wrong wheel — which is the original bug.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { colorName, paletteColorNames } from '../../src/utils/paletteNames.js'
import { hexToHct } from '../../src/utils/colors.js'

const hueOf = (hex) => hexToHct(hex)[0]
const gap = (a, b) => {
  const d = Math.abs(((a - b) % 360 + 360) % 360)
  return d > 180 ? 360 - d : d
}

// The words that name a hue, with the HCT hue they name. Deliberately a SECOND
// copy of the map in paletteNames.js: a test that imported the same table would
// pass on a table that was wrong, which is the whole failure mode here.
const NAMES_A_HUE = {
  Teal: 197, Indigo: 279, Cobalt: 269, Cerulean: 273, Azure: 264, Petrol: 210,
  Glacier: 216, Denim: 264, Marine: 255, Prussian: 251, Delft: 272,
  Firebrick: 24, Terracotta: 37, Sienna: 42, Ochre: 59, Rust: 38, Amber: 85,
  Sage: 135, Moss: 124, Olive: 111, Verdigris: 193, Eucalyptus: 170, Patina: 185,
  Plum: 336, Amethyst: 310, Mauve: 315, Heather: 314, Iris: 289,
  Rose: 3, Coral: 38, Fuchsia: 335, Raspberry: 9,
}

test('the two colours on record are no longer contradicted by their names', () => {
  // #1C2792 is HCT 281 and printed "Muted Teal" — Teal is 197, 84 degrees off.
  // #835507 is HCT 72 and drew "Firebrick" at 24, 48 degrees off.
  assert.doesNotMatch(colorName('#1C2792'), /Teal/, 'the export primary is named Teal again')
  assert.doesNotMatch(colorName('#835507'), /Firebrick/, 'the bronze is named Firebrick again')
})

test('no colour anywhere on the wheel draws a noun that contradicts it', () => {
  // THE GENERAL CASE, not the two anecdotes. Walks the wheel at several
  // chromas and lightnesses and checks every name it produces.
  const offenders = []
  for (let h = 0; h < 360; h += 5) {
    for (const [s, l] of [[80, 30], [60, 45], [45, 60], [90, 20]]) {
      const hex = hslHex(h, s, l)
      const name = colorName(hex)
      const noun = name.split(' ').pop()
      const named = NAMES_A_HUE[noun]
      if (named === undefined) continue
      const actual = hueOf(hex)
      const d = gap(named, actual)
      if (d > 60) offenders.push(`${hex} (HCT ${Math.round(actual)}) drew "${name}" — ${noun} is ${named}, ${Math.round(d)} off`)
    }
  }
  assert.deepEqual(offenders.slice(0, 12), [],
    `${offenders.length} colour(s) named by a word that contradicts them`)
})

test('the guard is not achieved by emptying the pool', () => {
  // POSITIVE CONTROL. Every assertion above is an absence, and a colorName that
  // returned one constant, or the same noun for everything, would satisfy all
  // of them. The names must still vary across a palette and across the wheel.
  const wheel = []
  for (let h = 0; h < 360; h += 15) wheel.push(colorName(hslHex(h, 70, 45)))
  assert.ok(new Set(wheel).size >= 18, `only ${new Set(wheel).size} distinct names across 24 hues`)

  const board = paletteColorNames(['#1C2792', '#3A26C9', '#7753DF', '#BA8AEA', '#E7C1F6'])
  assert.equal(new Set(board).size, 5, `a five-colour board produced ${new Set(board).size} distinct names: ${board.join(', ')}`)
  for (const name of board) assert.match(name, /^\S+ \S+/, `"${name}" is not an adjective plus a noun`)
})

test('a name is still a pure function of the hex', () => {
  // The pool is narrowed before the index is taken, so narrowing must not have
  // made the choice depend on anything but the colour.
  for (const hex of ['#1C2792', '#835507', '#00857A', '#FFFFFF', '#101010']) {
    const first = colorName(hex)
    for (let i = 0; i < 20; i += 1) assert.equal(colorName(hex), first, `${hex} is not stable`)
    assert.equal(colorName(hex.toLowerCase()), first, `${hex} depends on case`)
  }
})

test('a colour with no readable hue still gets a name', () => {
  // Greys have no hue to contradict, and a hex that does not parse must not
  // throw out of a naming call that a document generator is depending on.
  for (const hex of ['#808080', '#FFFFFF', '#000000', 'not-a-hex', '', null, undefined]) {
    const name = colorName(hex)
    assert.equal(typeof name, 'string')
    assert.ok(name.length > 2, `${JSON.stringify(hex)} produced ${JSON.stringify(name)}`)
  }
})

/** HSL to hex, so the wheel can be walked without a colour library. */
function hslHex(h, s, l) {
  const S = s / 100
  const L = l / 100
  const c = (1 - Math.abs(2 * L - 1)) * S
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = L - c / 2
  const seg = Math.floor(h / 60) % 6
  const rgb = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][seg]
  return '#' + rgb.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}
