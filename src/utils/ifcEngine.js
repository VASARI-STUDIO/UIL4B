// The IFC engine: web-ifc (MPL-2.0), fetched from a pinned CDN URL and run in
// a worker, on the same rules as the CAD engine (see cadEngine.js).
//
// web-ifc's browser build is a 6,089,952-byte script and a 1,595,268-byte
// wasm. Both are fetched from jsDelivr at an exact version, checked against
// their SHA-256 with utils/integrity.js, and only then posted to the worker,
// which fetches nothing. The library is used unmodified, as distributed.
//
// IN A WORKER because web-ifc's reader is synchronous; Cancel terminates the
// worker. Lengths come back in metres (web-ifc applies the file's own unit),
// Y up.
import { fetchVerified } from './integrity.js'

export const WEBIFC_VERSION = '0.0.78'
const BASE = `https://cdn.jsdelivr.net/npm/web-ifc@${WEBIFC_VERSION}`
export const ifcScriptURL = `${BASE}/web-ifc-api-iife.js`
export const ifcWasmURL = `${BASE}/web-ifc.wasm`
export const WEBIFC_SHA256 = Object.freeze({
  js: 'c6f7ba2b407065eac53a2d47e152f79bc987b120c42a7ea17355f7cc55bfdbf4',
  wasm: '1fbd30bd5515ff6ad15268e87aa26e41d57b29411c8461618b63bee92735d349',
})

let worker = null
let delivery = null
let nextId = 1

function stopWorker() {
  if (worker) worker.terminate()
  worker = null
  delivery = null
}

function abortError() {
  return Object.assign(new Error('cancelled'), { name: 'AbortError' })
}

function deliverEngine(onStage, signal) {
  if (delivery) return delivery
  const onBytes = ({ received, total }) => onStage?.({ stage: 'engine', loaded: received, total })
  delivery = (async () => {
    let script, wasm
    try {
      ;[script, wasm] = await Promise.all([
        fetchVerified(ifcScriptURL, WEBIFC_SHA256.js, { label: 'The IFC engine script', signal, onBytes }),
        fetchVerified(ifcWasmURL, WEBIFC_SHA256.wasm, { label: 'The IFC engine', signal }),
      ])
    } catch (err) {
      if (err?.name === 'IntegrityError' || err?.name === 'AbortError') throw err
      throw new Error(`the IFC engine could not be fetched (${err?.message || err})`)
    }
    if (!worker) worker = new Worker(new URL('./ifcWorker.js', import.meta.url), { type: 'classic' })
    worker.postMessage({ type: 'engine', script, wasm }, [script, wasm])
    return worker
  })()
  delivery.catch(() => { delivery = null })
  return delivery
}

/**
 * An IFC file's bytes to building elements with world-space triangles.
 * @returns {Promise<{ products: Array<{ id: number, name: string, type: string, parts: Array<{ position: Float32Array, normal: Float32Array, index: Uint32Array, color: number[] }> }>, tree: object|null }>}
 */
export async function readIfc(bytes, { onStage, signal } = {}) {
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
      if (msg.type === 'progress') { onStage?.({ stage: msg.stage }); return }
      cleanup()
      if (msg.type === 'result') { resolve(msg.result); return }
      stopWorker()
      reject(new Error(msg.message || 'the IFC engine failed without saying why'))
    }
    const onError = (e) => { cleanup(); stopWorker(); reject(new Error(`the IFC engine stopped: ${e?.message || 'unknown error'}`)) }
    const onAbort = () => { cleanup(); stopWorker(); reject(abortError()) }
    w.addEventListener('message', onMessage)
    w.addEventListener('error', onError)
    signal?.addEventListener('abort', onAbort, { once: true })
    w.postMessage({ id, bytes }, [bytes.buffer])
  })
}
