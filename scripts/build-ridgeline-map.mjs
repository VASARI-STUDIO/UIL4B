// Builds the map the Ridgeline preview draws: Mt Coot-tha, Brisbane, from OpenStreetMap.
//
//   node scripts/build-ridgeline-map.mjs [--cache <dir>] [--refetch]
//
// 1. Reads three Overpass extracts from the cache folder (roads.json, areas.json, named.json),
//    or fetches them when a file is missing or --refetch is given.
// 2. Routes a loop on the real paths from the JC Slaughter Falls trailhead, up past Simpson
//    Falls and Ghost Hole to the summit and back down, with Dijkstra on the walkable network.
// 3. Samples ground height along the route from Open-Meteo's elevation endpoint (Copernicus
//    DEM, 90 m cells) and keeps the answer in the cache folder as elevation.json.
// 4. Writes four monochrome SVG layers to public/previews/ridgeline/ (park, water, roads,
//    paths). The scene colours each one from the palette through CSS mask-image.
// 5. Writes src/components/palette/examples/Ridgeline.route.js: the route in the same
//    1200-wide coordinates as the layers, its height profile and the map labels.
//
// Map data (c) OpenStreetMap contributors, ODbL 1.0. Heights: Copernicus DEM GLO-90 through
// Open-Meteo. Both are credited in public/previews/CREDITS.md and on the preview itself.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const opt = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback)
const CACHE = path.resolve(ROOT, opt('--cache', '.claude/scratch/prem4'))
const OUT_SVG = path.join(ROOT, 'public/previews/ridgeline')
const OUT_ROUTE = path.join(ROOT, 'src/components/palette/examples/Ridgeline.route.js')

// What the extracts cover (south, west, north, east), and what the scene shows of it.
const FETCH_BOX = { s: -27.4915, w: 152.936, n: -27.4565, e: 152.984 }
const VIEW_BOX = { s: -27.4885, w: 152.942, n: -27.4625, e: 152.978 }
const VIEW_W = 1200
const KX = Math.cos(((VIEW_BOX.s + VIEW_BOX.n) / 2) * (Math.PI / 180))
const M_PER_DEG_LAT = 110574
const M_PER_DEG_LON = 111320 * KX
const VIEW_H = Math.round(VIEW_W * ((VIEW_BOX.n - VIEW_BOX.s) * M_PER_DEG_LAT) / ((VIEW_BOX.e - VIEW_BOX.w) * M_PER_DEG_LON))
const px = (lon) => ((lon - VIEW_BOX.w) / (VIEW_BOX.e - VIEW_BOX.w)) * VIEW_W
const py = (lat) => ((VIEW_BOX.n - lat) / (VIEW_BOX.n - VIEW_BOX.s)) * VIEW_H
const M_PER_UNIT = ((VIEW_BOX.e - VIEW_BOX.w) * M_PER_DEG_LON) / VIEW_W

// ── Overpass ──────────────────────────────────────────────────────────────────
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
const bbox = `${FETCH_BOX.s},${FETCH_BOX.w},${FETCH_BOX.n},${FETCH_BOX.e}`
const QUERIES = {
  'roads.json': `[out:json][timeout:90];way["highway"](${bbox});out geom;`,
  'areas.json': `[out:json][timeout:90];(
    way["leisure"~"^(park|garden|nature_reserve|dog_park|recreation_ground)$"](${bbox});
    way["landuse"~"^(cemetery|recreation_ground)$"](${bbox});
    way["natural"~"^(wood|scrub|water)$"](${bbox});
    way["waterway"="stream"](${bbox});
    relation["natural"~"^(wood|water)$"](${bbox});
    relation["leisure"~"^(park|nature_reserve)$"](${bbox});
  );out geom;`,
  'named.json': `[out:json][timeout:60];(
    node["place"~"^(suburb|locality|neighbourhood)$"](${bbox});
    node["natural"="peak"](${bbox});
    node["name"](${bbox});
  );out;`,
}

async function overpass(query) {
  let last
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length]
    try {
      const res = await fetch(url, { method: 'POST', body: `data=${encodeURIComponent(query)}`, headers: { 'content-type': 'application/x-www-form-urlencoded' } })
      const text = await res.text()
      if (res.ok && text.trimStart().startsWith('{')) return JSON.parse(text)
      last = `${url}: ${res.status}`
    } catch (err) {
      last = `${url}: ${err.message}`
    }
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt))
  }
  throw new Error(`Overpass would not answer (${last})`)
}

async function extract(name) {
  const file = path.join(CACHE, name)
  if (!flag('--refetch') && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  fs.mkdirSync(CACHE, { recursive: true })
  const data = await overpass(QUERIES[name])
  fs.writeFileSync(file, JSON.stringify(data))
  return data
}

// ── Geometry ──────────────────────────────────────────────────────────────────
const RAD = Math.PI / 180
function haversine(a, b) {
  const dl = (b.lat - a.lat) * RAD
  const dn = (b.lon - a.lon) * RAD
  const x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dn / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(x))
}

// Douglas-Peucker on [x, y] points.
function simplify(pts, eps) {
  if (pts.length < 3) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    let worst = 0
    let at = -1
    const [ax, ay] = pts[a]
    const [bx, by] = pts[b]
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy) || 1
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len
      if (d > worst) { worst = d; at = i }
    }
    if (worst > eps && at > 0) { keep[at] = 1; stack.push([a, at], [at, b]) }
  }
  return pts.filter((_, i) => keep[i])
}

// A closed ring has no baseline to measure from, so it is cut at its farthest point and each half simplified.
function simplifyClosed(pts, eps) {
  const first = pts[0]
  let far = 1
  for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i][0] - first[0], pts[i][1] - first[1]) > Math.hypot(pts[far][0] - first[0], pts[far][1] - first[1])) far = i
  return [...simplify(pts.slice(0, far + 1), eps), ...simplify(pts.slice(far), eps).slice(1)]
}

const num = (v) => String(Math.round(v * 10) / 10)
const line = (pts) => `M${pts.map(([x, y]) => `${num(x)} ${num(y)}`).join('L')}`
const ring = (pts) => `${line(pts)}Z`

// Sutherland-Hodgman against the view rectangle grown by `pad`, so a polygon stops at the frame.
function clipRing(pts, pad = 8) {
  const edges = [
    [(p) => p[0] >= -pad, (a, b) => [-pad, a[1] + ((b[1] - a[1]) * (-pad - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= VIEW_W + pad, (a, b) => [VIEW_W + pad, a[1] + ((b[1] - a[1]) * (VIEW_W + pad - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= -pad, (a, b) => [a[0] + ((b[0] - a[0]) * (-pad - a[1])) / (b[1] - a[1]), -pad]],
    [(p) => p[1] <= VIEW_H + pad, (a, b) => [a[0] + ((b[0] - a[0]) * (VIEW_H + pad - a[1])) / (b[1] - a[1]), VIEW_H + pad]],
  ]
  let out = pts
  for (const [inside, cross] of edges) {
    const next = []
    for (let i = 0; i < out.length; i++) {
      const cur = out[i]
      const prev = out[(i + out.length - 1) % out.length]
      if (inside(cur)) {
        if (!inside(prev)) next.push(cross(prev, cur))
        next.push(cur)
      } else if (inside(prev)) next.push(cross(prev, cur))
    }
    out = next
    if (!out.length) return []
  }
  return out
}

// The runs of a polyline that touch the (padded) view rectangle.
function clipLine(pts, pad = 8) {
  const runs = []
  let run = []
  const touches = (a, b) => Math.max(a[0], b[0]) >= -pad && Math.min(a[0], b[0]) <= VIEW_W + pad && Math.max(a[1], b[1]) >= -pad && Math.min(a[1], b[1]) <= VIEW_H + pad
  for (let i = 1; i < pts.length; i++) {
    if (touches(pts[i - 1], pts[i])) {
      if (!run.length) run.push(pts[i - 1])
      run.push(pts[i])
    } else if (run.length) { runs.push(run); run = [] }
  }
  if (run.length) runs.push(run)
  return runs
}

const project = (geom) => geom.map((g) => [px(g.lon), py(g.lat)])

// Joins the open member ways of a multipolygon into closed rings by matching end points.
function joinRings(members) {
  const key = (g) => `${g.lat},${g.lon}`
  const pool = members.map((m) => m.geometry.slice()).filter((g) => g.length > 1)
  const rings = []
  while (pool.length) {
    let cur = pool.pop()
    for (let guard = 0; guard < 500; guard++) {
      if (key(cur[0]) === key(cur[cur.length - 1])) break
      const head = key(cur[cur.length - 1])
      const i = pool.findIndex((g) => key(g[0]) === head || key(g[g.length - 1]) === head)
      if (i < 0) break
      const next = pool.splice(i, 1)[0]
      cur = cur.concat(key(next[0]) === head ? next.slice(1) : next.slice().reverse().slice(1))
    }
    if (key(cur[0]) === key(cur[cur.length - 1]) && cur.length > 3) rings.push(cur)
  }
  return rings
}

/** Closed rings (as projected [x, y] lists, outer ones then inner ones) for a way or a multipolygon. */
function areaRings(el) {
  if (el.type === 'way') return el.geometry && el.geometry.length > 3 ? [{ pts: project(el.geometry), inner: false }] : []
  const outer = joinRings((el.members || []).filter((m) => m.type === 'way' && m.role !== 'inner' && m.geometry))
  const inner = joinRings((el.members || []).filter((m) => m.type === 'way' && m.role === 'inner' && m.geometry))
  return [...outer.map((g) => ({ pts: project(g), inner: false })), ...inner.map((g) => ({ pts: project(g), inner: true }))]
}

// One path per area, each with its own holes, so two areas that overlap (a reserve and the woodland
// inside it) add together and do not cancel out under the even-odd rule.
function areaPaths(els, eps = 0.5) {
  const paths = []
  for (const el of els) {
    const parts = []
    for (const r of areaRings(el)) {
      const clipped = clipRing(r.pts)
      if (clipped.length < 3) continue
      const simple = simplifyClosed([...clipped, clipped[0]], eps).slice(0, -1)
      if (simple.length >= 3) parts.push(ring(simple))
    }
    if (parts.length) paths.push(`<path fill="#000" fill-rule="evenodd" d="${parts.join('')}"/>`)
  }
  return paths.join('')
}

function linePath(els, eps = 0.6) {
  const parts = []
  for (const el of els) {
    for (const run of clipLine(project(el.geometry))) {
      const simple = simplify(run, eps)
      if (simple.length >= 2) parts.push(line(simple))
    }
  }
  return parts.join('')
}

// ── Routing ───────────────────────────────────────────────────────────────────
const WALKABLE = /^(path|footway|track|bridleway|cycleway|steps|pedestrian|service|residential|unclassified|living_street|tertiary|secondary)$/
const TRAIL = /^(path|footway|track|bridleway|steps)$/

function buildGraph(roads) {
  const pos = new Map()
  const adj = new Map()
  const link = (a, b, w, way) => {
    if (!adj.has(a)) adj.set(a, [])
    adj.get(a).push({ to: b, w, way })
  }
  for (const e of roads) {
    const t = e.tags || {}
    if (!WALKABLE.test(t.highway) || t.foot === 'no' || t.access === 'private' || t.service === 'driveway') continue
    if (t.footway === 'sidewalk' || t.footway === 'crossing') continue
    e.nodes.forEach((id, i) => pos.set(id, e.geometry[i]))
    for (let i = 1; i < e.nodes.length; i++) {
      // Roads cost double, so the route prefers a trail where there is one.
      const w = haversine(e.geometry[i - 1], e.geometry[i]) * (TRAIL.test(t.highway) ? 1 : 2)
      link(e.nodes[i - 1], e.nodes[i], w, e)
      link(e.nodes[i], e.nodes[i - 1], w, e)
    }
  }
  return { pos, adj }
}

function nearest(graph, lat, lon) {
  let best = null
  let bestD = Infinity
  for (const [id, p] of graph.pos) {
    if (!graph.adj.has(id)) continue
    const d = haversine(p, { lat, lon })
    if (d < bestD) { bestD = d; best = id }
  }
  return best
}

// A small binary heap keyed on the first element.
class Heap {
  constructor() { this.a = [] }
  get size() { return this.a.length }
  push(item) {
    const a = this.a
    a.push(item)
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (a[p][0] <= a[i][0]) break
      ;[a[p], a[i]] = [a[i], a[p]]
      i = p
    }
  }
  pop() {
    const a = this.a
    const top = a[0]
    const last = a.pop()
    if (a.length) {
      a[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < a.length && a[l][0] < a[m][0]) m = l
        if (r < a.length && a[r][0] < a[m][0]) m = r
        if (m === i) break
        ;[a[m], a[i]] = [a[i], a[m]]
        i = m
      }
    }
    return top
  }
}

const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`)

// Shortest walk from a to b; an edge already used costs four times as much, so a loop does not retrace itself.
function leg(graph, a, b, used) {
  const dist = new Map([[a, 0]])
  const prev = new Map()
  const heap = new Heap()
  heap.push([0, a])
  while (heap.size) {
    const [d, u] = heap.pop()
    if (u === b) break
    if (d > dist.get(u)) continue
    for (const { to, w } of graph.adj.get(u) || []) {
      const nd = d + w * (used.has(edgeKey(u, to)) ? 4 : 1)
      if (nd < (dist.get(to) ?? Infinity)) { dist.set(to, nd); prev.set(to, u); heap.push([nd, to]) }
    }
  }
  if (!prev.has(b) && a !== b) throw new Error(`no walkable way between ${a} and ${b}`)
  const out = [b]
  for (let c = b; prev.has(c);) { c = prev.get(c); out.push(c) }
  return out.reverse()
}

// The loop: from the trailhead through the waypoints in order and back. The waypoints were chosen
// so the walk is the 9.6 km round the Simpson Falls, Ghost Hole and Summit tracks make.
const START = [-27.4727, 152.9686]
const WAYPOINTS = [
  [-27.4662, 152.9559], // Simpson Falls
  [-27.4745, 152.9459], // Litchfield Track
  [-27.485, 152.9575], // the summit
]

function routeLoop(graph) {
  const start = nearest(graph, ...START)
  let used = new Set()
  let cur = start
  const ids = [start]
  for (const wp of [...WAYPOINTS.map((w) => nearest(graph, ...w)), start]) {
    const l = leg(graph, cur, wp, used)
    for (let i = 1; i < l.length; i++) used.add(edgeKey(l[i - 1], l[i]))
    ids.push(...l.slice(1))
    cur = wp
  }
  return ids
}

// ── Elevation ─────────────────────────────────────────────────────────────────
const STEP = 100

/** Points along the polyline every STEP metres, and at the end, with the distance each lies at. */
function resample(pts) {
  const out = [{ ...pts[0], at: 0 }]
  let total = 0
  let next = STEP
  for (let i = 1; i < pts.length; i++) {
    const seg = haversine(pts[i - 1], pts[i])
    while (seg > 0 && total + seg >= next) {
      const t = (next - total) / seg
      out.push({ lat: pts[i - 1].lat + (pts[i].lat - pts[i - 1].lat) * t, lon: pts[i - 1].lon + (pts[i].lon - pts[i - 1].lon) * t, at: next })
      next += STEP
    }
    total += seg
  }
  out.push({ ...pts[pts.length - 1], at: total })
  return { samples: out, length: total }
}

async function heights(samples) {
  const file = path.join(CACHE, 'elevation.json')
  if (!flag('--refetch') && fs.existsSync(file)) {
    const cached = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (cached.length === samples.length) return cached
  }
  const out = []
  for (let i = 0; i < samples.length; i += 100) {
    const part = samples.slice(i, i + 100)
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${part.map((p) => p.lat.toFixed(5)).join(',')}&longitude=${part.map((p) => p.lon.toFixed(5)).join(',')}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Open-Meteo elevation answered ${res.status}`)
    out.push(...(await res.json()).elevation)
  }
  fs.mkdirSync(CACHE, { recursive: true })
  fs.writeFileSync(file, JSON.stringify(out))
  return out
}

// ── Build ─────────────────────────────────────────────────────────────────────
const [roadsData, areasData, namedData] = await Promise.all(['roads.json', 'areas.json', 'named.json'].map(extract))
const roads = roadsData.elements.filter((e) => e.type === 'way' && e.geometry)
const areas = areasData.elements
const tag = (e, k) => (e.tags || {})[k]

const graph = buildGraph(roads)
const routeIds = routeLoop(graph)
const polyline = routeIds.map((id) => graph.pos.get(id))
const { samples, length } = resample(polyline)
const raw = await heights(samples)
// The 90 m cells step; a three-point mean takes the stairs out without moving the peaks much.
const elev = raw.map((_, i) => {
  const win = raw.slice(Math.max(0, i - 1), i + 2)
  return Math.round(win.reduce((a, b) => a + b, 0) / win.length)
})

// Layers
const MAJOR = /^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|secondary_link|tertiary_link)$/
const MINOR = /^(residential|unclassified|living_street|service|pedestrian)$/
const FOOT = /^(path|footway|track|bridleway|cycleway|steps)$/
const roadWays = roads.filter((e) => !(tag(e, 'footway') === 'sidewalk' || tag(e, 'footway') === 'crossing' || tag(e, 'service') === 'driveway'))
const greens = areas.filter((e) => e.type !== 'way' || tag(e, 'waterway') !== 'stream').filter((e) => {
  const t = e.tags || {}
  return ['park', 'garden', 'nature_reserve', 'dog_park', 'recreation_ground'].includes(t.leisure) || ['cemetery', 'recreation_ground'].includes(t.landuse) || ['wood', 'scrub'].includes(t.natural)
})
const ponds = areas.filter((e) => tag(e, 'natural') === 'water')
const streams = areas.filter((e) => e.type === 'way' && tag(e, 'waterway') === 'stream' && e.geometry)

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}">${body}</svg>\n`
const layers = {
  'park.svg': svg(areaPaths(greens)),
  'water.svg': svg(`${areaPaths(ponds, 0.3)}<path fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="${linePath(streams, 0.5)}"/>`),
  'roads.svg': svg(
    `<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round"><path stroke-width="6" d="${linePath(roadWays.filter((e) => MAJOR.test(tag(e, 'highway'))))}"/><path stroke-width="3.2" d="${linePath(roadWays.filter((e) => MINOR.test(tag(e, 'highway'))))}"/></g>`,
  ),
  'paths.svg': svg(`<path fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="${linePath(roads.filter((e) => FOOT.test(tag(e, 'highway')) && tag(e, 'footway') !== 'sidewalk' && tag(e, 'footway') !== 'crossing'), 0.5)}"/>`),
}
fs.mkdirSync(OUT_SVG, { recursive: true })
for (const [name, body] of Object.entries(layers)) fs.writeFileSync(path.join(OUT_SVG, name), body)

// Labels: a few places that are on the map, as the viewer would know them.
const place = (name) => (namedData.elements || []).find((e) => e.tags && e.tags.name === name)
const labelAt = (text, el, side, kind) => ({ text, x: Math.round(px(el.lon) * 10) / 10, y: Math.round(py(el.lat) * 10) / 10, side, kind })
const labels = [
  labelAt('Mt Coot-tha', place('Mount Coot-tha (One Tree Hill)'), 'right', 'peak'),
  labelAt('Simpson Falls', place('Simpson Falls'), 'right', 'place'),
  labelAt('Ghost Hole', place('Ghost Hole'), 'right', 'place'),
  { text: 'Mt Coot-tha Reserve', x: Math.round(px(152.9475) * 10) / 10, y: Math.round(py(-27.4835) * 10) / 10, side: 'centre', kind: 'area' },
  { text: 'Sir Samuel Griffith Drive', x: Math.round(px(152.9625) * 10) / 10, y: Math.round(py(-27.4795) * 10) / 10, side: 'centre', kind: 'road' },
]

// The route, in view coordinates, and a mark at each whole km.
const routeXY = polyline.map((p) => [px(p.lon), py(p.lat)])
const routeD = line(simplifyClosed(routeXY, 0.35))
const kmMarks = []
{
  let run = 0
  let next = 1000
  for (let i = 1; i < polyline.length; i++) {
    const seg = haversine(polyline[i - 1], polyline[i])
    while (seg > 0 && run + seg >= next && next < length - 200) {
      const t = (next - run) / seg
      kmMarks.push([Math.round((routeXY[i - 1][0] + (routeXY[i][0] - routeXY[i - 1][0]) * t) * 10) / 10, Math.round((routeXY[i - 1][1] + (routeXY[i][1] - routeXY[i - 1][1]) * t) * 10) / 10])
      next += 1000
    }
    run += seg
  }
}
const start = routeXY[0].map((v) => Math.round(v * 10) / 10)

const file = `// Generated by scripts/build-ridgeline-map.mjs; do not edit by hand.
//
// The Ridgeline route and its map. Map data (c) OpenStreetMap contributors, ODbL 1.0.
// Heights: Copernicus DEM GLO-90 through Open-Meteo, sampled every ${STEP} m along the walk.
// Every x and y is in the layers' own ${VIEW_W} x ${VIEW_H} box (public/previews/ridgeline/*.svg),
// where one unit is ${Math.round(M_PER_UNIT * 100) / 100} m.

export const VIEW = { w: ${VIEW_W}, h: ${VIEW_H}, metresPerUnit: ${Math.round(M_PER_UNIT * 1000) / 1000} }

/** The routed length of the walk, in metres. */
export const LENGTH = ${Math.round(length)}

/** Metres between height samples; the last sample is at LENGTH. */
export const STEP = ${STEP}

/** Ground height in metres at each sample. */
export const ELEV = ${JSON.stringify(elev)}

export const ROUTE_D = '${routeD}'

export const START = ${JSON.stringify(start)}

/** The point at each whole km, in order (1 km, 2 km, ...). */
export const KM_MARKS = ${JSON.stringify(kmMarks)}

export const LABELS = ${JSON.stringify(labels, null, 2)}
`
fs.writeFileSync(OUT_ROUTE, file)

const sizes = Object.fromEntries(Object.keys(layers).map((n) => [n, fs.statSync(path.join(OUT_SVG, n)).size]))
console.log(JSON.stringify({ length: Math.round(length), samples: samples.length, min: Math.min(...elev), max: Math.max(...elev), raw: [Math.min(...raw), Math.max(...raw)], view: [VIEW_W, VIEW_H], routeBytes: routeD.length, layers: sizes }, null, 1))
