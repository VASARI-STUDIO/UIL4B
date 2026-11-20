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
//  5. THE GUIDE AND THE KIT LINK TO EACH OTHER ACROSS THEIR ZIPS: a link out of one zip names the other zip's top folder and a
//     page that is in it, so both work when unpacked side by side. Break: drop relinkSites() in exportThemeRoute.js.
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
async function exportZip(theme, row, withTop = false) {
  const res = fakeRes()
  await serveExportDocument({ headers: { authorization: 'Bearer tok' }, body: { theme, row, format: row === 'slides' ? 'html' : 'zip', projectName: 'Tide & Co.', design: DESIGN } }, res, deps())
  assert.equal(res.code, 200, `${theme} ${row}`)
  const zip = await JSZip.loadAsync(res.buffer)
  const out = {}
  let top = ''
  for (const [name, f] of Object.entries(zip.files)) {
    if (f.dir) continue
    top = name.slice(0, name.indexOf('/'))
    out[name.slice(name.indexOf('/') + 1)] = /\.(html|css|js|md|json|ts|txt|svg)$/.test(name) ? await f.async('string') : (await f.async('uint8array')).length
  }
  return withTop ? { top, files: out } : out
}

const htmlPages = (files) => Object.keys(files).filter((n) => /^[^/]+\.html$/.test(n))

// Every href and src a page names that stays in the site must be a file in the zip (an anchor is checked only for its file).
function brokenLinks(files, pages) {
  const bad = []
  for (const p of pages) {
    for (const m of files[p].matchAll(/\b(?:href|src)="([^"#?]+)[^"]*"/g)) {
      const target = m[1]
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\.\.\/)/i.test(target)) continue
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

test('the guide and the UI kit link to each other by the top folder of the other zip', async () => {
  for (const theme of ['28-riso', '32-dieline']) {
    const guide = await exportZip(theme, 'slides', true)
    const kit = await exportZip(theme, 'ui-kit', true)
    const out = (from, other) => {
      const seen = []
      for (const p of htmlPages(from.files)) {
        for (const m of from.files[p].matchAll(/\b(?:href|src)="\.\.\/([^"#?]+)/g)) {
          const [dir, ...rest] = m[1].split('/')
          seen.push(m[1])
          assert.equal(dir, other.top, `${theme} ${p} -> ../${m[1]}`)
          assert.ok(rest.join('/') in other.files, `${theme} ${p} -> ../${m[1]} is not in the other zip`)
        }
      }
      return seen
    }
    assert.ok(out(guide, kit).length > 0, `${theme}: the guide links to the kit`)
    assert.ok(out(kit, guide).length > 0, `${theme}: the kit links to the guide`)
  }
})

// The design review of the premium site (r1) found these; each is one thing a later edit could quietly bring back.
test('the palette page counts and lists each colour once, and carries no writing-rule text', async () => {
  const files = await exportZip('21-presentation', 'slides')
  const page = files['palette.html']
  const distinct = new Set(DESIGN.palette.colors.map((c) => c.toLowerCase()))
  assert.match(page, new RegExp(`>${distinct.size} colours, each named`), 'the count is the number of distinct colours (the label colour on the action is the canvas: it must not make a sixth)')
  assert.doesNotMatch(page, /Writing rule/, 'a writing-rule slot in the colour strip')
})

test('the type spec prints whole pixels, and the kit stylesheet sizes its code blocks by the border box', async () => {
  const guide = await exportZip('21-presentation', 'slides')
  assert.doesNotMatch(guide['type-in-use.html'], /\b\d+\.\d+ px\b/, 'a fractional px in the type spec')
  const kit = await exportZip('21-presentation', 'ui-kit')
  assert.match(kit['assets/kit.css'], /\.ht--kit\s*,[^{]*\*[^{]*\{\s*box-sizing:\s*border-box/, 'a border-box rule (a code block overflowed its column at 390 without it)')
  assert.doesNotMatch(kit['buttons.html'], /\n\s+&lt;path/, 'the source indent of an svg printed inside the code sample')
})

test('the kit tokens are drawn from the palette: no stock blue, and no pure white as a surface or a label', async () => {
  const kit = await exportZip('21-presentation', 'ui-kit')
  const light = kit['tokens.css'].split('\n[data-theme="dark"]')[0] // the first line's comment names the dark selector too
  for (const token of ['--focus', '--info', '--raised', '--action-label']) {
    const m = new RegExp(token + ': *(#[0-9A-Fa-f]{6})').exec(light)
    assert.ok(m, `${token} in tokens.css`)
    assert.notEqual(m[1].toUpperCase(), '#2563EB', `${token} is the stock blue`)
    assert.notEqual(m[1].toUpperCase(), '#FFFFFF', `${token} is pure white`)
  }
})
