// THE EMOJI GRID'S PHONE-LAG RULES, pinned on the atlas's public functions.
//
// 1. atlasPending(ch): a cell shows the quiet placeholder only while a bitmap is
//    really on its way. A glyph the worker ruled out (textOnly), a failed atlas
//    and a browser that cannot make bitmaps all keep their live text, because a
//    placeholder there would never be replaced.
// 2. A worker reply for glyphs no mounted cell shows must not notify the grid
//    (140 replies in one touch scroll used to re-render it 140 times), and trimming
//    must not notify either. A reply holding a mounted glyph notifies once.
// 3. Urgent chunks hold 24 glyphs and keep the order the grid gave them (nearest
//    the viewport first). nearestFirst does that ordering; every atlasWant call
//    rebuilds the urgent queue from its list, so a scroll reorders older jobs too.
// 4. Before the first measure a glyph is pending (cold load shows placeholders); a
//    measure that found no size (hidden grid) sends no job, so the cells fall back
//    to text, the grid is told, and a later successful measure restores the wait.
//
// The worker is the one thing outside our code, so it is faked: a Worker class
// that records what it was sent and lets the test hand back a reply.
import test from 'node:test'
import assert from 'node:assert/strict'

const REAL = { Worker: globalThis.Worker, OffscreenCanvas: globalThis.OffscreenCanvas }
const PATH = '../../src/components/library/emojiAtlas.js'

class FakeWorker {
  static all = []
  constructor() { this.sent = []; this.terminated = false; FakeWorker.all.push(this) }
  postMessage(msg) { this.sent.push(msg) }
  terminate() { this.terminated = true }
}
class FakeCanvas {}
FakeCanvas.prototype.convertToBlob = async () => new Blob(['x'])

const supportedBrowser = () => { globalThis.Worker = FakeWorker; globalThis.OffscreenCanvas = FakeCanvas }
const bareBrowser = () => { delete globalThis.Worker; delete globalThis.OffscreenCanvas }
test.after(() => {
  for (const [k, v] of Object.entries(REAL)) { if (v === undefined) delete globalThis[k]; else globalThis[k] = v }
})

// The module caches whether the browser is supported on first use, so each
// scenario gets its own copy of it.
let copies = 0
async function freshAtlas(browser) {
  browser()
  FakeWorker.all.length = 0
  return import(`${PATH}?copy=${++copies}`)
}

const CONFIG = { key: 'k', scale: 1, font: '24px x', fontSize: 24, advance: 24, baseline: 24, slotH: 36 }
const glyphs = (n, from = 0x1F600) => Array.from({ length: n }, (_, i) => String.fromCodePoint(from + i))

// A sprite reply for the job the worker was last sent.
function replyFor(worker, { text = [] } = {}) {
  const sent = worker.sent[worker.sent.length - 1]
  return { data: { gen: sent.gen, id: sent.id, blob: new Blob(['png']), rows: Math.ceil(sent.chars.length / 12), w: 432, h: 36, text } }
}

function quiet(mod) {
  // Subscribe once and count notifications; drop the idle timer so node can exit.
  let calls = 0
  mod.atlasSubscribe(() => { calls++ })
  clearTimeout(mod.atlas.idle)
  return () => calls
}

test('a glyph still waiting on its bitmap is pending', async () => {
  const m = await freshAtlas(supportedBrowser)
  assert.equal(m.atlasPending('\u{1F600}'), true)
})

test('a glyph the worker ruled out (textOnly) is not pending: it keeps its live text', async () => {
  const m = await freshAtlas(supportedBrowser)
  m.atlas.textOnly.add('\u{1F1E6}\u{1F1FA}')
  assert.equal(m.atlasPending('\u{1F1E6}\u{1F1FA}'), false)
  assert.equal(m.atlasPending('\u{1F600}'), true, 'only that glyph is ruled out')
})

test('nothing is pending once the atlas has failed', async () => {
  const m = await freshAtlas(supportedBrowser)
  m.atlas.failed = true
  assert.equal(m.atlasPending('\u{1F600}'), false)
})

test('nothing is pending where the browser cannot make bitmaps', async () => {
  const m = await freshAtlas(bareBrowser)
  assert.equal(m.atlasPending('\u{1F600}'), false)
})

test('a worker reply that rules a glyph out turns its cell from placeholder to text', async () => {
  const m = await freshAtlas(supportedBrowser)
  m.atlas.config = CONFIG
  const flag = '\u{1F1E6}\u{1F1FA}'
  m.atlasWant(['\u{1F600}', flag])
  assert.equal(m.atlasPending(flag), true)
  const w = FakeWorker.all[0]
  w.onmessage(replyFor(w, { text: [1] }))
  assert.equal(m.atlasPending(flag), false)
  assert.ok(m.atlas.sprites.has('\u{1F600}'))
})

test('a reply for glyphs no mounted cell shows installs the sprites but does not re-render the grid', async () => {
  const m = await freshAtlas(supportedBrowser)
  m.atlas.config = CONFIG
  const calls = quiet(m)
  m.atlasMounted(new Set(['\u{1F4A9}']))
  m.atlasWant(glyphs(3))
  const w = FakeWorker.all[0]
  const before = m.atlasVersion()
  w.onmessage(replyFor(w))
  assert.equal(calls(), 0, 'no notification')
  assert.equal(m.atlasVersion(), before, 'version unchanged')
  assert.ok(m.atlas.sprites.has(glyphs(1)[0]), 'a cell mounted later still finds its sprite')
})

test('a reply holding a mounted glyph re-renders the grid exactly once', async () => {
  const m = await freshAtlas(supportedBrowser)
  m.atlas.config = CONFIG
  const calls = quiet(m)
  m.atlasMounted(new Set([glyphs(3)[2]]))
  m.atlasWant(glyphs(3))
  const w = FakeWorker.all[0]
  const before = m.atlasVersion()
  w.onmessage(replyFor(w))
  assert.equal(calls(), 1)
  assert.equal(m.atlasVersion(), before + 1)
})

test('trimming sheets does not re-render the grid', async () => {
  const m = await freshAtlas(supportedBrowser)
  m.atlas.config = CONFIG
  const calls = quiet(m)
  const old = glyphs(4)
  m.atlasMounted(new Set(old))
  m.atlasWant(old)
  const w = FakeWorker.all[0]
  w.onmessage(replyFor(w))
  const seen = calls()
  assert.equal(m.atlas.sheets.length, 1)
  // A new skin tone: the sheet is stale and nothing mounted uses it any more.
  m.atlasTrim(new Set(), new Set(['\u{1F44D}']))
  assert.equal(m.atlas.sheets.length, 0, 'the stale sheet went')
  assert.equal(calls(), seen, 'and nobody was told')
})

test('urgent sheets hold 24 glyphs and keep the order the grid gave them', async () => {
  const m = await freshAtlas(supportedBrowser)
  m.atlas.config = CONFIG
  const want = glyphs(50)
  m.atlasWant(want)
  const w = FakeWorker.all[0]
  assert.equal(w.sent[0].chars.length, 24)
  assert.deepEqual(w.sent[0].chars, want.slice(0, 24), 'first sheet is the first (nearest) glyphs')
  assert.deepEqual(m.atlas.queue.map(j => j.chars.length), [24, 2])
  assert.deepEqual(m.atlas.queue[0].chars, want.slice(24, 48))
})

// ---- Nearest the viewport first -------------------------------------------

// Rows as the grid lays them out: { top, h } in the grid's own coordinates. The
// viewport here runs from 1000 to 1800.
const VIEW_TOP = 1000
const VIEW_H = 800
const row = (top, h = 40) => ({ top, h })

test('nearestFirst: rows inside the viewport lead, then above and below by how far they sit from it', async () => {
  const m = await freshAtlas(supportedBrowser)
  const [farAbove, nearAbove, straddlesTop, inside, nearBelow, farBelow] = glyphs(6)
  const cells = {
    chars: [farAbove, nearAbove, straddlesTop, inside, nearBelow, farBelow],
    rowOf: [row(100), row(850), row(980), row(1200), row(1900), row(3000)],
  }
  // gaps: 860, 110, 0 (its bottom edge is in view), 0, 100, 1200
  assert.deepEqual(m.nearestFirst(cells, VIEW_TOP, VIEW_H), [straddlesTop, inside, nearBelow, nearAbove, farAbove, farBelow])
})

test('nearestFirst: equal distance, and glyphs in the same row, keep their reading order', async () => {
  const m = await freshAtlas(supportedBrowser)
  const [a, b, c, d, e, f] = glyphs(6)
  // a and b share the row above (gap 100); c and d are in view; e is 100 below, f in view too.
  const cells = {
    chars: [a, b, c, d, e, f],
    rowOf: [row(860), row(860), row(1100), row(1100), row(1900), row(1500)],
  }
  assert.deepEqual(m.nearestFirst(cells, VIEW_TOP, VIEW_H), [c, d, f, a, b, e])
})

test('nearestFirst: a row above and a row below at the same distance keep reading order, and an empty list is fine', async () => {
  const m = await freshAtlas(supportedBrowser)
  const [above, below, view] = glyphs(3)
  const cells = { chars: [above, view, below], rowOf: [row(860), row(1100), row(1900)] }
  assert.deepEqual(m.nearestFirst(cells, VIEW_TOP, VIEW_H), [view, above, below])
  assert.deepEqual(m.nearestFirst({ chars: [], rowOf: [] }, VIEW_TOP, VIEW_H), [])
})

test('duplicate glyphs: nearestFirst keeps both, and the one nearest the viewport is the one atlasWant queues', async () => {
  const m = await freshAtlas(supportedBrowser)
  m.atlas.config = CONFIG
  const [dup, other, third] = glyphs(3)
  // dup sits far above AND in view; reading order puts the far one first.
  const cells = { chars: [dup, other, dup, third], rowOf: [row(100), row(1100), row(1200), row(3000)] }
  const sorted = m.nearestFirst(cells, VIEW_TOP, VIEW_H)
  assert.deepEqual(sorted, [other, dup, dup, third])
  m.atlasWant(sorted)
  assert.deepEqual(FakeWorker.all[0].sent[0].chars, [other, dup, third], 'each glyph is drawn once, at its nearest place')
})

// ---- The urgent queue follows the latest call ------------------------------

const queuedUrgent = (m) => m.atlas.queue.filter(j => j.urgent).flatMap(j => j.chars)

test('a later atlasWant puts glyphs now in view ahead of ones an older urgent job still holds', async () => {
  const m = await freshAtlas(supportedBrowser)
  m.atlas.config = CONFIG
  const all = glyphs(60)
  m.atlasWant(all)                 // first 24 are with the worker; [24..47] and [48..59] wait
  assert.deepEqual(m.atlas.queue.map(j => j.chars.length), [24, 12])
  // The user scrolled to the end: the last ten are now nearest.
  const scrolled = [...all.slice(50), ...all.slice(0, 50)]
  m.atlasWant(scrolled)
  assert.deepEqual(m.atlas.queue[0].chars.slice(0, 10), all.slice(50), 'the newly visible glyphs lead the next sheet')
  assert.deepEqual(queuedUrgent(m), [...all.slice(50), ...all.slice(24, 50)], 'rest follows in the new order, nothing doubled')
  assert.deepEqual(m.atlas.queue.map(j => j.chars.length), [24, 12])
  assert.equal(m.atlas.current.chars.length, 24, 'the job in flight is left alone')
})

test('a glyph that left the view drops out of the urgent jobs, and a call with nothing missing clears them', async () => {
  const m = await freshAtlas(supportedBrowser)
  m.atlas.config = CONFIG
  const all = glyphs(60)
  m.atlasWant(all)
  m.atlasWant(all.slice(55))
  assert.deepEqual(queuedUrgent(m), all.slice(55))
  m.atlasWant([])
  assert.deepEqual(queuedUrgent(m), [], 'nothing in view, nothing urgent')
})

test('rebuilding the urgent jobs leaves the background queue alone, minus glyphs now urgent', async () => {
  const m = await freshAtlas(supportedBrowser)
  m.atlas.config = CONFIG
  const [busy, ...rest] = glyphs(40)
  m.atlasWant([busy])              // in flight
  m.atlas.queue.push({ id: 900, urgent: false, chars: rest })
  m.atlasWant([rest[3], rest[1]])
  assert.deepEqual(m.atlas.queue[0].chars, [rest[3], rest[1]])
  assert.equal(m.atlas.queue[0].urgent, true)
  const bg = m.atlas.queue.find(j => !j.urgent)
  assert.deepEqual(bg.chars, rest.filter(ch => ch !== rest[1] && ch !== rest[3]))
})

// ---- A measure that finds nothing ------------------------------------------

// A stand-in for the cell the atlas measures. `height` 0 is a grid that is hidden
// or not laid out yet.
function withDom(height, run) {
  const span = {
    firstElementChild: { getBoundingClientRect: () => ({ bottom: 20 }) },
    getBoundingClientRect: () => ({ top: 0, height, width: 24 }),
  }
  globalThis.document = { createElement: () => ({ style: {}, setAttribute() {}, firstChild: span }) }
  globalThis.getComputedStyle = () => ({ fontSize: height ? '24px' : '0px', fontFamily: 'x' })
  globalThis.window = { devicePixelRatio: 1 }
  try { return run({ appendChild() {}, removeChild() {} }) } finally {
    delete globalThis.document
    delete globalThis.getComputedStyle
    delete globalThis.window
  }
}

test('before any measure a cell is pending (the cold load shows placeholders, not 120 text cells)', async () => {
  const m = await freshAtlas(supportedBrowser)
  assert.equal(m.atlas.config, null)
  assert.equal(m.atlasPending('\u{1F600}'), true)
})

test('a measure that finds no size sends no job, so cells fall back to text and the grid is told once', async () => {
  const m = await freshAtlas(supportedBrowser)
  const calls = quiet(m)
  withDom(0, host => { m.atlasConfigure(host); m.atlasConfigure(host) })
  assert.equal(m.atlas.config, null)
  m.atlasWant(glyphs(3))
  assert.equal(FakeWorker.all.length, 0, 'no worker, no job')
  assert.equal(m.atlasPending('\u{1F600}'), false, 'not stuck as a placeholder')
  assert.equal(calls(), 1, 'one notification, so the grid re-renders its cells as text; the second miss adds none')
})

test('a later measure that succeeds turns the cells back into waiting placeholders and draws', async () => {
  const m = await freshAtlas(supportedBrowser)
  const calls = quiet(m)
  withDom(0, host => m.atlasConfigure(host))
  assert.equal(m.atlasPending('\u{1F600}'), false)
  const before = calls()
  withDom(24, host => m.atlasConfigure(host))
  assert.ok(m.atlas.config, 'measured this time')
  assert.equal(m.atlasPending('\u{1F600}'), true, 'a bitmap is on its way again')
  assert.ok(calls() > before, 'the grid is told, so it re-renders and asks for sheets')
  m.atlasWant(glyphs(2))
  assert.equal(FakeWorker.all[0].sent[0].chars.length, 2)
})

test('a glyph the worker ruled out stays text whether or not a measure failed', async () => {
  const m = await freshAtlas(supportedBrowser)
  withDom(0, host => m.atlasConfigure(host))
  m.atlas.textOnly.add('\u{1F1E6}\u{1F1FA}')
  assert.equal(m.atlasPending('\u{1F1E6}\u{1F1FA}'), false)
})
