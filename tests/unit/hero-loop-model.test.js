// The hero loop's pure logic: which size a width gets, and the Next chain the
// timeline tables give. Neither needs a browser.
//
// The size panels' timelines live in JSX, so the chain is checked on a timeline
// built from the shared chapter config (loopData.js): one row per beat that
// config names, in the order the loop plays them. A chapter or step renamed in
// the config moves the chain, and this test with it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { loopSizeFor, LOOP_SIZES } from '../../src/components/home/heroLoopSize.js'
import { buildLoopModel } from '../../src/components/home/hero-loop/loopModel.js'
import { CHAPTERS, EXTRA_STEPS, SETTLE } from '../../src/components/home/hero-loop/loopData.js'

// Beats in play order: Palette, Icons, Type (its Type scale step inside it), Alt text, Export, then the seam.
const ORDER = ['p0', 'h5', 'enter3', 'h16', 'enter1', 'enter2', 'h11', 'enter6', 'h6c', 'pExp', 'guide', 'pEnd']
const timeline = () => ORDER.map((beat, i) => [0, beat, 400, 100 + i * 40, 100, 0])
const modelOf = (extra = {}) => buildLoopModel({ timeline: timeline(), chapters: CHAPTERS, extraSteps: EXTRA_STEPS, settle: SETTLE, ...extra })

// The next stop's name from each beat, following Next until it runs out.
function chainFrom(model, beat) {
  const names = []
  let k = model.IDX[beat]
  for (let step = model.nextStep(k); step; step = model.nextStep(k)) {
    names.push(step.name)
    k = step.k
  }
  return names
}

test('the test timeline holds every beat the shared config names', () => {
  const model = modelOf()
  for (const c of CHAPTERS) {
    assert.ok(model.IDX[c.first] != null, `${c.name} first beat ${c.first}`)
    assert.ok(model.IDX[c.end] != null, `${c.name} end beat ${c.end}`)
  }
  for (const s of EXTRA_STEPS) assert.ok(model.IDX[s.beat] != null, `${s.name} beat ${s.beat}`)
})

test('Next reads Icons, Type, Type scale, Alt text, Export, then nothing', () => {
  const model = modelOf()
  assert.deepEqual(chainFrom(model, 'p0'), ['Icons', 'Type', 'Type scale', 'Alt text', 'Export'])
  assert.equal(model.nextStep(model.IDX.pExp), null)
  assert.equal(model.nextStep(model.IDX.guide), null)
})

test('Next from the middle of a chapter goes to the step after it', () => {
  const model = modelOf()
  assert.equal(model.nextStep(model.IDX.h5).name, 'Icons')
  assert.equal(model.nextStep(model.IDX.enter1).name, 'Type scale')
  assert.equal(model.nextStep(model.IDX.h11).name, 'Alt text')
})

test('the seam counts as the opening frame, so Next from it goes to Icons', () => {
  const model = modelOf()
  assert.equal(model.nextStep(model.LAST).name, 'Icons')
})

test('the chapters are the five the panel lists, in order, and Type scale is a step, not a chapter', () => {
  assert.deepEqual(CHAPTERS.map((c) => c.name), ['Palette', 'Icons', 'Type', 'Alt text', 'Export'])
  assert.deepEqual(EXTRA_STEPS.map((s) => s.name), ['Type scale'])
  assert.equal(CHAPTERS[SETTLE].name, 'Export')
})

test('a size\'s cursor-speed factor scales travel time and nothing else', () => {
  const base = modelOf()
  const slow = modelOf({ moveK: 1.07 })
  const k = base.IDX.h5
  assert.equal(slow.moveMs(k), Math.round(Math.min(900, (320 + base.travel(k) * 0.6) * 1.07)))
  assert.deepEqual(slow.FIRST, base.FIRST)
  assert.deepEqual(slow.END, base.END)
})

// Each width belongs to exactly one size.
const EDGES = [
  [0, 'phone'], [390, 'phone'], [767, 'phone'],
  [768, 'tablet'], [1024, 'tablet'], [1199, 'tablet'],
  [1200, 'wide'], [1300, 'wide'], [1439, 'wide'],
  [1440, 'large'], [1920, 'large'], [4000, 'large'],
]

test('each width maps to the size its range names', () => {
  for (const [width, size] of EDGES) assert.equal(loopSizeFor(width), size, `${width}px`)
})

test('every width from 0 to 3000 maps to a known size, and sizes only step up as the width grows', () => {
  const rank = { phone: 0, tablet: 1, wide: 2, large: 3 }
  let last = 0
  for (let width = 0; width <= 3000; width++) {
    const size = loopSizeFor(width)
    assert.ok(size in LOOP_SIZES, `${width}px gave ${size}`)
    assert.ok(rank[size] >= last, `${width}px went back to ${size}`)
    last = rank[size]
  }
  assert.deepEqual(new Set(Array.from({ length: 3001 }, (_, w) => loopSizeFor(w))), new Set(Object.keys(LOOP_SIZES)))
})

test('each size draws in a frame that grows with its width range', () => {
  const { phone, tablet, wide, large } = LOOP_SIZES
  assert.ok(phone.width < tablet.width && tablet.width < wide.width && wide.width < large.width)
  assert.ok(large.height > wide.height)
})
