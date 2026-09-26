// The CAD engine: OpenCascade, fetched from a pinned CDN URL and run in a worker.
//
// STEP, IGES and BREP are boundary representations, not meshes: there is no
// triangle in the file until a geometry kernel has tessellated the surfaces.
// In the browser that kernel is OpenCascade compiled to WebAssembly, through
// occt-import-js, which hands back position / normal / index arrays per part
// and the assembly tree that names them. meshEngine.js turns those into
// three.js geometry like any other format.
//
// NOT BUNDLED. The wasm is 7,604,031 bytes and the JS wrapper 96,871. Both are
// fetched from jsDelivr at an exact version, never imported through Vite, never
// written to dist/, and never listed in package.json;
// tests/unit/model-converter.test.js fails if anything under src/ imports it.
//
// PINNED TO THE BYTES. OCCT_SHA256 holds the SHA-256 of both files and is
// enforced: the worker runs on our origin (IndexedDB, credentialed /api), so
// this module fetches both files itself, checks them with utils/integrity.js,
// and posts only verified bytes to the worker, which fetches nothing. A
// mismatch throws an IntegrityError before any worker is started. jsDelivr
// serves both with `access-control-allow-origin: *` and an immutable cache.
// The Content-Security-Policy in vercel.json allows cdn.jsdelivr.net for
// connect, blob: for the worker's importScripts, and 'wasm-unsafe-eval'.
//
// IN A WORKER, because OpenCascade's reader is synchronous: a large STEP holds
// the thread for seconds. In a worker the page stays live, the progress line
// keeps painting, and Cancel terminates the worker outright.
//
// LOADED ONLY WHEN A CAD FILE IS DROPPED, with no fallback mirror: if the CDN
// cannot be reached the page says the CAD engine could not be fetched, and
// every mesh format still works.

import { fetchVerified } from './integrity.js'
import { cadQuality } from './meshFormats.js'

export const OCCT_VERSION = '0.0.23'
export const OCCT_BASE = `https://cdn.jsdelivr.net/npm/occt-import-js@${OCCT_VERSION}/dist`
export const occtScriptURL = `${OCCT_BASE}/occt-import-js.js`
export const occtWasmURL = `${OCCT_BASE}/occt-import-js.wasm`
export const OCCT_SHA256 = Object.freeze({
  js: '3fb44ce11d00611f9b3f3c5775d520ebab48930c1f08279b7b1316f05f0d3379',
  wasm: '33391fc9d94ea5c869a6718488bf0a9a464222bac9bdc764dfe1690cef281952',
})

// Tessellation parameters for occt-import-js. Lengths come back in
// millimetres; `bounding_box_ratio` makes the linear deflection a fraction of
// the model's own size (see CAD_QUALITIES in meshFormats.js).
export function tessellationParams(quality) {
  const q = cadQuality(quality)
  return {
    linearUnit: 'millimeter',
    linearDeflectionType: 'bounding_box_ratio',
    linearDeflection: q.linear,
    angularDeflection: q.angular,
  }
}

export const CAD_READERS = Object.freeze({ step: 'ReadStepFile', iges: 'ReadIgesFile', brep: 'ReadBrepFile' })

// One worker per page life, kept between files so the 7.6 MB engine is
// compiled once. Terminated (and forgotten) on cancel; the next CAD file
// starts a fresh one, and the browser's HTTP cache makes that refetch cheap.
let worker = null
let nextId = 1
// Whether the current worker has been handed the verified engine. A new
// worker (after Cancel or a crash) needs it again; the HTTP cache makes the
// refetch cheap, and the bytes are re-verified every time.
let engineDelivery = null

function getWorker() {
  if (!worker) {
    // The literal `new Worker(new URL(...), ...)` shape is what Vite looks for
    // to emit the worker as its own file. Classic, not module: the engine is an
    // Emscripten script that has to be pulled in with importScripts().
    worker = new Worker(new URL('./cadWorker.js', import.meta.url), { type: 'classic' })
  }
  return worker
}

function stopWorker() {
  if (worker) worker.terminate()
  worker = null
  engineDelivery = null
}

// Fetch and verify the engine, then hand the verified bytes to the worker.
// Nothing is posted — and no worker is even started — unless both match.
function deliverEngine(onStage, signal) {
  if (engineDelivery) return engineDelivery
  const onBytes = ({ received, total }) => onStage?.({ stage: 'engine', loaded: received, total })
  engineDelivery = (async () => {
    let script, wasm
    try {
      ;[script, wasm] = await Promise.all([
        fetchVerified(occtScriptURL, OCCT_SHA256.js, { label: 'The CAD engine script', signal }),
        fetchVerified(occtWasmURL, OCCT_SHA256.wasm, { label: 'The CAD engine', signal, onBytes }),
      ])
    } catch (err) {
      if (err?.name === 'IntegrityError' || err?.name === 'AbortError') throw err
      throw new Error(`the CAD engine could not be fetched (${err?.message || err})`)
    }
    let w
    try {
      w = getWorker()
    } catch (err) {
      throw new Error(`the CAD engine could not start in this browser (${err?.message || err})`)
    }
    w.postMessage({ type: 'engine', script, wasm }, [script, wasm])
    return w
  })()
  engineDelivery.catch(() => { engineDelivery = null })
  return engineDelivery
}

function abortError() {
  const e = new Error('cancelled')
  e.name = 'AbortError'
  return e
}

/**
 * Tessellate a CAD file off the main thread.
 *
 * @param {Uint8Array} bytes  the whole file; its buffer is transferred to the worker
 * @param {'step'|'iges'|'brep'} formatId
 * @param {{ quality?: string, onStage?: Function, signal?: AbortSignal }} opts
 *   onStage receives { stage: 'engine'|'parsing', loaded?, total? }.
 * @returns {Promise<{ root: { name: string, meshes: number[], children: object[] }, meshes: Array<{ name: string, position: Float32Array|null, normal: Float32Array|null, index: Uint32Array|null, color: number[]|null, faces: Array<{ first: number, last: number, color: number[]|null }> }> }>}
 */
export async function readCad(bytes, formatId, { quality, onStage, signal } = {}) {
  const reader = CAD_READERS[formatId]
  if (!reader) throw new Error(`${formatId} is not a CAD format this engine reads`)
  if (signal?.aborted) throw abortError()

  onStage?.({ stage: 'engine', loaded: 0, total: 0 })
  let w
  try {
    w = await deliverEngine(onStage, signal)
  } catch (err) {
    if (err?.name === 'AbortError' || signal?.aborted) throw abortError()
    throw err
  }
  if (signal?.aborted) throw abortError()

  return new Promise((resolve, reject) => {
    const id = nextId++
    const cleanup = () => {
      w.removeEventListener('message', onMessage)
      w.removeEventListener('error', onError)
      signal?.removeEventListener('abort', onAbort)
    }
    const onMessage = (e) => {
      const msg = e.data || {}
      if (msg.id !== id) return
      if (msg.type === 'progress') { onStage?.({ stage: msg.stage, loaded: msg.loaded, total: msg.total }); return }
      cleanup()
      if (msg.type === 'result') { resolve(msg.result); return }
      // Anything else is a failure inside OpenCascade, and a wasm module that
      // threw mid-read may have left its heap corrupt. Discard the worker so the
      // next file starts from a fresh, re-verified engine rather than reusing it.
      stopWorker()
      reject(new Error(msg.message || 'the CAD engine failed without saying why'))
    }
    const onError = (e) => {
      cleanup()
      stopWorker()
      reject(new Error(`the CAD engine stopped: ${e?.message || 'unknown error'}`))
    }
    const onAbort = () => {
      cleanup()
      stopWorker()
      reject(abortError())
    }
    w.addEventListener('message', onMessage)
    w.addEventListener('error', onError)
    signal?.addEventListener('abort', onAbort, { once: true })
    // Transferred, not copied: the caller reads the file into a buffer for this
    // call alone. After this the caller's view is detached.
    w.postMessage({ id, reader, bytes, params: tessellationParams(quality) }, [bytes.buffer])
  })
}
