// /create/3d-converter — the format table, the signature checks, real conversions
// through the real three.js loaders and exporters, and the bundle proof that
// three.js never reaches the entry chunk.
//
// FIXTURES ARE BUILT HERE, NOT COMMITTED. Every mesh below is made in-test
// (a box, a tetrahedron, a hand-written ASCII FBX and PLY) so no binary blob
// lives in the repository and every expected number is known exactly.
//
// WHAT NODE CANNOT RUN, and where it is covered instead: ThreeMFLoader needs
// DOMParser, and the viewer needs WebGL. The 3MF round trip, drawing, keyboard
// orbit and the download gate are in tests/user-sim/98-model-converter.spec.js,
// in a real browser.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { stripJs } from '../helpers/strip-comments.js'

const ROOT = process.cwd()
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const load = (p) => import(pathToFileURL(path.join(ROOT, p)).href)

// GLTFExporter turns its binary output into an ArrayBuffer through a browser
// FileReader. Node has Blob but no FileReader; this is the smallest shim that
// satisfies the two methods it calls, and it is only installed when absent.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.({ target: this }) })
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((b) => {
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(b).toString('base64')}`
        this.onloadend?.({ target: this })
      })
    }
  }
}

// FileLoader (which GLTFLoader uses for a .gltf's embedded data: URIs) reports
// progress with a browser ProgressEvent. Same treatment.
if (typeof globalThis.ProgressEvent === 'undefined') {
  globalThis.ProgressEvent = class extends Event {
    constructor(type, init = {}) { super(type); Object.assign(this, init) }
  }
}

const F = await load('src/utils/meshFormats.js')
const E = await load('src/utils/meshEngine.js')
const THREE = await import('three')

const input = (id) => F.INPUT_FORMATS.find((f) => f.id === id)
const bytesOf = (s) => new TextEncoder().encode(s)

/** A 2 x 1 x 1 box and a tetrahedron, as two meshes under one group. */
function fixtureScene() {
  const group = new THREE.Group()
  group.add(new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), new THREE.MeshStandardMaterial()))
  const tetra = new THREE.Mesh(new THREE.TetrahedronGeometry(0.5), new THREE.MeshStandardMaterial())
  tetra.position.set(3, 0, 0)
  group.add(tetra)
  group.updateMatrixWorld(true)
  return group
}
// Box: 12 triangles. Tetrahedron: 4. Extent: x from -1 to 3 + 0.5*... — read
// off the scene rather than typed, so the assertion is about preservation.
const FIXTURE_TRIANGLES = 16

// ── The table ───────────────────────────────────────────────────────────────

test('the converter opens the mesh, CAD, BIM and point-cloud formats it was asked for', () => {
  const ids = F.INPUT_FORMATS.map((f) => f.id)
  const asked = [
    'obj', 'stl', 'gltf', 'glb', 'ply', '3mf', 'fbx', 'step', 'iges',
    '3ds', 'dae', 'usd', 'wrl', 'amf', 'off', '3dm', 'ifc', 'dxf', 'brep', 'lwo', 'xyz', 'pcd',
  ]
  for (const id of asked) assert.ok(ids.includes(id), `${id} is missing from INPUT_FORMATS`)
  assert.deepEqual(F.OUTPUT_FORMATS.map((f) => f.id).sort(), ['3mf', 'glb', 'glb-meshopt', 'gltf', 'obj', 'ply', 'stl', 'usdz'])
  // Every output sits in a group the panel shows, and every group has one.
  for (const f of F.OUTPUT_FORMATS) assert.ok(F.OUTPUT_GROUPS.some((g) => g.id === f.group), `${f.id} is in no output group`)
  for (const g of F.OUTPUT_GROUPS) assert.ok(F.outputsInGroup(g.id).length, `output group ${g.id} is empty`)
  assert.equal(F.outputName('bracket.step', F.outputFormat('glb-meshopt')), 'bracket.meshopt.glb')
})

test('formats with no honest browser reader are named with a way round, never opened', () => {
  for (const name of ['scene.blend', 'part.SLDPRT', 'plan.dwg', 'house.skp']) {
    assert.equal(F.formatForFile(name), null, `${name} resolved to a reader`)
    const row = F.unsupportedFor(name)
    assert.ok(row, `${name} has no explanation`)
    assert.match(row.route, /convert (it|that file|the DXF) here/)
  }
  assert.equal(F.unsupportedFor('part.stl'), null)
})

test('every extension resolves to its format, in any case, and nothing else does', () => {
  for (const f of F.INPUT_FORMATS) {
    for (const ext of f.exts) {
      assert.equal(F.formatForFile(`chair.${ext}`)?.id, f.id)
      assert.equal(F.formatForFile(`CHAIR.${ext.toUpperCase()}`)?.id, f.id)
    }
  }
  assert.equal(F.formatForFile('photo.png'), null)
  assert.equal(F.formatForFile('model'), null)
  assert.equal(F.formatForFile('archive.obj.zip'), null)
  const accept = F.acceptAttribute().split(',')
  for (const f of F.INPUT_FORMATS) for (const ext of f.exts) assert.ok(accept.includes(`.${ext}`), `.${ext} is not in the file input's accept list`)
})

test('a drop is split into the model, its sidecars, and anything else', () => {
  const file = (name) => ({ name })
  const drop = F.pickPrimary([file('notes.txt'), file('scene.gltf'), file('scene.bin'), file('wood.png'), file('other.glb')])
  assert.equal(drop.primary.name, 'scene.gltf')
  assert.equal(drop.format.id, 'gltf')
  assert.deepEqual(drop.companions.map((f) => f.name), ['scene.bin', 'wood.png'])
  assert.deepEqual(drop.ignored.map((f) => f.name).sort(), ['notes.txt', 'other.glb'])
  assert.equal(F.pickPrimary([file('a.png'), file('b.txt')]), null)
})

test('every format the viewer reads has a loader behind it (no advertised dead format)', () => {
  const src = stripJs(read('src/utils/meshEngine.js'))
  assert.deepEqual([...new Set(F.INPUT_FORMATS.map((f) => f.engine))].sort(), ['cad', 'ifc', 'mesh', 'rhino'])
  for (const f of F.INPUT_FORMATS) {
    if (f.engine === 'cad' || f.engine === 'ifc') continue
    assert.match(src, new RegExp(`case '${f.id}'`), `meshEngine.parseModel has no case for ${f.id}`)
  }
  const cad = stripJs(read('src/utils/cadEngine.js'))
  for (const f of F.INPUT_FORMATS.filter((x) => x.engine === 'cad')) {
    assert.match(cad, new RegExp(`${f.id}:\\s*'Read`), `cadEngine has no reader for ${f.id}`)
  }
  // IFC has its own worker; loadModel hands every 'ifc' row to it.
  assert.match(src, /format\.engine === 'ifc'[\s\S]{0,80}readIfc\(/, 'loadModel does not route IFC to readIfc')
  assert.match(stripJs(read('src/utils/ifcEngine.js')), /export async function readIfc\(/)
  for (const f of F.OUTPUT_FORMATS) {
    assert.match(src, new RegExp(`case '${f.id}'`), `meshEngine.exportModel has no case for ${f.id}`)
  }
})

test('the route description lists the formats from the table, so it cannot drift', async () => {
  const { PAGE_DESCRIPTIONS, PAGE_TITLES } = await load('src/data/routeMetaMap.js')
  const d = PAGE_DESCRIPTIONS['/create/3d-converter']
  assert.ok(PAGE_TITLES['/create/3d-converter'])
  // Every output by name; the inputs as the named few plus a count of the rest
  // that matches the table, so adding an input moves the number.
  for (const label of F.outputLabels()) assert.ok(d.includes(label), `${label} missing from the description`)
  const m = d.match(/^View ((?:[\w.]+, )*[\w.]+) and (\d+) more 3D formats /)
  assert.ok(m, `the description no longer names and counts its inputs: ${d}`)
  const named = m[1].split(', ')
  for (const label of named) assert.ok(F.INPUT_FORMATS.some((f) => f.label === label), `${label} is not an input format`)
  assert.equal(Number(m[2]) + named.length, F.INPUT_FORMATS.length, 'the count of other formats is not the table\'s')
  assert.ok(d.length <= 160, `${d.length} characters is cut off in a search result`)
})

test('the tool lives at /create/3d-converter and the old viewer URL redirects to it, at the edge and in the app', async () => {
  const { createTools } = await load('src/data/toolTree.js')
  const tool = createTools().find((t) => t.route === '/create/3d-converter')
  assert.ok(tool, 'no Create tool is mounted at /create/3d-converter')
  assert.equal(tool.label, '3D Model Converter')
  assert.equal(tool.beta, true, 'the converter lost its beta flag')
  assert.equal(createTools().some((t) => t.route === '/create/3d-viewer'), false, 'the old route is still a tool')

  const { LEGACY_REDIRECTS, CLIENT_REDIRECT_ROUTES } = await load('src/data/legacyRoutes.js')
  const pair = (list) => list.some(([from, to]) => from === '/create/3d-viewer' && to === '/create/3d-converter')
  assert.ok(pair(LEGACY_REDIRECTS), 'no redirect from /create/3d-viewer in the legacy table')
  assert.ok(pair(CLIENT_REDIRECT_ROUTES), 'the app does not render a client redirect for /create/3d-viewer')

  const vercel = JSON.parse(read('vercel.json'))
  const edge = vercel.redirects.find((r) => r.source === '/create/3d-viewer')
  assert.equal(edge?.destination, '/create/3d-converter', 'vercel.json does not 301 the old URL')
  assert.equal(edge?.permanent, true)
  assert.ok(vercel.rewrites.some((r) => r.source === '/create/3d-converter'), 'the new route has no prerendered shell rewrite')
  assert.equal(vercel.rewrites.some((r) => r.source === '/create/3d-viewer'), false, 'the old route still has a shell')
  assert.match(read('public/sitemap.xml'), /\/create\/3d-converter</)
  assert.doesNotMatch(read('public/sitemap.xml'), /\/create\/3d-viewer</)
  assert.match(stripJs(read('src/pages/CreateTool.jsx')), /'\/create\/3d-converter':\s*ModelConverter/)
})

// ── Does the file look like what its name says? ─────────────────────────────

test('a file that is not what its extension says is refused with a reason', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(200).fill(7)])
  for (const id of ['stl', 'obj', 'glb', 'gltf', 'ply', '3mf', 'fbx', 'step', 'iges']) {
    const why = F.signatureProblem(id, png, png.length)
    assert.equal(typeof why, 'string', `a PNG renamed .${id} was accepted`)
  }
  assert.equal(F.signatureProblem('stl', new Uint8Array(0), 0), 'the file is empty')
})

test('a binary STL cut short is named as cut short', async () => {
  const blob = await E.exportModel(fixtureScene(), F.outputFormat('stl'))
  const full = new Uint8Array(await blob.arrayBuffer())
  assert.equal(F.signatureProblem('stl', full, full.length), null)
  const cut = full.slice(0, full.length - 60)
  assert.match(F.signatureProblem('stl', cut, cut.length), /cut short/)
})

test('text formats are recognised by their own first lines', () => {
  assert.equal(F.signatureProblem('obj', bytesOf('# made by hand\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n')), null)
  assert.equal(F.signatureProblem('stl', bytesOf('solid t\nfacet normal 0 0 1\nouter loop\nendloop\nendfacet\nendsolid t\n')), null)
  assert.equal(F.signatureProblem('gltf', bytesOf('  {"asset":{"version":"2.0"}}')), null)
  assert.equal(F.signatureProblem('ply', bytesOf('ply\nformat ascii 1.0\n')), null)
  assert.equal(F.signatureProblem('step', bytesOf('ISO-10303-21;\nHEADER;\n')), null)
  assert.equal(F.signatureProblem('iges', bytesOf(`${' '.repeat(72)}S      1\n`)), null)
  assert.match(F.signatureProblem('obj', bytesOf('hello world\n')), /no vertex/)
})

// ── Real conversions through the real loaders and exporters ─────────────────

async function roundTrip(outId, inId = outId) {
  const scene = fixtureScene()
  const before = E.measure(scene)
  const blob = await E.exportModel(scene, F.outputFormat(outId))
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  assert.equal(F.signatureProblem(inId, bytes, bytes.length), null, `our own ${outId} fails its signature check`)
  const { object, warnings } = await E.parseModel(input(inId), buf)
  const after = E.measure(E.normalise(object, warnings))
  return { before, after, bytes: buf.byteLength }
}

for (const id of ['stl', 'obj', 'ply', 'glb', 'gltf']) {
  test(`${id.toUpperCase()}: written, read back, same triangles and same extent`, async () => {
    const { before, after, bytes } = await roundTrip(id)
    assert.ok(bytes > 100, `${id} output is only ${bytes} bytes`)
    assert.equal(before.triangles, FIXTURE_TRIANGLES)
    assert.equal(after.triangles, before.triangles, `${id} lost or gained triangles`)
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(after.size[i] - before.size[i]) < 1e-4, `${id} changed the extent on axis ${i}`)
  })
}

test('3MF: a valid package with one object per mesh, world transforms baked in', async () => {
  const blob = await E.exportModel(fixtureScene(), F.outputFormat('3mf'), { sourceUnit: null })
  const bytes = new Uint8Array(await blob.arrayBuffer())
  assert.equal(F.signatureProblem('3mf', bytes, bytes.length), null)
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(bytes)
  assert.ok(zip.file('[Content_Types].xml') && zip.file('_rels/.rels'), 'the package parts a reader looks for first are missing')
  const model = await zip.file('3D/3dmodel.model').async('string')
  assert.match(model, /unit="millimeter"/)
  assert.equal((model.match(/<object /g) || []).length, 2)
  assert.equal((model.match(/<triangle /g) || []).length, FIXTURE_TRIANGLES)
  // The tetrahedron sits at x = 3; if transforms were not applied, no vertex
  // would be anywhere near it.
  const xs = [...model.matchAll(/<vertex x="([-\d.e]+)"/g)].map((m) => Number(m[1]))
  assert.ok(Math.max(...xs) > 3, 'the second mesh was written at its local origin, not where it sits')
  const metres = await E.exportModel(fixtureScene(), F.outputFormat('3mf'), { sourceUnit: 'm' })
  const mz = await JSZip.loadAsync(new Uint8Array(await metres.arrayBuffer()))
  assert.match(await mz.file('3D/3dmodel.model').async('string'), /unit="meter"/)
})

test('FBX: a hand-written text FBX 7.3 is read as one mesh of two triangles', async () => {
  const fbx = [
    '; FBX 7.3.0 project file',
    'FBXHeaderExtension:  {', '\tFBXHeaderVersion: 1003', '\tFBXVersion: 7300', '}',
    'Objects:  {',
    '\tGeometry: 100, "Geometry::quad", "Mesh" {',
    '\t\tVertices: *12 {', '\t\t\ta: 0,0,0,2,0,0,2,3,0,0,3,0', '\t\t}',
    '\t\tPolygonVertexIndex: *4 {', '\t\t\ta: 0,1,2,-4', '\t\t}',
    '\t\tGeometryVersion: 124', '\t}',
    '\tModel: 200, "Model::quad", "Mesh" {', '\t\tVersion: 232', '\t\tProperties70:  {', '\t\t}', '\t}',
    '}',
    'Connections:  {', '\tC: "OO",100,200', '\tC: "OO",200,0', '}', '',
  ].join('\n')
  const bytes = bytesOf(fbx)
  assert.equal(F.signatureProblem('fbx', bytes, bytes.length), null)
  const { object, warnings } = await E.parseModel(input('fbx'), bytes.buffer)
  const stats = E.measure(E.normalise(object, warnings))
  assert.equal(stats.triangles, 2)
  assert.equal(stats.meshes, 1)
  assert.deepEqual(stats.size.map((n) => Math.round(n * 1000) / 1000), [2, 3, 0])
})

test('FBX: GlobalSettings.UnitScaleFactor sets the unit (centimetres per file unit)', async () => {
  const fbxWith = (factor) => bytesOf([
    '; FBX 7.3.0 project file',
    'FBXHeaderExtension:  {', '\tFBXHeaderVersion: 1003', '\tFBXVersion: 7300', '}',
    ...(factor == null ? [] : ['GlobalSettings:  {', '\tVersion: 1000', '\tProperties70:  {', `\t\tP: "UnitScaleFactor", "double", "Number", "",${factor}`, '\t}', '}']),
    'Objects:  {',
    '\tGeometry: 100, "Geometry::quad", "Mesh" {',
    '\t\tVertices: *12 {', '\t\t\ta: 0,0,0,2,0,0,2,3,0,0,3,0', '\t\t}',
    '\t\tPolygonVertexIndex: *4 {', '\t\t\ta: 0,1,2,-4', '\t\t}',
    '\t\tGeometryVersion: 124', '\t}',
    '\tModel: 200, "Model::quad", "Mesh" {', '\t\tVersion: 232', '\t\tProperties70:  {', '\t\t}', '\t}',
    '}',
    'Connections:  {', '\tC: "OO",100,200', '\tC: "OO",200,0', '}', '',
  ].join('\n')).buffer
  // Blender's default FBX export writes 1: centimetres.
  assert.equal((await E.parseModel(input('fbx'), fbxWith(1))).unit, 'cm')
  assert.equal((await E.parseModel(input('fbx'), fbxWith(100))).unit, 'm')
  assert.equal((await E.parseModel(input('fbx'), fbxWith(0.1))).unit, 'mm')
  assert.equal((await E.parseModel(input('fbx'), fbxWith(2.54))).unit, 'in')
  // No GlobalSettings: bare numbers, which the page asks the user to name.
  assert.equal((await E.parseModel(input('fbx'), fbxWith(null))).unit, undefined)
  // A factor with no unit of its own is scaled into metres.
  const odd = await E.parseModel(input('fbx'), fbxWith(50))
  assert.equal(odd.unit, 'm')
  const stats = E.measure(E.normalise(odd.object, odd.warnings))
  assert.deepEqual(stats.size.map((n) => Math.round(n * 1000) / 1000), [1, 1.5, 0])
})

test('the list of outputs reads as one name per format, with no comma inside a name', () => {
  const labels = F.outputLabels()
  assert.equal(labels.length, F.OUTPUT_FORMATS.length)
  for (const l of labels) assert.doesNotMatch(l, /,/)
  assert.ok(labels.includes('GLB (compressed)'))
})

test('3DM: the reader\'s per-object warnings are counted and never shown in its own words', async () => {
  const { rhinoWarnings } = await load('src/utils/mesh/rhino.js')
  const noMesh = (n) => Array.from({ length: n }, () => ({ type: 'missing mesh', message: 'THREE.3DMLoader: ObjectType_Brep has no associated mesh geometry.' }))
  const out = rhinoWarnings([
    ...noMesh(3),
    { type: 'not implemented', message: 'THREE.3DMLoader: Conversion not implemented for ObjectType_Hatch' },
    { type: 'no conversion', message: 'THREE.3DMLoader: No conversion exists for the decals associated with this object.' },
  ])
  assert.equal(out.length, 3)
  assert.match(out[0], /^3 objects were saved without a render mesh/)
  assert.match(out[1], /^1 object is of a kind/)
  assert.match(out[2], /^1 texture, light or decal /)
  for (const line of out) assert.doesNotMatch(line, /THREE|3DMLoader|ObjectType_/)
  assert.deepEqual(rhinoWarnings(undefined), [])
})

test('an STL that stores every normal as zero is lit, not drawn black', async () => {
  // Valid STL: the format allows zero facet normals and slicers recompute
  // them. Lit as stored, every face is black — which is how the first
  // rendered pass of this page drew its own test box.
  const buf = new ArrayBuffer(84 + 50)
  const view = new DataView(buf)
  view.setUint32(80, 1, true)
  const verts = [0, 0, 0, 1, 0, 0, 0, 1, 0]
  verts.forEach((n, i) => view.setFloat32(84 + 12 + i * 4, n, true))
  const { object, warnings } = await E.parseModel(input('stl'), buf)
  const root = E.normalise(object, warnings)
  let normal = null
  root.traverse((o) => { if (o.isMesh) normal = o.geometry.attributes.normal })
  assert.ok(normal, 'no normals at all')
  assert.ok(Math.abs(normal.getZ(0)) > 0.99, `the zero normal was kept (z = ${normal.getZ(0)})`)
})

test('PLY with no faces is drawn as a point cloud and says so', async () => {
  const ply = 'ply\nformat ascii 1.0\nelement vertex 4\nproperty float x\nproperty float y\nproperty float z\nend_header\n0 0 0\n1 0 0\n0 1 0\n0 0 1\n'
  const { object, warnings } = await E.parseModel(input('ply'), bytesOf(ply).buffer)
  const stats = E.measure(E.normalise(object, warnings))
  assert.equal(stats.points, 4)
  assert.equal(stats.triangles, 0)
  assert.ok(warnings.some((w) => /point cloud/.test(w)), 'the point-cloud drawing was not disclosed')
  // A point cloud can be written where a format holds points, and the page
  // disables the ones that cannot.
  assert.equal(F.outputFormat('stl').points, false)
  assert.equal(F.outputFormat('3mf').points, false)
})

test('a .gltf whose .bin was not dropped names the missing file instead of fetching it', async () => {
  const gltf = JSON.stringify({ asset: { version: '2.0' }, buffers: [{ uri: 'scene.bin', byteLength: 36 }] })
  await assert.rejects(
    () => E.parseModel(input('gltf'), bytesOf(gltf).buffer, { companions: [] }),
    (err) => err.message === 'gltf-missing-buffers' && err.files[0] === 'scene.bin',
  )
  const said = E.describeLoadError(Object.assign(new Error('gltf-missing-buffers'), { files: ['scene.bin'] }), input('gltf'), 'scene.gltf')
  assert.match(said, /scene\.bin/)
  assert.match(said, /Drop the \.gltf and its \.bin together/)
})

test('CAD tessellation output becomes geometry, and an uncoloured body is not drawn black', () => {
  // The shape occt returns for a unit square (two triangles), after
  // cadWorker.js has turned its arrays into typed arrays.
  const group = E.cadToGroup({
    meshes: [{
      name: 'plate',
      position: new Float32Array([0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0]),
      normal: null,
      index: new Uint32Array([0, 1, 2, 0, 2, 3]),
      color: [0, 0, 0],
      faces: [],
    }],
  })
  const stats = E.measure(group)
  assert.equal(stats.triangles, 2)
  const colour = group.children[0].material.color
  assert.ok(colour.r + colour.g + colour.b > 0.5, 'a body occt reports with no colour was painted black')
  // The same grey every other uncoloured model gets (0xa9a59b, an sRGB hex),
  // not a lighter one from reading those numbers as linear.
  assert.equal(colour.getHexString(), 'a9a59b', 'an uncoloured CAD part is not the default grey')
})

test('the IFC worker answers only its own verified wasm, and refuses every other request', async () => {
  const vm = await import('node:vm')
  const network = []
  let delivered = null
  const ctx = { URL, Blob, Response, Uint32Array, Float32Array, console }
  ctx.self = ctx
  ctx.fetch = (u) => { network.push(String(u?.url || u)); return Promise.resolve(new Response('')) }
  ctx.postMessage = () => {}
  // Stands in for web-ifc: the script defines WebIFC, and Init fetches the
  // wasm by the name it is told.
  ctx.importScripts = () => {
    ctx.WebIFC = { IfcAPI: class { async Init(locate) { delivered = new Uint8Array(await (await ctx.fetch(locate('web-ifc.wasm'))).arrayBuffer()) } } }
  }
  vm.createContext(ctx)
  vm.runInContext(read('src/utils/ifcWorker.js'), ctx)
  ctx.onmessage({ data: { type: 'engine', script: new Uint8Array(1), wasm: new Uint8Array([0, 0x61, 0x73, 0x6d]) } })
  for (let i = 0; i < 50 && !delivered; i++) await new Promise((r) => setTimeout(r, 5))
  assert.deepEqual(delivered && [...delivered], [0, 0x61, 0x73, 0x6d], 'the verified wasm was not answered from memory')
  await assert.rejects(() => ctx.fetch('https://example.test/web-ifc-mt.worker.js'))
  await assert.rejects(() => ctx.fetch(new URL('https://example.test/data.json')))
  await assert.rejects(() => ctx.fetch({ url: '/assets/anything.js' }))
  assert.deepEqual(network, [], 'the worker passed a request through to the network')
})

test('cancelling is not an error, and every other failure is a sentence', () => {
  const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' })
  assert.equal(E.describeLoadError(abort, input('stl')), null)
  const said = E.describeLoadError(new Error('signature: it is neither a binary STL nor a text STL'), input('stl'), 'part.stl')
  assert.equal(said, 'part.stl could not be read as STL: it is neither a binary STL nor a text STL.')
  assert.match(E.describeLoadError(new Error('empty-model'), input('obj'), 'x.obj'), /nothing to draw/)
})

// ── The engine never enters the entry graph ─────────────────────────────────

test('only the engine module imports three.js, and the page reaches it only lazily', () => {
  const files = []
  ;(function walk(dir) {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`
      if (e.isDirectory()) walk(rel)
      else if (/\.jsx?$/.test(e.name)) files.push(rel)
    }
  })('src')
  assert.ok(files.length > 100, `only ${files.length} source files found`)
  // The engine and the three helpers it splits into; nothing else.
  const importers = files.filter((f) => /from\s+['"]three(\/[^'"]*)?['"]/.test(stripJs(read(f)))).sort()
  assert.deepEqual(importers, ['src/utils/mesh/cad.js', 'src/utils/mesh/rhino.js', 'src/utils/mesh/transform.js', 'src/utils/meshEngine.js'])
  // Each helper is reached only from the engine (statically) or its lazy table.
  for (const helper of ['cad', 'rhino', 'transform']) {
    const users = files.filter((f) => f !== `src/utils/mesh/${helper}.js` && new RegExp(`['"]\\./(mesh/)?${helper}\\.js['"]`).test(stripJs(read(f))))
    assert.deepEqual(users, ['src/utils/meshEngine.js'], `mesh/${helper}.js is imported from outside the engine`)
  }
  // OpenCascade is fetched at runtime from a pinned CDN URL, never bundled.
  const occt = files.filter((f) => /from\s+['"]occt-import-js|import\(\s*['"]occt-import-js/.test(stripJs(read(f))))
  assert.deepEqual(occt, [])

  const page = stripJs(read('src/pages/ModelConverter.jsx'))
  assert.doesNotMatch(page, /import\s[^;]*from\s+['"][^'"]*meshEngine['"]/, 'ModelConverter imports the engine statically')
  assert.match(page, /import\(\s*['"]\.\.\/utils\/meshEngine['"]\s*\)/, 'ModelConverter no longer loads the engine lazily')
  const shell = stripJs(read('src/pages/CreateTool.jsx'))
  assert.match(shell, /lazy\(\(\)\s*=>\s*import\(\s*['"]\.\/ModelConverter['"]\s*\)\)/)
  assert.doesNotMatch(read('src/utils/meshFormats.js'), /^\s*import\s/m, 'meshFormats.js is in the entry graph and must import nothing')
})

const outDir = path.join(os.tmpdir(), `uil4b-three-chunk-${process.pid}-${Date.now()}`)
after(() => fs.rmSync(outDir, { recursive: true, force: true }))

test('a production build keeps three.js out of the entry chunk and out of the page chunk', async () => {
  const { build } = await import('vite')
  const result = await build({ root: ROOT, logLevel: 'silent', build: { outDir, emptyOutDir: true } })
  const output = (Array.isArray(result) ? result[0] : result).output
  const chunks = output.filter((o) => o.type === 'chunk')
  const byFile = new Map(chunks.map((c) => [c.fileName, c]))
  const isThree = (id) => /[\\/]node_modules[\\/]three[\\/]/.test(id)

  /** Every module id reachable from `chunk` by STATIC import. */
  const staticClosure = (chunk) => {
    const seen = new Set()
    const ids = []
    const queue = [chunk]
    while (queue.length) {
      const c = queue.shift()
      if (!c || seen.has(c.fileName)) continue
      seen.add(c.fileName)
      ids.push(...c.moduleIds)
      for (const f of c.imports) queue.push(byFile.get(f))
    }
    return ids
  }

  const entry = chunks.find((c) => c.isEntry && /^assets\/index-/.test(c.fileName))
  assert.ok(entry, `no entry chunk among ${chunks.length} chunks`)
  const entryIds = staticClosure(entry)
  assert.ok(entryIds.length > 50, 'the entry closure is too small to be this app')
  assert.deepEqual(entryIds.filter(isThree), [], 'three.js is reachable from the entry chunk by static import')

  const page = chunks.find((c) => c.facadeModuleId && /src[\\/]pages[\\/]ModelConverter\.jsx$/.test(c.facadeModuleId))
  assert.ok(page, 'the 3D Model Converter page did not get a chunk of its own')
  assert.deepEqual(staticClosure(page).filter(isThree), [], 'three.js is in the 3D Model Converter page chunk or its static imports')

  // POSITIVE CONTROL: three.js is in the build, in the engine chunk, reached
  // from the page by a dynamic import. Without this the two assertions above
  // would pass on a build where the engine silently failed to bundle.
  const engine = chunks.find((c) => c.facadeModuleId && /src[\\/]utils[\\/]meshEngine\.js$/.test(c.facadeModuleId))
  assert.ok(engine, 'the engine did not get a chunk of its own')
  assert.ok(staticClosure(engine).some(isThree), 'the engine chunk carries no three.js — is this the right chunk?')
  assert.ok(page.dynamicImports.includes(engine.fileName), 'the page does not reach the engine by dynamic import')

  // The CAD and IFC workers ship as their own small files. OpenCascade,
  // web-ifc and rhino3dm are fetched from their pinned CDN URLs, never bundled.
  const files = fs.readdirSync(path.join(outDir, 'assets'))
  assert.ok(files.some((f) => /^cadWorker-.*\.js$/.test(f)), `no cadWorker asset among ${files.length} files`)
  assert.ok(files.some((f) => /^ifcWorker-.*\.js$/.test(f)), `no ifcWorker asset among ${files.length} files`)
  // The ONE exception: three's Draco and Basis (KTX2) decoders, served from
  // this site. Named exactly, so no other wasm can slip in under them.
  const DECODERS = /^(draco_decoder|draco_wasm_wrapper|basis_transcoder)-[\w-]+\.(wasm|js)$/
  assert.deepEqual(files.filter((f) => /occt|web-ifc|rhino3dm|\.wasm$/i.test(f) && !/ffmpeg/i.test(f) && !DECODERS.test(f)), [])
  const decoderWasm = files.filter((f) => /\.wasm$/.test(f) && DECODERS.test(f)).map((f) => f.replace(/-[\w-]+\.wasm$/, '')).sort()
  assert.deepEqual([...new Set(decoderWasm)], ['basis_transcoder', 'draco_decoder'], 'the decoder wasm files are not the ones allowed')
  // ...and only the two loaders that use them name them, both reached from
  // the engine by dynamic import, so nothing on the page's static path does.
  const naming = chunks.filter((c) => /draco_decoder|basis_transcoder/.test(c.code))
  assert.deepEqual(naming.map((c) => path.basename(c.facadeModuleId || c.fileName)).sort(), ['DRACOLoader.js', 'KTX2Loader.js'])
  for (const c of naming) assert.ok(engine.dynamicImports.includes(c.fileName), `${c.fileName} is not a lazy import of the engine`)
  const staticIds = new Set([...entryIds, ...staticClosure(page), ...staticClosure(engine)])
  for (const c of naming) assert.equal(staticIds.has(c.facadeModuleId), false, `${c.facadeModuleId} is on a static path`)
})

// An MTL written on Windows names its textures with backslashes
// (`C:\models\tex\Wood.PNG`). The sidecar lookup keys files by basename, so a
// basename that only split on "/" never matched the dropped wood.png.
test('a sidecar path resolves to its file name on either separator', () => {
  assert.equal(E.basename('C:\\models\\tex\\Wood.PNG'), 'wood.png')
  assert.equal(E.basename('..\\tex\\wood.png'), 'wood.png')
  assert.equal(E.basename('tex/sub/wood.png?v=2#x'), 'wood.png')
  assert.equal(E.basename('wood%20grain.png'), 'wood grain.png')
})
