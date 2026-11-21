// The Image tab's still editor: output sizes for Fit, Fill and Stretch, turn and
// flip, the crop box, the rounded-corner mask and the edit list's words.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STILL_DEFAULTS, STILL_SPEC, applyMatrix, clampRadius, cleanSide, cropRect, drawStill, insideRounded,
  orientMatrix, orientedSize, planStill, reorientBox, roundedRectPath, scalePlan,
} from '../../src/utils/stillEdit.js'
import {
  canUndo, changedEditNames, describeEdits, record, startHistory, undo,
} from '../../src/utils/editHistory.js'

const plan = (o) => planStill({ srcW: 1024, srcH: 768, ...o })

test('Fill 1024x768 into 400x400 covers the square from the middle', () => {
  const p = plan({ outW: 400, outH: 400, fit: 'fill' })
  assert.deepEqual([p.w, p.h], [400, 400])
  assert.deepEqual(p.dest, { x: 0, y: 0, w: 400, h: 400 })
  assert.deepEqual(p.src, { x: 128, y: 0, w: 768, h: 768 })
})

test('Fit keeps the whole picture and centres it with bars', () => {
  const p = plan({ outW: 400, outH: 400, fit: 'fit' })
  assert.deepEqual([p.w, p.h], [400, 400])
  assert.deepEqual(p.dest, { x: 0, y: 50, w: 400, h: 300 })
  assert.deepEqual(p.src, { x: 0, y: 0, w: 1024, h: 768 })
})

test('Stretch fills the size and distorts', () => {
  const p = plan({ outW: 400, outH: 100, fit: 'stretch' })
  assert.deepEqual(p.dest, { x: 0, y: 0, w: 400, h: 100 })
  assert.deepEqual(p.src, { x: 0, y: 0, w: 1024, h: 768 })
})

test('one typed side follows the picture\'s proportions, whatever the fit', () => {
  for (const fit of ['fit', 'fill', 'stretch']) {
    assert.deepEqual(plan({ outW: 512, fit }).dest, { x: 0, y: 0, w: 512, h: 384 })
    assert.deepEqual(plan({ outH: 384, fit }).dest, { x: 0, y: 0, w: 512, h: 384 })
  }
})

test('no typed size falls back to the size limit and export scale', () => {
  const p = plan({ maxDim: 512, renderScale: 2 })
  assert.deepEqual([p.w, p.h, p.exact, p.capped], [512, 384, false, true])
  assert.deepEqual([plan({}).w, plan({}).h], [1024, 768])
})

test('a quarter turn swaps the picture\'s sides before sizing', () => {
  assert.deepEqual(orientedSize(1024, 768, 90), { w: 768, h: 1024 })
  assert.deepEqual(orientedSize(1024, 768, 180), { w: 1024, h: 768 })
  const p = plan({ turn: 270 })
  assert.deepEqual([p.w, p.h], [768, 1024])
})

test('typed sides are cleaned to whole numbers, 0 meaning "work it out"', () => {
  assert.equal(cleanSide('400.4'), 400)
  assert.equal(cleanSide(''), 0)
  assert.equal(cleanSide(-5), 0)
  assert.equal(cleanSide(99999), 16384)
})

test('turn and flip move each corner of the picture where it should go', () => {
  const W = 40
  const H = 20
  const at = (turn, flipH, flipV, x, y) => applyMatrix(orientMatrix(W, H, turn, flipH, flipV), x, y)
  assert.deepEqual(at(0, false, false, 0, 0), { x: 0, y: 0 })
  assert.deepEqual(at(90, false, false, 0, 0), { x: 20, y: 0 })
  assert.deepEqual(at(90, false, false, 40, 20), { x: 0, y: 40 })
  assert.deepEqual(at(180, false, false, 0, 0), { x: 40, y: 20 })
  assert.deepEqual(at(270, false, false, 0, 0), { x: 0, y: 40 })
  assert.deepEqual(at(0, true, false, 0, 0), { x: 40, y: 0 })
  assert.deepEqual(at(0, false, true, 0, 0), { x: 0, y: 20 })
  assert.deepEqual(at(90, true, false, 0, 0), { x: 0, y: 0 })
  // every combination keeps the picture inside its turned size
  for (const turn of [0, 90, 180, 270]) {
    for (const flipH of [false, true]) {
      for (const flipV of [false, true]) {
        const o = orientedSize(W, H, turn)
        for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) {
          const p = at(turn, flipH, flipV, x, y)
          assert.ok(p.x >= 0 && p.x <= o.w && p.y >= 0 && p.y <= o.h, `${turn} ${flipH} ${flipV}`)
        }
      }
    }
  }
})

test('turning the picture turns the crop box with it', () => {
  const none = { turn: 0, flipH: false, flipV: false }
  const right = { turn: 90, flipH: false, flipV: false }
  const box = { x: 0, y: 0, w: 10, h: 4 }
  assert.deepEqual(reorientBox(box, 40, 20, none, right), { x: 16, y: 0, w: 4, h: 10 })
  assert.deepEqual(reorientBox(reorientBox(box, 40, 20, none, right), 40, 20, right, none), box)
  assert.deepEqual(reorientBox(box, 40, 20, none, { turn: 0, flipH: true, flipV: false }), { x: 30, y: 0, w: 10, h: 4 })
  assert.equal(reorientBox(null, 40, 20, none, right), null)
})

test('the crop box applies as the same relative area to any picture', () => {
  const box = { x: 100, y: 50, w: 200, h: 100 }
  assert.deepEqual(cropRect(box, 400, 200, 400, 200), { x: 100, y: 50, w: 200, h: 100 })
  assert.deepEqual(cropRect(box, 400, 200, 800, 400), { x: 200, y: 100, w: 400, h: 200 })
  assert.deepEqual(cropRect(null, 400, 200, 800, 400), { x: 0, y: 0, w: 800, h: 400 })
  const crop = cropRect(box, 400, 200, 800, 400)
  const p = planStill({ srcW: 800, srcH: 400, crop, outW: 100, outH: 100, fit: 'fill' })
  assert.deepEqual(p.src, { x: 300, y: 100, w: 200, h: 200 })
})

test('the corner mask clears the corners and keeps the middle', () => {
  const w = 400
  const h = 400
  const r = 24
  assert.equal(insideRounded(0, 0, w, h, r), false)
  assert.equal(insideRounded(w - 1, 0, w, h, r), false)
  assert.equal(insideRounded(0, h - 1, w, h, r), false)
  assert.equal(insideRounded(w - 1, h - 1, w, h, r), false)
  assert.equal(insideRounded(200, 200, w, h, r), true)
  assert.equal(insideRounded(200, 0, w, h, r), true) // straight edges stay
  assert.equal(insideRounded(0, 200, w, h, r), true)
  assert.equal(insideRounded(24, 24, w, h, r), true) // on the arc's own centre
  assert.equal(insideRounded(3, 3, w, h, r), false)
  assert.equal(insideRounded(0, 0, w, h, 0), true) // no radius, no mask
})

test('the corner radius is a whole number, never more than half the short side', () => {
  assert.equal(clampRadius(24, 400, 400), 24)
  assert.equal(clampRadius(24.6, 400, 400), 25)
  assert.equal(clampRadius(500, 400, 200), 100)
  assert.equal(clampRadius(-3, 400, 400), 0)
  assert.equal(clampRadius('x', 400, 400), 0)
})

// A context that only writes down what it was asked to do.
function fakeContext() {
  const calls = []
  const ctx = {}
  for (const name of ['save', 'restore', 'beginPath', 'closePath', 'moveTo', 'arcTo', 'rect', 'clip', 'fillRect', 'setTransform', 'drawImage']) {
    ctx[name] = (...args) => calls.push([name, ...args])
  }
  return { ctx, calls }
}

test('the rounded corner path has four arcs and the clip follows it', () => {
  const { ctx, calls } = fakeContext()
  roundedRectPath(ctx, 400, 400, 24)
  assert.equal(calls.filter(c => c[0] === 'arcTo').length, 4)
  assert.deepEqual(calls[1], ['moveTo', 24, 0])
})

test('drawStill sends each picture corner to where the turned, cut picture puts it', () => {
  const W = 60
  const H = 30
  for (const turn of [0, 90, 180, 270]) {
    for (const flipH of [false, true]) {
      for (const flipV of [false, true]) {
        const o = orientedSize(W, H, turn)
        const crop = { x: 5, y: 2, w: o.w - 10, h: o.h - 4 }
        const p = planStill({ srcW: W, srcH: H, turn, crop, outW: 40, outH: 40, fit: 'stretch' })
        const { ctx, calls } = fakeContext()
        drawStill(ctx, {}, W, H, p, { turn, flipH, flipV, radius: 0 })
        const t = calls.find(c => c[0] === 'setTransform').slice(1)
        const m = orientMatrix(W, H, turn, flipH, flipV)
        for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) {
          const q = applyMatrix(m, x, y)
          const want = { x: ((q.x - crop.x) * 40) / crop.w, y: ((q.y - crop.y) * 40) / crop.h }
          const got = { x: t[0] * x + t[2] * y + t[4], y: t[1] * x + t[3] * y + t[5] }
          assert.ok(Math.abs(got.x - want.x) < 1e-9 && Math.abs(got.y - want.y) < 1e-9, `${turn} ${flipH} ${flipV} at ${x},${y}`)
        }
      }
    }
  }
})

test('drawStill rounds the corners only when asked, and fills behind for JPEG', () => {
  const p = planStill({ srcW: 100, srcH: 100, outW: 50, outH: 50 })
  let { ctx, calls } = fakeContext()
  drawStill(ctx, {}, 100, 100, p, { radius: 0, background: '#ffffff' })
  assert.equal(calls.filter(c => c[0] === 'arcTo').length, 0)
  assert.deepEqual(calls.find(c => c[0] === 'fillRect'), ['fillRect', 0, 0, 50, 50])
  ;({ ctx, calls } = fakeContext())
  drawStill(ctx, {}, 100, 100, p, { radius: 8 })
  assert.equal(calls.filter(c => c[0] === 'arcTo').length, 4)
  assert.equal(calls.some(c => c[0] === 'fillRect'), false)
})

test('scaling a plan keeps its proportions and never makes a side 0', () => {
  const p = plan({ outW: 400, outH: 400, fit: 'fit' })
  const s = scalePlan(p, 0.5)
  assert.deepEqual([s.w, s.h], [200, 200])
  assert.deepEqual(s.dest, { x: 0, y: 25, w: 200, h: 150 })
  assert.equal(scalePlan(p, 1), p)
  assert.equal(scalePlan(plan({ outW: 4, outH: 4 }), 0.01).w, 1)
})

// ── The edit list ────────────────────────────────────────────────────────────

test('the still edit list says what was done, in a fixed order', () => {
  const said = (change) => describeEdits({ ...STILL_DEFAULTS, ...change }, STILL_SPEC)
  assert.deepEqual(said({}), [])
  assert.deepEqual(said({ turn: 90, flipH: true }), ['Turned 90° right', 'Flipped horizontally'])
  assert.deepEqual(said({ outW: 400, outH: 400, fit: 'fill', radius: 24 }), ['Sized to 400×400, filled', 'Corners rounded 24 px'])
  assert.deepEqual(said({ outW: 800 }), ['Sized to 800 px wide'])
  assert.deepEqual(said({ box: { x: 0, y: 0, w: 2, h: 2 } }), ['Cropped'])
})

test('a still recipe undoes one step at a time, and a radius drag is one step', () => {
  let h = startHistory(STILL_DEFAULTS)
  h = record(h, { ...h.present, turn: 90 }, 0, STILL_SPEC)
  h = record(h, { ...h.present, outW: 400 }, 1000, STILL_SPEC)
  h = record(h, { ...h.present, radius: 4 }, 2000, STILL_SPEC)
  h = record(h, { ...h.present, radius: 8 }, 2100, STILL_SPEC)
  h = record(h, { ...h.present, radius: 12 }, 2200, STILL_SPEC)
  assert.equal(h.past.length, 3)
  h = undo(h)
  assert.equal(h.present.radius, 0)
  assert.equal(h.present.outW, 400)
  assert.deepEqual(changedEditNames({ ...STILL_DEFAULTS, outW: 400 }, STILL_DEFAULTS, STILL_SPEC), ['size'])
  assert.ok(canUndo(h))
})

test('the Video tab\'s history is unchanged when no spec is given', () => {
  const h = record(startHistory({ trimStart: 0, trimEnd: null, turn: 0 }), { trimStart: 0, trimEnd: null, turn: 90 }, 0)
  assert.equal(h.past.length, 1)
  assert.deepEqual(describeEdits({ turn: 90, flipH: false, flipV: false, shape: 'original', cut: 'none', speed: 1, direction: 'forward', trimStart: 0, trimEnd: null }), ['Turned 90° right'])
})
