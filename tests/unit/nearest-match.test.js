// The nearest-match engine (src/utils/nearestMatch.js), its loader, and the
// committed colour data under src/data/nearest/.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  hexToLabD50, labD50ToHex, deltaE2000, band, bandLabel, formatDE, nearest, matchSystem, BANDS,
} from '../../src/utils/nearestMatch.js'
import { createSystemLoader } from '../../src/utils/nearestLoader.js'
import { NEAREST_SYSTEMS } from '../../src/data/nearest/index.js'

const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/data/nearest')
const sys = (id) => JSON.parse(readFileSync(path.join(DATA, `${id}.json`), 'utf8'))
const hexOfRow = (r) => labD50ToHex([r[3], r[4], r[5]])

// The 34 reference pairs for CIEDE2000 (Color Res. Appl. 30(1), 2005, table 1).
const PAIRS = [
  [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
  [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
  [[50, 2.8361, -74.02], [50, 0, -82.7485], 3.4412],
  [[50, -1.3802, -84.2814], [50, 0, -82.7485], 1.0],
  [[50, -1.1848, -84.8006], [50, 0, -82.7485], 1.0],
  [[50, -0.9009, -85.5211], [50, 0, -82.7485], 1.0],
  [[50, 0, 0], [50, -1, 2], 2.3669],
  [[50, -1, 2], [50, 0, 0], 2.3669],
  [[50, 2.49, -0.001], [50, -2.49, 0.0009], 7.1792],
  [[50, 2.49, -0.001], [50, -2.49, 0.001], 7.1792],
  [[50, 2.49, -0.001], [50, -2.49, 0.0011], 7.2195],
  [[50, 2.49, -0.001], [50, -2.49, 0.0012], 7.2195],
  [[50, -0.001, 2.49], [50, 0.0009, -2.49], 4.8045],
  [[50, -0.001, 2.49], [50, 0.001, -2.49], 4.8045],
  [[50, -0.001, 2.49], [50, 0.0011, -2.49], 4.7461],
  [[50, 2.5, 0], [50, 0, -2.5], 4.3065],
  [[50, 2.5, 0], [73, 25, -18], 27.1492],
  [[50, 2.5, 0], [61, -5, 29], 22.8977],
  [[50, 2.5, 0], [56, -27, -3], 31.903],
  [[50, 2.5, 0], [58, 24, 15], 19.4535],
  [[50, 2.5, 0], [50, 3.1736, 0.5854], 1.0],
  [[50, 2.5, 0], [50, 3.2972, 0], 1.0],
  [[50, 2.5, 0], [50, 1.8634, 0.5757], 1.0],
  [[50, 2.5, 0], [50, 3.2592, 0.335], 1.0],
  [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
  [[63.0109, -31.0961, -5.8663], [62.8187, -29.7946, -4.0864], 1.263],
  [[61.2901, 3.7196, -5.3901], [61.4292, 2.248, -4.962], 1.8731],
  [[35.0831, -44.1164, 3.7933], [35.0232, -40.0716, 1.5901], 1.8645],
  [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373],
  [[36.4612, 47.858, 18.3852], [36.2715, 50.5065, 21.2231], 1.4146],
  [[90.8027, -2.0831, 1.441], [91.1528, -1.6435, 0.0447], 1.4441],
  [[90.9257, -0.5406, -0.9208], [88.6381, -0.8985, -0.7239], 1.5381],
  [[6.7747, -0.2908, -2.4247], [5.8714, -0.0985, -2.2286], 0.6377],
  [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
]

test('deltaE2000 gives all 34 published reference values to 4 decimal places', () => {
  assert.equal(PAIRS.length, 34)
  PAIRS.forEach(([a, b, want], i) => {
    const got = deltaE2000(a, b)
    assert.ok(Math.abs(got - want) < 0.00005, `pair ${i + 1}: got ${got.toFixed(4)}, want ${want}`)
  })
})

test('hexToLabD50 puts white at (100, 0, 0), black at 0 and red where the ICC says', () => {
  const w = hexToLabD50('#FFFFFF')
  assert.ok(Math.abs(w[0] - 100) < 1e-6 && Math.abs(w[1]) < 1e-6 && Math.abs(w[2]) < 1e-6)
  assert.deepEqual(hexToLabD50('#000').map((v) => Math.round(v * 1000)), [0, 0, 0])
  const [L, a, b] = hexToLabD50('#FF0000')
  assert.ok(Math.abs(L - 54.29) < 0.01 && Math.abs(a - 80.8) < 0.05 && Math.abs(b - 69.89) < 0.05)
  assert.equal(hexToLabD50('nope'), null)
})

test('Lab D50 and hex round-trip for colours across the cube', () => {
  for (let r = 0; r < 256; r += 15) for (let g = 0; g < 256; g += 15) for (let b = 0; b < 256; b += 15) {
    const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    const lab = hexToLabD50(hex).map((v) => Math.round(v * 100) / 100)
    assert.equal(labD50ToHex(lab), hex)
  }
})

test('band edges: lower bound is inclusive, placed from the unrounded difference', () => {
  assert.equal(band(0), 'very-close')
  assert.equal(band(1.9999999), 'very-close')
  assert.equal(band(2.0), 'close')
  assert.equal(band(4.9999999), 'close')
  assert.equal(band(5.0), 'near')
  assert.equal(band(9.9999999), 'near')
  assert.equal(band(10.0), 'not-close')
  assert.equal(band(55), 'not-close')
  // 1.96 prints as 2.0 but is still "very close".
  assert.equal(formatDE(1.96), '2.0')
  assert.equal(band(1.96), 'very-close')
  assert.deepEqual(BANDS.map((b) => bandLabel(b.id)), ['Very close', 'Close', 'Near', 'Not close'])
})

test('known matches: red is CSS red at dE 0, cornflower blue is cornflowerblue', () => {
  const css = sys('css')
  const red = nearest('#FF0000', css.rows)
  assert.equal(red.row[0], 'red')
  assert.ok(red.dE < 0.01)
  assert.equal(band(red.dE), 'very-close')
  const cf = matchSystem('#6495ED', css)
  assert.equal(cf.name, 'cornflowerblue')
  assert.equal(cf.code, '#6495ED')
  assert.ok(cf.dE < 0.01)
})

test('known matches in the other systems', () => {
  assert.equal(nearest('#FFFFFF', sys('tailwind').rows).row[0], 'white')
  assert.equal(nearest('#000000', sys('tailwind').rows).row[0], 'black')
  const m = matchSystem('#F44336', sys('material'))
  assert.equal(m.name, 'Red 500')
  assert.equal(m.copy, '#F44336')
  assert.ok(m.dE < 0.01)
  const n5 = sys('munsell').rows.find((r) => r[0] === 'N 5/')
  assert.equal(nearest(hexOfRow(n5), sys('munsell').rows).row[0], 'N 5/')
  assert.equal(matchSystem('#FFFFFF', sys('iscc-nbs')).name, 'White')
})

test('a copy of null means the name, and a far colour is "not close" but still gets a match', () => {
  const css = sys('css')
  const m = matchSystem('#6495ED', css)
  assert.equal(m.copy, 'cornflowerblue')
  const far = nearest([50, 120, 120], css.rows) // outside any real colour
  assert.ok(far.row && far.dE >= 10)
  assert.equal(nearest('#123456', []), null)
  assert.equal(nearest('zzz', css.rows), null)
})

test('data files: counts, headers, row shape, and screen rows match their own hex', () => {
  const want = { tailwind: 288, css: 148, material: 254, munsell: 1555, 'iscc-nbs': 267 }
  for (const entry of NEAREST_SYSTEMS) {
    const d = sys(entry.id)
    assert.equal(d.id, entry.id)
    assert.equal(d.rows.length, d.count)
    assert.equal(d.count, entry.count)
    assert.equal(d.count, want[entry.id], `${entry.id} row count`)
    assert.ok(d.sourceUrl.startsWith('https://') && d.licence && d.licenceUrl && d.source, `${entry.id} header`)
    for (const r of d.rows) {
      assert.equal(r.length, 6)
      assert.ok(typeof r[0] === 'string' && r.slice(3).every(Number.isFinite), `${entry.id}: ${r[0]}`)
    }
  }
  for (const id of ['css', 'material']) {
    for (const r of sys(id).rows) assert.equal(hexOfRow(r), r[1], `${id} ${r[0]}`)
  }
  assert.deepEqual(NEAREST_SYSTEMS.map((s) => s.id), ['tailwind', 'css', 'material', 'munsell', 'iscc-nbs'])
})

test('Munsell and ISCC-NBS rows are inside sRGB, named by notation and by block', () => {
  for (const id of ['munsell', 'iscc-nbs']) {
    for (const r of sys(id).rows) {
      const hex = hexOfRow(r)
      const back = hexToLabD50(hex)
      assert.ok(deltaE2000([r[3], r[4], r[5]], back) < 1.2, `${id} ${r[0]} fits sRGB (${hex})`)
    }
  }
  const iscc = sys('iscc-nbs').rows
  assert.deepEqual(iscc.find((r) => r[0] === 'Moderate blue').slice(0, 3), ['Moderate blue', 'No. 182', null])
  assert.ok(iscc.every((r) => /^[A-Z]/.test(r[0])), 'every ISCC-NBS name starts with a capital')
  assert.ok(sys('munsell').rows.every((r) => /^(N \d\/|\d+(\.\d)?[A-Z]{1,2} \d+\/\d+)$/.test(r[0])))
  // vivid red is red, white is light, black is dark (names start with a capital).
  const vivid = iscc.find((r) => r[0] === 'Vivid red')
  assert.ok(vivid[4] > 40 && vivid[5] > 20)
  assert.ok(iscc.find((r) => r[0] === 'White')[3] > 90 && iscc.find((r) => r[0] === 'Black')[3] < 20)
})

// Seeded generator so the distribution is the same on every run.
function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

test('band distribution over 2,000 seeded colours per system (decides whether the bands are right)', (t) => {
  const rnd = mulberry32(20261027)
  const colours = Array.from({ length: 2000 }, () => hexToLabD50(
    '#' + [0, 0, 0].map(() => Math.floor(rnd() * 256).toString(16).padStart(2, '0')).join(''),
  ))
  const share = {}
  for (const entry of NEAREST_SYSTEMS) {
    const rows = sys(entry.id).rows
    const counts = { 'very-close': 0, close: 0, near: 0, 'not-close': 0 }
    for (const lab of colours) counts[band(nearest(lab, rows).dE)]++
    share[entry.id] = Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Math.round((v / 20) * 10) / 10]))
    const total = Object.values(counts).reduce((s, v) => s + v, 0)
    assert.equal(total, 2000)
  }
  t.diagnostic('percent of 2,000 random colours per band:\n' + JSON.stringify(share, null, 1))
  // Raise it as a design question, don't change the bands: CSS mostly "Not close".
  assert.ok(share.css['not-close'] <= 40, `CSS not-close share ${share.css['not-close']}% is over 40%`)
  // The physical systems are dense: most colours should find a very close or close match.
  assert.ok(share.munsell['very-close'] + share.munsell.close > 50)
})

test('nearest against the biggest system is fast (under 5 ms median)', () => {
  const rows = sys('munsell').rows
  const lab = hexToLabD50('#3B82F6')
  const times = []
  for (let i = 0; i < 25; i++) {
    const t0 = performance.now()
    nearest(lab, rows)
    times.push(performance.now() - t0)
  }
  times.sort((a, b) => a - b)
  assert.ok(times[12] < 5, `median ${times[12].toFixed(2)} ms`)
})

const okJson = (data) => ({ ok: true, status: 200, json: async () => data })

test('loader: fetches each system once, drops a failure so a retry makes a real request', async () => {
  const requests = []
  let offline = true
  const fetchImpl = async (url) => {
    requests.push(url)
    if (url === '/assets/b-1.json' && offline) throw new TypeError('Failed to fetch')
    if (url === '/assets/c-1.json') return { ok: false, status: 404, json: async () => ({}) }
    return okJson({ rows: [url] })
  }
  const loader = createSystemLoader({ a: '/assets/a-1.json', b: '/assets/b-1.json', c: '/assets/c-1.json' }, fetchImpl)
  const [x, y] = [loader.loadSystem('a'), loader.loadSystem('a')]
  assert.equal(x, y)
  assert.deepEqual(await x, { rows: ['/assets/a-1.json'] })
  assert.deepEqual(requests, ['/assets/a-1.json'])
  await assert.rejects(loader.loadSystem('b'), /Failed to fetch/)
  assert.equal(loader.cache.has('b'), false)
  offline = false
  // The retry is a second request for the same URL, not a re-await of the failure.
  assert.deepEqual(await loader.loadSystem('b'), { rows: ['/assets/b-1.json'] })
  assert.equal(requests.filter((u) => u === '/assets/b-1.json').length, 2)
  await assert.rejects(loader.loadSystem('c'), /HTTP 404/)
  assert.equal(loader.cache.has('c'), false)
  await assert.rejects(loader.loadSystem('zzz'), /Unknown colour system/)
  assert.equal(requests.length, 4)
})

test('loader: a response with no rows is a failure, not an empty system', async () => {
  const loader = createSystemLoader({ a: '/a.json' }, async () => okJson({ rows: [] }))
  await assert.rejects(loader.loadSystem('a'), /no colour rows/)
  assert.equal(loader.cache.has('a'), false)
})

test('loading uses fetch(), never import(): a failed import() is cached by the browser', () => {
  // A rejected dynamic import stays in the module map, so a retry never reaches
  // the network and the page ends up reloaded by vite:preloadError.
  for (const f of ['src/utils/nearestLoader.js', 'src/utils/nearestSystems.js', 'src/data/nearest/index.js', 'src/data/nearest/urls.js']) {
    const src = readFileSync(path.resolve(DATA, '../../..', f), 'utf8').replace(/\/\/.*$/gm, '')
    assert.ok(!/\bimport\s*\(/.test(src), `${f} calls import()`)
  }
})

test('the data index and URL list agree, and every JSON file is over the inline limit', () => {
  const urls = readFileSync(path.join(DATA, 'urls.js'), 'utf8')
  for (const s of NEAREST_SYSTEMS) {
    assert.ok(urls.includes(`"./${s.id}.json?url"`), `${s.id} has no ?url import`)
    assert.ok(urls.includes(`${JSON.stringify(s.id)}:`), `${s.id} is not in NEAREST_URLS`)
    // Under Vite's 4096-byte assetsInlineLimit a ?url import becomes a data: URI.
    assert.ok(readFileSync(path.join(DATA, `${s.id}.json`)).length > 4096, `${s.id}.json would be inlined`)
  }
})

test('the index a Free user loads carries no colour data', () => {
  const src = readFileSync(path.join(DATA, 'index.js'), 'utf8')
  assert.ok(src.length < 4000)
  assert.ok(!/\[\s*"[^"]+"\s*,\s*(null|"#)/.test(src))
  assert.ok(!/\.json|import/.test(src.replace(/\/\/.*$/gm, '')))
  for (const s of NEAREST_SYSTEMS) assert.ok(s.credit && s.label && s.group)
})
