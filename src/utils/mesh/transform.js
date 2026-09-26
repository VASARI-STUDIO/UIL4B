// Moving a whole model between conventions: up axis and length unit.
//
// A change of convention is a similarity M (an axis swap and a uniform scale).
// It is BAKED rather than added as a parent node, so a file opened in Blender
// has clean objects: no extra empty at the root, no 0.001 scale on the parts,
// no 90° rotation on every object. Every node's transform T becomes M·T·M⁻¹
// and every geometry is multiplied by M, which leaves the world position of
// every vertex multiplied by M and nothing else changed. The node tree, the
// names and the materials are untouched.
import { Group, Matrix4 } from 'three'

// Z-up to Y-up: (x, y, z) → (x, z, −y). The exact matrix, not a rotation built
// from cos(π/2), so a round trip returns the same numbers.
export const Z_TO_Y = Object.freeze(new Matrix4().set(
  1, 0, 0, 0,
  0, 0, 1, 0,
  0, -1, 0, 0,
  0, 0, 0, 1,
))
export const Y_TO_Z = Object.freeze(new Matrix4().set(
  1, 0, 0, 0,
  0, 0, -1, 0,
  0, 1, 0, 0,
  0, 0, 0, 1,
))

/** The matrix that turns a model's `from` up axis into `to`. */
export function upMatrix(from, to) {
  if (from === to || !from || !to) return new Matrix4()
  return new Matrix4().copy(from === 'z' ? Z_TO_Y : Y_TO_Z)
}

const isIdentity = (m) => m.equals(new Matrix4())

function hasSkin(root) {
  let found = false
  root.traverse((o) => { if (o.isSkinnedMesh || o.isBone) found = true })
  return found
}

/**
 * Apply the similarity `m` to everything under `root`, in place.
 * Geometry shared between meshes is transformed once. A model with a
 * skeleton is wrapped instead (its bind matrices would need rebuilding), and
 * the wrapper is what is returned.
 */
export function bakeSimilarity(root, m) {
  if (isIdentity(m)) return root
  if (hasSkin(root)) {
    const wrap = new Group()
    wrap.name = root.name
    wrap.matrixAutoUpdate = true
    m.decompose(wrap.position, wrap.quaternion, wrap.scale)
    wrap.add(root)
    wrap.updateMatrixWorld(true)
    return wrap
  }
  const inv = new Matrix4().copy(m).invert()
  const local = new Matrix4()
  const done = new Set()
  root.traverse((o) => {
    o.updateMatrix()
    local.multiplyMatrices(m, o.matrix).multiply(inv)
    local.decompose(o.position, o.quaternion, o.scale)
    const g = o.geometry
    if (g && !done.has(g)) {
      done.add(g)
      g.applyMatrix4(m)
    }
    if (o.isInstancedMesh) {
      const im = new Matrix4()
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, im)
        o.setMatrixAt(i, local.multiplyMatrices(m, im).multiply(inv))
      }
      o.instanceMatrix.needsUpdate = true
    }
  })
  root.updateMatrixWorld(true)
  return root
}

/**
 * A copy of `root` for writing: the node tree is cloned and every geometry is
 * cloned (once, however many meshes share it), so baking a unit or an axis
 * into the copy leaves the model on screen untouched. Materials are shared.
 */
export function cloneForExport(root) {
  const copy = root.clone(true)
  const seen = new Map()
  copy.traverse((o) => {
    if (!o.geometry) return
    if (!seen.has(o.geometry)) seen.set(o.geometry, o.geometry.clone())
    o.geometry = seen.get(o.geometry)
  })
  return copy
}

/** Dispose the geometries a cloneForExport() copy owns. */
export function disposeExportCopy(copy) {
  const seen = new Set()
  copy.traverse((o) => {
    if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose() }
  })
}
