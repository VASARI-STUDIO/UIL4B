// The CAD worker: fetches OpenCascade (occt-import-js) from the pinned CDN URL
// it is given, once, and tessellates STEP / IGES files posted to it. Started
// only by src/utils/cadEngine.js, which explains why this runs in a worker and
// why the engine is not bundled. A CLASSIC worker, because the engine is an
// Emscripten script that defines a global and has to arrive by importScripts.

let engine = null

async function fetchWithProgress(url, onBytes) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`the CAD engine could not be fetched (HTTP ${resp.status})`)
  // With compression on, content-length describes the compressed body while
  // the reader yields decompressed bytes, so the total is a hint and the page
  // treats it as one.
  const total = Number(resp.headers.get('content-length')) || 0
  if (!resp.body || !resp.body.getReader) {
    const buf = await resp.arrayBuffer()
    onBytes(buf.byteLength, buf.byteLength)
    return buf
  }
  const reader = resp.body.getReader()
  const chunks = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    onBytes(received, total)
  }
  const out = new Uint8Array(received)
  let at = 0
  for (const c of chunks) { out.set(c, at); at += c.length }
  return out.buffer
}

function loadEngine(scriptURL, wasmURL, onBytes) {
  if (engine) return engine
  engine = (async () => {
    let wasmBinary
    try {
      wasmBinary = await fetchWithProgress(wasmURL, onBytes)
      self.importScripts(scriptURL)
    } catch (err) {
      const msg = String(err?.message || err)
      throw new Error(msg.startsWith('the CAD engine') ? msg : `the CAD engine could not be fetched (${msg})`)
    }
    if (typeof self.occtimportjs !== 'function') throw new Error('the CAD engine loaded but exposed no module')
    return self.occtimportjs({ wasmBinary })
  })().catch((err) => {
    engine = null
    throw err
  })
  return engine
}

const toF32 = (a) => (a && a.length ? Float32Array.from(a) : null)
const toU32 = (a) => (a && a.length ? Uint32Array.from(a) : null)

self.onmessage = async (e) => {
  const { id, reader, bytes, params, scriptURL, wasmURL } = e.data || {}
  const progress = (stage, loaded, total) => self.postMessage({ id, type: 'progress', stage, loaded, total })
  try {
    progress('engine', 0, 0)
    const occt = await loadEngine(scriptURL, wasmURL, (loaded, total) => progress('engine', loaded, total))
    progress('parsing')
    const result = occt[reader](bytes, params)
    if (!result || !result.success) {
      throw new Error('OpenCascade could not read it. It may be damaged, or written in a dialect OpenCascade does not import')
    }
    const meshes = (result.meshes || []).map((m) => ({
      name: m.name || '',
      position: toF32(m.attributes?.position?.array),
      normal: toF32(m.attributes?.normal?.array),
      index: toU32(m.index?.array),
      color: Array.isArray(m.color) ? m.color : null,
      faces: (m.brep_faces || []).filter((f) => f && Array.isArray(f.color)).map((f) => ({ first: f.first, last: f.last, color: f.color })),
    })).filter((m) => m.position)
    if (!meshes.length) throw new Error('it was read, but it contains no solid or surface to draw')
    const transfer = []
    for (const m of meshes) for (const k of ['position', 'normal', 'index']) if (m[k]) transfer.push(m[k].buffer)
    self.postMessage({ id, type: 'result', result: { meshes } }, transfer)
  } catch (err) {
    self.postMessage({ id, type: 'error', message: String(err?.message || err) })
  }
}
