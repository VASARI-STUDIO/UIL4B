// The CAD worker: runs OpenCascade (occt-import-js) and tessellates STEP, IGES
// and BREP files posted to it. Started only by src/utils/cadEngine.js, which
// explains why this runs in a worker and why the engine is not bundled. A
// CLASSIC worker, because the engine is an Emscripten script that defines a
// global and has to arrive by importScripts.
//
// THIS WORKER FETCHES NOTHING. It runs on our origin, so code it executes can
// read IndexedDB and call /api with credentials. cadEngine.js fetches the
// engine's script and wasm, checks both against their pinned SHA-256
// (utils/integrity.js), and only then posts the VERIFIED bytes here in an
// `engine` message. The script is executed from a blob: URL made from those
// bytes (revoked straight after), and the wasm is handed over as wasmBinary,
// so nothing unverified can reach importScripts or WebAssembly.instantiate.

let engine = null

function installEngine(script, wasm) {
  engine = (async () => {
    const url = URL.createObjectURL(new Blob([script], { type: 'text/javascript' }))
    try {
      self.importScripts(url)
    } finally {
      URL.revokeObjectURL(url)
    }
    if (typeof self.occtimportjs !== 'function') throw new Error('the CAD engine loaded but exposed no module')
    return self.occtimportjs({ wasmBinary: wasm })
  })()
  // A failed install is reported to the job that needed it, not swallowed.
  engine.catch(() => {})
}

const toF32 = (a) => (a && a.length ? Float32Array.from(a) : null)
const toU32 = (a) => (a && a.length ? Uint32Array.from(a) : null)

self.onmessage = async (e) => {
  const data = e.data || {}
  if (data.type === 'engine') { installEngine(data.script, data.wasm); return }
  const { id, reader, bytes, params } = data
  const progress = (stage, loaded, total) => self.postMessage({ id, type: 'progress', stage, loaded, total })
  try {
    if (!engine) throw new Error('the CAD engine was not delivered to the worker')
    const occt = await engine
    progress('parsing')
    const result = occt[reader](bytes, params)
    if (!result || !result.success) {
      throw new Error('OpenCascade could not read it. It may be damaged, or written in a dialect OpenCascade does not import')
    }
    // Colours arrive as linear RGB (OpenCascade converts STEP's sRGB on read).
    // Faces are triangle ranges in their mesh, one per CAD face, in order.
    const meshes = (result.meshes || []).map((m) => ({
      name: m.name || '',
      position: toF32(m.attributes?.position?.array),
      normal: toF32(m.attributes?.normal?.array),
      index: toU32(m.index?.array),
      color: Array.isArray(m.color) ? m.color : null,
      faces: (m.brep_faces || []).filter(Boolean).map((f) => ({ first: f.first, last: f.last, color: Array.isArray(f.color) ? f.color : null })),
    }))
    if (!meshes.some((m) => m.position)) throw new Error('it was read, but it contains no solid or surface to draw')
    // The assembly tree: named nodes holding mesh indices and child nodes.
    const node = (n) => ({ name: n?.name || '', meshes: Array.isArray(n?.meshes) ? n.meshes : [], children: (n?.children || []).map(node) })
    const transfer = []
    for (const m of meshes) for (const k of ['position', 'normal', 'index']) if (m[k]) transfer.push(m[k].buffer)
    self.postMessage({ id, type: 'result', result: { meshes, root: node(result.root) } }, transfer)
  } catch (err) {
    self.postMessage({ id, type: 'error', message: String(err?.message || err) })
  }
}
