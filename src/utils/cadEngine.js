// ── The CAD engine, and why it is NOT served from uil4b.com ──────────────────
//
// STEP and IGES are boundary representations, not meshes: there is no triangle
// in the file to draw until a geometry kernel has tessellated the surfaces. In
// the browser that kernel is OpenCascade compiled to WebAssembly, here through
// occt-import-js — the build 3dviewer.net runs — which hands back plain
// position / normal / index arrays that meshEngine.js turns into three.js
// geometry like any other format.
//
// THE WEIGHT. Measured against jsDelivr on 2026-09-23: the wasm is 7,604,031
// bytes; the JS wrapper is 96,871. That is the same class of file as the ffmpeg
// core in src/pages/FileConverter.jsx and it gets the same treatment for the
// same reason recorded there: a content-hashed wasm under dist/assets is
// re-fetched from origin in every edge region on every deploy. So it is never
// imported through Vite, never appears in dist/, and is never a dependency in
// package.json — tests/unit/three-d-viewer.test.js fails if anything under src/
// imports it.
//
// PINNED TO AN EXACT VERSION, and to the bytes: OCCT_SHA256 below holds the
// SHA-256 of both files (hashed against jsDelivr on 2026-09-23), and it is
// ENFORCED. The engine runs in a worker on our origin — IndexedDB auth tokens,
// credentialed /api — so this module fetches both files itself, checks them
// with utils/integrity.js, and posts only verified bytes to the worker, which
// fetches nothing. A mismatch throws an IntegrityError before any worker is
// started. tests/unit/cdn-engine-integrity feeds it one changed byte.
// jsDelivr serves both with `access-control-allow-origin: *` and an immutable
// one-year cache-control. vercel.json sets no Content-Security-Policy; if one
// is ever added it must allow cdn.jsdelivr.net for connect, blob: for the
// worker's importScripts, and 'wasm-unsafe-eval'.
//
// IN A WORKER, because OpenCascade's reader is synchronous: a large STEP holds
// the thread for seconds, and on the main thread that freezes the page with the
// Cancel button unpressable. In a worker the page stays live, the progress line
// keeps painting, and Cancel terminates the worker outright.
//
// LOADED ONLY WHEN A CAD FILE IS DROPPED. An OBJ or a GLB never asks for any of
// this. NO FALLBACK MIRROR, for the reason FileConverter.jsx gives: a second CDN
// is a code path that only runs during someone else's outage. The honest
// failure is built instead — the page says the CAD engine could not be fetched,
// and every mesh format still works.

import { fetchVerified } from './integrity.js'

export const OCCT_VERSION = '0.0.23'
export const OCCT_BASE = `https://cdn.jsdelivr.net/npm/occt-import-js@${OCCT_VERSION}/dist`
export const occtScriptURL = `${OCCT_BASE}/occt-import-js.js`
export const occtWasmURL = `${OCCT_BASE}/occt-import-js.wasm`
export const OCCT_SHA256 = Object.freeze({
  js: '3fb44ce11d00611f9b3f3c5775d520ebab48930c1f08279b7b1316f05f0d3379',
  wasm: '33391fc9d94ea5c869a6718488bf0a9a464222bac9bdc764dfe1690cef281952',
})

// Tessellation. `bounding_box_ratio` makes the linear deflection a fraction of
// the model's own size, so a 2 mm bracket and a 2 m chassis both come out
// smooth rather than one faceted and the other absurdly dense.
export const TESSELLATION = Object.freeze({
  linearUnit: 'millimeter',
  linearDeflectionType: 'bounding_box_ratio',
  linearDeflection: 0.001,
  angularDeflection: 0.5,
})

export const CAD_READERS = Object.freeze({ step: 'ReadStepFile', iges: 'ReadIgesFile' })

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
 * @param {Uint8Array} bytes  the whole file
 * @param {'step'|'iges'} formatId
 * @param {(p: { stage: 'engine'|'parsing', loaded?: number, total?: number }) => void} onStage
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ meshes: Array<{ name: string, position: Float32Array, normal: Float32Array|null, index: Uint32Array|null, color: number[]|null, faces: Array<{ first: number, last: number, color: number[] }> }> }>}
 */
export async function readCad(bytes, formatId, onStage, signal) {
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
      if (msg.type === 'result') resolve(msg.result)
      else reject(new Error(msg.message || 'the CAD engine failed without saying why'))
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
    // The bytes are copied rather than transferred: the caller may still hold
    // them, and a CAD file is small next to the engine.
    w.postMessage({ id, reader, bytes, params: TESSELLATION })
  })
}
