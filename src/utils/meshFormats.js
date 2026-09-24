// THE ONE TABLE OF WHAT /create/3d-viewer READS AND WRITES.
//
// The file input's accept list, the empty state's format line, the panel's
// idle facts, the route's meta description (src/data/routeMetaMap.js) and
// tests/unit/three-d-viewer.test.js all derive from here, so a format cannot
// be advertised without a loader behind it, and cannot drop out of the copy
// while its loader still runs. The same discipline src/data/toolTree.js
// applies to the tool list, for the same reason.
//
// Plain .js with NO three.js import, deliberately. routeMetaMap.js imports it
// and routeMetaMap.js is in the entry graph, and `node --test` imports it
// directly. three.js lives in src/utils/meshEngine.js, which the page reaches
// only through a dynamic import().

export const MAX_MODEL_BYTES = 150 * 1024 * 1024
export const LARGE_MODEL_BYTES = 50 * 1024 * 1024

// `unit` is what the extent readout can honestly print. glTF and GLB are
// metres by specification; STEP and IGES are asked for millimetres when they
// are tessellated (see cadEngine.js). Everything else stores bare numbers — an
// STL is "usually" millimetres, and "usually" is not a unit — so the readout
// says "file units" rather than guessing.
//
// `companions` are the sidecar files a format may arrive with. They are
// accepted in the same drop and resolved by name, which is how a .gltf finds
// its .bin and an .obj finds its .mtl without an upload anywhere.
export const INPUT_FORMATS = Object.freeze([
  Object.freeze({ id: 'obj', label: 'OBJ', exts: Object.freeze(['obj']), engine: 'mesh', unit: null, companions: Object.freeze(['mtl', 'png', 'jpg', 'jpeg', 'webp']) }),
  Object.freeze({ id: 'stl', label: 'STL', exts: Object.freeze(['stl']), engine: 'mesh', unit: null, companions: Object.freeze([]) }),
  Object.freeze({ id: 'gltf', label: 'glTF', exts: Object.freeze(['gltf']), engine: 'mesh', unit: 'm', companions: Object.freeze(['bin', 'png', 'jpg', 'jpeg', 'webp']) }),
  Object.freeze({ id: 'glb', label: 'GLB', exts: Object.freeze(['glb']), engine: 'mesh', unit: 'm', companions: Object.freeze([]) }),
  Object.freeze({ id: 'ply', label: 'PLY', exts: Object.freeze(['ply']), engine: 'mesh', unit: null, companions: Object.freeze([]) }),
  Object.freeze({ id: '3mf', label: '3MF', exts: Object.freeze(['3mf']), engine: 'mesh', unit: null, companions: Object.freeze([]) }),
  Object.freeze({ id: 'fbx', label: 'FBX', exts: Object.freeze(['fbx']), engine: 'mesh', unit: null, companions: Object.freeze(['png', 'jpg', 'jpeg', 'webp']) }),
  Object.freeze({ id: 'step', label: 'STEP', exts: Object.freeze(['step', 'stp']), engine: 'cad', unit: 'mm', companions: Object.freeze([]) }),
  Object.freeze({ id: 'iges', label: 'IGES', exts: Object.freeze(['iges', 'igs']), engine: 'cad', unit: 'mm', companions: Object.freeze([]) }),
])

// What comes out. `keeps` is the line under each option, so the difference
// between them is read before pressing Convert rather than after opening the
// file. `points: false` marks a format that cannot hold a point cloud (a PLY
// scan with no faces) — STL and 3MF are triangles by definition.
//
// FBX and the two CAD formats are read-only: three.js ships no writer for
// them, and a hand-rolled FBX writer is not something to ship in beta.
export const OUTPUT_FORMATS = Object.freeze([
  Object.freeze({ id: 'glb', label: 'GLB', ext: 'glb', mime: 'model/gltf-binary', keeps: 'Meshes, materials, textures and hierarchy, one binary file', points: true }),
  Object.freeze({ id: 'gltf', label: 'glTF', ext: 'gltf', mime: 'model/gltf+json', keeps: 'The same as GLB, as one JSON file with its data embedded', points: true }),
  Object.freeze({ id: 'obj', label: 'OBJ', ext: 'obj', mime: 'model/obj', keeps: 'Geometry, normals and UVs. No materials', points: true }),
  Object.freeze({ id: 'stl', label: 'STL', ext: 'stl', mime: 'model/stl', keeps: 'Triangles only, binary', points: false }),
  Object.freeze({ id: 'ply', label: 'PLY', ext: 'ply', mime: 'application/octet-stream', keeps: 'Geometry, normals, UVs and vertex colours, binary', points: true }),
  Object.freeze({ id: '3mf', label: '3MF', ext: '3mf', mime: 'model/3mf', keeps: 'Triangles per object, for 3D printing. No materials', points: false }),
])

/** The lower-case extension of a file name, without the dot, or ''. */
export function extensionOf(name) {
  const m = /\.([a-z0-9]+)$/i.exec(String(name || ''))
  return m ? m[1].toLowerCase() : ''
}

/** The input format a file name belongs to, or null when nothing here reads it. */
export function formatForFile(name) {
  const ext = extensionOf(name)
  return INPUT_FORMATS.find((f) => f.exts.includes(ext)) || null
}

/** Is this file a sidecar the given format may arrive with? */
export function isCompanionFor(format, name) {
  return !!format && format.companions.includes(extensionOf(name))
}

/** The `accept` attribute for the file input: every readable extension, dotted. */
export function acceptAttribute() {
  const exts = new Set(INPUT_FORMATS.flatMap((f) => [...f.exts, ...f.companions]))
  return [...exts].map((e) => '.' + e).join(',')
}

export const inputLabels = () => INPUT_FORMATS.map((f) => f.label)
export const outputLabels = () => OUTPUT_FORMATS.map((f) => f.label)
export const outputFormat = (id) => OUTPUT_FORMATS.find((f) => f.id === id) || null

/** "OBJ, STL and GLB" — a list for a sentence. */
export function listForProse(labels) {
  const list = [...labels]
  if (list.length < 2) return list.join('')
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

export function formatBytes(b) {
  if (b == null || !Number.isFinite(b)) return '—'
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

/** "150 MB", derived from the constant it describes. */
export function describeSizeLimit() {
  return `${Math.round(MAX_MODEL_BYTES / 1048576)} MB`
}

/**
 * Split one drop into the file the viewer will read and the sidecars that
 * belong to it. Returns null when nothing in the drop is readable. When a drop
 * holds two readable models, the first wins and the rest are reported back as
 * `ignored`, so the page can say so instead of silently picking one.
 */
export function pickPrimary(files) {
  const list = Array.from(files || [])
  const readable = list.filter((f) => formatForFile(f.name))
  if (!readable.length) return null
  const primary = readable[0]
  const format = formatForFile(primary.name)
  const companions = list.filter((f) => f !== primary && isCompanionFor(format, f.name))
  const ignored = list.filter((f) => f !== primary && !companions.includes(f))
  return { primary, format, companions, ignored }
}

// ── Does the file look like what its name says? ─────────────────────────────
//
// three.js loaders are forgiving in the wrong direction: hand STLLoader a PNG
// renamed .stl and it can return an empty geometry, or garbage triangles,
// rather than an error. So the first bytes are checked against the format's
// own signature BEFORE a loader sees them, and a mismatch is reported as what
// it is — "this is not an STL" — instead of as an empty model or a stack trace.
//
// `bytes` is a Uint8Array of (at least the start of) the file; `size` is the
// whole file's length, which binary STL needs to check its own triangle count.

const ascii = (bytes, start, end) => {
  let s = ''
  const stop = Math.min(end, bytes.length)
  for (let i = start; i < stop; i++) s += String.fromCharCode(bytes[i])
  return s
}

/** The sentence a failed signature check is shown as — one wording, used both
 *  by the pre-check in ThreeDViewer.jsx and by meshEngine's describeLoadError. */
export function describeSignatureProblem(name, format, problem) {
  return `${name} could not be read as ${format?.label}: ${problem}.`
}

/** Null when the bytes plausibly are `formatId`, otherwise a short reason. */
export function signatureProblem(formatId, bytes, size = bytes?.length ?? 0) {
  if (!bytes || size === 0) return 'the file is empty'
  const head = ascii(bytes, 0, 2048)
  // `ascii` maps bytes one to one, so a UTF-8 byte-order mark arrives as the
  // three characters EF BB BF rather than as U+FEFF.
  const text = head.replace(/^\xEF\xBB\xBF/, '').trimStart()
  switch (formatId) {
    case 'glb':
      return head.startsWith('glTF') ? null : 'it does not start with the GLB signature'
    case 'gltf':
      return text.startsWith('{') ? null : 'it is not a JSON document'
    case 'ply':
      return /^ply\r?\n/.test(head) ? null : 'it does not start with a PLY header'
    case '3mf':
      return head.startsWith('PK\u0003\u0004') ? null : 'it is not a 3MF package (a 3MF is a zip archive)'
    case 'fbx':
      if (head.startsWith('Kaydara FBX Binary')) return null
      return /FBXHeaderExtension|FBXVersion/.test(head) ? null : 'it is neither a binary nor a text FBX'
    case 'stl': {
      // Text first: "solid" followed by facets. Some binary files also open
      // with the word "solid" in their header, so the facet check matters.
      if (/^solid\b/i.test(text) && /facet\s+normal/i.test(ascii(bytes, 0, 65536))) return null
      // Binary: an 80-byte header, a uint32 triangle count, 50 bytes per
      // triangle. A file SHORTER than its own count says is truncated; a few
      // trailing bytes past it are padding some exporters write, and
      // STLLoader reads past them.
      if (size >= 84 && bytes.length >= 84) {
        const n = (bytes[80] | (bytes[81] << 8) | (bytes[82] << 16) | (bytes[83] << 24)) >>> 0
        const expected = 84 + n * 50
        if (n > 0 && expected <= size) return null
        if (n > 0 && expected > size) return `it is cut short: its header promises ${n.toLocaleString('en')} triangles and the file ends before them`
      }
      return 'it is neither a binary STL nor a text STL'
    }
    case 'obj': {
      const sample = ascii(bytes, 0, 1 << 20)
      for (let i = 0; i < Math.min(bytes.length, 4096); i++) {
        const b = bytes[i]
        if (b < 9 || (b > 13 && b < 27)) return 'it is a binary file, and OBJ is text'
      }
      return /^\s*v\s+-?[\d.]/m.test(sample) ? null : 'no vertex lines were found in it'
    }
    case 'step':
      return /ISO-10303-21/.test(head) ? null : 'it does not start with a STEP (ISO 10303-21) header'
    case 'iges': {
      // Fixed 80-column records; column 73 of the first record is the section
      // letter, and the first section is Start (S) or, for compressed IGES, C.
      const first = head.split(/\r?\n/, 1)[0] || ''
      return /^.{72}[SC]/.test(first) ? null : 'it is not laid out as IGES 80-column records'
    }
    default:
      return 'no reader handles this format'
  }
}
