// Every gallery gate's copy is built from live counts, never typed.
//
// To see it fail: type a number into a heading or body in src/data/galleryGateCopy.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import { GALLERY_GATE_COPY } from '../../src/data/galleryGateCopy.js'

// Counts no real library holds, so a typed number cannot pass by coincidence.
const SHOWN = 7311
const TOTAL = 9127
const OPENS = 8419
const MORE = TOTAL - SHOWN

for (const name of ['palettes', 'gradients', 'iconGroups', 'prompts']) {
  test(`${name}: the signed-out gate states the counts it is given`, () => {
    const { anon } = GALLERY_GATE_COPY[name]
    assert.match(anon.heading(OPENS), /^Log in to access 8,419 /)
    const body = anon.body(SHOWN, TOTAL, OPENS)
    assert.match(body, /^You're seeing 7,311 of the 9,127 /)
    assert.ok(body.includes('A free account opens 8,419'), body)
    assert.equal(anon.action, 'Log in')
    assert.equal(anon.secondary, 'See the plans')
  })

  test(`${name}: the Pro gate states the counts it is given and links to the plans`, () => {
    const { pro } = GALLERY_GATE_COPY[name]
    assert.equal(pro.heading(MORE), `Pro opens 1,816 more ${pro.heading(MORE).split(' ').slice(4).join(' ')}`)
    const body = pro.body(SHOWN, TOTAL, MORE)
    assert.ok(body.includes('7,311 of the 9,127') && body.includes('remaining 1,816'), body)
    assert.equal(pro.action, 'See what Pro includes')
  })

  test(`${name}: one item reads as a singular`, () => {
    const { anon, pro } = GALLERY_GATE_COPY[name]
    assert.doesNotMatch(anon.heading(1), /s$/)
    assert.doesNotMatch(pro.heading(1), /s$/)
  })
}

test('palettes: a collection emptied by the cap names the live counts', () => {
  const { emptied } = GALLERY_GATE_COPY.palettes
  assert.match(emptied.anon.body('Curated', OPENS, TOTAL), /^No curated palettes are open signed out\. A free account opens 8,419 of the 9,127 palettes; Pro opens all 9,127\.$/)
  assert.equal(emptied.pro.heading('Brand'), 'Brand palettes are part of Pro')
  assert.equal(emptied.pro.body({ anonymous: true, total: TOTAL, locked: MORE, brand: true }), 'Pro opens all 9,127 palettes, brand systems included.')
  assert.equal(emptied.pro.body({ anonymous: false, total: TOTAL, locked: MORE, brand: true }), 'Another 1,816 palettes open with Pro, including every brand system.')
  assert.equal(emptied.pro.body({ anonymous: false, total: TOTAL, locked: 1, brand: false }), 'Another 1 palette opens with Pro.')
})

test('icon groups: a locked group names its own icon count and sets', () => {
  const { locked } = GALLERY_GATE_COPY.iconGroups
  assert.equal(locked.pro.heading('Commerce'), 'Commerce is Pro')
  assert.equal(locked.pro.body(24, 'Solar · Phosphor'), '24 icons from Solar · Phosphor. Pro opens it.')
  assert.equal(locked.free.heading('Commerce'), 'Commerce needs a free account')
  assert.equal(locked.free.body(1, 'Solar'), '1 icon from Solar. A free account opens it.')
})
