import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PAIR_HISTORY_MAX, headingCategoriesFor, pairIsAllowed, popPairHistory, pushPairHistory,
  shufflePair, swapPair,
} from '../../src/utils/fontPairing.js'
import {
  bodyFaceWeights, buildFontImportUrl, describePairImport, familyAxis, pairImportFamilies,
} from '../../src/utils/fontImport.js'

const mk = (family, category, variants, popularity, extra = {}) => ({ family, category, variants, popularity, ...extra })
const catalogue = [
  mk('Inter', 'sans-serif', [100, 400, 600, 700, 900], 0, { italics: true }),
  mk('Roboto', 'sans-serif', [100, 400, 700, 900], 1, { italics: true }),
  mk('Open Sans', 'sans-serif', [300, 400, 600, 700], 2, { italics: true }),
  mk('Montserrat', 'sans-serif', [100, 400, 700, 900], 3),
  mk('Playfair Display', 'serif', [400, 700, 900], 4, { italics: true }),
  mk('Merriweather', 'serif', [300, 400, 700], 5, { italics: true }),
  mk('Lora', 'serif', [400, 500, 700], 6),
  mk('Lobster', 'display', [400], 7),
  mk('JetBrains Mono', 'monospace', [400, 700], 8),
]
const by = (name) => catalogue.find((f) => f.family === name)

// A seeded generator, so a failure names its seed and replays.
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }

test('shuffle never returns one family twice, whatever is locked', () => {
  for (const lock of [null, 'heading', 'body']) {
    for (let seed = 1; seed <= 200; seed += 1) {
      for (const [h, b] of [['Inter', 'Roboto'], ['Playfair Display', 'Inter'], ['JetBrains Mono', 'Lora']]) {
        const out = shufflePair(catalogue, { heading: by(h), body: by(b), lock, random: seeded(seed) })
        assert.ok(out, `lock ${lock} seed ${seed}: nothing returned`)
        assert.notEqual(out.heading.family, out.body.family, `lock ${lock} seed ${seed}: one family twice`)
      }
    }
  }
})

test('shuffle keeps the locked side and moves the other', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const a = shufflePair(catalogue, { heading: by('Playfair Display'), body: by('Inter'), lock: 'heading', random: seeded(seed) })
    assert.equal(a.heading.family, 'Playfair Display')
    assert.notEqual(a.body.family, 'Inter')
    assert.deepEqual(a.changed, ['body'])

    const b = shufflePair(catalogue, { heading: by('Playfair Display'), body: by('Inter'), lock: 'body', random: seeded(seed) })
    assert.equal(b.body.family, 'Inter')
    assert.notEqual(b.heading.family, 'Playfair Display')
    assert.deepEqual(b.changed, ['heading'])
  }
})

test('shuffle obeys the pairing rules in all three modes', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    for (const lock of [null, 'heading', 'body']) {
      const out = shufflePair(catalogue, { heading: by('Playfair Display'), body: by('Inter'), lock, random: seeded(seed) })
      assert.ok(pairIsAllowed(out.heading, out.body), `lock ${lock} seed ${seed}: ${out.heading.family} + ${out.body.family} breaks the rules`)
      assert.ok(out.reason.length > 20, 'the draw carries its reason')
    }
  }
})

test('a locked body only gets headings whose rules offer that body', () => {
  // Nothing but a serif heading takes a monospace body.
  assert.deepEqual(headingCategoriesFor('monospace'), ['serif'])
  for (let seed = 1; seed <= 100; seed += 1) {
    const out = shufflePair(catalogue, { heading: by('Inter'), body: by('JetBrains Mono'), lock: 'body', random: seeded(seed) })
    assert.equal(out.heading.category, 'serif')
  }
})

test('both locked draws nothing, and an empty catalogue draws nothing', () => {
  assert.equal(shufflePair(catalogue, { heading: by('Inter'), body: by('Lora'), lock: 'both' }), null)
  assert.equal(shufflePair([], { heading: by('Inter'), body: by('Lora') }), null)
})

test('a catalogue of one family cannot make a pair', () => {
  const one = [mk('Inter', 'sans-serif', [400, 700], 0)]
  assert.equal(shufflePair(one, { heading: one[0], body: one[0], lock: null }), null)
  assert.equal(shufflePair(one, { heading: one[0], body: one[0], lock: 'heading' }), null)
})

test('undo steps back through the pairs, newest first, and is capped', () => {
  const s = (n) => ({ headingName: `H${n}`, bodyName: `B${n}`, headingW: 700, bodyW: 400 })
  let stack = []
  stack = pushPairHistory(stack, s(1))
  stack = pushPairHistory(stack, s(2))
  stack = pushPairHistory(stack, s(2)) // a repeat of the top is not a step
  assert.equal(stack.length, 2)
  const first = popPairHistory(stack)
  assert.equal(first.snapshot.headingName, 'H2')
  const second = popPairHistory(first.rest)
  assert.equal(second.snapshot.headingName, 'H1')
  assert.equal(popPairHistory(second.rest).snapshot, null)

  let long = []
  for (let i = 0; i < PAIR_HISTORY_MAX + 10; i += 1) long = pushPairHistory(long, s(i))
  assert.equal(long.length, PAIR_HISTORY_MAX)
  assert.equal(long[long.length - 1].headingName, `H${PAIR_HISTORY_MAX + 9}`)
})

test('swap exchanges the families and gives each its own default weight', () => {
  const out = swapPair(by('Playfair Display'), by('Inter'))
  assert.deepEqual(out, { headingName: 'Inter', bodyName: 'Playfair Display', headingW: 700, bodyW: 400 })
  // Twice is back where it started.
  const back = swapPair(by('Inter'), by('Playfair Display'))
  assert.equal(back.headingName, 'Playfair Display')
  assert.equal(back.bodyName, 'Inter')
  assert.equal(swapPair(null, by('Inter')), null)
})

test('the import asks for the regular, button and bold weights, and the italic', () => {
  const w = bodyFaceWeights(by('Inter'), 400)
  assert.deepEqual(w.upright, [400, 600, 700])
  assert.deepEqual(w.italic, [400])
  assert.equal(w.buttons, 600)

  // No 600: the button weight is the bold one, so it never falls to a faux bold.
  const roboto = bodyFaceWeights(by('Roboto'), 400)
  assert.deepEqual(roboto.upright, [400, 700])
  assert.equal(roboto.buttons, 700)

  // No italics in the catalogue, none asked for. No real bold, none invented.
  const lora = bodyFaceWeights(by('Lora'), 400)
  assert.deepEqual(lora.italic, [])
  assert.deepEqual(lora.upright, [400, 700])
  assert.deepEqual(bodyFaceWeights(by('Lobster'), 400).upright, [400])
})

test('the import URL carries the heading weight, the body set and the ital axis', () => {
  const fams = pairImportFamilies(by('Playfair Display'), 700, by('Inter'), 400)
  const url = buildFontImportUrl(fams)
  assert.equal(
    url,
    'https://fonts.googleapis.com/css2?family=Playfair%20Display:wght@700&family=Inter:ital,wght@0,400;0,600;0,700;1,400&display=swap',
  )
  assert.equal(familyAxis([700, 400]), 'wght@400;700')
  assert.match(describePairImport(fams), /Inter 400, 600, 700 and 400 italic/)
  // A pair that is one family (it should not happen) is one entry, not two.
  assert.equal(pairImportFamilies(by('Inter'), 700, by('Inter'), 400).length, 1)
})
