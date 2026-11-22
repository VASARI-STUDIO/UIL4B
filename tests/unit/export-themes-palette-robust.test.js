// A user's own palette must never stop an export from building. The sample brands are tuned to pass the contrast rules; a real
// palette is not (a mid-tone colour that neither dark nor light text clears 4.5:1 on, no dark colour, one colour, all light...).
// The engine asserts contrast in pair(), and a throw there was a 500 build_failed: the file would not build, and no retry could help.
//
// What is pinned here, and the change that makes each fail:
//  1. EVERY BUILD HOLDS: every theme x every row it has x every format builds, through the route's own entry (serveExportDocument),
//     for the Kerbside palette (the one that failed live: #D9E6E1 on #0A7562 is 4.38:1) and for adversarial palettes: mid-tones,
//     all light, all dark, one colour, no dark colour, the earlier repro, and seeded random ones. Each is a 200 with a file.
//     Break: make readableOn() in engine/color.js return its first candidate unchecked.
//  2. NO PAGE IS QUIETLY DROPPED: pagesDoc leaves out a page that throws and only warns, and a theme site that fails is "not built".
//     A build that passes with a page missing is as bad as a throw, so every warning of that kind fails the run.
//     Break: put the old throw back in a theme's picker (for example in 27-swissfield/swiss.js).
//  3. THE LIVE PREVIEW HOLDS: the preview pages (the book's first screen, guidelines cover and palette, the kit's screen and
//     buttons) draw for every theme and palette, through renderThemePage.
//     Break: as 1.
//  4. THE OUTPUT IS STILL PRINT SAFE: every print document passes isPrintSafe (CSP meta first, no script, form or inline handler),
//     and every zip is a real zip.
//     Break: leave the CSP meta out of withCsp in exportThemeRoute.js.
//  5. THE HELPER ITSELF: readableOn() always returns a colour that reaches the ratio the size needs, on every background, and
//     keeps the first candidate that passes (so a brand that already read is drawn as before).
//     Break: as 1.
// Test seam: serveExportDocument (the route's entry) for 1, 2 and 4; renderThemePage for 3; engine/color.js readableOn for 5.
import test from 'node:test'
import assert from 'node:assert/strict'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'
import { renderThemePage } from '../../api/_lib/exportThemeRoute.js'
import { EXPORT_THEMES, THEME_ROW_FORMATS, themeHasRow } from '../../src/data/exportThemes.js'
import { isPrintSafe } from '../../src/utils/exportThemeRequest.js'
import * as colour from '../../api/_lib/exportThemes/engine/color.js'

const FONTS = { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } }
const designOf = (colors) => ({ palette: { base: colors[0], harmony: 'auto', colors }, fonts: FONTS })

// A small seeded generator, so a failing palette is the same palette next time.
const seeded = (seed) => { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296 }
const hexFrom = (rnd) => '#' + [0, 0, 0].map(() => Math.floor(rnd() * 256).toString(16).padStart(2, '0')).join('').toUpperCase()
const randomPalettes = (count, seed) => {
  const rnd = seeded(seed)
  return Array.from({ length: count }, () => Array.from({ length: 5 }, () => hexFrom(rnd)))
}

const NAMED = {
  'the Kerbside palette': ['#0A7562', '#033C31', '#4A9FBC', '#D9E6E1'],
  // main #2E7BB8: the book failed in 01, 02, 04, 05, 06, 09, 21, 29 and 32 (#06070A on it is 4.45:1; no brand colour reads at 4.5)
  'the Harbour palette': ['#2E7BB8', '#06070A', '#F2B544', '#EEF3F8'],
  'mid-tones only': ['#F96B76', '#808080', '#0146AE'],
  'all light': ['#FFFFFF', '#F4F1EA', '#E8E0D0', '#FAFAFA', '#EDEDED'],
  'all dark': ['#000000', '#111111', '#1A1A2E', '#0B1D3A', '#222222'],
  'a single colour': ['#F96B76'],
  'a single mid-grey': ['#808080'],
  'no dark colour': ['#E8C547', '#F2A65A', '#8FB8A8', '#F4F1EA', '#B7C9E2'],
  'the earlier repro palette': ['#5C01C5', '#01FC65', '#F96B76', '#010166', '#0146AE'],
}
const PALETTES = { ...NAMED, ...Object.fromEntries(randomPalettes(4, 20261122).map((p, i) => [`random palette ${i + 1} (${p.join(' ')})`, p])) }

// Every theme, every row it has, every format that row makes.
const BUILDS = []
for (const t of EXPORT_THEMES) for (const row of Object.keys(THEME_ROW_FORMATS)) if (themeHasRow(t.id, row)) for (const format of THEME_ROW_FORMATS[row]) BUILDS.push({ theme: t.id, row, format })

const USERS = { 'pro-1': { subscription: { status: 'active', currentPeriodEnd: Date.now() + 10 * 86_400_000 } } }
function fakeRes() {
  const res = {
    headers: {},
    setHeader(k, v) { res.headers[k] = v },
    status(code) { res.code = code; return res },
    json(body) { res.body = body; return res },
    send(buf) { res.buffer = buf; return res },
  }
  return res
}
const deps = {
  verifyIdToken: async () => ({ uid: 'pro-1' }),
  readUser: async (uid) => USERS[uid],
  consume: async () => ({ allowed: true, remaining: 10, retryAfter: 0 }),
}
const ask = async (body) => {
  const res = fakeRes()
  await serveExportDocument({ headers: { authorization: 'Bearer tok' }, body }, res, deps)
  return res
}

// Runs fn with console.warn and console.error held, and returns what was warned about a page or site left out.
async function quietly(fn) {
  const warn = console.warn, error = console.error, dropped = []
  console.warn = (...a) => { const s = String(a[0]); if (/left out|not built/i.test(s)) dropped.push(s.replace(/\s+/g, ' ').slice(0, 140)) }
  console.error = () => {}
  try { await fn() } finally { console.warn = warn; console.error = error }
  return dropped
}

const PREVIEW = [
  { kind: 'book', page: undefined, needs: 'book' },
  { kind: 'guidelines', page: 'cover', needs: 'slides' },
  { kind: 'guidelines', page: 'palette', needs: 'slides' },
  { kind: 'uikit', page: 'screen-light', needs: 'ui-kit' },
  { kind: 'uikit', page: 'buttons', needs: 'ui-kit' },
]

for (const [name, colors] of Object.entries(PALETTES)) {
  test(`every theme, row and format builds for ${name}, with no page dropped`, async () => {
    const design = designOf(colors), problems = []
    const dropped = await quietly(async () => {
      for (const { theme, row, format } of BUILDS) {
        const where = `${theme} ${row} ${format}`
        try {
          const res = await ask({ theme, row, format, design, projectName: 'Kerbside' })
          if (res.code !== 200) { problems.push(`${where}: ${res.code} ${res.body?.code || ''}`); continue }
          // the print row (pdf) answers with the document as JSON, the guide's markdown as text; every other format is a zip
          if (format === 'md') {
            if (typeof res.buffer !== 'string' || res.buffer.length < 100 || !/^text\/markdown/.test(res.headers['Content-Type'] || '')) problems.push(`${where}: not markdown`)
          } else if (format !== 'pdf') {
            if (!Buffer.isBuffer(res.buffer) || res.buffer.length < 100 || res.buffer.subarray(0, 2).toString() !== 'PK') problems.push(`${where}: not a zip`)
          } else if (res.body?.ok !== true || res.body.theme !== theme || res.body.row !== row || res.body.format !== format) {
            problems.push(`${where}: wrong success shape`)
          } else if (!isPrintSafe(res.body.html)) {
            problems.push(`${where}: not print safe`)
          }
        } catch (e) { problems.push(`${where}: threw ${String(e?.message).slice(0, 120)}`) }
      }
    })
    assert.deepEqual([...problems, ...dropped.map((d) => `dropped: ${d}`)], [])
  })

  test(`the live preview pages draw for every theme with ${name}`, async () => {
    const design = designOf(colors), problems = []
    await quietly(async () => {
      for (const t of EXPORT_THEMES) for (const { kind, page, needs } of PREVIEW) {
        if (!themeHasRow(t.id, needs)) continue
        const where = `${t.id} ${kind}${page ? `/${page}` : ''}`
        try {
          const out = await renderThemePage({ theme: t.id, kind, page, design, projectName: 'Kerbside' })
          if (!isPrintSafe(out.html)) problems.push(`${where}: not print safe`)
        } catch (e) { problems.push(`${where}: threw ${String(e?.message).slice(0, 120)}`) }
      }
    })
    assert.deepEqual(problems, [])
  })
}

// The route answers a contrast failure with its own code, not as a generic build failure. Break: take the code out of pair() in engine/color.js.
test('pair() throws an error coded contrast on a pair that misses, and returns the ratio on one that passes', () => {
  assert.throws(() => colour.pair('#777777', '#787878'), (e) => e.code === 'contrast' && /^Contrast #777777 on #787878 is 1[.]01:1, needs 4[.]5:1/.test(e.message))
  // #808080 on white is 3.95:1: under 4.5 at body size, enough at 24 px
  assert.throws(() => colour.pair('#808080', '#FFFFFF', { size: 13 }), (e) => e.code === 'contrast')
  assert.ok(colour.pair('#808080', '#FFFFFF', { size: 24 }) > 3.9)
})

test('readableOn always reaches the ratio the size needs, and keeps the first candidate that passes', () => {
  const { readableOn, ratio, needFor } = colour
  const rnd = seeded(7)
  for (let i = 0; i < 400; i++) {
    const bg = hexFrom(rnd), a = hexFrom(rnd), b = hexFrom(rnd)
    for (const [size, weight] of [[13, 400], [16, 400], [24, 400], [19, 700]]) {
      const got = readableOn(bg, [a, b], { size, weight })
      assert.ok(ratio(got, bg) >= needFor(size, weight), `${got} on ${bg} at ${size}/${weight}`)
      if (ratio(a, bg) >= needFor(size, weight)) assert.equal(got, a, 'the first candidate that passes wins')
    }
  }
  // Kerbside's pair: the theme's own light text and surface both miss, and the helper still returns something that reads
  assert.ok(ratio(readableOn('#0A7562', ['#D9E6E1', '#FFFFFF']), '#0A7562') >= 4.5)
  assert.equal(readableOn('#808080', ['nonsense', undefined, null]).length, 7)
  assert.equal(readableOn('not a colour', ['#123456']), '#123456')
})
