// CODE FROM A CDN RUNS ONLY IF IT IS THE CODE WE PINNED.
//
// ffmpegEngine.js and cadEngine.js fetch an engine from jsDelivr and execute it
// on our origin, where the auth token and the credentialed /api live. A pinned
// version names an artifact; only a hash proves the bytes are that artifact.
// These tests hold the loaders to it: the real bytes pass, ONE changed byte is
// refused, and on refusal nothing executable is ever made — no blob: URL is
// minted and no worker is started.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { assertIntegrity, fetchVerified, IntegrityError } from '../../src/utils/integrity.js'
import { FFMPEG_CORE_SHA256, getFfmpeg, resetFfmpeg } from '../../src/utils/ffmpegEngine.js'
import { OCCT_SHA256, readCad } from '../../src/utils/cadEngine.js'

const CORE_DIR = path.join(process.cwd(), 'node_modules', '@ffmpeg', 'core', 'dist', 'esm')
const coreJs = fs.readFileSync(path.join(CORE_DIR, 'ffmpeg-core.js'))
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
const tamper = (b) => { const c = Buffer.from(b); c[c.length >> 1] ^= 0x01; return c }

/** Answer every fetch with `body`; restore afterwards. Counts calls. */
function stubFetch(t, body) {
  const real = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url) => {
    calls.push(String(url))
    const bytes = new Uint8Array(body)
    return new Response(bytes, { status: 200, headers: { 'content-length': String(bytes.length) } })
  }
  t.after(() => { globalThis.fetch = real })
  return calls
}

/** Count blob: URLs minted and workers constructed; restore afterwards. */
function watchExecutables(t) {
  const realCreate = URL.createObjectURL
  const realWorker = globalThis.Worker
  const seen = { blobs: 0, workers: 0 }
  URL.createObjectURL = (...a) => { seen.blobs++; return realCreate.apply(URL, a) }
  globalThis.Worker = class { constructor() { seen.workers++; throw new Error('no workers in this test') } }
  t.after(() => { URL.createObjectURL = realCreate; globalThis.Worker = realWorker })
  return seen
}

test('the pinned ffmpeg core hashes are the bytes the installed package ships', () => {
  assert.equal(FFMPEG_CORE_SHA256.js, sha(coreJs))
  assert.equal(FFMPEG_CORE_SHA256.wasm, sha(fs.readFileSync(path.join(CORE_DIR, 'ffmpeg-core.wasm'))))
  // The CAD pins are 64-hex and distinct; the package is not installed (it is
  // fetched, never bundled), so its bytes are pinned from jsDelivr directly.
  for (const h of [OCCT_SHA256.js, OCCT_SHA256.wasm]) assert.match(h, /^[0-9a-f]{64}$/)
  assert.notEqual(OCCT_SHA256.js, OCCT_SHA256.wasm)
})

test('the real bytes pass and one changed byte is refused', async () => {
  await assertIntegrity(coreJs, sha(coreJs), 'core')
  await assert.rejects(assertIntegrity(tamper(coreJs), sha(coreJs), 'core'), IntegrityError)
  // No pin at all is a refusal too, never a pass.
  await assert.rejects(assertIntegrity(coreJs, '', 'core'), IntegrityError)
})

test('fetchVerified hands back verified bytes, and nothing for tampered ones', async (t) => {
  stubFetch(t, coreJs)
  const got = await fetchVerified('https://cdn.example/core.js', sha(coreJs))
  assert.equal(sha(Buffer.from(got)), sha(coreJs))
  globalThis.fetch = async () => new Response(new Uint8Array(tamper(coreJs)), { status: 200 })
  await assert.rejects(fetchVerified('https://cdn.example/core.js', sha(coreJs)), IntegrityError)
})

test('a tampered converter engine is refused before anything executable exists', async (t) => {
  resetFfmpeg()
  const calls = stubFetch(t, tamper(coreJs))
  const seen = watchExecutables(t)
  await assert.rejects(getFfmpeg(), (err) => err.name === 'IntegrityError' && /not run/.test(err.message))
  assert.ok(calls.length >= 1, 'the loader never fetched — the stub is not what it is reading')
  assert.equal(seen.blobs, 0, 'a blob: URL was minted from bytes that failed the check')
  resetFfmpeg()
})

test('a tampered CAD engine is refused before a worker is started', async (t) => {
  const calls = stubFetch(t, tamper(coreJs))
  const seen = watchExecutables(t)
  await assert.rejects(readCad(new Uint8Array([1, 2, 3]), 'step', () => {}),
    (err) => err.name === 'IntegrityError' && /not run/.test(err.message))
  assert.ok(calls.length >= 1, 'the CAD loader never fetched')
  assert.equal(seen.workers, 0, 'a worker was started with an engine that failed the check')
  assert.equal(seen.blobs, 0)
})
