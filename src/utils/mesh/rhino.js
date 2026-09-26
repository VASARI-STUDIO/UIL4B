// Rhino .3dm files, through three.js's Rhino3dmLoader and rhino3dm (MIT).
//
// rhino3dm is McNeel's openNURBS compiled to WebAssembly: 2,656,984 bytes of
// wasm and a 126,991-byte wrapper. Like the CAD engine it is fetched from
// jsDelivr at an exact version and run only if both files match their pinned
// SHA-256 (see integrity.js). The loader asks its LoadingManager for
// "rhino3dm.js" and "rhino3dm.wasm"; the manager answers with blob: URLs made
// from the verified bytes, so the loader never reaches the network itself.
// It decodes in its own worker, built from the verified script.
//
// Rhino stores exact NURBS; the file's own render meshes are what is drawn.
// A surface saved without them has nothing to draw here, and a warning says
// so. Objects are grouped by layer, as Rhino shows them.
import { Group, LoadingManager } from 'three'
import { fetchVerified } from '../integrity.js'

export const RHINO_VERSION = '8.32.1'
const BASE = `https://cdn.jsdelivr.net/npm/rhino3dm@${RHINO_VERSION}`
export const rhinoScriptURL = `${BASE}/rhino3dm.js`
export const rhinoWasmURL = `${BASE}/rhino3dm.wasm`
export const RHINO_SHA256 = Object.freeze({
  js: '7f3b804afda0cafbf456d5729f2980a6011cf90e882b8156c674e78696e2005a',
  wasm: '75c3965576d6e7ea1e1451dafd11300316c4783f0cb915a5b612d9ebabac7210',
})

// Rhino's UnitSystem enum, for the ones this tool writes.
const RHINO_UNITS = { 2: 'mm', 3: 'cm', 4: 'm', 8: 'in', 9: 'ft' }

let libs = null

function verifiedLibs(onStage, signal) {
  if (!libs) {
    const onBytes = ({ received, total }) => onStage?.({ stage: 'engine', loaded: received, total })
    libs = Promise.all([
      fetchVerified(rhinoScriptURL, RHINO_SHA256.js, { label: 'The Rhino engine script', signal }),
      fetchVerified(rhinoWasmURL, RHINO_SHA256.wasm, { label: 'The Rhino engine', signal, onBytes }),
    ]).catch((err) => {
      libs = null
      if (err?.name === 'IntegrityError' || err?.name === 'AbortError') throw err
      throw new Error(`the Rhino engine could not be fetched (${err?.message || err})`)
    })
  }
  return libs
}

/**
 * A .3dm file's bytes to a Group, with the model's unit when it has one.
 * @returns {Promise<{ object: import('three').Group, unit: string|null, warnings: string[] }>}
 */
export async function readRhino(buffer, { onStage, signal } = {}) {
  onStage?.({ stage: 'engine', loaded: 0, total: 0 })
  const [{ Rhino3dmLoader }, [script, wasm]] = await Promise.all([
    import('three/examples/jsm/loaders/3DMLoader.js'),
    verifiedLibs(onStage, signal),
  ])
  if (signal?.aborted) throw Object.assign(new Error('cancelled'), { name: 'AbortError' })
  onStage?.({ stage: 'parsing' })
  const urls = {
    'rhino3dm.js': URL.createObjectURL(new Blob([script], { type: 'text/javascript' })),
    'rhino3dm.wasm': URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' })),
  }
  const manager = new LoadingManager()
  manager.setURLModifier((url) => urls[String(url).split('/').pop()] || url)
  const loader = new Rhino3dmLoader(manager)
  loader.setLibraryPath('verified/')
  loader.setWorkerLimit(1)
  const onAbort = () => loader.dispose()
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    const raw = await new Promise((resolve, reject) => loader.parse(buffer.slice(0), resolve, (e) => reject(new Error(e?.message || e?.error || String(e)))))
    if (signal?.aborted) throw Object.assign(new Error('cancelled'), { name: 'AbortError' })
    const settings = raw.userData?.settings || {}
    const unitCode = settings.modelUnitSystem?.value ?? settings.modelUnitSystem
    const unit = RHINO_UNITS[unitCode] || null
    return { object: byLayer(raw), unit, warnings: rhinoWarnings(raw.userData?.warnings) }
  } finally {
    signal?.removeEventListener('abort', onAbort)
    loader.dispose()
    for (const u of Object.values(urls)) URL.revokeObjectURL(u)
  }
}

const plural = (n, one, many) => `${n.toLocaleString('en')} ${n === 1 ? one : many}`

/**
 * The loader's per-object warnings ({ type, message }), counted and put in
 * plain words: one line per kind, never the loader's own text.
 */
export function rhinoWarnings(list) {
  let noMesh = 0
  let notConverted = 0
  let other = 0
  for (const w of list || []) {
    const type = typeof w === 'string' ? '' : w?.type
    const message = typeof w === 'string' ? w : w?.message || ''
    if (type === 'missing mesh' || /has no associated mesh geometry/.test(message)) noMesh++
    else if (type === 'not implemented' || /Conversion not implemented/.test(message)) notConverted++
    else other++
  }
  const out = []
  if (noMesh) out.push(`${plural(noMesh, 'object was', 'objects were')} saved without a render mesh, so ${noMesh === 1 ? 'it is' : 'they are'} not drawn. In Rhino, shade the view and save the file normally (not with Save Small), then open it here again.`)
  if (notConverted) out.push(`${plural(notConverted, 'object is', 'objects are')} of a kind this reader does not convert (such as annotations or hatches) and ${notConverted === 1 ? 'is' : 'are'} left out.`)
  if (other) out.push(`${plural(other, 'texture, light or decal', 'textures, lights or decals')} could not be converted and ${other === 1 ? 'is' : 'are'} left out.`)
  return out
}

/** Regroup the loader's flat object list under one Group per layer. */
function byLayer(raw) {
  const layers = raw.userData?.layers || []
  const root = new Group()
  const groups = new Map()
  for (const child of [...raw.children]) {
    const index = child.userData?.attributes?.layerIndex
    const layer = layers[index]
    if (!layer) { root.add(child); continue }
    const name = layer.fullPath || layer.name || `Layer ${index + 1}`
    if (!groups.has(name)) {
      const g = new Group()
      g.name = name.replace(/::/g, ' / ')
      groups.set(name, g)
      root.add(g)
    }
    if (!child.name) child.name = child.userData?.attributes?.name || child.userData?.objectType || ''
    groups.get(name).add(child)
  }
  return root
}
