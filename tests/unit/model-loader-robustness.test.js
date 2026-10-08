// /create/3d-converter loaders: three failure modes that used to cost a visitor
// a working load.
//
//   1. Cancelling one load must not cancel the engine or decoder download that
//      the next load shares.
//   2. A zip-based model (3MF, KMZ, AMF, USDZ) may not unpack past a ceiling.
//   3. blob: URLs minted beside a loader chunk are revoked when that chunk
//      cannot be downloaded.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { unzipSync, zipSync } from 'three/examples/jsm/libs/fflate.module.js'

const ROOT = process.cwd()
const load = (p) => import(pathToFileURL(path.join(ROOT, p)).href)

const { sharedDownload } = await load('src/utils/sharedDownload.js')
const { fetchVerified } = await load('src/utils/integrity.js')
const { DECODERS, THREE_VERSION, decoderURLs, resetDecoders } = await load('src/utils/mesh/decoders.js')
const { readCad } = await load('src/utils/cadEngine.js')
const { readIfc } = await load('src/utils/ifcEngine.js')
const Z = await load('src/utils/mesh/zipCap.js')
const F = await load('src/utils/meshFormats.js')
const E = await load('src/utils/meshEngine.js')

const input = (id) => F.INPUT_FORMATS.find((f) => f.id === id)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── 1. A cancel detaches one caller, not the download ───────────────────────

test('sharedDownload: a cancelled caller leaves the download running for the others', async () => {
  let starts = 0
  let release
  const gate = new Promise((r) => { release = r })
  const get = sharedDownload(async () => { starts++; await gate; return 'engine' })
  const first = new AbortController()
  const a = get({ signal: first.signal })
  const b = get()
  first.abort()
  await assert.rejects(a, (e) => e.name === 'AbortError')
  release()
  assert.equal(await b, 'engine')
  assert.equal(await get({ signal: new AbortController().signal }), 'engine')
  assert.equal(starts, 1, 'the download was started again')
})

test('sharedDownload: when the last caller leaves, the stalled download is aborted and a retry starts a fresh one', async () => {
  const signals = []
  const get = sharedDownload((report, signal) => {
    signals.push(signal)
    if (signals.length > 1) return Promise.resolve('engine')
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))
  })
  const one = new AbortController()
  const two = new AbortController()
  const a = get({ signal: one.signal })
  const b = get({ signal: two.signal })
  one.abort()
  await assert.rejects(a, (e) => e.name === 'AbortError')
  assert.equal(signals[0].aborted, false, 'aborted while a caller was still waiting')
  two.abort()
  const retry = get()
  await assert.rejects(b, (e) => e.name === 'AbortError')
  assert.equal(signals[0].aborted, true, 'the stalled download was left running')
  assert.equal(await retry, 'engine')
  assert.equal(signals.length, 2, 'the retry joined the abandoned download')
})

test('sharedDownload: a failed download is forgotten, and progress reaches a late joiner', async () => {
  let starts = 0
  const get = sharedDownload(async (report) => {
    starts++
    report({ received: 5, total: 10 })
    if (starts === 1) throw new Error('offline')
    return 'engine'
  })
  await assert.rejects(get(), /offline/)
  const seen = []
  assert.equal(await get({ onProgress: (p) => seen.push(p) }), 'engine')
  assert.equal(starts, 2)
  assert.deepEqual(seen, [{ received: 5, total: 10 }])
})

const THREE_LIBS_URL = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/examples/jsm/libs/`
const localDecoderFile = (url) => path.join(ROOT, 'node_modules', 'three', 'examples', 'jsm', 'libs', url.slice(THREE_LIBS_URL.length))

/** A fetch that answers after a pause and honours the caller's signal, like the real one. */
function slowFetch(t, bodyFor) {
  const real = globalThis.fetch
  const seen = { calls: 0, aborted: 0 }
  globalThis.fetch = async (url, init = {}) => {
    seen.calls++
    await sleep(25)
    if (init.signal?.aborted) seen.aborted++
    if (init.signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    return new Response(new Uint8Array(bodyFor(String(url))), { status: 200 })
  }
  t.after(() => { globalThis.fetch = real })
  return seen
}

test('decoders: cancelling the first load does not fail the load waiting on the same download', async (t) => {
  resetDecoders()
  t.after(resetDecoders)
  const seen = slowFetch(t, (url) => fs.readFileSync(localDecoderFile(url)))
  const first = new AbortController()
  const a = decoderURLs('draco', { signal: first.signal })
  const b = decoderURLs('draco')
  first.abort()
  await assert.rejects(a, (e) => e.name === 'AbortError')
  const files = await b
  assert.match(files.js, /^blob:/)
  files.revoke()
  const again = await decoderURLs('draco')
  again.revoke()
  assert.equal(seen.calls, 2, 'the verified bytes were fetched again instead of shared (one request per file)')
  assert.equal(seen.aborted, 0, 'the shared request was aborted while a caller still waited')
})

for (const [name, read] of [
  ['CAD', (signal) => readCad(new Uint8Array([1, 2, 3]), 'step', { signal })],
  ['IFC', (signal) => readIfc(new Uint8Array([1, 2, 3]), { signal })],
]) {
  test(`${name} engine: cancelling the first load leaves the shared download to the next`, async (t) => {
    // The bytes are not the pinned engine, so the surviving load ends in an
    // IntegrityError: it got as far as verifying, which a cancel would prevent.
    const seen = slowFetch(t, () => [1, 2, 3, 4])
    const realWorker = globalThis.Worker
    globalThis.Worker = class { constructor() { throw new Error('no workers in this test') } }
    t.after(() => { globalThis.Worker = realWorker })
    const first = new AbortController()
    const a = read(first.signal)
    const b = read(undefined)
    first.abort()
    await assert.rejects(a, (e) => e.name === 'AbortError')
    await assert.rejects(b, (e) => e.name === 'IntegrityError')
    assert.equal(seen.aborted, 0, 'the shared request was aborted while a caller still waited')
  })
}

// ── 3. Loader chunk fails: every blob: URL is revoked ───────────────────────

/** A GLB whose JSON declares the given extensions and holds nothing else. */
function glbDeclaring(extensions) {
  const json = new TextEncoder().encode(JSON.stringify({ asset: { version: '2.0' }, extensionsUsed: extensions }))
  const padded = new Uint8Array(Math.ceil(json.length / 4) * 4).fill(0x20)
  padded.set(json)
  const out = new Uint8Array(20 + padded.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, out.length, true)
  view.setUint32(12, padded.length, true)
  view.setUint32(16, 0x4e4f534a, true)
  out.set(padded, 20)
  return out.buffer
}

/** Count blob: URLs minted and revoked. */
function watchBlobs(t) {
  const create = URL.createObjectURL
  const revoke = URL.revokeObjectURL
  const live = new Set()
  URL.createObjectURL = (...a) => { const u = create.apply(URL, a); live.add(u); return u }
  URL.revokeObjectURL = (u) => { live.delete(u); return revoke.call(URL, u) }
  t.after(() => { URL.createObjectURL = create; URL.revokeObjectURL = revoke })
  return live
}

for (const [label, extension, lazyName, opts] of [
  ['Draco', 'KHR_draco_mesh_compression', 'draco', {}],
  ['KTX2', 'KHR_texture_basisu', 'ktx2', { renderer: {} }],
]) {
  test(`${label} chunk fails to download: the decoder's blob: URLs are still revoked`, async (t) => {
    resetDecoders()
    t.after(resetDecoders)
    slowFetch(t, (url) => fs.readFileSync(localDecoderFile(url)))
    const live = watchBlobs(t)
    const realLazy = E.lazy[lazyName]
    E.lazy[lazyName] = () => Promise.reject(new Error('Failed to fetch dynamically imported module'))
    t.after(() => { E.lazy[lazyName] = realLazy })
    await assert.rejects(E.parseModel(input('glb'), glbDeclaring([extension]), opts), /dynamically imported/)
    // The decoder download is still in flight when the chunk rejects; give it
    // the time it needs to finish and mint, then count what is left.
    await sleep(120)
    assert.deepEqual([...live], [], 'blob: URLs were left unrevoked')
    assert.ok(DECODERS.draco && DECODERS.basis)
  })
}

test('3MF chunk fails to download: the companion files\' blob: URLs are revoked', async (t) => {
  const live = watchBlobs(t)
  const realLazy = E.lazy.threeMF
  E.lazy.threeMF = () => Promise.reject(new Error('Failed to fetch dynamically imported module'))
  t.after(() => { E.lazy.threeMF = realLazy })
  const companion = new File([new Uint8Array([1, 2, 3])], 'thumb.png')
  await assert.rejects(E.parseModel(input('3mf'), new Uint8Array(8).buffer, { companions: [companion] }), /dynamically imported/)
  assert.deepEqual([...live], [], 'blob: URLs were left unrevoked')
})

// ── 2. Zip-based models have an unpacked-size ceiling ───────────────────────

/**
 * A real zip whose headers claim `declared` bytes for each entry while the
 * payload stays as built, so a 600 MB claim costs a few hundred bytes of test.
 */
function zipDeclaring(entries, declared) {
  const files = {}
  entries.forEach((bytes, i) => { files[`part${i}.bin`] = bytes })
  const zip = zipSync(files)
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  let n = 0
  for (let i = 0; i < zip.length - 30; i++) {
    const sig = view.getUint32(i, true)
    if (sig === 0x04034b50) view.setUint32(i + 22, declared[n] ?? declared[declared.length - 1], true)
    else if (sig === 0x02014b50) { view.setUint32(i + 24, declared[n] ?? declared[declared.length - 1], true); n++ }
  }
  return zip
}
const MB = 1024 * 1024
const ones = (n) => new Uint8Array(n).fill(7)

test('zip cap: the ceilings are 256 MB per part and 512 MB overall', () => {
  assert.equal(Z.MAX_ENTRY_BYTES, 256 * MB)
  assert.equal(Z.MAX_TOTAL_BYTES, 512 * MB)
})

test('zip cap: a part that claims more than the per-part ceiling is refused before it is inflated', () => {
  const zip = zipDeclaring([ones(1000)], [300 * MB])
  assert.throws(() => Z.assertArchiveWithinCap(zip), (e) => e.message === 'archive-too-large' && /256 MB/.test(e.limit))
})

test('zip cap: parts that are each fine but add up past the overall ceiling are refused', () => {
  const ok = zipDeclaring([ones(1000), ones(1000)], [200 * MB])
  assert.doesNotThrow(() => Z.assertArchiveWithinCap(ok))
  const over = zipDeclaring([ones(1000), ones(1000), ones(1000)], [200 * MB])
  assert.throws(() => Z.assertArchiveWithinCap(over), (e) => e.message === 'archive-too-large' && /512 MB/.test(e.limit))
})

test('zip cap: a real archive well inside the ceilings, and a file that is not a zip, pass', () => {
  assert.doesNotThrow(() => Z.assertArchiveWithinCap(zipSync({ '3D/3dmodel.model': new TextEncoder().encode('<model/>') })))
  assert.doesNotThrow(() => Z.assertArchiveWithinCap(new TextEncoder().encode('not a zip at all')))
})

/** `zip` with `lead` bytes in front and its stored offsets moved to match, as a real archive with a prefix has. */
function withLead(zip, lead) {
  const out = new Uint8Array(lead.length + zip.length)
  out.set(lead, 0)
  out.set(zip, lead.length)
  const view = new DataView(out.buffer)
  for (let i = lead.length; i <= out.length - 22; i++) {
    const sig = view.getUint32(i, true)
    if (sig === 0x02014b50) view.setUint32(i + 42, view.getUint32(i + 42, true) + lead.length, true)
    else if (sig === 0x06054b50) view.setUint32(i + 16, view.getUint32(i + 16, true) + lead.length, true)
  }
  return out
}

test('zip cap: an archive is checked whatever its first bytes say', () => {
  const zip = zipDeclaring([ones(1000)], [300 * MB])
  for (const lead of [[0x50, 0x4b, 1, 2], [0x50, 0x4b], [...new TextEncoder().encode('<amf>')], [0, 0, 0, 0]]) {
    assert.throws(() => Z.assertArchiveWithinCap(withLead(zip, lead)), (e) => e.message === 'archive-too-large', `slipped past with a start of ${lead.join(',')}`)
  }
})

test('amf: an archive that unpacks past the ceiling is refused even when it starts PK without a local file header', async () => {
  const wrapped = withLead(zipDeclaring([ones(1000)], [300 * MB]), [0x50, 0x4b, 1, 2])
  await assert.rejects(E.parseModel(input('amf'), wrapped.buffer), (e) => e.message === 'archive-too-large')
})

test('zip cap: a part holding more than its header declares is cut off at the declared size', () => {
  // What makes checking the declared size enough: the inflate cannot outgrow it.
  const lying = zipDeclaring([ones(64 * 1024)], [1000])
  let out = null
  try { out = unzipSync(lying) } catch { /* a refusal is as good as a cut-off */ }
  if (out) assert.ok(out['part0.bin'].length <= 1000, `inflated ${out['part0.bin'].length} bytes against a declared 1000`)
})

for (const id of ['3mf', 'kmz']) {
  test(`${id}: an archive that unpacks past the ceiling fails with a plain reason, before any loader runs`, async () => {
    const zip = zipDeclaring([ones(1000)], [300 * MB])
    await assert.rejects(E.parseModel(input(id), zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength)), (e) => e.message === 'archive-too-large')
    let err
    try { await E.parseModel(input(id), zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength)) } catch (e) { err = e }
    const said = E.describeLoadError(err, input(id), 'model.' + id)
    assert.match(said, /too large once unpacked/)
    assert.match(said, /256 MB/)
  })
}

// ── 4. A download that goes quiet is abandoned ─────────────────────────────

const quietFetch = (t, body) => {
  const real = globalThis.fetch
  globalThis.fetch = (url, init = {}) => new Promise((resolve, reject) => {
    const stop = () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    if (init.signal?.aborted) return stop()
    init.signal?.addEventListener('abort', stop, { once: true })
    if (body) resolve(new Response(body(init.signal), { status: 200 }))
  })
  t.after(() => { globalThis.fetch = real })
}

test('fetchVerified: a request that never answers fails with a plain reason instead of hanging', { timeout: 3000 }, async (t) => {
  quietFetch(t)
  await assert.rejects(fetchVerified('https://cdn.example/a.wasm', 'x', { stallMs: 30 }), /no data for/)
})

test('fetchVerified: a body that stops part way fails the same way, and Cancel is still a cancel', { timeout: 3000 }, async (t) => {
  quietFetch(t, (signal) => new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array([1, 2, 3]))
      signal.addEventListener('abort', () => c.error(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true })
    },
  }))
  await assert.rejects(fetchVerified('https://cdn.example/a.wasm', 'x', { stallMs: 30 }), /no data for/)
  const cancel = new AbortController()
  const pending = fetchVerified('https://cdn.example/a.wasm', 'x', { stallMs: 5000, signal: cancel.signal })
  await sleep(10)
  cancel.abort()
  await assert.rejects(pending, (e) => e.name === 'AbortError')
})
