// The themed style guide: the `guide` row (A4 pages as one print document, a zip of pages, fonts and style-guide.md, or the markdown alone).
//
// What is pinned here, and the change that makes each fail:
//  1. THE ROW BUILDS: Swiss Field's guide comes back as pdf (a print document), html (a zip) and md for the default brand.
//     Break: delete the `guide` branch in renderThemeExport (api/_lib/exportThemeRoute.js).
//  2. THE ZIP HOLDS ITS OWN LINKS: every url() and href in it resolves to a file in the zip, and the zip is named <slug>-style-guide-<theme>.
//     Break: change the folder E.fontFiles writes to, so a page links a font the zip does not hold.
//  3. NOTHING THIRD-PARTY: no origin in any file, and the print document keeps its CSP meta and holds no script.
//     Break: add a Google Fonts link to guideCss in themes/27-swissfield/lane-guide.js.
//  4. THE ROW IS OPT-IN: a theme without a rows list has no `guide` row (the book is still on it), and only Swiss Field is offered it.
//     Break: make themeHasRow in src/data/exportThemes.js ignore OPT_IN_ROWS.
//  5. A THEME WITHOUT THE ROW IS REFUSED like any other missing row: 400 unknown_row.
//     Break: drop the themeHasRow line in themeRequestProblem.
//  6. THE MD IS SENT AS A FILE: raw markdown, text/markdown, an attachment named for the slug and theme.
//     Break: send the md as JSON in serveThemeExport.
//  7. NO PAGE IS LEFT OUT for long brand names or a one-colour palette: every page id is drawn, in order, with no warning,
//     and the markdown carries all six sections.
//     Break: put the head's left label back to the full `${name} style guide`, or drop the one-row retry on the logo page.
//  8. A PAGE LEFT OUT IS LEFT OUT OF THE MARKDOWN: a 30-letter one-word name drops the logo page, and the md then numbers
//     Colour to Usage 01 to 05 with no Logo section.
//     Break: drop the drawn(k) check in styleGuideMarkdown, or the ctx.pagesDrawn line in styleGuide.
//  9. A TABLE CELL NEVER BREAKS THE TABLE: a pipe is escaped and a line break becomes a space.
//     Break: remove either replace in mdCell (api/_lib/exportThemes/engine/styleguide.js).
// 10. A PAGE THAT THROWS TAKES ITS MARKDOWN HOOKS WITH IT: an applied page that writes a supply row and then throws leaves
//     no trace of that row in the md, and the Logo section is still there.
//     Break: drop `ctx.mdHooks = hooks` in the catch of styleGuide (api/_lib/exportThemeRoute.js).
import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { renderThemeExport, themeRequestProblem, serveThemeExport } from '../../api/_lib/exportThemeRoute.js'
import { EXPORT_THEMES, THEME_ROW_FORMATS, themeHasRow, isThemeExportPro } from '../../src/data/exportThemes.js'
import { pickerThemesFor, themedFile, themedZipName } from '../../src/config/exportThemePicker.js'
import { assertThemeAccess } from '../../api/_lib/themeAccess.js'
import { mdCell } from '../../api/_lib/exportThemes/engine/styleguide.js'
import { guide as swissGuide } from '../../api/_lib/exportThemes/themes/27-swissfield/index.js'

const THEME = '27-swissfield'
const out = {}
const build = (format) => (out[format] ??= renderThemeExport({ theme: THEME, row: 'guide', format }))
const PAGES = ['cover', 'logo', 'colour', 'ruler', 'applied', 'type', 'contrast', 'tokens', 'usage']
const drawnPages = (html) => [...html.matchAll(/<section class="pg" data-page="([a-z]+)"/g)].map((m) => m[1])

test('the row is opt-in: only a theme that names it has it, and the others keep every other row', () => {
  const plain = EXPORT_THEMES.find((t) => !t.rows)
  assert.ok(plain, 'a theme with no rows list exists')
  assert.equal(themeHasRow(plain.id, 'guide'), false)
  assert.equal(themeHasRow(plain.id, 'book'), true)
  assert.equal(themeHasRow(plain.id, 'ui-kit'), true)
  assert.deepEqual(EXPORT_THEMES.filter((t) => themeHasRow(t.id, 'guide')).map((t) => t.id), [THEME])
  assert.deepEqual(THEME_ROW_FORMATS.guide, ['pdf', 'html', 'md'])
})

test('the picker offers the style guide only on Swiss Field, in the three formats', () => {
  assert.deepEqual(pickerThemesFor('style-guide').map((t) => t.id), [THEME])
  assert.deepEqual(themedFile('style-guide'), { row: 'guide', format: 'pdf' })
  assert.deepEqual(themedFile('style-guide-html'), { row: 'guide', format: 'html' })
  assert.deepEqual(themedFile('style-guide-md'), { row: 'guide', format: 'md' })
  assert.equal(themedZipName('Lumen', 'style-guide-html', THEME), 'lumen-style-guide-27-swissfield.zip')
})

test('the style guide is free where the guidelines are free, and a theme without the row is refused', () => {
  assert.equal(isThemeExportPro('guide', THEME), false)
  assert.deepEqual(assertThemeAccess({ id: 'free' }, { theme: THEME, row: 'guide', format: 'md' }), { ok: true })
  const plain = EXPORT_THEMES.find((t) => !t.rows).id
  assert.deepEqual(themeRequestProblem({ theme: plain, row: 'guide', format: 'pdf' }), { error: 'Unknown export row', code: 'unknown_row' })
  assert.equal(themeRequestProblem({ theme: THEME, row: 'guide', format: 'pdf' }), null)
  assert.equal(themeRequestProblem({ theme: THEME, row: 'guide', format: 'zip' }).code, 'unknown_format')
  assert.equal(assertThemeAccess({ id: 'pro' }, { theme: plain, row: 'guide', format: 'pdf' }).code, 'unknown_row')
})

test('the pdf is one print document of the A4 pages, fonts embedded, nothing loaded from outside', async () => {
  const { html } = await build('pdf')
  assert.ok(html.indexOf('<head>') < 200)
  assert.match(html, /<head><meta http-equiv="Content-Security-Policy"/)
  assert.deepEqual(drawnPages(html), PAGES, 'every page is there, in order')
  assert.match(html, /794px/)
  assert.ok(!/<script[\s>]/i.test(html) && !/<form[\s>]/i.test(html))
  assert.ok(!/https?:\/\//i.test(html.replace(/xmlns="[^"]*"/g, '')), 'no origin')
  assert.ok(!/url\((?!['"]?data:)/.test(html), 'every url() is a data url')
  assert.match(html, /url\(data:font\/woff2/)
})

test('the zip holds the pages, the fonts and style-guide.md, named for the slug and theme', async () => {
  const { zip, name } = await build('html')
  assert.match(name, /^[a-z0-9-]+-style-guide-27-swissfield\.zip$/)
  const z = await JSZip.loadAsync(zip)
  const files = Object.keys(z.files).filter((f) => !z.files[f].dir)
  const top = files[0].split('/')[0]
  assert.ok(files.every((f) => f.startsWith(top + '/')), 'one top folder')
  const rel = files.map((f) => f.slice(top.length + 1))
  for (const f of ['index.html', 'style-guide.md', 'cover.html', 'colour.html']) assert.ok(rel.includes(f), f)
  assert.ok(rel.some((f) => /^assets\/fonts\/.+\.woff2$/.test(f)), 'fonts')
  for (const f of files.filter((x) => /\.(html|css)$/.test(x))) {
    const text = await z.file(f).async('string')
    const dir = f.split('/').slice(0, -1).join('/')
    assert.ok(!/https?:\/\/(?!www\.w3\.org)/i.test(text), `${f}: no origin`)
    for (const m of text.matchAll(/(?:url\(\s*['"]?|href=["'])([^'")#"]+)/g)) {
      const ref = m[1]
      if (/^(data:|#|mailto:)/.test(ref)) continue
      const stack = []
      for (const p of (dir + '/' + ref).split('/')) { if (p === '..') stack.pop(); else if (p && p !== '.') stack.push(p) }
      assert.ok(files.includes(stack.join('/')), `${f}: ${ref} is not in the zip`)
    }
  }
  assert.equal(await z.file(`${top}/style-guide.md`).async('string'), (await build('md')).md)
})

test('the markdown alone carries the brand, its colours and the tokens', async () => {
  const { md, name } = await build('md')
  assert.match(name, /^[a-z0-9-]+-style-guide-27-swissfield\.md$/)
  assert.match(md, /^# /m)
  assert.match(md, /#[0-9A-Fa-f]{6}/)
  assert.ok(md.length > 1500)
  assert.ok(!/https?:\/\//.test(md))
})

test('the route sends the md as a file: raw body, text/markdown, an attachment', async () => {
  const headers = {}
  const res = { statusCode: 0, body: undefined, setHeader(k, v) { headers[k] = v }, status(c) { this.statusCode = c; return this }, send(b) { this.body = b; return this }, json(b) { this.body = b; return this } }
  await serveThemeExport({ headers: {} }, res, { body: { theme: THEME, row: 'guide', format: 'md' }, decoded: { uid: 'u' }, plan: { id: 'free' }, consume: async () => ({ allowed: true }) })
  assert.equal(res.statusCode, 200)
  assert.equal(headers['Content-Type'], 'text/markdown; charset=utf-8')
  assert.match(headers['Content-Disposition'], /^attachment; filename="[a-z0-9-]+-style-guide-27-swissfield\.md"$/)
  assert.equal(typeof res.body, 'string')
  assert.match(res.body, /^# /m)
})

test('long names and small palettes draw every page, and the markdown keeps every section', async () => {
  const NAMES = ['Kerbside', 'Bright Harbour Studio', 'Wild Tide Collective', 'Northern Rivers Community Credit Union']
  const PALETTES = [['#0A7562', '#033C31', '#4A9FBC', '#D9E6E1'], ['#F96B76'], ['#2E7BB8', '#F2B705', '#1B1B1B']]
  const warned = []
  const keep = console.warn
  console.warn = (...a) => { warned.push(a.map(String).join(' ')) }
  try {
    for (const colors of PALETTES) {
      for (const projectName of NAMES) {
        const design = { palette: { base: colors[0], harmony: 'auto', colors } }
        const at = warned.length
        const { html } = await renderThemeExport({ theme: THEME, row: 'guide', format: 'pdf', design, projectName })
        const { md } = await renderThemeExport({ theme: THEME, row: 'guide', format: 'md', design, projectName })
        const label = `${colors[0]} "${projectName}"`
        assert.deepEqual(warned.slice(at).filter((w) => w.includes('left out')), [], `${label}: no page left out`)
        assert.deepEqual(drawnPages(html), PAGES, `${label}: every page drawn`)
        assert.deepEqual((md.match(/^## \d\d · .+$/gm) || []).map((h) => h.slice(8)), ['Logo', 'Colour', 'Typography', 'Contrast', 'Tokens', 'Usage'], `${label}: every md section`)
      }
    }
  } finally {
    console.warn = keep
  }
})

test('a page left out is left out of the markdown too', async () => {
  const projectName = 'A'.repeat(30)
  const warned = []
  const keep = console.warn
  console.warn = (...a) => { warned.push(a.map(String).join(' ')) }
  try {
    const { html } = await renderThemeExport({ theme: THEME, row: 'guide', format: 'pdf', projectName })
    const { md } = await renderThemeExport({ theme: THEME, row: 'guide', format: 'md', projectName })
    assert.ok(!drawnPages(html).includes('logo'), 'the logo page is left out for this name')
    assert.ok(warned.some((w) => w.includes('guide page logo left out')), 'the warning names the page')
    assert.deepEqual(md.match(/^## \d\d · .+$/gm), ['## 01 · Colour', '## 02 · Typography', '## 03 · Contrast', '## 04 · Tokens', '## 05 · Usage'])
  } finally {
    console.warn = keep
  }
})

test('a markdown table cell escapes pipes and flattens line breaks', () => {
  assert.equal(mdCell('a|b\nc'), 'a\\|b c')
  assert.equal(mdCell('x\r\ny'), 'x y')
  assert.equal(mdCell(42), '42')
})

test('a page that throws after writing a markdown hook leaves no trace in the markdown', async () => {
  const applied = swissGuide.applied
  const keep = console.warn
  const warned = []
  console.warn = (...a) => { warned.push(a.map(String).join(' ')) }
  swissGuide.applied = (ctx) => {
    ctx.mdHooks = { ...(ctx.mdHooks || {}), supply: [...((ctx.mdHooks || {}).supply || []), ['Planted row', 'never drawn']] }
    throw new Error('applied failed')
  }
  try {
    const { md } = await renderThemeExport({ theme: THEME, row: 'guide', format: 'md', projectName: 'Kerbside' })
    assert.ok(warned.some((w) => w.includes('guide page applied left out')), 'the stand-in page really threw')
    assert.ok(!md.includes('Planted row'), 'the hook the failed page wrote is gone')
    assert.match(md, /^## 01 · Logo$/m, 'the Logo section is still drawn')
  } finally {
    swissGuide.applied = applied
    console.warn = keep
  }
})
