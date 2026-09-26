// OpenCascade's tessellation (see cadWorker.js) to a three.js node tree.
//
// The assembly tree comes through as nodes: an assembly or sub-assembly is a
// named Group, a part is a named Mesh, so a GLB written from it imports into
// Blender with the same outliner the CAD file had. Colours become materials,
// one per distinct colour across the whole model, so a hundred red bolts
// share one red material rather than bringing a hundred.
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LinearSRGBColorSpace,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three'

// The colour a part with none of its own is drawn in: meshEngine.js's
// defaultMaterial() grey, given as sRGB so it converts the same way a hex does.
const DEFAULT_RGB = [0xa9 / 255, 0xa5 / 255, 0x9b / 255]

/**
 * occt reports colours as linear RGB in 0..1. Pure black is what it reports
 * for a body with NO colour, so black is treated as absent rather than drawn
 * as a black hole.
 */
export function cadColor(rgb) {
  if (!Array.isArray(rgb) || rgb.length < 3) return null
  const [r, g, b] = rgb
  if (![r, g, b].every(Number.isFinite)) return null
  if (r === 0 && g === 0 && b === 0) return null
  return new Color().setRGB(r, g, b, LinearSRGBColorSpace)
}

function materialCache() {
  const byKey = new Map()
  return (color) => {
    const c = color || new Color().setRGB(...DEFAULT_RGB, SRGBColorSpace)
    const key = color ? c.getHexString() : 'default'
    if (!byKey.has(key)) {
      const m = new MeshStandardMaterial({ color: c, metalness: 0.05, roughness: 0.6, side: DoubleSide })
      // Named by the colour's sRGB hex, which is how a CAD user refers to it.
      m.name = color ? `#${c.getHexString()}` : 'Default'
      byKey.set(key, m)
    }
    return byKey.get(key)
  }
}

/** The triangles of one CAD mesh as [first, last, colour|null] ranges covering all of it. */
function faceRanges(m, triangles) {
  const faces = (m.faces || []).filter((f) => Number.isInteger(f.first) && Number.isInteger(f.last) && f.last >= f.first)
  if (!faces.length) return [{ first: 0, last: triangles - 1, color: null }]
  return faces.map((f) => ({ first: f.first, last: Math.min(f.last, triangles - 1), color: cadColor(f.color) }))
}

function geometryFrom(position, normal, index) {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(position, 3))
  if (normal && normal.length === position.length) g.setAttribute('normal', new Float32BufferAttribute(normal, 3))
  if (index) g.setIndex(Array.from(index))
  return g
}

function finishNormals(geometry, normals) {
  if (normals === 'flat') {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry
    flat.deleteAttribute('normal')
    flat.computeVertexNormals()
    if (flat !== geometry) geometry.dispose()
    return flat
  }
  if (!geometry.attributes.normal) geometry.computeVertexNormals()
  return geometry
}

/** One part, whole: its triangles ordered by colour, one material slot per colour. */
function partMesh(m, material, normals) {
  const index = m.index || Uint32Array.from({ length: m.position.length / 3 }, (_, i) => i)
  const triangles = Math.floor(index.length / 3)
  const base = cadColor(m.color)
  const ranges = faceRanges(m, triangles)
  const keyOf = (c) => (c || base ? (c || base).getHexString() : 'default')
  const slots = new Map()
  for (const r of ranges) {
    const key = keyOf(r.color)
    if (!slots.has(key)) slots.set(key, { color: r.color || base, ranges: [] })
    slots.get(key).ranges.push(r)
  }
  let geometry
  const materials = []
  if (slots.size <= 1) {
    geometry = geometryFrom(m.position, m.normal, index)
    materials.push(material(base))
  } else {
    // Reorder the triangles so each colour is one contiguous group.
    const out = new Uint32Array(triangles * 3)
    let at = 0
    geometry = geometryFrom(m.position, m.normal, null)
    for (const slot of slots.values()) {
      const start = at
      for (const r of slot.ranges) {
        for (let t = r.first; t <= r.last; t++) {
          out[at++] = index[t * 3]
          out[at++] = index[t * 3 + 1]
          out[at++] = index[t * 3 + 2]
        }
      }
      geometry.addGroup(start, at - start, materials.length)
      materials.push(material(slot.color))
    }
    geometry.setIndex(Array.from(out.subarray(0, at)))
  }
  geometry = finishNormals(geometry, normals)
  const mesh = new Mesh(geometry, materials.length === 1 ? materials[0] : materials)
  mesh.name = m.name || ''
  return [mesh]
}

/** One part, split: one mesh per CAD face, named "<part>.face<n>". */
function faceMeshes(m, material, normals) {
  const index = m.index || Uint32Array.from({ length: m.position.length / 3 }, (_, i) => i)
  const triangles = Math.floor(index.length / 3)
  const base = cadColor(m.color)
  const out = []
  faceRanges(m, triangles).forEach((r, k) => {
    const remap = new Map()
    const pos = []
    const nor = []
    const idx = []
    for (let t = r.first; t <= r.last; t++) {
      for (let v = 0; v < 3; v++) {
        const src = index[t * 3 + v]
        if (!remap.has(src)) {
          remap.set(src, pos.length / 3)
          pos.push(m.position[src * 3], m.position[src * 3 + 1], m.position[src * 3 + 2])
          if (m.normal) nor.push(m.normal[src * 3], m.normal[src * 3 + 1], m.normal[src * 3 + 2])
        }
        idx.push(remap.get(src))
      }
    }
    if (!idx.length) return
    const geometry = finishNormals(geometryFrom(pos, m.normal ? nor : null, idx), normals)
    const mesh = new Mesh(geometry, material(r.color || base))
    mesh.name = `${m.name || 'Part'}.face${k + 1}`
    out.push(mesh)
  })
  return out
}

/**
 * occt's result to a Group.
 *
 * @param {{ meshes: object[], root?: { name: string, meshes: number[], children: object[] } }} result
 * @param {{ normals?: 'smooth'|'flat', split?: 'part'|'face' }} [opts]
 */
export function cadToGroup(result, { normals = 'smooth', split = 'part' } = {}) {
  const material = materialCache()
  const build = split === 'face' ? faceMeshes : partMesh
  const used = new Set()
  const objectsFor = (i) => {
    const m = result.meshes[i]
    if (!m?.position?.length) return []
    used.add(i)
    return build(m, material, normals)
  }
  const node = (n) => {
    const group = new Group()
    group.name = n.name || ''
    for (const i of n.meshes || []) for (const o of objectsFor(i)) group.add(o)
    for (const c of n.children || []) {
      const child = node(c)
      if (child) group.add(child)
    }
    if (!group.children.length) return null
    // A part node holding one mesh of its own name is the part: keep the mesh.
    if (group.children.length === 1 && group.children[0].isMesh && (group.children[0].name === group.name || !group.name)) {
      const only = group.children[0]
      group.remove(only)
      if (!only.name) only.name = group.name
      return only
    }
    return group
  }
  let root = result.root ? node(result.root) : null
  // An unnamed wrapper around one named assembly is the assembly.
  while (root && root.isGroup && !root.name && root.children.length === 1) {
    const only = root.children[0]
    root.remove(only)
    root = only
  }
  const group = root?.isGroup ? root : new Group()
  if (root && !root.isGroup) group.add(root)
  // Meshes the tree does not reference (older files, loose faces) still draw.
  result.meshes.forEach((_, i) => { if (!used.has(i)) for (const o of objectsFor(i)) group.add(o) })
  return group
}
