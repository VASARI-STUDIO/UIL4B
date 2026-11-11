// A SHEET THE BROWSER CANNOT DECODE GIVES ITS EMOJI BACK AS TEXT.
//
// A cell with a bitmap hides its text (`has-bitmap`), so a sheet that paints
// nothing leaves blank tiles. atlasSheetFailed is what the decode probe calls:
// it must remove the sprites, mark the glyphs text-only (so they are neither
// pending nor queued again) and tell the grid when a mounted cell is affected.
//
// MUTATION: delete the `atlas.textOnly.add(ch)` or the `atlas.sprites.delete(ch)`
// line in atlasSheetFailed (src/components/library/emojiAtlas.js) and the first
// test goes red; delete the `badSheets` check and the third goes red.
import test from 'node:test'
import assert from 'node:assert/strict'

const REAL = { Worker: globalThis.Worker, OffscreenCanvas: globalThis.OffscreenCanvas }
class FakeWorker {
  static all = []
  constructor() { this.sent = []; FakeWorker.all.push(this) }
  postMessage(msg) { this.sent.push(msg) }
  terminate() {}
}
class FakeCanvas {}
FakeCanvas.prototype.convertToBlob = async () => new Blob(['x'])
test.after(() => {
  for (const [k, v] of Object.entries(REAL)) { if (v === undefined) delete globalThis[k]; else globalThis[k] = v }
})

let copies = 0
async function freshAtlas() {
  globalThis.Worker = FakeWorker
  globalThis.OffscreenCanvas = FakeCanvas
  FakeWorker.all.length = 0
  const m = await import(`../../src/components/library/emojiAtlas.js?sheet=${++copies}`)
  m.atlas.config = { key: 'k', scale: 1, font: '24px x', fontSize: 24, advance: 24, baseline: 24, slotH: 36 }
  return m
}
const glyphs = (n, from = 0x1F600) => Array.from({ length: n }, (_, i) => String.fromCodePoint(from + i))

// Install one sheet for `chars` the way a worker reply does, and return it.
function installSheet(m, chars) {
  m.atlasWant(chars)
  const w = FakeWorker.all[FakeWorker.all.length - 1]
  const sent = w.sent[w.sent.length - 1]
  w.onmessage({ data: { gen: sent.gen, id: sent.id, blob: new Blob(['png']), rows: 1, w: 432, h: 36, text: [] } })
  return m.atlas.sheets[m.atlas.sheets.length - 1]
}

test('a failed sheet turns its glyphs back into text', async () => {
  const m = await freshAtlas()
  const chars = glyphs(3)
  const sheet = installSheet(m, chars)
  assert.ok(m.atlas.sprites.has(chars[0]), 'the sprite is there before the failure')
  m.atlasSheetFailed(sheet)
  for (const ch of chars) {
    assert.equal(m.atlas.sprites.has(ch), false, 'sprite removed, so the cell loses has-bitmap')
    assert.equal(m.atlasPending(ch), false, 'not pending: the cell shows its text')
  }
  assert.equal(m.atlas.sheets.length, 0)
  assert.equal(m.atlas.bytes, 0)
})

test('only a failure that touches a mounted glyph re-renders the grid', async () => {
  const m = await freshAtlas()
  let calls = 0
  m.atlasSubscribe(() => { calls++ })
  clearTimeout(m.atlas.idle)
  const chars = glyphs(3)
  const sheet = installSheet(m, chars)
  m.atlasMounted(new Set(['\u{1F4A9}']))
  m.atlasSheetFailed(sheet)
  assert.equal(calls, 0, 'nothing on screen used that sheet')

  const second = installSheet(m, glyphs(3, 0x1F680))
  m.atlasMounted(new Set([glyphs(3, 0x1F680)[1]]))
  const before = calls
  m.atlasSheetFailed(second)
  assert.equal(calls, before + 1, 'a mounted glyph went back to text: the grid is told once')
})

test('a sheet already dropped on purpose is not a failure, and repeated failures end the atlas', async () => {
  const m = await freshAtlas()
  const gone = installSheet(m, glyphs(2))
  m.atlas.sheets = []
  m.atlasSheetFailed(gone)
  assert.equal(m.atlas.badSheets, 0, 'a revoked blob URL is not counted')

  for (let i = 0; i < 3; i++) m.atlasSheetFailed(installSheet(m, glyphs(2, 0x1F300 + i * 10)))
  assert.equal(m.atlas.failed, true, 'three undecodable sheets: the browser cannot be trusted with sheets')
})
