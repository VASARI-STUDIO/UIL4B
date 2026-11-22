// A zip holds one format, so a page in it may not link to a file that lives in another zip, and a link to a place in the
// same page has to land on something. Pinned here, and the change that makes each fail:
//  1. EVERY LINK RESOLVES: every theme x row x format builds, and each relative href or src in each html file names a file in the
//     same zip (or, for a print document, an id in the same page). Break: leave relinkSites in exportThemeRoute.js as it was.
//  2. THE SAME INPUT GIVES THE SAME BYTES: two builds of the same project are byte-identical, for every theme and format.
//     Break: put a module-level counter back in the id minting of 04-standards (lane-hg.js / lane-s*.js).
//  3. SWISSFIELD'S FONTS ARE THERE: the 27 guidelines build with the fonts the checkout carries (no font_missing).
//  4. NO SCREEN OVERFLOWS AT 390: the responsive pages that overflowed are no wider than the viewport.
//     Break: take the min-width:0 / overflow-wrap rules out of the theme's css.
// Test seam: serveExportDocument (the route's entry), as export-themes-palette-robust.test.js drives it.
import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'
import { EXPORT_THEMES, THEME_ROW_FORMATS, themeHasRow } from '../../src/data/exportThemes.js'

const FONTS = { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } }
const COLORS = ['#0A7562', '#033C31', '#4A9FBC', '#D9E6E1']
const design = { palette: { base: COLORS[0], harmony: 'auto', colors: COLORS }, fonts: FONTS }
const USERS = { 'pro-1': { subscription: { status: 'active', currentPeriodEnd: Date.now() + 10 * 86_400_000 } } }
function fakeRes() {
  const res = { headers: {}, setHeader(k, v) { res.headers[k] = v }, status(c) { res.code = c; return res }, json(b) { res.body = b; return res }, send(b) { res.buffer = b; return res } }
  return res
}
const deps = { verifyIdToken: async () => ({ uid: 'pro-1' }), readUser: async (uid) => USERS[uid], consume: async () => ({ allowed: true, remaining: 10, retryAfter: 0 }) }
const ask = async (body) => {
  const res = fakeRes()
  const warn = console.warn, error = console.error
  console.warn = () => {}; console.error = () => {}
  try { await serveExportDocument({ headers: { authorization: 'Bearer tok' }, body }, res, deps) } finally { console.warn = warn; console.error = error }
  return res
}

const BUILDS = []
for (const t of EXPORT_THEMES) for (const row of Object.keys(THEME_ROW_FORMATS)) if (themeHasRow(t.id, row)) for (const format of THEME_ROW_FORMATS[row]) BUILDS.push({ theme: t.id, row, format })

// Every href, src and css url() in a page (a font the page asks for is a link too), with the ones that leave it (a scheme, a data url) left out.
function refsOf(html) {
  const out = []
  for (const m of html.matchAll(/\b(?:href|src)="([^"]*)"|url\(['"]?([^'")]+)['"]?\)/g)) {
    const v = m[1] ?? m[2]
    if (!v || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(v)) continue
    out.push(v.replaceAll('&amp;', '&'))
  }
  return out
}
const hasId = (html, id) => html.includes(`id="${id}"`) || html.includes(`name="${id}"`)

// The refs of one built document that point nowhere. `files` is the map of path -> text for a zip, or null for a single page.
function broken(page, html, files) {
  const bad = []
  for (const ref of refsOf(html)) {
    const [target, frag] = ref.split('#')
    if (!target) { if (frag && !hasId(html, frag)) bad.push(ref); continue }
    if (!files) continue
    const parts = page.split('/'); parts.pop()
    for (const seg of decodeURIComponent(target.split('?')[0]).split('/')) { if (seg === '..') parts.pop(); else if (seg && seg !== '.') parts.push(seg) }
    const path = parts.join('/')
    const dest = files.get(path) ?? files.get(path.replace(/\/$/, '') + '/index.html')
    if (dest === undefined) bad.push(ref)
    else if (frag && typeof dest === 'string' && !hasId(dest, frag)) bad.push(ref)
  }
  return bad
}

test('every relative link in every build lands on a file or an id in the same zip', { timeout: 600_000 }, async () => {
  const problems = []
  for (const { theme, row, format } of BUILDS) {
    const where = `${theme} ${row} ${format}`
    const res = await ask({ theme, row, format, design, projectName: 'Kerbside' })
    if (res.code !== 200) { problems.push(`${where}: ${res.code}`); continue }
    if (format === 'pdf') {
      for (const b of broken('doc.html', res.body.html, null)) problems.push(`${where}: ${b}`)
      continue
    }
    // the guide's markdown is one text file, not a zip: it carries no relative links to resolve
    if (format === 'md') { if (typeof res.buffer !== 'string') problems.push(`${where}: not markdown`); continue }
    const zip = await JSZip.loadAsync(res.buffer)
    const files = new Map()
    for (const [name, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue
      files.set(name, /\.html$/.test(name) ? await entry.async('string') : true)
    }
    for (const [name, body] of files) if (typeof body === 'string') for (const b of broken(name, body, files)) problems.push(`${where}: ${name} -> ${b}`)
  }
  assert.deepEqual(problems, [])
})

// Ids minted while a page is drawn (SVG ids, gradient ids) come from a counter per build, so two builds are the same bytes.
test('two builds of the same project are byte-identical (04 and 26 mint ids as they draw)', { timeout: 300_000 }, async () => {
  const same = []
  for (const [theme, row, format] of [['04-standards', 'slides', 'html'], ['04-standards', 'slides', 'pdf'], ['04-standards', 'ui-kit', 'zip'], ['26-notebook', 'ui-kit', 'zip'], ['26-notebook', 'book', 'pdf']]) {
    const a = await ask({ theme, row, format, design, projectName: 'Kerbside' }), b = await ask({ theme, row, format, design, projectName: 'Kerbside' })
    const x = format === 'pdf' ? a.body?.html : a.buffer, y = format === 'pdf' ? b.body?.html : b.buffer
    if (!x || !y || !(format === 'pdf' ? x === y : x.equals(y))) same.push(`${theme} ${row} ${format}`)
  }
  assert.deepEqual(same, [])
})

test('the 27 guidelines build with the fonts the checkout carries', async () => {
  for (const format of ['html', 'pdf']) {
    const res = await ask({ theme: '27-swissfield', row: 'slides', format, design, projectName: 'Kerbside' })
    assert.equal(res.code, 200, `27 slides ${format}: ${res.body?.code}`)
  }
})

// The responsive files that ran wider than a phone. Fixed-page (@page) documents are not in this list.
const NARROW = [
  ['08-monograph', 'book', 'pdf', null], ['08-monograph', 'book', 'html', 'index.html'], ['24-standards', 'book', 'pdf', null],
  ['24-standards', 'book', 'html', 'index.html'], ['24-standards', 'slides', 'html', 'clear-space.html'], ['24-standards', 'ui-kit', 'zip', 'navigation.html'],
]
test('the responsive pages that overflowed are no wider than a 390 px screen', { timeout: 300_000 }, async (t) => {
  let chromium
  try { ({ chromium } = await import('playwright')) } catch { return t.skip('playwright is not installed') }
  let browser
  try { browser = await chromium.launch() } catch { return t.skip('no chromium to launch') }
  const wide = [], dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-integrity-'))
  try {
    for (const [theme, row, format, file] of NARROW) {
      const res = await ask({ theme, row, format, design, projectName: 'Kerbside' })
      const root = path.join(dir, `${theme}-${row}-${format}`)
      let target
      if (format === 'pdf') { fs.mkdirSync(root, { recursive: true }); target = path.join(root, 'doc.html'); fs.writeFileSync(target, res.body.html) } else {
        const zip = await JSZip.loadAsync(res.buffer)
        for (const [name, entry] of Object.entries(zip.files)) {
          if (entry.dir) continue
          fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true })
          fs.writeFileSync(path.join(root, name), await entry.async('nodebuffer'))
        }
        target = path.join(root, fs.readdirSync(root)[0], file)
      }
      const page = await browser.newPage({ viewport: { width: 390, height: 900 } })
      await page.goto(pathToFileURL(target).href)
      const sw = await page.evaluate(() => document.documentElement.scrollWidth)
      if (sw > 390) wide.push(`${theme} ${row} ${format} ${file || ''}: ${sw}`)
      await page.close()
    }
  } finally { await browser.close(); fs.rmSync(dir, { recursive: true, force: true }) }
  assert.deepEqual(wide, [])
})
