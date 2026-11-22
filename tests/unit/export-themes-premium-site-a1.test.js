// Premium sites of themes 22 (Stub) and 23 (Broadsheet), batch a1: the built guide and kit pages, with a design and with none.
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
// the visible words of a page: tags dropped, the entity for the middle dot read, white space folded
const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&middot;/g, '·').replace(/\s+/g, ' ')

// Pages each theme must keep, by name: a page lost to a bug in keep() drops with no error (see keep() in the engine).
// Theme 22's guide has 17 pages (the 16 named here and index) with a design and with none; its kit's contents list 26.
const THEMES = {
  '22-ticket': {
    guide: ['clear-space', 'colour-values', 'contrast', 'digital', 'grid', 'hierarchy', 'layouts', 'logo-grounds', 'logo-misuse', 'logo-versions', 'logo', 'min-size', 'palette', 'proportion', 'type-in-use', 'typefaces'],
    kit: ['buttons', 'inputs', 'cards', 'example', 'screen-light', 'screen-dark', 'screen-mobile', 'tokens'],
    guidePages: 17, kitLinks: 26,
  },
}

const DESIGNS = [['with a design', DESIGN], ['with none', {}]]

// 1. NO FILLER, NO PLACEHOLDER, NO BROKEN MARKUP, in every built page of both sites, with and without a design, and the pages that matter exist.
//    Break: drop `prepare` from guideSite and kitSite in themes/22-ticket/lane-ht.js (the brand's stand-in text and the dashed logo frame print again).
for (const [theme, want] of Object.entries(THEMES)) {
  for (const [label, design] of DESIGNS) {
    test(`${theme} guide and kit print no filler, no placeholder, no empty class and no void closing tag ${label}`, async () => {
      for (const row of ['slides', 'ui-kit']) {
        const files = await exportFiles(theme, row, design)
        const pages = htmlPages(files)
        assert.ok(pages.length >= (row === 'slides' ? want.guidePages : want.kitLinks), `${row}: ${pages.length} pages`)
        for (const p of pages) {
          const html = files[p]
          assert.doesNotMatch(html, /Not written yet\.|Item 1|Main action|Example Street|undefined|NaN/, `${row} ${p}: editor words or filler`)
          assert.doesNotMatch(text(html), /Your main line goes here|A (?:second|third) line\.|Write this in your own words|Customer name|Trait \d|Writing rule \d|Hi there,/, `${row} ${p}: the brand's stand-in text`)
          assert.doesNotMatch(html, /class="[^"]*\b(ph-b|ph-c|logo-slot)\b/, `${row} ${p}: a placeholder box`)
          assert.ok(!html.includes(''), `${row} ${p}: an unswapped placeholder`)
          assert.doesNotMatch(html, /class=""/, `${row} ${p}: an empty class`)
          assert.doesNotMatch(html, /<\/(?:input|img|br|hr|meta|link)>|&lt;\/input&gt;/, `${row} ${p}: a void element closed`)
          assert.doesNotMatch(html, /Place a photograph|Photo slot|Your photo here/i, `${row} ${p}: a photo-slot instruction`)
        }
        for (const name of want[row === 'slides' ? 'guide' : 'kit']) assert.ok(`${name}.html` in files, `${row}: ${name}.html is missing`)
      }
    })
  }
}

// 2. THE CONTENTS LINK ONLY TO PAGES IN THE ZIP, and the pages that matter are named so a silent drop is seen. The link to the sibling zip (../) is left out.
//    Break: make keep() return false for 'palette' (themes/22-ticket/site-keep.js: add `if (id === 'palette') return false;` as the first line of keep()):
//    the palette page is dropped and the named-page check fails.
for (const [theme, want] of Object.entries(THEMES)) {
  for (const [label, design] of DESIGNS) {
    test(`${theme} contents link to pages that are in the zip, and every local link and asset is in the zip ${label}`, async () => {
      for (const row of ['slides', 'ui-kit']) {
        const files = await exportFiles(theme, row, design)
        const root = files['index.html']
        assert.ok(root, `${row}: index.html`)
        const listed = [...new Set([...root.matchAll(/href="([^"#:]+\.html)"/g)].map((m) => m[1]).filter((h) => !h.startsWith('../')))]
        assert.ok(listed.length >= (row === 'slides' ? want.guidePages - 1 : want.kitLinks), `${row}: the index lists ${listed.length} pages`)
        for (const href of listed) assert.ok(href in files, `${row}: the index links to ${href}, which is not in the zip`)
        for (const name of want[row === 'slides' ? 'guide' : 'kit']) {
          assert.ok(`${name}.html` in files, `${row}: ${name}.html is missing`)
          assert.ok(listed.includes(`${name}.html`), `${row}: the index does not link to ${name}.html`)
        }
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
}

// 3. THE FACE NAMED IS THE FACE SHIPPED: every @font-face names a file that is in the zip (url() is relative to assets/), and a face the brand asks
//    for but the site does not ship (the design asks for Roboto) is named by no page.
//    Break: drop the servedCtx() call in prepare() (themes/22-ticket/site-clean.js, last line: `siteCtx(servedCtx(ctx))` to `siteCtx(ctx)`):
//    the pages name Roboto but ship another face.
for (const theme of Object.keys(THEMES)) {
  test(`${theme} guide and kit name the faces they ship: each @font-face has its file, and no page names a face it does not ship`, async () => {
    for (const row of ['slides', 'ui-kit']) {
      const files = await exportFiles(theme, row, DESIGN)
      const css = cssOf(files)
      const faces = [...css.matchAll(/@font-face\s*\{[^}]*font-family:\s*["']?([^;"']+)["']?[^}]*url\(([^)]+)\)/g)]
      assert.ok(faces.length >= 3, `${row}: font faces in the stylesheet`)
      for (const [, family, url] of faces) assert.ok(`assets/${url.replace(/^\.?\//, '')}` in files, `${row} ${family}: ${url} is not in the zip`)
      assert.ok(!faces.some((f) => f[1].trim() === 'Roboto'), `${row}: a Roboto @font-face with no Roboto file behind it`)
      for (const p of htmlPages(files)) assert.doesNotMatch(files[p], /Roboto/, `${row} ${p}: names Roboto, which the site does not ship`)
    }
  })
}

// 4. ONE STORY: the example's total is the sum of the six sample bookings, and booking 4021 (The Glass Menagerie) is Active on the example card,
//    the example list and both product screens.
//    Break: change a price in themes/22-ticket/story.js (BOOKINGS, `cents: 7000` to `cents: 7500`) so the printed total is no longer the sum below,
//    or set the first booking's `status: 'active'` to 'closed' so the pages stop saying Active.
test('22-ticket kit tells one story: the example total is the sum of the bookings, and booking 4021 is Active on the example and both screens', async () => {
  const kit = await exportFiles('22-ticket', 'ui-kit', DESIGN)
  const sum = [96.0, 288.0, 70.0, 60.0, 84.5, 110.0].reduce((a, b) => a + b, 0)
  assert.equal(sum.toFixed(2), '708.50')
  const ex = text(kit['example.html'])
  assert.match(ex, /\$708\.50/, 'the example total is not the sum of the sample bookings')
  assert.match(ex, /Booking 4021 · Maya Chen · Active/, 'the example card names another status for booking 4021')
  assert.match(ex, /The Glass Menagerie[^$]{0,80}\$96\.00 Active/, 'the example list does not show booking 4021 as Active')
  for (const p of ['screen-light.html', 'screen-dark.html']) {
    const t = text(kit[p])
    assert.match(t, /The Glass Menagerie[^$]{0,80}\$96\.00 Active/, `${p}: the list shows booking 4021 with another status or price`)
    assert.match(t, /Paid \$96\.00/, `${p}: the paid amount is not the booking's price`)
  }
})
