// Readers for the two text formats three.js has no loader for: OFF and DXF.
//
// Plain arrays in, plain arrays out, no three.js, so node --test drives them
// directly. meshEngine.js turns the result into geometry.

// ── OFF (Object File Format) ─────────────────────────────────────────────────
//
// A header line (OFF, COFF, NOFF, CNOFF, STOFF…), then "vertices faces edges",
// the vertex lines, and one line per face: its vertex count, the indices, and
// optionally an RGB(A) colour. '#' starts a comment anywhere on a line.
// Polygons are split into triangle fans.

/**
 * @returns {{ positions: number[], indices: number[], colors: number[]|null, faces: number }}
 */
export function parseOFF(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim()).filter(Boolean)
  if (!lines.length) throw new Error('the file is empty')
  const header = lines.shift()
  const m = /^(ST)?(C)?(N)?(4)?(n)?OFF\b(.*)$/.exec(header)
  if (!m) throw new Error('it does not start with an OFF header')
  if (m[4] || m[5]) throw new Error('four-dimensional OFF is not read')
  const hasColor = !!m[2]
  const hasNormal = !!m[3]
  // The counts may sit on the header line itself ("OFF 8 6 0").
  let counts = m[6].trim().split(/\s+/).filter(Boolean).map(Number)
  if (counts.length < 2) counts = lines.shift()?.split(/\s+/).map(Number) || []
  const [nv, nf] = counts
  if (!Number.isInteger(nv) || !Number.isInteger(nf) || nv < 0 || nf < 0) throw new Error('its vertex and face counts are missing')
  if (lines.length < nv + nf) throw new Error(`it promises ${nv} vertices and ${nf} faces and ends before them`)

  const positions = new Array(nv * 3)
  const colors = hasColor ? new Array(nv * 3) : null
  for (let i = 0; i < nv; i++) {
    const v = lines[i].split(/\s+/).map(Number)
    positions[i * 3] = v[0]
    positions[i * 3 + 1] = v[1]
    positions[i * 3 + 2] = v[2]
    if (colors) {
      const at = 3 + (hasNormal ? 3 : 0)
      const c = v.slice(at, at + 3)
      const scale = c.some((x) => x > 1) ? 1 / 255 : 1
      colors[i * 3] = (c[0] ?? 0.7) * scale
      colors[i * 3 + 1] = (c[1] ?? 0.7) * scale
      colors[i * 3 + 2] = (c[2] ?? 0.7) * scale
    }
  }
  const indices = []
  for (let f = 0; f < nf; f++) {
    const v = lines[nv + f].split(/\s+/).map(Number)
    const n = v[0]
    if (!(n >= 3)) continue
    const ids = v.slice(1, 1 + n)
    if (ids.some((x) => !Number.isInteger(x) || x < 0 || x >= nv)) throw new Error(`face ${f + 1} names a vertex that does not exist`)
    for (let k = 1; k + 1 < ids.length; k++) indices.push(ids[0], ids[k], ids[k + 1])
  }
  return { positions, indices, colors, faces: nf }
}

// ── DXF (ASCII) ──────────────────────────────────────────────────────────────
//
// DXF is a list of group-code / value pairs. The 3D surface entities are read:
//   3DFACE                   a triangle or quad;
//   POLYLINE, flag 64        a polyface mesh (VERTEX records carry positions,
//                            face records carry up to four 1-based indices);
//   POLYLINE, flag 16        an M x N polygon mesh;
//   MESH                     a subdivision mesh's control cage.
// INSERT references to blocks are expanded with their position, scale and
// rotation about Z, nested up to a fixed depth. Lines, arcs, text and
// hatches have no surface and are counted, not drawn. Everything is grouped
// by layer, which is what a DXF user organises a model by.

const INSUNITS = { 1: 'in', 2: 'ft', 4: 'mm', 5: 'cm', 6: 'm' }

// The AutoCAD Colour Index's first nine entries; anything else draws in the
// default material.
const ACI = { 1: [1, 0, 0], 2: [1, 1, 0], 3: [0, 1, 0], 4: [0, 1, 1], 5: [0, 0, 1], 6: [1, 0, 1], 8: [0.5, 0.5, 0.5], 9: [0.75, 0.75, 0.75] }

function pairsOf(text) {
  const lines = String(text).split(/\r?\n/)
  const out = []
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i].trim(), 10)
    if (Number.isNaN(code)) throw new Error(`line ${i + 1} is not a group code`)
    out.push([code, lines[i + 1].trim()])
  }
  return out
}

/** Split the pair list into entities: arrays of [code, value] starting at a 0 code. */
function entitiesOf(pairs, from, to) {
  const list = []
  let cur = null
  for (let i = from; i < to; i++) {
    const [code, value] = pairs[i]
    if (code === 0) {
      cur = { type: value, pairs: [] }
      list.push(cur)
    } else if (cur) cur.pairs.push([code, value])
  }
  return list
}

const num = (e, code, dflt = 0) => {
  const p = e.pairs.find(([c]) => c === code)
  return p ? Number(p[1]) : dflt
}
const str = (e, code, dflt = '') => {
  const p = e.pairs.find(([c]) => c === code)
  return p ? p[1] : dflt
}

function sectionRange(pairs, name) {
  for (let i = 0; i + 1 < pairs.length; i++) {
    if (pairs[i][0] === 0 && pairs[i][1] === 'SECTION' && pairs[i + 1][0] === 2 && pairs[i + 1][1] === name) {
      for (let j = i + 2; j < pairs.length; j++) if (pairs[j][0] === 0 && pairs[j][1] === 'ENDSEC') return [i + 2, j]
      return [i + 2, pairs.length]
    }
  }
  return null
}

/**
 * @returns {{ layers: Array<{ name: string, color: number[]|null, positions: number[], indices: number[] }>, unit: string|null, skipped: number }}
 */
export function parseDXF(text) {
  const pairs = pairsOf(text)
  let unit = null
  const header = sectionRange(pairs, 'HEADER')
  if (header) {
    for (let i = header[0]; i < header[1] - 1; i++) {
      if (pairs[i][0] === 9 && pairs[i][1] === '$INSUNITS') { unit = INSUNITS[Number(pairs[i + 1][1])] || null; break }
    }
  }

  // Layer colours from the TABLES section.
  const layerColor = new Map()
  const tables = sectionRange(pairs, 'TABLES')
  if (tables) {
    for (const e of entitiesOf(pairs, tables[0], tables[1])) {
      if (e.type === 'LAYER') layerColor.set(str(e, 2), Math.abs(num(e, 62, 7)))
    }
  }

  const blocks = new Map()
  const blocksRange = sectionRange(pairs, 'BLOCKS')
  if (blocksRange) {
    let current = null
    for (const e of entitiesOf(pairs, blocksRange[0], blocksRange[1])) {
      if (e.type === 'BLOCK') { current = { name: str(e, 2), base: [num(e, 10), num(e, 20), num(e, 30)], entities: [] }; blocks.set(current.name, current) }
      else if (e.type === 'ENDBLK') current = null
      else if (current) current.entities.push(e)
    }
  }

  const entRange = sectionRange(pairs, 'ENTITIES')
  if (!entRange) throw new Error('it has no ENTITIES section')
  const layers = new Map()
  let skipped = 0
  const layerFor = (name, aci) => {
    const key = name || '0'
    if (!layers.has(key)) {
      const colorIndex = aci && aci !== 256 ? aci : layerColor.get(key)
      layers.set(key, { name: key, color: ACI[colorIndex] || null, positions: [], indices: [] })
    }
    return layers.get(key)
  }
  const addFace = (layer, pts, xf) => {
    const base = layer.positions.length / 3
    for (const p of pts) layer.positions.push(...xf(p))
    if (pts.length >= 3) layer.indices.push(base, base + 1, base + 2)
    if (pts.length === 4) layer.indices.push(base, base + 2, base + 3)
  }

  const walk = (list, xf, depth) => {
    for (let i = 0; i < list.length; i++) {
      const e = list[i]
      const layerName = str(e, 8, '0')
      const aci = num(e, 62, 256)
      if (e.type === '3DFACE') {
        const p = [0, 1, 2, 3].map((k) => [num(e, 10 + k), num(e, 20 + k), num(e, 30 + k)])
        const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
        addFace(layerFor(layerName, aci), same(p[2], p[3]) ? p.slice(0, 3) : p, xf)
      } else if (e.type === 'POLYLINE') {
        const flags = num(e, 70)
        const verts = []
        let j = i + 1
        for (; j < list.length && list[j].type === 'VERTEX'; j++) verts.push(list[j])
        if (list[j]?.type === 'SEQEND') j += 1
        i = j - 1
        const layer = layerFor(layerName, aci)
        if (flags & 64) {
          const pos = verts.filter((v) => (num(v, 70) & 192) === 192)
          const faces = verts.filter((v) => (num(v, 70) & 192) === 128)
          const base = layer.positions.length / 3
          for (const v of pos) layer.positions.push(...xf([num(v, 10), num(v, 20), num(v, 30)]))
          for (const f of faces) {
            const ids = [71, 72, 73, 74].map((c) => Math.abs(num(f, c))).filter((n) => n > 0).map((n) => base + n - 1)
            for (let k = 1; k + 1 < ids.length; k++) layer.indices.push(ids[0], ids[k], ids[k + 1])
          }
        } else if (flags & 16) {
          const m = num(e, 71)
          const n = num(e, 72)
          if (m * n === verts.length && m > 1 && n > 1) {
            const base = layer.positions.length / 3
            for (const v of verts) layer.positions.push(...xf([num(v, 10), num(v, 20), num(v, 30)]))
            for (let a = 0; a + 1 < m; a++) {
              for (let b = 0; b + 1 < n; b++) {
                const q = [a * n + b, (a + 1) * n + b, (a + 1) * n + b + 1, a * n + b + 1].map((x) => base + x)
                layer.indices.push(q[0], q[1], q[2], q[0], q[2], q[3])
              }
            }
          } else skipped += 1
        } else skipped += 1
      } else if (e.type === 'MESH') {
        // Vertex count (92) then that many 10/20/30 triples; face list size
        // (93) then, per face, a count followed by its indices (all code 90).
        const layer = layerFor(layerName, aci)
        const base = layer.positions.length / 3
        const xs = e.pairs.filter(([c]) => c === 10).map(([, v]) => Number(v))
        const ys = e.pairs.filter(([c]) => c === 20).map(([, v]) => Number(v))
        const zs = e.pairs.filter(([c]) => c === 30).map(([, v]) => Number(v))
        const nv = num(e, 92)
        const start = xs.length - nv
        for (let k = 0; k < nv; k++) layer.positions.push(...xf([xs[start + k], ys[start + k], zs[start + k]]))
        const at93 = e.pairs.findIndex(([c]) => c === 93)
        if (at93 >= 0) {
          const list90 = []
          for (let k = at93 + 1; k < e.pairs.length && e.pairs[k][0] === 90; k++) list90.push(Number(e.pairs[k][1]))
          for (let k = 0; k < list90.length;) {
            const n = list90[k]
            const ids = list90.slice(k + 1, k + 1 + n).map((x) => base + x)
            for (let t = 1; t + 1 < ids.length; t++) layer.indices.push(ids[0], ids[t], ids[t + 1])
            k += n + 1
          }
        }
      } else if (e.type === 'INSERT' && depth < 8) {
        const block = blocks.get(str(e, 2))
        if (!block) { skipped += 1; continue }
        const at = [num(e, 10), num(e, 20), num(e, 30)]
        const s = [num(e, 41, 1), num(e, 42, 1), num(e, 43, 1)]
        const r = (num(e, 50) * Math.PI) / 180
        const c = Math.cos(r)
        const sn = Math.sin(r)
        const inner = (p) => {
          const x = (p[0] - block.base[0]) * s[0]
          const y = (p[1] - block.base[1]) * s[1]
          const z = (p[2] - block.base[2]) * s[2]
          return xf([x * c - y * sn + at[0], x * sn + y * c + at[1], z + at[2]])
        }
        walk(block.entities, inner, depth + 1)
      } else if (e.type !== 'VERTEX' && e.type !== 'SEQEND') {
        skipped += 1
      }
    }
  }
  walk(entitiesOf(pairs, entRange[0], entRange[1]), (p) => p, 0)
  const out = [...layers.values()].filter((l) => l.indices.length)
  return { layers: out, unit, skipped }
}
