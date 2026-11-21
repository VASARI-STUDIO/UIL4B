// The "Fit under N KB" search, with a fake encoder in place of a canvas.
import test from 'node:test'
import assert from 'node:assert/strict'
import { describeParams, fitSummary, fitUnderBytes, largestUnder, targetBytes } from '../../src/utils/fitUnderBytes.js'

const KB = 1024

test('the target is whole KB turned into bytes, 0 for none', () => {
  assert.equal(targetBytes(50), 51200)
  assert.equal(targetBytes('50.4'), 51200)
  assert.equal(targetBytes(0), 0)
  assert.equal(targetBytes(''), 0)
  assert.equal(targetBytes(-4), 0)
  assert.equal(targetBytes(1e9), 102400 * 1024)
})

test('a quality search finds the largest quality that is under the target', async () => {
  // bytes grow with quality: 1 KB at quality 1, 100 KB at quality 100
  const calls = []
  const r = await fitUnderBytes({
    target: 50 * KB,
    kind: 'lossy',
    encode: async ({ quality }) => { calls.push(quality); return { bytes: quality * KB } },
  })
  assert.equal(r.ok, true)
  assert.deepEqual(r.params, { quality: 50 })
  assert.equal(r.result.bytes, 50 * KB)
  assert.ok(r.tries <= 9, `${r.tries} tries`)
  assert.equal(r.tries, calls.length)
})

test('a target that already fits at the top quality takes one encode', async () => {
  const r = await fitUnderBytes({ target: 500 * KB, kind: 'lossy', encode: async ({ quality }) => ({ bytes: quality * KB }) })
  assert.deepEqual([r.ok, r.params.quality, r.tries], [true, 100, 1])
})

test('an unreachable target reports the smallest result and says it missed', async () => {
  const r = await fitUnderBytes({ target: 500, kind: 'lossy', encode: async ({ quality }) => ({ bytes: quality * KB }) })
  assert.equal(r.ok, false)
  assert.equal(r.result.bytes, KB)
  assert.deepEqual(r.params, { quality: 1 })
  assert.equal(r.tries, 2)
})

test('a search that is not quite steady still returns something under the target', async () => {
  const wobble = (q) => q * KB + (q % 7) * 100
  const r = await fitUnderBytes({ target: 40 * KB, kind: 'lossy', encode: async ({ quality }) => ({ bytes: wobble(quality) }) })
  assert.equal(r.ok, true)
  assert.ok(r.result.bytes <= 40 * KB)
})

test('largestUnder keeps the smallest it saw when nothing fits', async () => {
  const r = await largestUnder({ lo: 10, hi: 20, limit: 5, test: async (v) => ({ bytes: v * 100 }) })
  assert.equal(r.best, null)
  assert.equal(r.smallest.value, 10)
})

test('a PNG tries full colour first and stops if it fits', async () => {
  const seen = []
  const r = await fitUnderBytes({
    target: 100 * KB,
    kind: 'png',
    encode: async (p) => { seen.push(p); return { bytes: 80 * KB } },
  })
  assert.deepEqual(seen, [{ colours: 0, scale: 100 }])
  assert.deepEqual([r.ok, r.params], [true, { colours: 0, scale: 100 }])
})

test('a PNG that is too big drops colours before it drops size', async () => {
  const bytes = ({ colours, scale }) => (colours === 0 ? 900 : colours * 2) * KB * (scale / 100)
  const r = await fitUnderBytes({ target: 100 * KB, kind: 'png', encode: async (p) => ({ bytes: bytes(p) }) })
  assert.equal(r.ok, true)
  assert.deepEqual(r.params, { colours: 50, scale: 100 })
})

test('a PNG that no colour count can fit is shrunk at 256 colours', async () => {
  const bytes = ({ colours, scale }) => (colours === 0 ? 4000 : 1000 + colours) * KB * (scale / 100) ** 2
  const r = await fitUnderBytes({ target: 100 * KB, kind: 'png', encode: async (p) => ({ bytes: bytes(p) }) })
  assert.equal(r.ok, true)
  assert.equal(r.params.colours, 256)
  assert.ok(r.params.scale < 99)
  assert.ok(r.result.bytes <= 100 * KB)
  assert.ok(bytes({ colours: 256, scale: r.params.scale + 1 }) > 100 * KB)
})

test('a PNG that cannot be reached at all gives the smallest it made', async () => {
  const bytes = ({ colours, scale }) => (colours === 0 ? 9000 : 5000 + colours) * KB * (scale / 100)
  const r = await fitUnderBytes({ target: 1, kind: 'png', encode: async (p) => ({ bytes: bytes(p) }) })
  assert.equal(r.ok, false)
  assert.deepEqual(r.params, { colours: 256, scale: 5 })
  assert.equal(r.result.bytes, bytes({ colours: 256, scale: 5 }))
})

test('the words for a result', () => {
  assert.equal(describeParams({ quality: 72 }), 'quality 72')
  assert.equal(describeParams({ colours: 64, scale: 100 }), '64 colours')
  assert.equal(describeParams({ colours: 256, scale: 40 }), '256 colours at 40% size')
  assert.equal(describeParams({ colours: 0, scale: 100 }), 'full colour')
  assert.equal(fitSummary({ ok: true, bytes: 40 * KB, params: { quality: 72 } }, 50 * KB), 'Under 50.0 KB: 40.0 KB at quality 72')
  assert.equal(
    fitSummary({ ok: false, bytes: 60 * KB, params: { quality: 1 } }, 50 * KB),
    'Couldn’t reach 50.0 KB. Smallest was 60.0 KB at quality 1',
  )
})
