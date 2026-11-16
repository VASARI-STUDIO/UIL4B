// A theme that has a multi-page site serves it from the themed export: the brand guidelines zip holds index.html and a page each, the UI
// kit zip holds the same beside the code package. A theme with no site keeps the single stacked document.
//
// What is pinned here, and the change that makes each fail:
//  1. THE GUIDELINES ZIP IS A SITE: index.html, many pages, a stylesheet, a script and the fonts; no single-file document.
//     Break: drop the premiumSite('guide', ...) line in renderThemeExport (api/_lib/exportThemeRoute.js).
//  2. THE UI KIT ZIP IS A SITE BESIDE THE CODE PACKAGE: the same, and the tokens, components and example files are still there.
//     Break: drop the premiumSite('kit', ...) line, or let the site's files replace the code package's.
//  3. THE PAGES ARE WIRED: every local link and asset a page names is in the zip, and no slot placeholder is left unswapped.
//     Break: write a page with fs-style put() skipped (a file map entry that bypasses put() in guide-site-build.js or kit-site-build.js).
//  4. A THEME WITH NO SITE KEEPS THE DOCUMENT.
//     Break: serve a site for every theme without checking T.guideSite / T.kitSite.
import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'

const DESIGN = {
  palette: { base: '#2F6F5E', harmony: 'auto', colors: ['#2F6F5E', '#F2C14E', '#8FB8A8', '#F4F1EA', '#1D2B27'] },
  fonts: { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } },
}
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

const deps = () => ({
  verifyIdToken: async () => ({ uid: 'pro-1' }),
  readUser: async (uid) => USERS[uid],
  consume: async () => ({ allowed: true, remaining: 10, retryAfter: 0 }),
})

// The export zip as { name: text-or-buffer-size } with the one top folder taken off.
async function exportZip(theme, row) {
  const res = fakeRes()
  await serveExportDocument({ headers: { authorization: 'Bearer tok' }, body: { theme, row, format: row === 'slides' ? 'html' : 'zip', projectName: 'Tide & Co.', design: DESIGN } }, res, deps())
  assert.equal(res.code, 200, `${theme} ${row}`)
  const zip = await JSZip.loadAsync(res.buffer)
  const out = {}
  for (const [name, f] of Object.entries(zip.files)) if (!f.dir) out[name.slice(name.indexOf('/') + 1)] = /\.(html|css|js|md|json|ts|txt|svg)$/.test(name) ? await f.async('string') : (await f.async('uint8array')).length
  return out
}

const htmlPages = (files) => Object.keys(files).filter((n) => /^[^/]+\.html$/.test(n))

// Every href and src a page names that stays in the site must be a file in the zip (an anchor is checked only for its file).
function brokenLinks(files, pages) {
  const bad = []
  for (const p of pages) {
    for (const m of files[p].matchAll(/\b(?:href|src)="([^"#?]+)[^"]*"/g)) {
      const target = m[1]
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue
      const rel = target.replace(/^\.\//, '')
      if (!(rel in files)) bad.push(`${p} -> ${target}`)
    }
  }
  return bad
}

test('the brand guidelines of a theme with a site is that site: an index, a page each, a stylesheet, a script and the fonts', async () => {
  const files = await exportZip('21-presentation', 'slides')
  const pages = htmlPages(files)
  assert.ok(files['index.html'], 'index.html')
  assert.ok(pages.length > 10, `many pages, got ${pages.length}`)
  assert.ok(files['assets/guidelines.css'] && files['assets/guidelines.js'], 'stylesheet and script')
  assert.ok(Object.keys(files).some((n) => /^assets\/fonts\/.+\.woff2$/.test(n)), 'fonts')
  assert.ok(!('brand-guidelines.html' in files), 'no single-file document')
  assert.match(files['index.html'], /<link rel="stylesheet" href="assets\/guidelines\.css">/)
  assert.match(files['assets/guidelines.css'], /#2F6F5E/i, 'the brand colour is in the stylesheet')
  assert.deepEqual(brokenLinks(files, pages), [])
  for (const p of pages) assert.ok(!/[]/.test(files[p]), `${p}: a slot placeholder was left in the page`)
})

test('the UI kit of a theme with a site is that site beside the code package', async () => {
  const files = await exportZip('21-presentation', 'ui-kit')
  const pages = htmlPages(files)
  assert.ok(files['index.html'], 'index.html')
  assert.ok(pages.length > 10, `many pages, got ${pages.length}`)
  assert.ok(files['assets/kit.css'] && files['assets/kit.js'], 'stylesheet and script')
  assert.ok(Object.keys(files).some((n) => /^assets\/fonts\/.+\.woff2$/.test(n)), 'fonts')
  assert.ok(!('ui-kit.html' in files), 'no single-file document')
  for (const f of ['tokens.css', 'tokens.json', 'tailwind.css', 'tokens.ts', 'components.css', 'example.html', 'README.md']) assert.ok(f in files, `${f} (code package) missing`)
  assert.deepEqual(brokenLinks(files, pages.filter((p) => p !== 'example.html')), [])
  for (const p of pages) assert.ok(!/[]/.test(files[p]), `${p}: a slot placeholder was left in the page`)
})

test('a theme with no site keeps the single document in both rows', async () => {
  const guide = await exportZip('04-standards', 'slides')
  assert.ok(guide['brand-guidelines.html'], 'brand-guidelines.html')
  assert.ok(!('index.html' in guide))
  const kit = await exportZip('04-standards', 'ui-kit')
  assert.ok(kit['ui-kit.html'], 'ui-kit.html')
  assert.ok(!('index.html' in kit))
})
