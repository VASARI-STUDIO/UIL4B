// ── THE 3D ENGINE: three.js, its loaders and exporters, and the viewer ───────
//
// The only module under src/ that imports three.js. src/pages/ThreeDViewer.jsx
// reaches it through ONE dynamic import() that runs when a visitor first brings
// a file (or points at the drop area, which prefetches it), so Vite emits it as
// its own chunk and neither the homepage nor the /create/3d-viewer route pays
// for it on open. tests/unit/three-d-viewer.test.js builds the app and fails if
// three.js reaches the entry chunk or the page's own chunk.
//
// Every loader and exporter is a named import from three/examples/jsm, so only
// those ship. Specifiers carry their `.js` so `node --test` can import this
// file too: the parse and export halves below run in Node, and the unit tests
// convert real geometry through them rather than trusting a mock.
//
// It exposes four things and hides the library behind them:
//   loadModel(drop, opts)     — a File in, a drawable Group out, with the
//                               per-format honesty (what was skipped, what was
//                               defaulted) as warnings;
//   parseModel(format, buf)   — the same without the File reading, for tests;
//   exportModel(object, fmt)  — a Group in, a Blob out;
//   createViewer(canvas, frame) — renderer, camera, lights, orbit, keyboard
//                               orbit, and the dispose that returns the WebGL
//                               context.
//
// DISPOSAL IS NOT OPTIONAL. Browsers cap live WebGL contexts (Chromium at 16),
// and a viewer that leaks one per visit kills the tab a few visits later.
import {
  ACESFilmicToneMapping,
  Box3,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  GridHelper,
  Group,
  HemisphereLight,
  LoadingManager,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Spherical,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js'
import { readCad } from './cadEngine.js'
import { extensionOf, signatureProblem } from './meshFormats.js'

// ── Materials ────────────────────────────────────────────────────────────────

// What a model with no materials of its own is drawn in: a warm mid-grey that
// reads against both theme grounds. DoubleSide because STL and OBJ files from
// the wild have inconsistent winding, and a face that vanishes when orbited
// past reads as a hole in the model rather than a culling choice.
function defaultMaterial() {
  return new MeshStandardMaterial({ color: 0xa9a59b, metalness: 0.05, roughness: 0.6, side: DoubleSide })
}

function materialsOf(object) {
  if (!object.material) return []
  return Array.isArray(object.material) ? object.material : [object.material]
}

function disposeMaterial(m) {
  for (const key of Object.keys(m)) {
    const v = m[key]
    if (v && v.isTexture) v.dispose()
  }
  m.dispose()
}

export function disposeObject(root) {
  root?.traverse((o) => {
    if (o.geometry) o.geometry.dispose()
    for (const m of materialsOf(o)) disposeMaterial(m)
  })
}

// ── Measuring ────────────────────────────────────────────────────────────────

/**
 * What the panel shows. Counts are read off the geometry that is actually
 * drawn, so a non-indexed STL reports three vertices per triangle — which is
 * what the file holds — rather than a deduplicated figure the file does not.
 */
export function measure(object) {
  let triangles = 0
  let vertices = 0
  let meshes = 0
  let points = 0
  const materials = new Set()
  object.updateMatrixWorld(true)
  object.traverse((o) => {
    const pos = o.geometry?.attributes?.position
    if (!pos) return
    if (o.isMesh) {
      meshes += 1
      vertices += pos.count
      triangles += Math.floor((o.geometry.index ? o.geometry.index.count : pos.count) / 3)
    } else if (o.isPoints) {
      points += pos.count
      vertices += pos.count
    }
    for (const m of materialsOf(o)) materials.add(m.uuid)
  })
  const box = new Box3().setFromObject(object)
  const empty = box.isEmpty()
  const size = empty ? new Vector3() : box.getSize(new Vector3())
  return { triangles, vertices, meshes, points, materials: materials.size, size: [size.x, size.y, size.z], empty }
}

// ── Loading ──────────────────────────────────────────────────────────────────

function abortError() {
  const e = new Error('cancelled')
  e.name = 'AbortError'
  return e
}

/** Read a File in chunks so a 100 MB drop reports progress rather than freezing. */
async function readFileBytes(file, onStage, signal) {
  const total = file.size
  if (typeof file.stream !== 'function') {
    const buf = await file.arrayBuffer()
    onStage?.({ stage: 'reading', loaded: total, total })
    return buf
  }
  const reader = file.stream().getReader()
  const out = new Uint8Array(total)
  let at = 0
  for (;;) {
    if (signal?.aborted) {
      reader.cancel().catch(() => {})
      throw abortError()
    }
    const { done, value } = await reader.read()
    if (done) break
    const n = Math.min(value.length, out.length - at)
    out.set(value.subarray(0, n), at)
    at += n
    onStage?.({ stage: 'reading', loaded: at, total })
    if (at >= out.length) break
  }
  return at === total ? out.buffer : out.buffer.slice(0, at)
}

// Let the progress line paint before a synchronous parse takes the thread.
const yieldToPaint = () => new Promise((r) => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(r, 0))
  else setTimeout(r, 0)
})

const decode = (buffer) => new TextDecoder().decode(buffer)

function basename(url) {
  const clean = String(url).split(/[?#]/)[0]
  let name = clean.slice(clean.lastIndexOf('/') + 1)
  try { name = decodeURIComponent(name) } catch { /* keep it raw */ }
  return name.toLowerCase()
}

// A 1x1 transparent PNG, answered for any sidecar a model names that was not
// dropped with it — so a missing texture draws as "no texture" instead of the
// loader fetching `wood.png` from uil4b.com and receiving the 404 page.
const EMPTY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

/**
 * Sidecars resolve by file name: a .gltf asks for "textures/wood.png" and gets
 * the wood.png that was dropped beside it, through a blob URL that lives until
 * the model is disposed. Names that were asked for and not dropped are
 * collected so the page can say which ones.
 */
function companionResolver(companions) {
  const urls = new Map()
  const canBlob = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
  for (const f of companions) if (canBlob) urls.set(f.name.toLowerCase(), URL.createObjectURL(f))
  const missing = new Set()
  const manager = new LoadingManager()
  manager.setURLModifier((url) => {
    if (/^(data|blob):/i.test(url)) return url
    const hit = urls.get(basename(url))
    if (hit) return hit
    missing.add(basename(url))
    return EMPTY_PNG
  })
  const revoke = () => { for (const u of urls.values()) URL.revokeObjectURL(u) }
  return { manager, missing, revoke }
}

/**
 * A .gltf that points at an external .bin cannot be drawn without it, and the
 * loader's own failure for that ("Failed to load buffer") names nothing a
 * visitor can act on. So the JSON is read first and the missing files named.
 */
function gltfMissingBuffers(json, companions) {
  const have = new Set(companions.map((f) => f.name.toLowerCase()))
  return (json.buffers || [])
    .map((b) => b?.uri)
    .filter((uri) => uri && !/^data:/i.test(uri))
    .map((uri) => basename(uri))
    .filter((name) => !have.has(name))
}

/**
 * Bytes to a three.js object, by format. No File reading, no progress, no
 * signature check — loadModel() does those — so this is the half the unit tests
 * drive directly.
 *
 * @returns {Promise<{ object: import('three').Object3D, warnings: string[], missing: Set<string>, revoke: () => void }>}
 */
export async function parseModel(format, buffer, { companions = [] } = {}) {
  const warnings = []
  const { manager, missing, revoke } = companionResolver(companions)
  try {
    let object
    switch (format.id) {
      case 'obj': {
        const loader = new OBJLoader(manager)
        const mtl = companions.find((f) => extensionOf(f.name) === 'mtl')
        if (mtl) {
          const creator = new MTLLoader(manager).parse(await mtl.text(), '')
          creator.preload()
          loader.setMaterials(creator)
        } else if (/^\s*mtllib\s/m.test(decode(buffer.slice(0, 65536)))) {
          warnings.push('This OBJ names a .mtl material file that was not dropped with it, so it is drawn in a plain grey.')
        }
        object = loader.parse(decode(buffer))
        // OBJLoader's own fallback is a flat, single-sided material; swap it
        // for the lit default so an OBJ without an .mtl looks like an STL does.
        if (!mtl) object.traverse((o) => { if (o.isMesh) { disposeMaterial(o.material); o.material = defaultMaterial() } })
        break
      }
      case 'stl': {
        const geometry = new STLLoader().parse(buffer)
        const material = defaultMaterial()
        if (geometry.hasColors) {
          material.vertexColors = true
          material.color.set(0xffffff)
          if (geometry.alpha < 1) { material.transparent = true; material.opacity = geometry.alpha }
        }
        object = new Mesh(geometry, material)
        break
      }
      case 'ply': {
        const geometry = new PLYLoader().parse(buffer)
        const hasColor = !!geometry.attributes.color
        // A PLY with no face list is a point cloud — a scan, typically — and
        // the honest drawing of it is points, not an empty mesh.
        if (!geometry.index) {
          geometry.computeBoundingBox()
          const s = geometry.boundingBox.getSize(new Vector3())
          const extent = Math.max(s.x, s.y, s.z) || 1
          const material = new PointsMaterial({ size: extent * 0.004, vertexColors: hasColor, color: hasColor ? 0xffffff : 0x8a8780 })
          warnings.push('This PLY has no faces, so it is drawn as a point cloud. STL and 3MF need triangles and are not offered for it.')
          object = new Points(geometry, material)
        } else {
          const material = defaultMaterial()
          if (hasColor) { material.vertexColors = true; material.color.set(0xffffff) }
          object = new Mesh(geometry, material)
        }
        break
      }
      case 'gltf':
      case 'glb': {
        let data = buffer
        if (format.id === 'gltf') {
          data = decode(buffer)
          let json
          try { json = JSON.parse(data) } catch { throw new Error('gltf-not-json') }
          const absent = gltfMissingBuffers(json, companions)
          if (absent.length) {
            const e = new Error('gltf-missing-buffers')
            e.files = absent
            throw e
          }
        }
        const loader = new GLTFLoader(manager)
        const gltf = await new Promise((resolve, reject) => loader.parse(data, '', resolve, reject))
        object = gltf.scene || gltf.scenes?.[0] || new Group()
        if (gltf.animations?.length) warnings.push(`${gltf.animations.length} animation${gltf.animations.length === 1 ? '' : 's'} in the file ${gltf.animations.length === 1 ? 'is' : 'are'} not played; the model is shown at rest.`)
        break
      }
      case '3mf':
        object = new ThreeMFLoader(manager).parse(buffer)
        break
      case 'fbx':
        object = new FBXLoader(manager).parse(buffer, '')
        if (object.animations?.length) warnings.push(`${object.animations.length} animation${object.animations.length === 1 ? '' : 's'} in the file ${object.animations.length === 1 ? 'is' : 'are'} not played; the model is shown at rest.`)
        break
      default:
        throw new Error(`${format.label} has no mesh loader`)
    }
    return { object, warnings, missing, revoke }
  } catch (err) {
    revoke()
    throw err
  }
}

// occt returns colours as 0..1 floats; guard the 0..255 case too, since a
// colour of (200, 30, 30) read as floats would come out white. Pure black is
// what occt reports for a body with NO colour (measured on an uncoloured IGES
// cube), so it is treated as absent rather than drawn as a black hole.
function cadColor(rgb) {
  if (!Array.isArray(rgb) || rgb.length < 3) return null
  const [r, g, b] = rgb
  if (r === 0 && g === 0 && b === 0) return null
  const scale = Math.max(r, g, b) > 1 ? 1 / 255 : 1
  return new Color(r * scale, g * scale, b * scale)
}

/** occt's arrays (see cadWorker.js) to a three.js Group. Exported for tests. */
export function cadToGroup(result) {
  const group = new Group()
  for (const m of result.meshes) {
    if (!m.position?.length) continue
    let geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(m.position, 3))
    if (m.normal && m.normal.length === m.position.length) geometry.setAttribute('normal', new Float32BufferAttribute(m.normal, 3))
    if (m.index?.length) geometry.setIndex(Array.from(m.index))

    const material = defaultMaterial()
    const base = cadColor(m.color) || material.color.clone()
    material.color.copy(base)

    // Per-face colours: a STEP from CAD software often paints faces rather than
    // bodies. Faces are triangle ranges, so the geometry is de-indexed and every
    // triangle in a painted range takes its face's colour.
    const painted = (m.faces || []).map((f) => ({ ...f, c: cadColor(f.color) })).filter((f) => f.c)
    if (painted.length && geometry.index) {
      geometry = geometry.toNonIndexed()
      const count = geometry.attributes.position.count
      const colors = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) { colors[i * 3] = base.r; colors[i * 3 + 1] = base.g; colors[i * 3 + 2] = base.b }
      for (const face of painted) {
        for (let t = face.first; t <= face.last; t++) {
          for (let v = 0; v < 3; v++) {
            const i = (t * 3 + v) * 3
            if (i + 2 >= colors.length) break
            colors[i] = face.c.r; colors[i + 1] = face.c.g; colors[i + 2] = face.c.b
          }
        }
      }
      geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
      material.vertexColors = true
      material.color.set(0xffffff)
    }
    if (!geometry.attributes.normal) geometry.computeVertexNormals()
    const mesh = new Mesh(geometry, material)
    mesh.name = m.name || ''
    group.add(mesh)
  }
  return group
}

/**
 * Lights and cameras a file carries would relight or reframe the viewer, so
 * they are removed from what is drawn; meshes with no normals get computed
 * ones so lighting has something to work with.
 */
export function normalise(object, warnings) {
  const strip = []
  object.traverse((o) => {
    if (o.isLight || o.isCamera) strip.push(o)
    if (o.isMesh && o.geometry && !o.geometry.attributes.normal) o.geometry.computeVertexNormals()
  })
  for (const o of strip) o.parent?.remove(o)
  if (strip.length) warnings.push(`${strip.length} light${strip.length === 1 ? '' : 's'} or camera${strip.length === 1 ? '' : 's'} stored in the file ${strip.length === 1 ? 'was' : 'were'} not loaded; the viewer uses its own.`)
  const root = (object.isGroup || object.isScene) && !object.isMesh ? object : new Group().add(object)
  root.updateMatrixWorld(true)
  return root
}

/**
 * Turn any failure into one sentence that names the problem and, where there
 * is one, the way out. Returns null for a cancel, which is not an error.
 */
export function describeLoadError(err, format, name) {
  if (err?.name === 'AbortError') return null
  const msg = String(err?.message || err || '')
  const file = name || `This ${format?.label || ''} file`.replace(/\s+file$/, ' file')
  if (msg === 'gltf-not-json') return `${file} is not valid JSON, so it cannot be a .gltf. If it is binary, it may be a .glb with the wrong extension.`
  if (msg === 'gltf-missing-buffers') return `${file} keeps its geometry in a separate file that was not dropped with it: ${(err.files || []).join(', ')}. Drop the .gltf and its .bin together.`
  if (msg.startsWith('signature:')) return `${file} could not be read as ${format?.label}: ${msg.slice('signature:'.length).trim()}.`
  if (msg.startsWith('empty-model')) return `${file} was read, but it contains nothing to draw: no triangles and no points.`
  if (/DRACOLoader|KHR_draco/i.test(msg)) return `${file} is Draco-compressed, which this viewer does not decode yet. Export it uncompressed and try again.`
  if (/KTX2Loader|KHR_texture_basisu/i.test(msg)) return `${file} uses KTX2 textures, which this viewer does not decode. Export the textures as PNG or JPEG.`
  if (/MeshoptDecoder|EXT_meshopt/i.test(msg)) return `${file} is meshopt-compressed, which this viewer does not decode. Export it uncompressed and try again.`
  if (/FBX version not supported/i.test(msg)) return `${file} is older than FBX 7 (2011). Save it as FBX 2011 or newer and try again.`
  if (/Unknown format|FBX/i.test(msg) && format?.id === 'fbx') return `${file} could not be read as FBX. Save it as FBX 2011 or newer.`
  if (/CAD engine|OpenCascade|solid or surface/i.test(msg)) return `${file}: ${msg}.`
  if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg)) {
    return 'The viewer could not be downloaded. Check the connection and choose the file again.'
  }
  return `${file} could not be read as ${format?.label || 'a model'}: ${msg || 'the reader stopped without saying why'}.`
}

/**
 * A dropped File to a drawable Group, with every stage reported.
 *
 * @param {{ primary: File, format: object, companions: File[] }} drop
 * @param {{ onStage?: Function, signal?: AbortSignal }} opts
 *   onStage receives { stage: 'reading'|'engine'|'parsing', loaded?, total? }.
 * @returns {Promise<{ object: import('three').Group, warnings: string[], revoke: Function }>}
 */
export async function loadModel(drop, { onStage, signal } = {}) {
  const { primary, format, companions = [] } = drop
  const buffer = await readFileBytes(primary, onStage, signal)
  if (signal?.aborted) throw abortError()

  const problem = signatureProblem(format.id, new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 1 << 20)), buffer.byteLength)
  if (problem) throw new Error(`signature: ${problem}`)

  let object
  let warnings = []
  let revoke = () => {}
  let missing = new Set()
  if (format.engine === 'cad') {
    const result = await readCad(new Uint8Array(buffer), format.id, onStage, signal)
    if (signal?.aborted) throw abortError()
    onStage?.({ stage: 'parsing' })
    await yieldToPaint()
    object = cadToGroup(result)
    warnings.push('Curved surfaces are approximated with triangles at 0.1% of the model\'s size.')
  } else {
    onStage?.({ stage: 'parsing' })
    await yieldToPaint()
    ;({ object, warnings, revoke, missing } = await parseModel(format, buffer, { companions }))
  }
  if (signal?.aborted) {
    disposeObject(object)
    revoke()
    throw abortError()
  }
  if (missing.size) {
    const names = [...missing]
    warnings.push(`${names.length === 1 ? 'A file it refers to was' : `${names.length} files it refers to were`} not dropped with it (${names.slice(0, 4).join(', ')}${names.length > 4 ? ', …' : ''}), so ${names.length === 1 ? 'it is' : 'they are'} left out.`)
  }
  const root = normalise(object, warnings)
  const stats = measure(root)
  if (stats.empty || (stats.triangles === 0 && stats.points === 0)) {
    disposeObject(root)
    revoke()
    throw new Error('empty-model')
  }
  return { object: root, warnings, revoke }
}

// ── Exporting ────────────────────────────────────────────────────────────────

const fmtNum = (n) => {
  if (!Number.isFinite(n)) return '0'
  const s = n.toFixed(6).replace(/\.?0+$/, '')
  return s === '-0' ? '0' : s
}

/**
 * 3MF: a zip holding one XML model. three.js has a 3MF reader and no writer,
 * and this is the smallest writer the core specification accepts — vertices
 * and triangles per object, world transforms baked in, one build item each.
 * `unit` is written from the source when the source has one; bare numbers are
 * written as millimetres, which is the 3MF default and what a slicer assumes.
 */
async function export3MF(object, unit) {
  const objects = []
  const v = new Vector3()
  object.updateMatrixWorld(true)
  object.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return
    const pos = o.geometry.attributes.position
    const idx = o.geometry.index
    const verts = []
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
      verts.push(`<vertex x="${fmtNum(v.x)}" y="${fmtNum(v.y)}" z="${fmtNum(v.z)}"/>`)
    }
    // A negative-determinant transform (a mirror) flips winding; flip it back
    // so the normals a slicer computes still point out.
    const flip = new Matrix4().copy(o.matrixWorld).determinant() < 0
    const tris = []
    const count = idx ? idx.count : pos.count
    for (let t = 0; t + 2 < count; t += 3) {
      const a = idx ? idx.getX(t) : t
      const b = idx ? idx.getX(t + 1) : t + 1
      const c = idx ? idx.getX(t + 2) : t + 2
      if (a === b || b === c || a === c) continue
      tris.push(flip ? `<triangle v1="${a}" v2="${c}" v3="${b}"/>` : `<triangle v1="${a}" v2="${b}" v3="${c}"/>`)
    }
    if (tris.length) objects.push({ verts, tris })
  })
  if (!objects.length) throw new Error('there are no triangles to write')
  const unitName = unit === 'm' ? 'meter' : 'millimeter'
  const model = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<model unit="${unitName}" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">`,
    '<resources>',
    ...objects.map((ob, i) => `<object id="${i + 1}" type="model"><mesh><vertices>${ob.verts.join('')}</vertices><triangles>${ob.tris.join('')}</triangles></mesh></object>`),
    '</resources>',
    `<build>${objects.map((_, i) => `<item objectid="${i + 1}"/>`).join('')}</build>`,
    '</model>',
  ].join('\n')
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>')
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>')
  zip.file('3D/3dmodel.model', model)
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}

/**
 * A Group to a Blob in the named output format. `sourceUnit` is the input
 * format's unit (see meshFormats.js); only 3MF records one.
 */
export async function exportModel(object, format, { sourceUnit = null } = {}) {
  object.updateMatrixWorld(true)
  switch (format.id) {
    case 'glb': {
      const ab = await new GLTFExporter().parseAsync(object, { binary: true, onlyVisible: false })
      return new Blob([ab], { type: format.mime })
    }
    case 'gltf': {
      const json = await new GLTFExporter().parseAsync(object, { binary: false, onlyVisible: false })
      return new Blob([JSON.stringify(json)], { type: format.mime })
    }
    case 'obj':
      return new Blob([new OBJExporter().parse(object)], { type: format.mime })
    case 'stl':
      return new Blob([new STLExporter().parse(object, { binary: true })], { type: format.mime })
    case 'ply':
      return new Blob([new PLYExporter().parse(object, null, { binary: true })], { type: format.mime })
    case '3mf':
      return new Blob([await export3MF(object, sourceUnit)], { type: format.mime })
    default:
      throw new Error(`${format.label} has no writer`)
  }
}

// ── The viewer ───────────────────────────────────────────────────────────────

const nice = (x) => {
  const p = Math.pow(10, Math.floor(Math.log10(x)))
  const m = x / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p
}

function cssColor(el, name, fallback) {
  try {
    const v = getComputedStyle(el).getPropertyValue(name).trim()
    if (v) return new Color(v)
  } catch { /* an unparsable token falls back rather than crashing */ }
  return new Color(fallback)
}

/**
 * The renderer and everything around it, bound to one canvas inside one
 * frame. `frame` is measured for size; the canvas fills it.
 */
export function createViewer(canvas, frame) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    // Keeps the last frame readable, which is how the acceptance suite proves
    // pixels were drawn rather than trusting that setModel() was called.
    preserveDrawingBuffer: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.setClearColor(0x000000, 0)

  const scene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()
  scene.environment = environment
  scene.environmentIntensity = 0.8

  const camera = new PerspectiveCamera(40, 1, 0.01, 1000)
  // The key light rides on the camera, so whatever faces the visitor is lit —
  // a model is never orbited into its own shadow.
  const key = new DirectionalLight(0xffffff, 1.3)
  key.position.set(0.5, 0.9, 1.2)
  camera.add(key)
  scene.add(camera)
  scene.add(new HemisphereLight(0xffffff, 0x777777, 0.7))

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.09
  controls.autoRotateSpeed = 1.2
  controls.screenSpacePanning = true

  let model = null
  let grid = null
  let gridBox = null
  let raf = 0
  let running = false
  let visible = !document.hidden
  let onScreen = true
  let disposed = false
  let idleFrames = 0

  const render = () => renderer.render(scene, camera)

  function size() {
    const w = frame.clientWidth
    const h = frame.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    render()
  }

  // The loop runs while something is moving — a drag, damping settling, the
  // turntable — and stops itself after a short idle, so a model left on screen
  // costs nothing. Any interaction restarts it.
  function loop() {
    if (!running) return
    const moved = controls.update()
    render()
    idleFrames = moved || controls.autoRotate ? 0 : idleFrames + 1
    if (idleFrames > 30) { running = false; return }
    raf = requestAnimationFrame(loop)
  }
  function wake() {
    idleFrames = 0
    if (running || disposed || !model || !visible || !onScreen) return
    running = true
    raf = requestAnimationFrame(loop)
  }
  function stop() {
    running = false
    cancelAnimationFrame(raf)
  }
  controls.addEventListener('start', wake)
  controls.addEventListener('change', wake)

  const ro = new ResizeObserver(size)
  ro.observe(frame)
  size()
  const onVisibility = () => { visible = !document.hidden; if (visible) wake(); else stop() }
  document.addEventListener('visibilitychange', onVisibility)
  const io = new IntersectionObserver(([entry]) => { onScreen = !!entry?.isIntersecting; if (onScreen) wake(); else stop() })
  io.observe(frame)

  function placeGrid(box) {
    if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); grid = null }
    gridBox = box
    const s = box.getSize(new Vector3())
    const c = box.getCenter(new Vector3())
    const extent = Math.max(s.x, s.y, s.z) || 1
    const step = nice(extent / 8)
    const span = step * Math.max(4, Math.ceil((extent * 2.2) / step))
    const colour = cssColor(frame, '--t3', 0x9a978f)
    grid = new GridHelper(span, Math.round(span / step), colour, colour)
    grid.material.transparent = true
    grid.material.opacity = 0.35
    grid.material.depthWrite = false
    grid.position.set(c.x, box.min.y, c.z)
    scene.add(grid)
    return step
  }

  // The grid is drawn in a theme token, so a theme switch re-reads it.
  const themeWatch = new MutationObserver(() => {
    if (gridBox) { placeGrid(gridBox); render() }
  })
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  function fit() {
    if (!model) return
    const box = new Box3().setFromObject(model)
    if (box.isEmpty()) return
    const c = box.getCenter(new Vector3())
    const s = box.getSize(new Vector3())
    const extent = Math.max(s.x, s.y, s.z) || 1
    const dist = (extent / (2 * Math.tan((camera.fov * Math.PI) / 360))) * 1.25
    camera.near = Math.max(dist / 500, 1e-4)
    camera.far = dist * 60
    camera.position.set(c.x + dist * 0.58, c.y + dist * 0.44, c.z + dist * 0.72)
    camera.updateProjectionMatrix()
    controls.target.copy(c)
    controls.minDistance = extent * 0.02
    controls.maxDistance = dist * 12
    controls.update()
    render()
  }

  // Keyboard orbit. OrbitControls only pans from the keyboard, so rotation
  // and zoom are done here, on the same spherical coordinates it uses, and
  // then handed back to it so a mouse drag continues from where the keys left
  // the camera.
  const spherical = new Spherical()
  const offset = new Vector3()
  function orbit(dTheta, dPhi) {
    if (!model) return
    offset.copy(camera.position).sub(controls.target)
    spherical.setFromVector3(offset)
    spherical.theta += dTheta
    spherical.phi = Math.min(Math.PI - 0.05, Math.max(0.05, spherical.phi + dPhi))
    offset.setFromSpherical(spherical)
    camera.position.copy(controls.target).add(offset)
    camera.lookAt(controls.target)
    controls.update()
    render()
  }
  function zoom(factor) {
    if (!model) return
    offset.copy(camera.position).sub(controls.target)
    const len = Math.min(controls.maxDistance, Math.max(controls.minDistance, offset.length() * factor))
    offset.setLength(len)
    camera.position.copy(controls.target).add(offset)
    controls.update()
    render()
  }

  function clear() {
    stop()
    if (model) {
      scene.remove(model)
      disposeObject(model)
      model.userData.revoke?.()
      model = null
    }
    if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); grid = null }
    gridBox = null
    renderer.clear()
  }

  return {
    /** Replace whatever is shown. Returns the panel's numbers. */
    setModel(object, revoke) {
      clear()
      model = object
      model.userData.revoke = revoke
      scene.add(model)
      const stats = measure(model)
      stats.gridStep = placeGrid(new Box3().setFromObject(model))
      fit()
      wake()
      return stats
    },
    clear,
    fit,
    orbit,
    zoom,
    setWireframe(on) {
      if (!model) return
      model.traverse((o) => { if (o.isMesh) for (const m of materialsOf(o)) m.wireframe = !!on })
      render()
    },
    setAutoRotate(on) {
      controls.autoRotate = !!on
      if (on) wake()
    },
    // Under reduced motion the drag still moves the model — the visitor is
    // moving it — but it stops when the pointer stops instead of gliding on.
    setReducedMotion(on) {
      controls.enableDamping = !on
    },
    get model() { return model },
    dispose() {
      disposed = true
      stop()
      ro.disconnect()
      io.disconnect()
      themeWatch.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      clear()
      controls.dispose()
      environment.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
