// A GLB, rewritten with EXT_meshopt_compression.
//
// GLTFExporter writes plain buffers. This takes its GLB and replaces every
// vertex-attribute and index buffer view with meshoptimizer's lossless codec:
// the decoded bytes are identical to the originals, so positions, normals and
// UVs are not quantised or moved. Buffer views nothing compresses well
// (images, animation) are copied as they are.
//
// THE ENCODER is meshoptimizer's own WebAssembly build (MIT), 24 kB, fetched
// from jsDelivr at an exact version and run only if its SHA-256 matches, the
// same rule as the CAD engine (see integrity.js). Version 0.25.0 is pinned
// because its encoder writes vertex codec version 0, the version
// EXT_meshopt_compression specifies; later releases default to version 1.
//
// Layout of the result: buffer 0 is the GLB's BIN chunk and holds the
// compressed streams plus any uncompressed views; buffer 1 is the extension's
// "fallback" buffer, which has a length and no data, and which every
// compressed view points at for its decoded layout.
import { fetchVerified } from '../integrity.js'

export const MESHOPT_VERSION = '0.25.0'
export const meshoptEncoderURL = `https://cdn.jsdelivr.net/npm/meshoptimizer@${MESHOPT_VERSION}/meshopt_encoder.module.js`
export const MESHOPT_SHA256 = '54f67e999c6facbb946219f967e96cb6dc00a004d1c7c7ae5ca373e003600ebf'

const EXT = 'EXT_meshopt_compression'
const ARRAY_BUFFER = 34962
const ELEMENT_ARRAY_BUFFER = 34963
const TRIANGLES = 4

let encoderPromise = null

/** The verified encoder module's MeshoptEncoder, ready to use. */
export function loadMeshoptEncoder({ signal } = {}) {
  if (!encoderPromise) {
    encoderPromise = (async () => {
      const bytes = await fetchVerified(meshoptEncoderURL, MESHOPT_SHA256, { label: 'The mesh compressor', signal })
      const url = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }))
      try {
        const mod = await import(/* @vite-ignore */ url)
        await mod.MeshoptEncoder.ready
        return mod.MeshoptEncoder
      } finally {
        URL.revokeObjectURL(url)
      }
    })()
    encoderPromise.catch(() => { encoderPromise = null })
  }
  return encoderPromise
}

const align4 = (n) => (n + 3) & ~3

/** Split a GLB into its JSON and its BIN chunk. */
export function readGlb(buffer) {
  const view = new DataView(buffer)
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB')
  const length = view.getUint32(8, true)
  let at = 12
  let json = null
  let bin = new Uint8Array(0)
  while (at < length) {
    const size = view.getUint32(at, true)
    const type = view.getUint32(at + 4, true)
    const body = new Uint8Array(buffer, at + 8, size)
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(body))
    else if (type === 0x004e4942) bin = body
    at += 8 + size
  }
  if (!json) throw new Error('the GLB has no JSON chunk')
  return { json, bin }
}

/** Join JSON and a BIN chunk into a GLB. */
export function writeGlb(json, bin) {
  const text = new TextEncoder().encode(JSON.stringify(json))
  const jsonLen = align4(text.length)
  const binLen = align4(bin.length)
  const total = 12 + 8 + jsonLen + (binLen ? 8 + binLen : 0)
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, jsonLen, true)
  view.setUint32(16, 0x4e4f534a, true)
  out.set(text, 20)
  out.fill(0x20, 20 + text.length, 20 + jsonLen)
  if (binLen) {
    const at = 20 + jsonLen
    view.setUint32(at, binLen, true)
    view.setUint32(at + 4, 0x004e4942, true)
    out.set(bin, at + 8)
  }
  return out
}

/**
 * Compress a GLB's geometry. `encoder` is a MeshoptEncoder (see
 * loadMeshoptEncoder). Returns { glb: Uint8Array, before, after } where the
 * two sizes are the geometry bytes before and after.
 */
export function compressGlb(buffer, encoder) {
  const { json, bin } = readGlb(buffer)
  if ((json.buffers || []).length > 1) throw new Error('a GLB with more than one buffer is not compressed')
  const views = json.bufferViews || []

  // How each view is used: vertex attributes by their accessors' element
  // size, indices by whether every primitive reading them draws triangles.
  const use = views.map(() => ({ kind: null, count: 0, stride: 0, triangles: true }))
  const accessors = json.accessors || []
  const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }
  const bytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }
  for (const mesh of json.meshes || []) {
    for (const prim of mesh.primitives || []) {
      const mode = prim.mode ?? TRIANGLES
      for (const id of Object.values(prim.attributes || {})) {
        const a = accessors[id]
        if (a?.bufferView == null) continue
        const u = use[a.bufferView]
        const stride = views[a.bufferView].byteStride || size[a.type] * bytes[a.componentType]
        u.kind = u.kind || 'attributes'
        u.stride = stride
        u.count = Math.max(u.count, Math.floor(views[a.bufferView].byteLength / stride))
      }
      const ia = prim.indices != null ? accessors[prim.indices] : null
      if (ia?.bufferView != null) {
        const u = use[ia.bufferView]
        u.kind = 'indices'
        u.stride = bytes[ia.componentType]
        u.count = Math.max(u.count, ia.count)
        if (mode !== TRIANGLES || ia.count % 3 !== 0) u.triangles = false
      }
    }
  }

  const parts = []
  let at = 0
  let before = 0
  let after = 0
  const push = (data) => {
    const offset = at
    parts.push(data)
    at += data.length
    const pad = align4(at) - at
    if (pad) { parts.push(new Uint8Array(pad)); at += pad }
    return offset
  }
  let fallbackLength = 0
  views.forEach((v, i) => {
    const u = use[i]
    const src = bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength)
    const ok = u.kind && u.stride > 0 && u.count > 0 && u.stride <= 256 && u.count * u.stride <= v.byteLength
      && (u.kind === 'attributes' ? u.stride % 4 === 0 : (u.stride === 2 || u.stride === 4))
    if (!ok) {
      v.byteOffset = push(src)
      return
    }
    const mode = u.kind === 'attributes' ? 'ATTRIBUTES' : (u.triangles ? 'TRIANGLES' : 'INDICES')
    const count = u.count
    // Trailing padding in the view is not data; the decoded view is exactly
    // count elements long.
    v.byteLength = count * u.stride
    const encoded = encoder.encodeGltfBuffer(new Uint8Array(src.subarray(0, v.byteLength)), count, u.stride, mode)
    before += v.byteLength
    after += encoded.length
    const offset = push(encoded)
    const fallbackOffset = fallbackLength
    fallbackLength = align4(fallbackLength + v.byteLength)
    v.extensions = { ...(v.extensions || {}), [EXT]: { buffer: 0, byteOffset: offset, byteLength: encoded.length, byteStride: u.stride, count, mode } }
    v.buffer = 1
    v.byteOffset = fallbackOffset
    if (u.kind === 'attributes') v.byteStride = u.stride
    v.target = v.target || (u.kind === 'attributes' ? ARRAY_BUFFER : ELEMENT_ARRAY_BUFFER)
  })

  const out = new Uint8Array(at)
  let w = 0
  for (const p of parts) { out.set(p, w); w += p.length }
  json.buffers = [{ byteLength: out.length }, { byteLength: Math.max(fallbackLength, 4), extensions: { [EXT]: { fallback: true } } }]
  json.extensionsUsed = [...new Set([...(json.extensionsUsed || []), EXT])]
  json.extensionsRequired = [...new Set([...(json.extensionsRequired || []), EXT])]
  return { glb: writeGlb(json, out), before, after }
}
