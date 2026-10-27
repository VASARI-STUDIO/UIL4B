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
//    the viewport first).
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
