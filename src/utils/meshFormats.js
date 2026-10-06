// The one table of what /create/3d-converter reads and writes.
//
// The file input's accept list, the empty state's format line, the panel's
// grouped format lists, the route's meta description (src/data/routeMetaMap.js),
// the search keywords (src/data/toolIndex.js) and tests/unit/model-converter.test.js
// all derive from here, so a format cannot be advertised without a reader
// behind it, and cannot drop out of the copy while its reader still runs.
//
// Plain .js with NO imports: routeMetaMap.js and toolIndex.js import it and
// both are in the entry graph, and `node --test` imports it directly. three.js
// lives in src/utils/meshEngine.js, which the page reaches only through a
// dynamic import().

export const MAX_MODEL_BYTES = 150 * 1024 * 1024
export const LARGE_MODEL_BYTES = 50 * 1024 * 1024

// ── Units ────────────────────────────────────────────────────────────────────

/** Lengths a model can be written in, with their size in metres. */
export const UNITS = Object.freeze([
  Object.freeze({ id: 'mm', label: 'Millimetres', short: 'mm', metres: 0.001 }),
  Object.freeze({ id: 'cm', label: 'Centimetres', short: 'cm', metres: 0.01 }),
  Object.freeze({ id: 'm', label: 'Metres', short: 'm', metres: 1 }),
  Object.freeze({ id: 'in', label: 'Inches', short: 'in', metres: 0.0254 }),
  Object.freeze({ id: 'ft', label: 'Feet', short: 'ft', metres: 0.3048 }),
])

export const unitById = (id) => UNITS.find((u) => u.id === id) || null

/**
 * The factor that turns a length in `from` into a length in `to`. A missing
 * unit on either side means "bare numbers", and bare numbers are copied as
 * they are (factor 1) rather than guessed at.
 */
export function unitFactor(from, to) {
  const a = unitById(from)
  const b = unitById(to)
  if (!a || !b) return 1
  return a.metres / b.metres
}

/** The unit whose length is `metres`, within rounding, or null. */
export function unitFromMetres(metres) {
  if (!(metres > 0)) return null
  return UNITS.find((u) => Math.abs(u.metres - metres) <= u.metres * 1e-6)?.id || null
}

// ── Inputs ───────────────────────────────────────────────────────────────────
//
// engine    which reader runs it: 'mesh' (a three.js loader or a parser in
//           meshEngine.js), 'cad' (OpenCascade in a worker, cadEngine.js),
//           'rhino' (rhino3dm, mesh/rhino.js) or 'ifc' (web-ifc, ifcEngine.js).
// unit      the length unit the loaded model is in, when the format or its
//           reader fixes one. null means bare numbers ("file units"); a reader
//           may still report a unit it found in the file (see meshEngine).
// up        the up axis of the loaded model. 'z' models are turned upright on
//           load and turned back for formats whose convention is Z-up.
// group     which list the format is shown under.
// companions  sidecar files accepted in the same drop and resolved by name.
const row = (o) => Object.freeze({ companions: Object.freeze([]), ...o, exts: Object.freeze(o.exts), ...(o.companions ? { companions: Object.freeze(o.companions) } : {}) })
const IMAGES = ['png', 'jpg', 'jpeg', 'webp', 'tga', 'bmp', 'gif']

export const INPUT_FORMATS = Object.freeze([
  // For Blender and other 3D apps
  row({ id: 'obj', label: 'OBJ', exts: ['obj'], engine: 'mesh', unit: null, up: 'y', group: 'apps', companions: ['mtl', ...IMAGES] }),
  row({ id: 'fbx', label: 'FBX', exts: ['fbx'], engine: 'mesh', unit: null, up: 'y', group: 'apps', companions: IMAGES }),
  row({ id: 'dae', label: 'DAE', exts: ['dae'], engine: 'mesh', unit: 'm', up: 'y', group: 'apps', companions: IMAGES }),
  row({ id: '3ds', label: '3DS', exts: ['3ds'], engine: 'mesh', unit: null, up: 'z', group: 'apps', companions: IMAGES }),
  row({ id: 'lwo', label: 'LWO', exts: ['lwo'], engine: 'mesh', unit: 'm', up: 'y', group: 'apps', companions: IMAGES }),
  row({ id: 'wrl', label: 'VRML', exts: ['wrl', 'vrml'], engine: 'mesh', unit: 'm', up: 'y', group: 'apps', companions: IMAGES }),
  row({ id: 'off', label: 'OFF', exts: ['off'], engine: 'mesh', unit: null, up: 'y', group: 'apps' }),
  // For 3D printing
  row({ id: 'stl', label: 'STL', exts: ['stl'], engine: 'mesh', unit: null, up: 'z', group: 'print' }),
  row({ id: '3mf', label: '3MF', exts: ['3mf'], engine: 'mesh', unit: 'mm', up: 'z', group: 'print' }),
  row({ id: 'amf', label: 'AMF', exts: ['amf'], engine: 'mesh', unit: 'mm', up: 'z', group: 'print' }),
  // For the web and AR
  row({ id: 'gltf', label: 'glTF', exts: ['gltf'], engine: 'mesh', unit: 'm', up: 'y', group: 'web', companions: ['bin', 'ktx2', ...IMAGES] }),
  row({ id: 'glb', label: 'GLB', exts: ['glb'], engine: 'mesh', unit: 'm', up: 'y', group: 'web' }),
  row({ id: 'usd', label: 'USD', exts: ['usdz', 'usd', 'usda', 'usdc'], engine: 'mesh', unit: 'cm', up: 'y', group: 'web' }),
  row({ id: 'kmz', label: 'KMZ', exts: ['kmz'], engine: 'mesh', unit: 'm', up: 'y', group: 'web' }),
  // CAD
  row({ id: 'step', label: 'STEP', exts: ['step', 'stp'], engine: 'cad', unit: 'mm', up: 'z', group: 'cad' }),
  row({ id: 'iges', label: 'IGES', exts: ['iges', 'igs'], engine: 'cad', unit: 'mm', up: 'z', group: 'cad' }),
  row({ id: 'brep', label: 'BREP', exts: ['brep', 'brp'], engine: 'cad', unit: null, up: 'z', group: 'cad' }),
  row({ id: '3dm', label: '3DM', exts: ['3dm'], engine: 'rhino', unit: null, up: 'z', group: 'cad' }),
  row({ id: 'ifc', label: 'IFC', exts: ['ifc'], engine: 'ifc', unit: 'm', up: 'y', group: 'cad' }),
  row({ id: 'dxf', label: 'DXF', exts: ['dxf'], engine: 'mesh', unit: null, up: 'z', group: 'cad' }),
  // Scans and point clouds
  row({ id: 'ply', label: 'PLY', exts: ['ply'], engine: 'mesh', unit: null, up: 'z', group: 'scans' }),
  row({ id: 'xyz', label: 'XYZ', exts: ['xyz'], engine: 'mesh', unit: null, up: 'z', group: 'scans' }),
  row({ id: 'pcd', label: 'PCD', exts: ['pcd'], engine: 'mesh', unit: null, up: 'z', group: 'scans' }),
  row({ id: 'vtk', label: 'VTK', exts: ['vtk', 'vtp'], engine: 'mesh', unit: null, up: 'y', group: 'scans' }),
])

export const INPUT_GROUPS = Object.freeze([
  Object.freeze({ id: 'cad', label: 'CAD' }),
  Object.freeze({ id: 'apps', label: 'For Blender / 3D apps' }),
  Object.freeze({ id: 'print', label: 'For 3D printing' }),
  Object.freeze({ id: 'web', label: 'For web / AR' }),
  Object.freeze({ id: 'scans', label: 'Scans and point clouds' }),
])

// ── The engines fetched from a CDN ───────────────────────────────────────────
//
// What the first file of each kind downloads, so the panel can say so before
// it happens. The byte counts are the pinned files' sizes; the pins and their
// SHA-256 live beside each loader (cadEngine.js, mesh/rhino.js, ifcEngine.js,
// mesh/meshopt.js).
export const REMOTE_ENGINES = Object.freeze({
  cad: Object.freeze({ label: 'OpenCascade', bytes: 7_604_031 + 96_871 }),
  rhino: Object.freeze({ label: 'rhino3dm', bytes: 2_656_984 + 126_991 }),
  ifc: Object.freeze({ label: 'web-ifc', bytes: 1_595_268 + 6_089_952 }),
})

// ── Outputs ──────────────────────────────────────────────────────────────────
//
// `keeps` is the line under the choices, so the difference between formats is
// read before pressing Convert rather than after opening the file.
// `points: false` marks a format that cannot hold a point cloud.
// `unit`: 'm' for formats whose specification fixes metres; 'choose' for
// formats that store bare numbers, where the unit is picked in the panel.
// `up`: the up axis the format's readers expect (Blender's importers included).
export const OUTPUT_FORMATS = Object.freeze([
  Object.freeze({ id: 'glb', label: 'GLB', ext: 'glb', mime: 'model/gltf-binary', group: 'apps', unit: 'm', up: 'y', points: true, keeps: 'Meshes, materials, textures, names and hierarchy, in metres, one binary file' }),
  Object.freeze({ id: 'obj', label: 'OBJ', ext: 'obj', mime: 'model/obj', group: 'apps', unit: 'choose', up: 'y', points: true, keeps: 'Geometry, normals, UVs and object names. No materials' }),
  Object.freeze({ id: 'ply', label: 'PLY', ext: 'ply', mime: 'application/octet-stream', group: 'apps', unit: 'choose', up: 'z', points: true, keeps: 'Geometry, normals, UVs and vertex colours, merged into one object, binary' }),
  Object.freeze({ id: 'stl', label: 'STL', ext: 'stl', mime: 'model/stl', group: 'print', unit: 'choose', up: 'z', points: false, keeps: 'Triangles only, merged into one object, binary' }),
  Object.freeze({ id: '3mf', label: '3MF', ext: '3mf', mime: 'model/3mf', group: 'print', unit: 'choose', up: 'z', points: false, keeps: 'Triangles per object with the unit recorded. No materials' }),
  Object.freeze({ id: 'gltf', label: 'glTF', ext: 'gltf', mime: 'model/gltf+json', group: 'web', unit: 'm', up: 'y', points: true, keeps: 'The same as GLB, as one JSON file with its data embedded' }),
  Object.freeze({ id: 'glb-meshopt', label: 'GLB, compressed', ext: 'glb', suffix: '.meshopt', mime: 'model/gltf-binary', group: 'web', unit: 'm', up: 'y', points: true, keeps: 'GLB with meshopt geometry compression (EXT_meshopt_compression). Blender, three.js and Babylon.js read it' }),
  Object.freeze({ id: 'usdz', label: 'USDZ', ext: 'usdz', mime: 'model/vnd.usdz+zip', group: 'web', unit: 'm', up: 'y', points: false, keeps: 'Meshes, materials and hierarchy, in metres, for AR Quick Look and Blender' }),
])

export const OUTPUT_GROUPS = Object.freeze([
  Object.freeze({ id: 'apps', label: 'For Blender / 3D apps' }),
  Object.freeze({ id: 'print', label: 'For 3D printing' }),
  Object.freeze({ id: 'web', label: 'For web / AR' }),
])

// ── CAD tessellation ─────────────────────────────────────────────────────────
//
// STEP, IGES and BREP hold exact surfaces; triangles exist only once a kernel
// has approximated them. `linear` is the largest distance a triangle may sit
// from the true surface, as a fraction of the model's bounding box, so a 2 mm
// bracket and a 2 m chassis get the same visual quality. `angular` is the
// largest angle, in radians, between the normals of neighbouring triangles on
// a curved face.
export const CAD_QUALITIES = Object.freeze([
  Object.freeze({ id: 'draft', label: 'Draft', linear: 0.004, angular: 0.8 }),
  Object.freeze({ id: 'standard', label: 'Standard', linear: 0.001, angular: 0.5 }),
  Object.freeze({ id: 'fine', label: 'Fine', linear: 0.0002, angular: 0.2 }),
])

export const cadQuality = (id) => CAD_QUALITIES.find((q) => q.id === id) || CAD_QUALITIES[1]

/** "0.1% of the model's size, 29°": what a quality level promises, in words. */
export function describeCadQuality(q) {
  const pct = q.linear * 100
  return `within ${pct < 0.1 ? pct.toFixed(2) : pct.toFixed(1)}% of the model's size, ${Math.round((q.angular * 180) / Math.PI)}° between facets`
}

// How a CAD file's faces become meshes.
//   part  one mesh per solid or part, with each colour its own material slot;
//   face  one mesh per CAD face, named after its part.
export const CAD_SPLITS = Object.freeze([
  Object.freeze({ id: 'part', label: 'Per part' }),
  Object.freeze({ id: 'face', label: 'Per face' }),
])

// Normals from the CAD surfaces (smooth across each curved face, sharp at
// every edge between faces), or one normal per triangle.
export const CAD_NORMALS = Object.freeze([
  Object.freeze({ id: 'smooth', label: 'Smooth' }),
  Object.freeze({ id: 'flat', label: 'Flat' }),
])

// The settings a Blender import wants: GLB (metres, Y-up, names and hierarchy
// by specification), surface normals, one object per part.
export const BLENDER_PRESET = Object.freeze({ output: 'glb', quality: 'standard', normals: 'smooth', split: 'part' })

// ── Formats with no reader here ──────────────────────────────────────────────
//
// Dropping one of these gets its `route` as the answer: the way to a format
// this tool does read.
export const UNSUPPORTED_FORMATS = Object.freeze([
  Object.freeze({ label: 'Blender (.blend)', exts: Object.freeze(['blend']), why: 'no browser library reads or writes .blend files; only Blender does', route: 'In Blender, use File > Export > glTF 2.0 (.glb) or FBX, then convert that file here.' }),
  Object.freeze({ label: 'SolidWorks', exts: Object.freeze(['sldprt', 'sldasm']), why: 'SolidWorks files use a closed format', route: 'In SolidWorks, save as STEP (.step), then convert it here.' }),
  Object.freeze({ label: 'Fusion', exts: Object.freeze(['f3d', 'f3z']), why: 'Fusion files use a closed format', route: 'In Fusion, export as STEP (.step), then convert it here.' }),
  Object.freeze({ label: 'Inventor', exts: Object.freeze(['ipt', 'iam']), why: 'Inventor files use a closed format', route: 'In Inventor, export as STEP (.step), then convert it here.' }),
  Object.freeze({ label: 'CATIA', exts: Object.freeze(['catpart', 'catproduct']), why: 'CATIA files use a closed format', route: 'In CATIA, save as STEP (.stp), then convert it here.' }),
  Object.freeze({ label: 'Creo and NX', exts: Object.freeze(['prt', 'asm']), why: 'Creo and NX files use closed formats', route: 'In Creo or NX, export as STEP (.step), then convert it here.' }),
  Object.freeze({ label: 'DWG', exts: Object.freeze(['dwg']), why: 'DWG is a closed format with no reader this site can include', route: 'Save it as DXF from your CAD app, then convert the DXF here.' }),
  Object.freeze({ label: 'SketchUp', exts: Object.freeze(['skp']), why: 'SketchUp files use a closed format', route: 'In SketchUp, export as COLLADA (.dae) or OBJ, then convert it here.' }),
  Object.freeze({ label: '3ds Max', exts: Object.freeze(['max']), why: '3ds Max files use a closed format', route: 'In 3ds Max, export as FBX or glTF, then convert it here.' }),
])

// ── Lookups ──────────────────────────────────────────────────────────────────

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

/** The unsupported-format row for a file name, or null. */
export function unsupportedFor(name) {
  const ext = extensionOf(name)
  return UNSUPPORTED_FORMATS.find((f) => f.exts.includes(ext)) || null
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
// For a comma-separated list: "GLB, compressed" would read as two formats.
export const outputLabels = () => OUTPUT_FORMATS.map((f) => f.label.replace(/, (.+)$/, (_, q) => ` (${q})`))
export const outputFormat = (id) => OUTPUT_FORMATS.find((f) => f.id === id) || null
export const inputsInGroup = (id) => INPUT_FORMATS.filter((f) => f.group === id)
export const outputsInGroup = (id) => OUTPUT_FORMATS.filter((f) => f.group === id)

/** The output file name for a model: "bracket.glb", "bracket.meshopt.glb". */
export function outputName(sourceName, format) {
  const base = String(sourceName || 'model').replace(/\.[^.]+$/, '') || 'model'
  return `${base}${format.suffix || ''}.${format.ext}`
}

/** "OBJ, STL and GLB": a list for a sentence. */
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

/** The route's meta description, built from the table. */
export function describeConverter() {
  const cad = INPUT_FORMATS.filter((f) => f.group === 'cad').map((f) => f.label)
  const outs = [...new Set(OUTPUT_FORMATS.map((f) => f.label.replace(/,.*$/, '')))]
  return `Convert ${INPUT_FORMATS.length} 3D and CAD formats in your browser, ${listForProse(cad)} included, to ${listForProse(outs)}.`
}

/**
 * Split one drop into the file the converter will read and the sidecars that
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
// it is ("this is not an STL") instead of as an empty model or a stack trace.
//
// `bytes` is a Uint8Array of (at least the start of) the file; `size` is the
// whole file's length, which binary STL needs to check its own triangle count.

const ascii = (bytes, start, end) => {
  let s = ''
  const stop = Math.min(end, bytes.length)
  for (let i = start; i < stop; i++) s += String.fromCharCode(bytes[i])
  return s
}

const isZip = (head) => head.startsWith('PK\u0003\u0004')

function isBinary(bytes, n = 4096) {
  for (let i = 0; i < Math.min(bytes.length, n); i++) {
    const b = bytes[i]
    if (b < 9 || (b > 13 && b < 27)) return true
  }
  return false
}

/** The sentence a failed signature check is shown as: one wording, used both
 *  by the pre-check in ModelConverter.jsx and by meshEngine's describeLoadError. */
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
      return isZip(head) ? null : 'it is not a 3MF package (a 3MF is a zip archive)'
    case 'kmz':
      return isZip(head) ? null : 'it is not a KMZ package (a KMZ is a zip archive)'
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
      if (isBinary(bytes)) return 'it is a binary file, and OBJ is text'
      return /^\s*v\s+-?[\d.]/m.test(ascii(bytes, 0, 1 << 20)) ? null : 'no vertex lines were found in it'
    }
    case 'dae':
      return /<COLLADA[\s>]/.test(ascii(bytes, 0, 8192)) ? null : 'it is not a COLLADA document'
    case '3ds':
      // The main chunk: id 0x4D4D, then the chunk's own length.
      return bytes.length >= 6 && bytes[0] === 0x4d && bytes[1] === 0x4d ? null : 'it does not start with a 3DS main chunk'
    case 'lwo': {
      const tag = ascii(bytes, 8, 12)
      return head.startsWith('FORM') && /^LW(O2|O3|OB)$/.test(tag) ? null : 'it is not a LightWave object (an IFF FORM of type LWO2 or LWO3)'
    }
    case 'wrl':
      if (/^#VRML V2\.0/.test(text)) return null
      return /^#VRML V1\.0/.test(text) ? 'it is VRML 1.0, and only VRML 2.0 (VRML97) is read' : 'it does not start with a VRML 2.0 header'
    case 'off':
      return /^(ST)?C?N?4?n?OFF\b/.test(text) ? null : 'it does not start with an OFF header'
    case 'amf':
      if (isZip(head)) return null
      return /<amf[\s>]/.test(ascii(bytes, 0, 8192)) ? null : 'it is not an AMF document'
    case 'usd':
      if (head.startsWith('PXR-USDC') || isZip(head) || /^#usda\b/.test(text)) return null
      return 'it is not a USD file (text USDA, binary USDC or a USDZ package)'
    case 'vtk':
      if (/^# vtk DataFile/.test(text)) return null
      return /<VTKFile[\s>]/.test(ascii(bytes, 0, 8192)) ? null : 'it is neither a legacy VTK file nor a VTK XML file'
    case 'xyz': {
      if (isBinary(bytes)) return 'it is a binary file, and XYZ is text'
      const line = text.split(/\r?\n/).find((l) => l.trim() && !/^\s*#/.test(l)) || ''
      return /^\s*-?[\d.]+(e[-+]?\d+)?[\s,;]+-?[\d.]+(e[-+]?\d+)?[\s,;]+-?[\d.]+/i.test(line) ? null : 'its first line is not three numbers'
    }
    case 'pcd':
      return /^(#[^\n]*\n\s*)*(VERSION|FIELDS)\b/m.test(text) && /\bDATA\s+(ascii|binary|binary_compressed)\b/.test(ascii(bytes, 0, 8192)) ? null : 'it does not have a PCD header'
    case 'dxf': {
      if (head.startsWith('AutoCAD Binary DXF')) return 'it is a binary DXF; save it as an ASCII DXF'
      if (isBinary(bytes)) return 'it is a binary file, and DXF is text'
      return /^\s*0\s*\r?\n\s*SECTION\b/.test(text) || /\n\s*0\s*\r?\n\s*SECTION\b/.test(ascii(bytes, 0, 4096)) ? null : 'it does not start with a DXF section'
    }
    case 'step':
      return /ISO-10303-21/.test(head) ? null : 'it does not start with a STEP (ISO 10303-21) header'
    case 'ifc':
      if (!/ISO-10303-21/.test(head)) return 'it does not start with an ISO 10303-21 header'
      return /FILE_SCHEMA\s*\(\s*\(\s*'IFC/i.test(ascii(bytes, 0, 8192)) ? null : 'its header names no IFC schema'
    case 'iges': {
      // Fixed 80-column records; column 73 of the first record is the section
      // letter, and the first section is Start (S) or, for compressed IGES, C.
      const first = head.split(/\r?\n/, 1)[0] || ''
      return /^.{72}[SC]/.test(first) ? null : 'it is not laid out as IGES 80-column records'
    }
    case 'brep':
      return /^(DBRep_DrawableShape|CASCADE Topology)/.test(text) ? null : 'it is not an OpenCascade BREP file'
    case '3dm':
      return head.startsWith('3D Geometry File Format ') ? null : 'it does not start with the Rhino 3DM signature'
    default:
      return 'no reader handles this format'
  }
}
