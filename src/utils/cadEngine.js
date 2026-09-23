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
// PINNED TO AN EXACT VERSION, with the bytes hashed on 2026-09-23 so the pin
// means something:
//   occt-import-js.js    sha256 3fb44ce11d00611f9b3f3c5775d520ebab48930c1f08279b7b1316f05f0d3379
//   occt-import-js.wasm  sha256 33391fc9d94ea5c869a6718488bf0a9a464222bac9bdc764dfe1690cef281952
// jsDelivr serves both with `access-control-allow-origin: *` and an immutable
// one-year cache-control. vercel.json sets no Content-Security-Policy, so
// nothing blocks the cross-origin script or the wasm compile; if a CSP is ever
// added it must allow cdn.jsdelivr.net for script and connect, and
// 'wasm-unsafe-eval'.
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

export const OCCT_VERSION = '0.0.23'
export const OCCT_BASE = `https://cdn.jsdelivr.net/npm/occt-import-js@${OCCT_VERSION}/dist`
export const occtScriptURL = `${OCCT_BASE}/occt-import-js.js`
export const occtWasmURL = `${OCCT_BASE}/occt-import-js.wasm`

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
export function readCad(bytes, formatId, onStage, signal) {
  const reader = CAD_READERS[formatId]
  if (!reader) return Promise.reject(new Error(`${formatId} is not a CAD format this engine reads`))
  if (signal?.aborted) return Promise.reject(abortError())

  return new Promise((resolve, reject) => {
    let w
    try {
      w = getWorker()
    } catch (err) {
      reject(new Error(`the CAD engine could not start in this browser (${err?.message || err})`))
      return
    }
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
    w.postMessage({ id, reader, bytes, params: TESSELLATION, scriptURL: occtScriptURL, wasmURL: occtWasmURL })
  })
}
