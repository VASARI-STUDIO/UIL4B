// Whether the Stroke control is offered is decided from the artwork's markup (markupHasStroke), not from
// the pack's name. These run it over real icons from the packs the library ships, copied into
// fixtures/pack-samples.json from each pack's own data. The expected answers are written out here by hand
// from what the pack draws: outline sets stroke, solid and filled sets (and sets that draw outlines as
// filled shapes, like MingCute, Material Design Icons and Phosphor) do not.
//
// HOW TO SEE EACH FAIL (src/utils/iconStroke.js):
//   markupHasStroke returns true when `fill="currentColor"` is seen   -> every "does not stroke" case
//   markupHasStroke goes back to a pack list that includes 'ph'        -> the Phosphor cases
//   markupHasStroke reads a stroke inside <defs> or a clip path         -> the synthetic "not drawn" cases
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { markupHasStroke } from '../../src/utils/iconStroke.js'

const { icons } = JSON.parse(readFileSync(new URL('./fixtures/pack-samples.json', import.meta.url), 'utf8'))
const svgOf = ({ width, height, body }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>`
const find = (pack, name) => {
  const hit = icons.find((i) => i.pack === pack && i.name === name)
  assert.ok(hit, `${pack}:${name} is in the fixture`)
  return svgOf(hit)
}

const STROKES = [
  ['solar', 'bell-linear'], ['solar', 'home-2-linear'], ['solar', 'heart-broken'],
  ['iconoir', 'heart'], ['lucide', 'heart'], ['lucide', 'search'], ['tabler', 'heart'], ['heroicons', 'heart'],
]
const DOES_NOT = [
  ['solar', 'heart-bold'], ['solar', 'bell-bold'], ['solar', 'star-bold-duotone'],
  ['iconoir', 'heart-solid'], ['mingcute', 'heart-line'], ['mingcute', 'heart-fill'],
  ['mdi', 'heart'], ['mdi', 'heart-outline'], ['ph', 'heart'], ['ph', 'heart-bold'], ['ph', 'heart-fill'],
  ['tabler', 'heart-filled'], ['heroicons', 'heart-solid'],
]

for (const [pack, name] of STROKES) {
  test(`${pack}:${name} draws with a stroke, so the Stroke control is offered`, () => {
    assert.equal(markupHasStroke(find(pack, name)), true)
  })
}

for (const [pack, name] of DOES_NOT) {
  test(`${pack}:${name} is drawn filled, so there is no Stroke control`, () => {
    assert.equal(markupHasStroke(find(pack, name)), false)
  })
}

test('the fixture covers every pack the answers above name', () => {
  const packs = new Set(icons.map((i) => i.pack))
  for (const p of ['solar', 'iconoir', 'mingcute', 'mdi', 'ph', 'lucide', 'tabler', 'heroicons']) assert.ok(packs.has(p), p)
})

test('a stroke that is not drawn does not count: inside defs, a clip path, or with the width at 0', () => {
  const wrap = (inner) => `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M1 1h4v4z"/>${inner}</svg>`
  assert.equal(markupHasStroke(wrap('<defs><path stroke="#000" d="M0 0h1"/></defs>')), false)
  assert.equal(markupHasStroke(wrap('<clipPath id="c"><path stroke="#000" d="M0 0h1"/></clipPath>')), false)
  assert.equal(markupHasStroke(wrap('<path stroke="#000" stroke-width="0" d="M0 0h1"/>')), false)
  assert.equal(markupHasStroke(wrap('<path stroke="#000" d="M0 0h1"/>')), true, 'positive control: the same path outside them strokes')
})
