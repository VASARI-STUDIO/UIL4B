// Premium sites of themes 24 (Standards Plate) and 26 (Notebook), batch b1: the built guide and kit pages, with a design and with none.
// The helpers are copied from export-themes-premium-site.test.js, which stays as it is.
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

// The export zip as { name: text-or-byte-length } with the one top folder taken off. `design` may be {} (a project with nothing written).
async function exportFiles(theme, row, design) {
  const res = fakeRes()
  const body = { theme, row, format: row === 'slides' ? 'html' : 'zip', design }
  if (design.palette) body.projectName = 'Tide & Co.'
  await serveExportDocument({ headers: { authorization: 'Bearer tok' }, body }, res, deps())
  assert.equal(res.code, 200, `${theme} ${row}`)
  const zip = await JSZip.loadAsync(res.buffer)
  const out = {}
  for (const [name, f] of Object.entries(zip.files)) {
    if (f.dir) continue
    out[name.slice(name.indexOf('/') + 1)] = /\.(html|css|js|md|json|ts|txt|svg)$/.test(name) ? await f.async('string') : (await f.async('uint8array')).length
  }
  return out
}

const htmlPages = (files) => Object.keys(files).filter((n) => /^[^/]+\.html$/.test(n))
const cssOf = (files) => Object.entries(files).filter(([n]) => /^assets\/.+\.css$/.test(n)).map(([, t]) => t).join('\n')

// Pages each theme must keep, by name: a page lost to a bug in a notes function drops with no error (see keep() in the engine).
const THEMES = {
  '24-standards': {
    guide: ['logo', 'logo-versions', 'logo-grounds', 'palette', 'typefaces', 'clear-space', 'min-size', 'layouts'],
    kit: ['buttons', 'inputs', 'cards', 'example', 'screen-light', 'screen-dark', 'screen-mobile', 'tokens'],
  },
}

const DESIGNS = [['with a design', DESIGN], ['with none', {}]]

// 1. NO EDITOR WORDS, NO PLACEHOLDER, NO BROKEN MARKUP, in every built page of both sites, with and without a design.
//    Break: drop `prepare: prepareSite` from guideSite or kitSite (themes/24-standards/lane-hg.js, lane-hk.js), or make keep() return true for every page.
for (const [theme, want] of Object.entries(THEMES)) {
  for (const [label, design] of DESIGNS) {
    test(`${theme} guide and kit print no editor words, no placeholder, no empty class and no void closing tag ${label}`, async () => {
      for (const row of ['slides', 'ui-kit']) {
        const files = await exportFiles(theme, row, design)
        const pages = htmlPages(files)
        assert.ok(pages.length > 10, `${row}: many pages, got ${pages.length}`)
        for (const p of pages) {
          const html = files[p]
          assert.doesNotMatch(html, /Not written yet\.|Item 1|Main action|Example Street|undefined|NaN/, `${row} ${p}: editor words or filler`)
          assert.doesNotMatch(html, /class="[^"]*\b(ph-b|ph-c|logo-slot)\b/, `${row} ${p}: a placeholder box`)
          assert.ok(!html.includes(''), `${row} ${p}: an unswapped placeholder`)
          assert.doesNotMatch(html, /class=""/, `${row} ${p}: an empty class`)
          assert.doesNotMatch(html, /<\/(?:input|img|br|hr|meta|link)>|&lt;\/input&gt;/, `${row} ${p}: a void element closed`)
          assert.doesNotMatch(html, /Place a photograph|Photo slot|Your photo here/i, `${row} ${p}: a photo-slot instruction`)
        }
        for (const name of want[row === 'slides' ? 'guide' : 'kit']) {
          if (design.palette || !['logo-versions', 'logo-grounds'].includes(name)) assert.ok(`${name}.html` in files, `${row}: ${name}.html is missing`)
        }
      }
    })
  }
}

// 2. THE CONTENTS LINK ONLY TO PAGES IN THE ZIP, and the pages that matter are named so a silent drop is seen. The one link to the sibling zip (../) is left out here.
//    Break: make keep() return false for 'palette' (themes/24-standards/lane-hg.js): the palette page is dropped and the named-page check fails.
for (const theme of Object.keys(THEMES)) {
  test(`${theme} contents link to pages that are in the zip, and every local link and asset is in the zip`, async () => {
    for (const row of ['slides', 'ui-kit']) {
      const files = await exportFiles(theme, row, DESIGN)
      const root = files['index.html']
      assert.ok(root, `${row}: index.html`)
      const listed = [...root.matchAll(/href="([^"#:]+\.html)"/g)].map((m) => m[1]).filter((h) => !h.startsWith('../'))
      assert.ok(listed.length > 8, `${row}: the index lists ${listed.length} pages`)
      for (const href of listed) assert.ok(href in files, `${row}: the index links to ${href}, which is not in the zip`)
      for (const name of THEMES[theme][row === 'slides' ? 'guide' : 'kit']) assert.ok(`${name}.html` in files, `${row}: ${name}.html is missing`)
      const bad = []
      for (const p of htmlPages(files).filter((n) => n !== 'example.html')) {
        for (const m of files[p].matchAll(/\b(?:href|src)="([^"#?]+)[^"]*"/g)) {
          if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\.\.\/)/i.test(m[1])) continue
          if (!(m[1].replace(/^\.\//, '') in files)) bad.push(`${p} -> ${m[1]}`)
        }
      }
      assert.deepEqual(bad, [], `${row}: links to files that are not in the zip`)
    }
  })
}

// 3. THE FACE NAMED IS THE FACE SHIPPED: every @font-face names a file that is in the zip, and a face served by a stand-in is named as the stand-in.
//    Break: drop the servedCtx() call in prepareSite() (themes/24-standards/site-clean.js): the guide names Roboto but ships another face.
for (const theme of Object.keys(THEMES)) {
  test(`${theme} guide names the faces it ships: each @font-face has its file, and no page names the face it does not ship`, async () => {
    const files = await exportFiles(theme, 'slides', DESIGN)
    const css = cssOf(files)
    const faces = [...css.matchAll(/@font-face\s*\{[^}]*font-family:\s*["']?([^;"']+)["']?[^}]*url\(([^)]+)\)/g)]
    assert.ok(faces.length >= 3, 'font faces in the stylesheet')
    for (const [, family, url] of faces) assert.ok(`assets/${url.replace(/^\.?\//, '')}` in files, `${family}: ${url} is not in the zip`)
    assert.ok(!faces.some((f) => f[1].trim() === 'Roboto'), 'a Roboto @font-face with no Roboto file behind it')
    for (const p of ['typefaces.html', 'type-in-use.html']) {
      if (p in files) assert.doesNotMatch(files[p], /Roboto/, `${p}: names Roboto, which the site does not ship`)
    }
  })
}

// 4. ONE STORY: the example's total is the sum of the six sample orders, the dark screen's order total is the light list's, and the late order is late on both.
//    Break: change an order's amount in themes/21-presentation/real-copy.js, or drop exampleDemo from themes/24-standards/index.js meta.
test('24-standards kit tells one story: the example total is the sum of the orders, and order 1040 is late on the list and on the dark screen', async () => {
  const kit = await exportFiles('24-standards', 'ui-kit', DESIGN)
  const sum = [84.35, 126.8, 47.95, 212.1, 58.2, 93.65].reduce((a, b) => a + b, 0)
  assert.equal(sum.toFixed(2), '623.05')
  assert.match(kit['example.html'], /\$623\.05/, 'the example total is not the sum of the sample orders')
  assert.match(kit['screen-light.html'], /Order 1042[\s\S]{0,200}\$84\.35/, 'order 1042 on the light screen')
  assert.match(kit['screen-dark.html'], /Total[\s\S]{0,40}\$84\.35/, 'the dark screen shows another total for order 1042')
  assert.match(kit['screen-dark.html'], /Order 1040 is 12 minutes late/, 'the dark screen does not show order 1040 late')
  assert.match(kit['screen-light.html'], /Order 1040[\s\S]{0,60}12 min late/, 'order 1040 is not late on the light screen')
})
