// The Adobe swatch files (.ase, .aco).
//
// The writers are checked against a reader written here from the byte layouts,
// not against the writers' own helpers. The reader is strict (a wrong length, a
// stray byte or a bad marker throws), so each "can fail" test corrupts one byte
// of a copy and expects the reader to reject it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { swatchGroups, buildAse, buildAco } from '../../src/utils/swatchFiles.js'
import { generateTintScale } from '../../src/utils/colors.js'
import { tintConfigFor, DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const TINTS = { lumBias: 82, satDecay: 12, oled: true }
const DESIGN = {
  palette: { base: '#1F4B8E', harmony: 'analogous', activeIdx: 0, colors: ['#1f4b8e', '#2E7BB8', '#3FA9A0'] },
  states: { success: 1, warning: 0, error: { custom: 10 }, info: 2, infoHue: 'purple' },
  tints: {
    ...TINTS,
    scale: generateTintScale({ ...tintConfigFor({ ...DEFAULT_DESIGN, tints: TINTS, palette: { base: '#1F4B8E' } }) }),
  },
}
const ONE_COLOUR = { palette: { base: '#C2410C', colors: ['#C2410C'] } }

const groups = swatchGroups(DESIGN)
const allSwatches = groups.flatMap((g) => g.swatches)

/* ── Independent readers ──────────────────────────────────────────────────── */

const hexOf = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()

// A cursor over a buffer that throws on any read past the end.
function cursor(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let at = 0
  const need = (n) => { if (at + n > bytes.length) throw new Error(`read past end at ${at}`) }
  return {
    get at() { return at },
    done: () => at === bytes.length,
    u16: () => { need(2); at += 2; return view.getUint16(at - 2, false) },
    u32: () => { need(4); at += 4; return view.getUint32(at - 4, false) },
    f32: () => { need(4); at += 4; return view.getFloat32(at - 4, false) },
    ascii: (n) => { need(n); at += n; return String.fromCharCode(...bytes.slice(at - n, at)) },
  }
}

// Reads `units` UTF-16BE code units (the last is the null) from `c`.
function readName(c, units) {
  if (units < 1) throw new Error('name length must include the null')
  let s = ''
  for (let i = 0; i < units - 1; i++) s += String.fromCharCode(c.u16())
  if (c.u16() !== 0) throw new Error('name is not null-terminated')
  return s
}

// Returns { blocks, tree: [{ group, swatches: [{ name, model, values, type }] }] }.
function readAse(bytes) {
  const c = cursor(bytes)
  if (c.ascii(4) !== 'ASEF') throw new Error('bad signature')
  if (c.u16() !== 1 || c.u16() !== 0) throw new Error('bad version')
  const blocks = c.u32()
  const tree = []
  let open = null
  for (let i = 0; i < blocks; i++) {
    const type = c.u16()
    const length = c.u32()
    const start = c.at
    if (type === 0xc001) {
      if (open) throw new Error('group opened inside a group')
      open = { group: readName(c, c.u16()), swatches: [] }
    } else if (type === 0x0001) {
      if (!open) throw new Error('colour outside a group')
      const name = readName(c, c.u16())
      const model = c.ascii(4)
      if (model !== 'RGB ') throw new Error(`unexpected colour model ${model}`)
      const values = [c.f32(), c.f32(), c.f32()]
      const colourType = c.u16()
      open.swatches.push({ name, model, values, type: colourType })
    } else if (type === 0xc002) {
      if (!open) throw new Error('group end with no group')
      tree.push(open)
      open = null
    } else {
      throw new Error(`unknown block type ${type.toString(16)}`)
    }
    if (c.at - start !== length) throw new Error(`block ${i} length ${length} but read ${c.at - start}`)
  }
  if (open) throw new Error('group never closed')
  if (!c.done()) throw new Error('bytes after the last block')
  return { blocks, tree }
}

// Returns { v1: [{ space, w, x, y, z }], v2: [{ ..., name }] }.
function readAco(bytes) {
  const c = cursor(bytes)
  const record = () => ({ space: c.u16(), w: c.u16(), x: c.u16(), y: c.u16(), z: c.u16() })
  if (c.u16() !== 1) throw new Error('first section is not version 1')
  const n1 = c.u16()
  const v1 = Array.from({ length: n1 }, record)
  if (c.u16() !== 2) throw new Error('second section is not version 2')
  const n2 = c.u16()
  const v2 = Array.from({ length: n2 }, () => {
    const r = record()
    return { ...r, name: readName(c, c.u32()) }
  })
  if (!c.done()) throw new Error('bytes after the last colour')
  return { v1, v2 }
}

const near = (a, b, tol) => Math.abs(a - b) <= tol
const hexFromFloats = (values) => hexOf(...values.map((v) => Math.round(v * 255)))
const hexFromAco = (r) => hexOf(...[r.w, r.x, r.y, r.z].slice(0, 3).map((v) => Math.round((v / 65535) * 255)))

/* ── swatchGroups ─────────────────────────────────────────────────────────── */

test('swatchGroups: the groups, in order, with slash names', () => {
  assert.deepEqual(groups.map((g) => g.group), [
    'Brand',
    'Brand tints – Primary',
    'Brand tints – Secondary',
    'Brand tints – Accent',
    'Semantic – Light',
    'Semantic – Dark',
    'States',
  ])
  assert.deepEqual(groups[0].swatches.map((s) => s.name), ['primary', 'secondary', 'accent'])
  assert.equal(groups[0].swatches[0].hex, '#1F4B8E')
  assert.deepEqual(groups[1].swatches.map((s) => s.name), [
    'primary/50', 'primary/100', 'primary/200', 'primary/300', 'primary/400',
    'primary/500', 'primary/600', 'primary/700', 'primary/800', 'primary/900',
  ])
  assert.deepEqual(groups.at(-1).swatches.map((s) => s.name), ['success/500', 'warning/500', 'error/500', 'info/500'])
  for (const s of allSwatches) assert.match(s.hex, /^#[0-9A-F]{6}$/)
})

test('swatchGroups: light and dark hold the same names, with a different surface', () => {
  const light = groups.find((g) => g.group === 'Semantic – Light')
  const dark = groups.find((g) => g.group === 'Semantic – Dark')
  assert.deepEqual(dark.swatches.map((s) => s.name), light.swatches.map((s) => s.name))
  assert.ok(light.swatches.some((s) => s.name === 'on-surface/muted'))
  const surface = (g) => g.swatches.find((s) => s.name === 'surface').hex
  assert.notEqual(surface(dark), surface(light))
  const background = (g) => g.swatches.find((s) => s.name === 'background').hex
  assert.notEqual(background(dark), background(light))
})

test('swatchGroups: a design with no palette still returns the interface and state groups', () => {
  const names = swatchGroups({}).map((g) => g.group)
  assert.ok(names.includes('Semantic – Light') && names.includes('States'))
  assert.ok(!names.includes('Brand'))
  assert.equal(swatchGroups(ONE_COLOUR)[0].swatches.length, 1)
})

/* ── ASE ──────────────────────────────────────────────────────────────────── */

test('ASE: block count, nesting, names and colours round-trip', () => {
  const bytes = buildAse(groups)
  const { blocks, tree } = readAse(bytes)
  assert.equal(blocks, groups.length * 2 + allSwatches.length)
  assert.equal(tree.length, groups.length)
  groups.forEach((g, gi) => {
    assert.equal(tree[gi].group, g.group)
    assert.equal(tree[gi].swatches.length, g.swatches.length)
    g.swatches.forEach((s, si) => {
      const got = tree[gi].swatches[si]
      assert.equal(got.name, s.name)
      assert.equal(got.type, 0)
      const want = [1, 3, 5].map((i) => parseInt(s.hex.slice(i, i + 2), 16) / 255)
      got.values.forEach((v, k) => {
        assert.ok(v >= 0 && v <= 1)
        assert.ok(near(v, want[k], 1 / 255), `${s.name} channel ${k}`)
      })
      assert.equal(hexFromFloats(got.values), s.hex)
    })
  })
})

test('ASE: every hex from swatchGroups is in the file', () => {
  const found = new Set(readAse(buildAse(groups)).tree.flatMap((g) => g.swatches.map((s) => hexFromFloats(s.values))))
  for (const s of allSwatches) assert.ok(found.has(s.hex), s.hex)
})

test('ASE: an empty group list is a valid header-only file', () => {
  const { blocks, tree } = readAse(buildAse([]))
  assert.equal(blocks, 0)
  assert.deepEqual(tree, [])
})

test('ASE reader rejects a file with one byte broken', () => {
  const good = buildAse(groups)
  assert.doesNotThrow(() => readAse(good))
  const broken = (index, value) => { const b = good.slice(); b[index] = value; return b }
  assert.throws(() => readAse(broken(0, 0x58)), /signature/)
  assert.throws(() => readAse(broken(5, 2)), /version/)
  // Block count one too high: the reader runs out of bytes.
  assert.throws(() => readAse(broken(11, good[11] + 1)))
  // First block's length, last byte.
  assert.throws(() => readAse(broken(17, good[17] + 2)), /length/)
  // First block's type becomes a colour entry (0x0001), so it sits outside a group.
  assert.throws(() => readAse(broken(12, 0x00)), /outside a group/)
  // The null after "Brand" (header 12 + block head 6 + name length 2 + 5 characters x 2 = 30).
  assert.throws(() => readAse(broken(31, 0x41)), /null/)
  assert.throws(() => readAse(good.slice(0, good.length - 1)))
  assert.throws(() => readAse(Uint8Array.from([...good, 0])), /bytes after/)
})

/* ── ACO ──────────────────────────────────────────────────────────────────── */

test('ACO: v1 and v2 counts match, names and colours round-trip', () => {
  const { v1, v2 } = readAco(buildAco(groups))
  assert.equal(v1.length, allSwatches.length)
  assert.equal(v2.length, v1.length)
  v1.forEach((r, i) => assert.deepEqual(r, { space: v2[i].space, w: v2[i].w, x: v2[i].x, y: v2[i].y, z: v2[i].z }))
  const expected = groups.flatMap((g) => g.swatches.map((s) => {
    const prefix = g.group === 'Semantic – Light' ? 'light/' : g.group === 'Semantic – Dark' ? 'dark/' : ''
    return { name: prefix + s.name, hex: s.hex }
  }))
  expected.forEach((e, i) => {
    assert.equal(v2[i].name, e.name)
    assert.equal(v2[i].space, 0)
    assert.equal(v2[i].z, 0)
    const want = [1, 3, 5].map((k) => parseInt(e.hex.slice(k, k + 2), 16) / 255)
    const got = [v2[i].w, v2[i].x, v2[i].y].map((v) => v / 65535)
    got.forEach((v, k) => assert.ok(near(v, want[k], 1 / 255), `${e.name} channel ${k}`))
    assert.equal(hexFromAco(v2[i]), e.hex)
  })
})

test('ACO: light and dark names carry a prefix, so the two sets stay apart', () => {
  const names = readAco(buildAco(groups)).v2.map((r) => r.name)
  assert.equal(new Set(names).size, names.length, 'no two swatches share a name')
  assert.ok(names.includes('light/surface') && names.includes('dark/surface'))
  const surface = (prefix) => hexFromAco(readAco(buildAco(groups)).v2.find((r) => r.name === `${prefix}/surface`))
  assert.notEqual(surface('light'), surface('dark'))
})

test('ACO: every hex from swatchGroups is in the file', () => {
  const found = new Set(readAco(buildAco(groups)).v2.map(hexFromAco))
  for (const s of allSwatches) assert.ok(found.has(s.hex), s.hex)
})

test('ACO reader rejects a file with one byte broken', () => {
  const good = buildAco(groups)
  assert.doesNotThrow(() => readAco(good))
  const broken = (index, value) => { const b = good.slice(); b[index] = value; return b }
  assert.throws(() => readAco(broken(1, 3)), /version 1/)
  // v1 count one too low: the v2 marker is then read from inside a colour record.
  assert.throws(() => readAco(broken(3, good[3] - 1)))
  // v2 marker.
  const v2At = 4 + allSwatches.length * 10
  assert.throws(() => readAco(broken(v2At + 1, 3)), /version 2/)
  // First v2 name's length (low byte of the u32) one too long.
  const nameLenAt = v2At + 4 + 10 + 3
  assert.throws(() => readAco(broken(nameLenAt, good[nameLenAt] + 1)))
  assert.throws(() => readAco(good.slice(0, good.length - 1)))
  assert.throws(() => readAco(Uint8Array.from([...good, 0])), /bytes after/)
})
