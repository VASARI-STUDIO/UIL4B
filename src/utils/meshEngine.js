// The 3D engine: three.js, its loaders and exporters, and the viewer.
//
// src/pages/ModelConverter.jsx reaches this module through ONE dynamic
// import() that runs when a visitor first brings a file (or points at the
// drop area, which prefetches it), so Vite emits it as its own chunk and
// neither the homepage nor the /create/3d-converter route pays for it on open.
// Inside it, every loader beyond the five most common formats is itself a
// dynamic import, so a STEP file never downloads the VRML parser and an OBJ
// never downloads the USD one. tests/unit/model-converter.test.js builds the
// app and fails if three.js or any loader reaches the entry chunk or the
// page's own chunk.
//
// Specifiers carry their `.js` so `node --test` can import this file too: the
// parse and export halves run in Node, and the unit tests convert real
// geometry through them rather than trusting a mock.
//
// It exposes:
//   loadModel(drop, opts)       a File in, a drawable Group out (Y up), with
//                               the per-format honesty (what was skipped, what
//                               was defaulted) as warnings;
//   parseModel(format, buf)     the same without the File reading, for tests;
//   exportModel(object, fmt)    a Group in, a Blob out, in the output format's
//                               unit and up axis;
//   createViewer(canvas, frame) renderer, camera, lights, orbit, keyboard
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
  SRGBColorSpace,
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
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js'
import { readCad } from './cadEngine.js'
import { readIfc } from './ifcEngine.js'
import { cadToGroup } from './mesh/cad.js'
import { parseDXF, parseOFF } from './mesh/parsers.js'
import { bakeSimilarity, cloneForExport, disposeExportCopy, upMatrix } from './mesh/transform.js'
import { describeSignatureProblem, extensionOf, signatureProblem, unitFactor, unitFromMetres } from './meshFormats.js'

export { cadToGroup }

// ── Loaders fetched on demand ────────────────────────────────────────────────
//
// One entry per module, so Vite gives each its own chunk. The Rhino reader
// and the meshopt writer fetch pinned engines from a CDN (see their files).
export const lazy = {
  fbx: () => import('three/examples/jsm/loaders/FBXLoader.js').then((m) => m.FBXLoader),
  threeMF: () => import('three/examples/jsm/loaders/3MFLoader.js').then((m) => m.ThreeMFLoader),
  dae: () => import('three/examples/jsm/loaders/ColladaLoader.js').then((m) => m.ColladaLoader),
  tds: () => import('three/examples/jsm/loaders/TDSLoader.js').then((m) => m.TDSLoader),
  lwo: () => import('three/examples/jsm/loaders/LWOLoader.js').then((m) => m.LWOLoader),
  vrml: () => import('three/examples/jsm/loaders/VRMLLoader.js').then((m) => m.VRMLLoader),
  amf: () => import('three/examples/jsm/loaders/AMFLoader.js').then((m) => m.AMFLoader),
  usd: () => import('three/examples/jsm/loaders/USDLoader.js').then((m) => m.USDLoader),
  kmz: () => import('three/examples/jsm/loaders/KMZLoader.js').then((m) => m.KMZLoader),
  vtk: () => import('three/examples/jsm/loaders/VTKLoader.js').then((m) => m.VTKLoader),
  xyz: () => import('three/examples/jsm/loaders/XYZLoader.js').then((m) => m.XYZLoader),
  pcd: () => import('three/examples/jsm/loaders/PCDLoader.js').then((m) => m.PCDLoader),
  draco: () => import('three/examples/jsm/loaders/DRACOLoader.js'),
  ktx2: () => import('three/examples/jsm/loaders/KTX2Loader.js').then((m) => m.KTX2Loader),
  meshopt: () => import('three/examples/jsm/libs/meshopt_decoder.module.js').then((m) => m.MeshoptDecoder),
  rhino: () => import('./mesh/rhino.js').then((m) => m.readRhino),
  usdz: () => import('three/examples/jsm/exporters/USDZExporter.js').then((m) => m.USDZExporter),
  meshoptWriter: () => import('./mesh/meshopt.js'),
}

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
 * drawn, so a non-indexed STL reports three vertices per triangle (which is
 * what the file holds) rather than a deduplicated figure the file does not.
 * `groups` counts the named assemblies and layers above the meshes.
 */
export function measure(object) {
  let triangles = 0
  let vertices = 0
  let meshes = 0
  let points = 0
  let groups = 0
  const materials = new Set()
  object.updateMatrixWorld(true)
  object.traverse((o) => {
    if (o !== object && !o.isMesh && !o.isPoints && o.children.length) groups += 1
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
  return { triangles, vertices, meshes, points, groups, materials: materials.size, size: [size.x, size.y, size.z], empty }
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

export function basename(url) {
  const clean = String(url).split(/[?#]/)[0]
  // Either separator: an MTL or glTF written on Windows names its textures
  // with backslashes, and the dropped file is keyed by its bare name.
  let name = clean.split(/[\\/]/).pop()
  try { name = decodeURIComponent(name) } catch { /* keep it raw */ }
  return name.toLowerCase()
}

// A 1x1 transparent PNG, answered for any sidecar a model names that was not
// dropped with it, so a missing texture draws as "no texture" instead of the
// loader fetching `wood.png` from this site and receiving the 404 page.
const EMPTY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

// The Draco and Basis decoders Vite emits beside three.js, which the loaders
// fetch themselves and the sidecar lookup must let through.
const OWN_ASSET = /\/(draco_|basis_)[\w.-]+$/

/**
 * Sidecars resolve by file name: a .gltf asks for "textures/wood.png" and gets
 * the wood.png that was dropped beside it, through a blob: URL that lives until
 * the model is disposed (the loaders fetch() it, so the CSP's connect-src
 * lists blob:). Names that were asked for and not dropped are
 * collected so the page can say which ones.
 */
function companionResolver(companions) {
  const urls = new Map()
  const canBlob = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
  for (const f of companions) if (canBlob) urls.set(f.name.toLowerCase(), URL.createObjectURL(f))
  const missing = new Set()
  const manager = new LoadingManager()
  manager.setURLModifier((url) => {
    if (/^(data|blob):/i.test(url) || OWN_ASSET.test(String(url).split(/[?#]/)[0])) return url
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

/** The extensions a glTF or GLB declares, read from its JSON. */
export function gltfExtensions(formatId, buffer) {
  try {
    let json
    if (formatId === 'gltf') json = JSON.parse(decode(buffer))
    else {
      const len = new DataView(buffer).getUint32(12, true)
      json = JSON.parse(decode(new Uint8Array(buffer, 20, len)))
    }
    return new Set([...(json.extensionsUsed || []), ...(json.extensionsRequired || [])])
  } catch {
    return new Set()
  }
}

/** A drawable Points object for a cloud, sized to its own extent. */
function pointCloud(geometry) {
  const hasColor = !!geometry.attributes.color
  geometry.computeBoundingBox()
  const s = geometry.boundingBox.getSize(new Vector3())
  const extent = Math.max(s.x, s.y, s.z) || 1
  const material = new PointsMaterial({ size: extent * 0.004, vertexColors: hasColor, color: hasColor ? 0xffffff : 0x8a8780 })
  return new Points(geometry, material)
}

/** A mesh from plain arrays (OFF and DXF). */
function arraysToMesh(positions, indices, colors, name) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  if (indices?.length) geometry.setIndex(indices)
  const material = defaultMaterial()
  if (colors) {
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    material.vertexColors = true
    material.color.set(0xffffff)
  }
  geometry.computeVertexNormals()
  const mesh = new Mesh(geometry, material)
  mesh.name = name || ''
  return mesh
}

// A legacy VTK file of POINTS / VERTICES only has no polygons to draw.
function vtkHasPolygons(buffer) {
  return /\bPOLYGONS\b|\bTRIANGLE_STRIPS\b|<Polys\b|<Strips\b|\bCELLS\b/.test(decode(buffer.slice(0, 1 << 20)))
}

const animationNote = (n) => `${n} animation${n === 1 ? '' : 's'} in the file ${n === 1 ? 'is' : 'are'} not played; the model is shown at rest.`

/**
 * Bytes to a three.js object, by format. No File reading, no progress, no
 * signature check (loadModel() does those), so this is the half the unit tests
 * drive directly.
 *
 * `renderer` is the viewer's WebGLRenderer, which KTX2 textures need to pick
 * a GPU format; without one, a KTX2-textured glTF is refused with a reason.
 * `unit` in the result is a unit found in the file itself; undefined when the
 * format's own unit (meshFormats.js) stands.
 *
 * @returns {Promise<{ object: import('three').Object3D, warnings: string[], missing: Set<string>, revoke: () => void, unit?: string|null }>}
 */
export async function parseModel(format, buffer, { companions = [], renderer = null, signal = null, onStage = null } = {}) {
  const warnings = []
  const { manager, missing, revoke } = companionResolver(companions)
  let unit
  const cleanups = []
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
        // A PLY with no face list is a point cloud (a scan, typically), and
        // the honest drawing of it is points, not an empty mesh.
        if (!geometry.index) {
          warnings.push('This PLY has no faces, so it is drawn as a point cloud. Formats that need triangles are not offered for it.')
          object = pointCloud(geometry)
        } else {
          const material = defaultMaterial()
          if (geometry.attributes.color) { material.vertexColors = true; material.color.set(0xffffff) }
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
        // Decoders load only for a file that declares their extension. The
        // Draco and Basis decoders are served from this site: Vite emits them
        // from the installed three package beside the chunks, and no CDN is
        // involved. Draco uses its glTF-only build, the smaller of the two.
        const ext = gltfExtensions(format.id, buffer)
        if (ext.has('KHR_draco_mesh_compression')) {
          const { DRACOLoader, DRACO_GLTF_CONFIG } = await lazy.draco()
          const draco = new DRACOLoader(manager).setDecoderPath(DRACO_GLTF_CONFIG)
          loader.setDRACOLoader(draco)
          cleanups.push(() => draco.dispose())
        }
        if (ext.has('EXT_meshopt_compression') || ext.has('KHR_meshopt_compression')) {
          const decoder = await lazy.meshopt()
          await decoder.ready
          loader.setMeshoptDecoder(decoder)
        }
        if (ext.has('KHR_texture_basisu')) {
          if (!renderer) throw new Error('ktx2-needs-viewer')
          const KTX2 = await lazy.ktx2()
          const ktx2 = new KTX2(manager).detectSupport(renderer)
          loader.setKTX2Loader(ktx2)
          cleanups.push(() => ktx2.dispose())
        }
        const gltf = await new Promise((resolve, reject) => loader.parse(data, '', resolve, reject))
        object = gltf.scene || gltf.scenes?.[0] || new Group()
        if (gltf.animations?.length) warnings.push(animationNote(gltf.animations.length))
        break
      }
      case '3mf': {
        // No cap on the DECOMPRESSED size (a 3MF is a zip): a crafted archive
        // can only exhaust the memory of the tab that opened it.
        const Loader = await lazy.threeMF()
        object = new Loader(manager).parse(buffer)
        break
      }
      case 'fbx': {
        const Loader = await lazy.fbx()
        object = new Loader(manager).parse(buffer, '')
        if (object.animations?.length) warnings.push(animationNote(object.animations.length))
        // GlobalSettings.UnitScaleFactor is centimetres per file unit. A
        // factor outside the unit list is scaled into metres on the root.
        const cm = Number(object.userData?.unitScaleFactor)
        if (cm > 0) {
          unit = unitFromMetres(cm / 100)
          if (!unit) { object.scale.multiplyScalar(cm / 100); unit = 'm' }
        }
        break
      }
      case 'dae': {
        const Loader = await lazy.dae()
        const result = new Loader(manager).parse(decode(buffer), '')
        if (!result?.scene) throw new Error('the COLLADA document has no visual scene')
        object = result.scene
        if (result.scene.animations?.length) warnings.push(animationNote(result.scene.animations.length))
        break
      }
      case 'kmz': {
        const Loader = await lazy.kmz()
        const result = new Loader(manager).parse(buffer)
        if (!result?.scene) throw new Error('the KMZ holds no COLLADA model')
        object = result.scene
        break
      }
      case '3ds': {
        const Loader = await lazy.tds()
        object = new Loader(manager).parse(buffer, '')
        break
      }
      case 'lwo': {
        const Loader = await lazy.lwo()
        const result = new Loader(manager).parse(buffer, '', '')
        object = new Group()
        for (const m of result.meshes || []) object.add(m)
        break
      }
      case 'wrl': {
        const Loader = await lazy.vrml()
        object = new Loader(manager).parse(decode(buffer), '')
        break
      }
      case 'amf': {
        const Loader = await lazy.amf()
        object = new Loader(manager).parse(buffer)
        break
      }
      case 'usd': {
        const Loader = await lazy.usd()
        object = await new Promise((resolve, reject) => {
          let settled = false
          const done = (g) => { if (!settled) { settled = true; resolve(g) } }
          const g = new Loader(manager).parse(buffer, '', done, (e) => { if (!settled) { settled = true; reject(e) } })
          // The loader calls back once its textures are in; a file without
          // textures is complete as soon as parse() returns.
          if (g) setTimeout(() => done(g), 0)
        })
        // The loader scales to metres when the file declares metersPerUnit
        // other than 1; a declared 1 is metres already.
        unit = object.scale.x !== 1 || /metersPerUnit\s*=\s*1(\.0*)?\b/.test(decode(buffer.slice(0, 65536))) ? 'm' : null
        break
      }
      case 'vtk': {
        const Loader = await lazy.vtk()
        const geometry = new Loader(manager).parse(buffer, '')
        if (vtkHasPolygons(buffer)) {
          const material = defaultMaterial()
          if (geometry.attributes.color) { material.vertexColors = true; material.color.set(0xffffff) }
          if (!geometry.attributes.normal) geometry.computeVertexNormals()
          object = new Mesh(geometry, material)
        } else {
          object = pointCloud(geometry)
        }
        break
      }
      case 'xyz': {
        const Loader = await lazy.xyz()
        object = pointCloud(new Loader(manager).parse(decode(buffer)))
        break
      }
      case 'pcd': {
        const Loader = await lazy.pcd()
        const cloud = new Loader(manager).parse(buffer)
        object = pointCloud(cloud.geometry)
        cloud.material?.dispose?.()
        break
      }
      case 'off': {
        const { positions, indices, colors } = parseOFF(decode(buffer))
        object = arraysToMesh(positions, indices, colors, '')
        break
      }
      case 'dxf': {
        const { layers, unit: found, skipped } = parseDXF(decode(buffer))
        if (!layers.length) throw new Error('empty-model')
        object = new Group()
        for (const l of layers) {
          const mesh = arraysToMesh(l.positions, l.indices, null, l.name)
          if (l.color) mesh.material.color.setRGB(l.color[0], l.color[1], l.color[2], SRGBColorSpace)
          object.add(mesh)
        }
        unit = found
        if (skipped) warnings.push(`${skipped.toLocaleString('en')} entit${skipped === 1 ? 'y has' : 'ies have'} no surface (lines, arcs, text, 2D shapes) and ${skipped === 1 ? 'is' : 'are'} not drawn. 3D faces, polyface meshes and MESH entities are.`)
        break
      }
      case '3dm': {
        const readRhino = await lazy.rhino()
        const result = await readRhino(buffer, { onStage, signal })
        object = result.object
        unit = result.unit
        warnings.push(...result.warnings)
        break
      }
      default:
        throw new Error(`${format.label} has no mesh loader`)
    }
    return { object, warnings, missing, revoke, unit }
  } catch (err) {
    revoke()
    throw err
  } finally {
    for (const c of cleanups) c()
  }
}

/** IFC elements (see ifcWorker.js) to Groups per spatial level, one Mesh per element. */
export function ifcToGroup({ products, tree }) {
  const cache = new Map()
  const material = (rgba) => {
    const key = rgba.map((n) => Number(n).toFixed(3)).join(',')
    if (!cache.has(key)) {
      const m = new MeshStandardMaterial({ metalness: 0, roughness: 0.8, side: DoubleSide })
      m.color.setRGB(rgba[0], rgba[1], rgba[2], SRGBColorSpace)
      if (rgba[3] < 1) { m.transparent = true; m.opacity = rgba[3]; m.depthWrite = false }
      m.name = `#${m.color.getHexString(SRGBColorSpace)}${rgba[3] < 1 ? ` ${Math.round(rgba[3] * 100)}%` : ''}`
      cache.set(key, m)
    }
    return cache.get(key)
  }
  // "IFCWALLSTANDARDCASE" reads as "IfcWallStandardCase" only with a
  // dictionary; the upper-case type name is kept as the file has it.
  const title = (n) => n.name || n.type || `#${n.id}`
  const meshOf = (p) => {
    const parts = p.parts.map((part) => {
      const g = new BufferGeometry()
      g.setAttribute('position', new Float32BufferAttribute(part.position, 3))
      g.setAttribute('normal', new Float32BufferAttribute(part.normal, 3))
      g.setIndex(Array.from(part.index))
      return new Mesh(g, material(part.color))
    })
    if (parts.length === 1) { parts[0].name = title(p); return parts[0] }
    const g = new Group()
    g.name = title(p)
    parts.forEach((m, i) => { m.name = `${g.name}.${i + 1}`; g.add(m) })
    return g
  }
  const byId = new Map(products.map((p) => [p.id, p]))
  const placed = new Set()
  const walk = (n) => {
    const product = byId.get(n.id)
    const kids = (n.children || []).map(walk).filter(Boolean)
    if (product && !kids.length) { placed.add(n.id); return meshOf(product) }
    const g = new Group()
    g.name = title(n)
    if (product) { placed.add(n.id); g.add(meshOf(product)) }
    for (const k of kids) g.add(k)
    return g.children.length ? g : null
  }
  const root = (tree && walk(tree)) || new Group()
  const group = root.isGroup ? root : new Group().add(root)
  for (const p of products) if (!placed.has(p.id)) group.add(meshOf(p))
  return group
}

/**
 * Lights and cameras a file carries would relight or reframe the viewer, so
 * they are removed from what is drawn; meshes with no usable normals get
 * computed ones so lighting has something to work with.
 */
// Many STLs in the wild store every facet normal as 0,0,0 (the format allows
// it and slicers recompute them), and a zero normal lights as pure black. So a
// normal attribute is only trusted when most of a sample of it has length.
function normalsUsable(geometry) {
  const n = geometry.attributes.normal
  if (!n) return false
  const step = Math.max(1, Math.floor(n.count / 512))
  let seen = 0
  let zero = 0
  for (let i = 0; i < n.count; i += step) {
    seen += 1
    if (Math.abs(n.getX(i)) + Math.abs(n.getY(i)) + Math.abs(n.getZ(i)) < 1e-6) zero += 1
  }
  return zero * 2 < seen
}

export function normalise(object, warnings) {
  const strip = []
  object.traverse((o) => {
    if (o.isLight || o.isCamera) strip.push(o)
    if (o.isMesh && o.geometry?.attributes?.position && !normalsUsable(o.geometry)) o.geometry.computeVertexNormals()
  })
  for (const o of strip) o.parent?.remove(o)
  if (strip.length) warnings.push(`${strip.length} light${strip.length === 1 ? '' : 's'} or camera${strip.length === 1 ? '' : 's'} stored in the file ${strip.length === 1 ? 'was' : 'were'} not loaded; the viewer uses its own.`)
  const root = (object.isGroup || object.isScene || object.type === 'Object3D') && !object.isMesh && !object.isPoints ? object : new Group().add(object)
  root.updateMatrixWorld(true)
  return root
}

/** Turn a model from one up axis to the other, in place. */
export function reorient(object, from, to) {
  return bakeSimilarity(object, upMatrix(from, to))
}

/** When the root carries a uniform scale and a rotation, bake them into everything below. */
export function foldRootTransform(root) {
  root.updateMatrix()
  const m = root.matrix.clone()
  if (m.equals(new Matrix4())) return root
  const s = new Vector3()
  m.decompose(new Vector3(), root.quaternion.clone(), s)
  const uniform = Math.abs(s.x - s.y) <= 1e-9 * Math.abs(s.x) && Math.abs(s.x - s.z) <= 1e-9 * Math.abs(s.x)
  if (!uniform) return root
  root.position.set(0, 0, 0)
  root.quaternion.identity()
  root.scale.set(1, 1, 1)
  root.updateMatrix()
  return bakeSimilarity(root, m)
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
  if (msg === 'ktx2-needs-viewer') return `${file} uses KTX2 textures, which need the 3D view to decode. Reload the page and open it again.`
  if (msg.startsWith('signature:')) return describeSignatureProblem(file, format, msg.slice('signature:'.length).trim())
  if (msg.startsWith('empty-model')) return `${file} was read, but it contains nothing to draw: no triangles and no points.`
  if (/FBX version not supported/i.test(msg)) return `${file} is older than FBX 7 (2011). Save it as FBX 2011 or newer and try again.`
  if (/Unknown format|FBX/i.test(msg) && format?.id === 'fbx') return `${file} could not be read as FBX. Save it as FBX 2011 or newer.`
  if (err?.name === 'IntegrityError' || /(CAD|IFC|Rhino) engine|OpenCascade|web-ifc|solid or surface|building element/i.test(msg)) return `${file}: ${msg}.`
  if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg)) {
    return 'The converter could not be downloaded. Check the connection and choose the file again.'
  }
  return `${file} could not be read as ${format?.label || 'a model'}: ${msg || 'the reader stopped without saying why'}.`
}

// The raw tessellation per file and quality, so switching quality back, or
// changing normals or the split, never re-runs OpenCascade.
const cadResults = new WeakMap()

/**
 * A dropped File to a drawable Group, Y up, with every stage reported.
 *
 * @param {{ primary: File, format: object, companions: File[] }} drop
 * @param {{ onStage?: Function, signal?: AbortSignal, cad?: { quality?: string, normals?: string, split?: string }, up?: 'y'|'z', renderer?: object }} opts
 *   onStage receives { stage: 'reading'|'engine'|'parsing', loaded?, total? }.
 *   `up` overrides the format's own up axis (see meshFormats.js).
 * @returns {Promise<{ object: import('three').Group, warnings: string[], revoke: Function, unit: string|null, up: 'y'|'z' }>}
 */
export async function loadModel(drop, { onStage, signal, cad = {}, up, renderer } = {}) {
  const { primary, format, companions = [] } = drop
  const quality = cad.quality || 'standard'
  const cached = format.engine === 'cad' ? cadResults.get(primary)?.get(quality) : null

  let buffer = null
  if (!cached) {
    buffer = await readFileBytes(primary, onStage, signal)
    if (signal?.aborted) throw abortError()
    const problem = signatureProblem(format.id, new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 1 << 20)), buffer.byteLength)
    if (problem) throw new Error(`signature: ${problem}`)
  }

  let object
  let warnings = []
  let revoke = () => {}
  let missing = new Set()
  let unit = format.unit
  if (format.engine === 'cad') {
    let result = cached
    if (!result) {
      result = await readCad(new Uint8Array(buffer), format.id, { quality, onStage, signal })
      if (!cadResults.has(primary)) cadResults.set(primary, new Map())
      cadResults.get(primary).set(quality, result)
    }
    if (signal?.aborted) throw abortError()
    onStage?.({ stage: 'parsing' })
    await yieldToPaint()
    object = cadToGroup(result, { normals: cad.normals, split: cad.split })
  } else if (format.engine === 'ifc') {
    const result = await readIfc(new Uint8Array(buffer), { onStage, signal })
    if (signal?.aborted) throw abortError()
    onStage?.({ stage: 'parsing' })
    await yieldToPaint()
    object = ifcToGroup(result)
  } else {
    onStage?.({ stage: 'parsing' })
    await yieldToPaint()
    const parsed = await parseModel(format, buffer, { companions, renderer, signal, onStage })
    ;({ object, warnings, revoke, missing } = parsed)
    if (parsed.unit !== undefined) unit = parsed.unit
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
  let root = normalise(object, warnings)
  // Fold a root transform the loader added (a unit scale, an up-axis turn)
  // into the model, so the tree the converter writes has none.
  root = foldRootTransform(root)
  const sourceUp = up || format.up
  if (sourceUp === 'z') root = reorient(root, 'z', 'y')
  const stats = measure(root)
  if (stats.empty || (stats.triangles === 0 && stats.points === 0)) {
    disposeObject(root)
    revoke()
    throw new Error('empty-model')
  }
  return { object: root, warnings, revoke, unit, up: sourceUp }
}

// ── Exporting ────────────────────────────────────────────────────────────────

const fmtNum = (n) => {
  if (!Number.isFinite(n)) return '0'
  const s = n.toFixed(6).replace(/\.?0+$/, '')
  return s === '-0' ? '0' : s
}

const UNIT_3MF = { mm: 'millimeter', cm: 'centimeter', m: 'meter', in: 'inch', ft: 'foot' }

/**
 * 3MF: a zip holding one XML model. three.js has a 3MF reader and no writer,
 * and this is the smallest writer the core specification accepts: vertices
 * and triangles per object, world transforms baked in, one build item each,
 * and the unit the numbers are in.
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
    if (tris.length) objects.push({ verts, tris, name: o.name })
  })
  if (!objects.length) throw new Error('there are no triangles to write')
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const model = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<model unit="${UNIT_3MF[unit] || 'millimeter'}" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">`,
    '<resources>',
    ...objects.map((ob, i) => `<object id="${i + 1}" type="model"${ob.name ? ` name="${esc(ob.name)}"` : ''}><mesh><vertices>${ob.verts.join('')}</vertices><triangles>${ob.tris.join('')}</triangles></mesh></object>`),
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
 * The unit a file in `format` is written in: metres where its specification
 * says so (when the source has a unit to convert from), the chosen unit where
 * it stores bare numbers, and bare numbers as they are otherwise.
 */
export function outputUnitFor(format, sourceUnit, chosenUnit) {
  if (format.unit === 'm') return sourceUnit ? 'm' : null
  return chosenUnit || sourceUnit || null
}

/** What gets written: an unnamed identity wrapper is dropped and its children written. */
function writeRoots(object) {
  object.updateMatrix()
  const plain = object.isGroup && !object.name && object.matrix.equals(new Matrix4()) && object.children.length
  return plain ? [...object.children] : [object]
}

/**
 * A Group to a Blob in the named output format.
 *
 * The model on screen is Y up, in `sourceUnit` (null: bare numbers). The file
 * is written in the output's own up axis and in outputUnitFor()'s unit, both
 * baked into a copy, so the model on screen is never changed.
 *
 * @param {{ sourceUnit?: string|null, unit?: string|null, signal?: AbortSignal }} opts
 */
export async function exportModel(object, format, { sourceUnit = null, unit = null, signal } = {}) {
  object.updateMatrixWorld(true)
  const target = outputUnitFor(format, sourceUnit, unit)
  const scale = target && sourceUnit ? unitFactor(sourceUnit, target) : 1
  const m = new Matrix4().makeScale(scale, scale, scale).premultiply(upMatrix('y', format.up))
  let copy = object
  let owned = false
  if (!m.equals(new Matrix4())) {
    copy = bakeSimilarity(cloneForExport(object), m)
    owned = true
  }
  try {
    copy.updateMatrixWorld(true)
    const roots = writeRoots(copy)
    switch (format.id) {
      case 'glb': {
        const ab = await new GLTFExporter().parseAsync(roots, { binary: true, onlyVisible: false })
        return new Blob([ab], { type: format.mime })
      }
      case 'gltf': {
        const json = await new GLTFExporter().parseAsync(roots, { binary: false, onlyVisible: false })
        return new Blob([JSON.stringify(json)], { type: format.mime })
      }
      case 'glb-meshopt': {
        const [ab, writer] = await Promise.all([
          new GLTFExporter().parseAsync(roots, { binary: true, onlyVisible: false }),
          lazy.meshoptWriter(),
        ])
        const encoder = await writer.loadMeshoptEncoder({ signal })
        const { glb } = writer.compressGlb(ab, encoder)
        return new Blob([glb], { type: format.mime })
      }
      case 'usdz': {
        const USDZExporter = await lazy.usdz()
        const scene = new Scene()
        const parts = roots.map((r) => r.clone(true))
        for (const r of parts) scene.add(r)
        const bytes = await new USDZExporter().parseAsync(scene, { onlyVisible: false, quickLookCompatible: true })
        return new Blob([bytes], { type: format.mime })
      }
      case 'obj':
        return new Blob([new OBJExporter().parse(copy)], { type: format.mime })
      case 'stl':
        return new Blob([new STLExporter().parse(copy, { binary: true })], { type: format.mime })
      case 'ply':
        return new Blob([new PLYExporter().parse(copy, null, { binary: true })], { type: format.mime })
      case '3mf':
        return new Blob([await export3MF(copy, target)], { type: format.mime })
      default:
        throw new Error(`${format.label} has no writer`)
    }
  } finally {
    if (owned) disposeExportCopy(copy)
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
  // The key light rides on the camera, so whatever faces the visitor is lit:
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

  // The loop runs while something is moving (a drag, damping settling, the
  // turntable) and stops itself after a short idle, so a model left on screen
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
    // Fit the bounding SPHERE, against whichever of the two fields of view is
    // narrower, so the whole model is in frame from any orbit angle and on a
    // portrait phone frame as well as a landscape one. 1.2 leaves room for
    // the view controls along the bottom edge.
    const radius = (s.length() / 2) || extent / 2
    const vHalf = (camera.fov * Math.PI) / 360
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect)
    const dist = (radius / Math.sin(Math.min(vHalf, hHalf))) * 1.2
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

  function show(stats) {
    stats.gridStep = placeGrid(new Box3().setFromObject(model))
    fit()
    wake()
    return stats
  }

  return {
    renderer,
    /** Replace whatever is shown. Returns the panel's numbers. */
    setModel(object, revoke) {
      clear()
      model = object
      model.userData.revoke = revoke
      scene.add(model)
      return show(measure(model))
    },
    /** The model on screen changed in place (a new up axis): re-measure and re-frame. */
    refresh() {
      return model ? show(measure(model)) : null
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
    // Under reduced motion the drag still moves the model (the visitor is
    // moving it) but it stops when the pointer stops instead of gliding on.
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
