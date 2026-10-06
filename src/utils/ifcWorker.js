// The IFC worker: runs web-ifc and turns an IFC file into triangles per
// building element, plus the spatial tree (project, site, building, storey)
// the elements sit in. Started only by src/utils/ifcEngine.js.
//
// THIS WORKER FETCHES NOTHING. ifcEngine.js fetches web-ifc's script and wasm,
// checks both against their pinned SHA-256 (utils/integrity.js), and posts
// the verified bytes here. The script runs from a blob: URL made from those
// bytes. web-ifc locates its wasm by URL and fetches it; that one request is
// answered here, from the verified bytes, so nothing leaves the worker.

const WASM_NAME = 'verified-web-ifc.wasm'
let api = null

function install(script, wasm) {
  api = (async () => {
    const url = URL.createObjectURL(new Blob([script], { type: 'text/javascript' }))
    try {
      self.importScripts(url)
    } finally {
      URL.revokeObjectURL(url)
    }
    if (!self.WebIFC?.IfcAPI) throw new Error('the IFC engine loaded but exposed no API')
    // Only the verified wasm is answered; every other request is refused, so
    // the engine cannot reach the network from here.
    self.fetch = (input) => {
      const href = typeof input === 'string' ? input : input?.url || String(input || '')
      if (href.endsWith(WASM_NAME)) return Promise.resolve(new Response(wasm, { headers: { 'Content-Type': 'application/wasm' } }))
      return Promise.reject(new Error('no network in this worker'))
    }
    const ifc = new self.WebIFC.IfcAPI()
    await ifc.Init(() => WASM_NAME, true)
    return ifc
  })()
  api.catch(() => {})
}

const nameOf = (ifc, model, id) => {
  try {
    const line = ifc.GetLine(model, id)
    const name = line?.Name?.value || line?.LongName?.value || ''
    const type = ifc.GetNameFromTypeCode(ifc.GetLineType(model, id)) || ''
    return { name: String(name), type: String(type) }
  } catch {
    return { name: '', type: '' }
  }
}

function transform(verts, m) {
  // Interleaved x, y, z, nx, ny, nz; m is a column-major 4x4.
  const n = verts.length / 6
  const position = new Float32Array(n * 3)
  const normal = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const x = verts[i * 6]
    const y = verts[i * 6 + 1]
    const z = verts[i * 6 + 2]
    position[i * 3] = m[0] * x + m[4] * y + m[8] * z + m[12]
    position[i * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]
    position[i * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]
    const nx = verts[i * 6 + 3]
    const ny = verts[i * 6 + 4]
    const nz = verts[i * 6 + 5]
    normal[i * 3] = m[0] * nx + m[4] * ny + m[8] * nz
    normal[i * 3 + 1] = m[1] * nx + m[5] * ny + m[9] * nz
    normal[i * 3 + 2] = m[2] * nx + m[6] * ny + m[10] * nz
  }
  return { position, normal }
}

self.onmessage = async (e) => {
  const data = e.data || {}
  if (data.type === 'engine') { install(data.script, data.wasm); return }
  const { id, bytes } = data
  const progress = (stage) => self.postMessage({ id, type: 'progress', stage })
  let ifc = null
  let model = -1
  try {
    if (!api) throw new Error('the IFC engine was not delivered to the worker')
    ifc = await api
    progress('parsing')
    model = ifc.OpenModel(bytes, { COORDINATE_TO_ORIGIN: true })
    if (model < 0) throw new Error('web-ifc could not open it')
    const products = []
    const transfer = []
    ifc.StreamAllMeshes(model, (flat) => {
      const parts = []
      const placed = flat.geometries
      for (let i = 0; i < placed.size(); i++) {
        const pg = placed.get(i)
        const geom = ifc.GetGeometry(model, pg.geometryExpressID)
        const verts = ifc.GetVertexArray(geom.GetVertexData(), geom.GetVertexDataSize())
        const index = ifc.GetIndexArray(geom.GetIndexData(), geom.GetIndexDataSize())
        if (verts.length && index.length) {
          const { position, normal } = transform(verts, pg.flatTransformation)
          const idx = Uint32Array.from(index)
          parts.push({ position, normal, index: idx, color: [pg.color.x, pg.color.y, pg.color.z, pg.color.w] })
          transfer.push(position.buffer, normal.buffer, idx.buffer)
        }
        geom.delete?.()
      }
      if (parts.length) products.push({ id: flat.expressID, ...nameOf(ifc, model, flat.expressID), parts })
    })
    if (!products.length) throw new Error('it was read, but it contains no building element with geometry')
    let tree = null
    try {
      const node = (n) => ({ id: n.expressID, ...nameOf(ifc, model, n.expressID), children: (n.children || []).map(node) })
      tree = node(await ifc.properties.getSpatialStructure(model, false))
    } catch { /* the elements still draw, ungrouped */ }
    self.postMessage({ id, type: 'result', result: { products, tree } }, transfer)
  } catch (err) {
    self.postMessage({ id, type: 'error', message: String(err?.message || err) })
  } finally {
    if (ifc && model >= 0) { try { ifc.CloseModel(model) } catch { /* already closed */ } }
  }
}
