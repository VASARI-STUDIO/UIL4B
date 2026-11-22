// The themed style guide: the `guide` row (A4 pages as one print document, a zip of pages, fonts and style-guide.md, or the markdown alone).
//
// What is pinned here, and the change that makes each fail:
//  1. THE ROW BUILDS: Swiss Field's guide comes back as pdf (a print document), html (a zip) and md for the default brand.
//     Break: delete the `guide` branch in renderThemeExport (api/_lib/exportThemeRoute.js).
//  2. THE ZIP HOLDS ITS OWN LINKS: every url() and href in it resolves to a file in the zip, and the zip is named <slug>-style-guide-<theme>.
//     Break: change the folder E.fontFiles writes to, so a page links a font the zip does not hold.
//  3. NOTHING THIRD-PARTY: no origin in any file, and the print document keeps its CSP meta and holds no script.
//     Break: add a Google Fonts link to guideCss in themes/27-swissfield/lane-guide.js.
//  4. THE ROW IS OPT-IN: a theme without a rows list has no `guide` row (the book is still on it), and only Swiss Field and Keynote are offered it.
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
const KEYNOTE = '21-presentation'
const out = {}
const build = (format) => (out[format] ??= renderThemeExport({ theme: THEME, row: 'guide', format }))
const PAGES = ['cover', 'logo', 'colour', 'ruler', 'applied', 'type', 'contrast', 'tokens', 'usage']
const drawnPages = (html) => [...html.matchAll(/<section class="pg" data-page="([a-z]+)"/g)].map((m) => m[1])

test('the row is opt-in: only a theme that names it has it, and the others keep every other row', () => {
  const plain = EXPORT_THEMES.find((t) => !t.rows && !t.extraRows)
  assert.ok(plain, 'a theme with no rows list and no extraRows exists')
  assert.equal(themeHasRow(plain.id, 'guide'), false)
  assert.equal(themeHasRow(plain.id, 'book'), true)
  assert.equal(themeHasRow(plain.id, 'ui-kit'), true)
  assert.deepEqual(EXPORT_THEMES.filter((t) => themeHasRow(t.id, 'guide')).map((t) => t.id).sort(), [KEYNOTE, THEME])
  assert.deepEqual(THEME_ROW_FORMATS.guide, ['pdf', 'html', 'md'])
})

test('the picker offers the style guide only on Swiss Field and Keynote, in the three formats', () => {
  assert.deepEqual(pickerThemesFor('style-guide').map((t) => t.id).sort(), [KEYNOTE, THEME])
  assert.deepEqual(themedFile('style-guide'), { row: 'guide', format: 'pdf' })
  assert.deepEqual(themedFile('style-guide-html'), { row: 'guide', format: 'html' })
  assert.deepEqual(themedFile('style-guide-md'), { row: 'guide', format: 'md' })
  assert.equal(themedZipName('Lumen', 'style-guide-html', THEME), 'lumen-style-guide-27-swissfield.zip')
})

test('the style guide is free where the guidelines are free, and a theme without the row is refused', () => {
  assert.equal(isThemeExportPro('guide', THEME), false)
  assert.deepEqual(assertThemeAccess({ id: 'free' }, { theme: THEME, row: 'guide', format: 'md' }), { ok: true })
  const plain = EXPORT_THEMES.find((t) => !t.rows && !t.extraRows).id
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

// Keynote (21-presentation). Each test names the change that makes it fail.
// 11. IT BUILDS, PRO ONLY: pdf, html and md build; the zip holds its own links; a free account is refused.
//     Break: drop 'guide' from the 21 entry's extraRows in src/data/exportThemes.js, or set `free: true` on it.
// 12. A PAGE LEFT OUT IS NOT COUNTED: the folio on each page reads its place among the pages drawn; a 48-letter name drops the logo page and the md numbers 01 to 05.
//     Break: in themes/21-presentation/lane-guide.js, make drawnIds return the whole PAGE_IDS list.
// 13. THE USAGE CARD READS on a mid-grey raised colour; a brand with no border token still draws it; one-colour palettes hold no NaN or Infinity.
//     Break: in guide-pages-c.js, drop the cardInk chain, dereference the border token without a guard, or divide by a palette spread without a zero guard.
// 14. THE COLOUR PAGE IS NEVER DROPPED FOR PALETTE SIZE: 8, 12 and 40 colours draw it, and a cap says how many are shown.
//     Break: in guide-pages-a.js colourPage, stop capping the shown colours (the page is then too tall and left out).
const keynoteGuide = (await import('../../api/_lib/exportThemes/themes/21-presentation/index.js')).guide
const kHtml = async (colors, projectName = 'Kerbside') => {
  const design = colors && { palette: { base: colors[0], harmony: 'auto', colors } }
  const warns = []
  const warn = console.warn
  console.warn = (...a) => { warns.push(a.join(' ')) }
  try {
    const { html } = await renderThemeExport({ theme: KEYNOTE, row: 'guide', format: 'pdf', design, projectName })
    const { md } = await renderThemeExport({ theme: KEYNOTE, row: 'guide', format: 'md', design, projectName })
    return { html, md, warns, left: warns.filter((w) => /left out/.test(w)) }
  } finally { console.warn = warn }
}
const hexLum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
const hexRatio = (a, b) => { const [x, y] = [hexLum(a), hexLum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

test('Keynote: the guide is Pro only, offered in three formats, and builds in each', async () => {
  assert.equal(isThemeExportPro('guide', KEYNOTE), true)
  assert.equal(assertThemeAccess({ id: 'free' }, { theme: KEYNOTE, row: 'guide', format: 'md' }).code, 'pro_required')
  assert.deepEqual(assertThemeAccess({ id: 'pro' }, { theme: KEYNOTE, row: 'guide', format: 'md' }), { ok: true })
  assert.equal(themeRequestProblem({ theme: KEYNOTE, row: 'guide', format: 'pdf' }), null)
  const { html, md } = await kHtml()
  assert.deepEqual(drawnPages(html), PAGES)
  assert.ok(!/<script[\s>]/i.test(html) && !/https?:\/\//i.test(html.replace(/xmlns=(["'])[^"']*\1/g, '')), 'no script and no origin')
  assert.match(html, /url\(data:font\/woff2/)
  assert.match(md, /^# /m)
  const { zip, name } = await renderThemeExport({ theme: KEYNOTE, row: 'guide', format: 'html' })
  assert.match(name, /-style-guide-21-presentation\.zip$/)
  const z = await JSZip.loadAsync(zip)
  const files = Object.keys(z.files).filter((f) => !z.files[f].dir)
  for (const f of files.filter((x) => /\.(html|css)$/.test(x))) {
    const text = await z.file(f).async('string')
    const dir = f.split('/').slice(0, -1).join('/')
    for (const m of text.matchAll(/(?:url\(\s*['"]?|href=["'])([^'")#"]+)/g)) {
      if (/^(data:|#|mailto:)/.test(m[1])) continue
      const stack = []
      for (const p of (dir + '/' + m[1]).split('/')) { if (p === '..') stack.pop(); else if (p && p !== '.') stack.push(p) }
      assert.ok(files.includes(stack.join('/')), `${f}: ${m[1]} is not in the zip`)
    }
  }
})

test('Keynote: long names and small palettes draw every page, and the markdown keeps every section', async () => {
  for (const colors of [['#0A7562', '#033C31', '#4A9FBC', '#D9E6E1'], ['#F96B76'], ['#2E7BB8', '#F2B705', '#1B1B1B']]) {
    for (const projectName of ['Kerbside', 'Bright Harbour Studio', 'Northern Rivers Community Credit Union']) {
      const { html, md, left } = await kHtml(colors, projectName)
      assert.deepEqual(left, [], `${colors[0]} "${projectName}": no page left out`)
      assert.deepEqual(drawnPages(html), PAGES)
      assert.deepEqual((md.match(/^## \d\d · .+$/gm) || []).map((h) => h.slice(8)), ['Logo', 'Colour', 'Typography', 'Contrast', 'Tokens', 'Usage'])
    }
  }
})

test('Keynote: the folio counts the pages drawn, and a page left out is left out of the markdown', async () => {
  const folios = (html) => [...html.matchAll(/gk-fo"[^>]*>(\d{3}) \/ (\d{3})</g)].map((m) => [+m[1], +m[2]])
  const whole = await kHtml()
  assert.deepEqual(folios(whole.html), PAGES.map((_, i) => [i + 1, PAGES.length]))
  const long = await kHtml(undefined, 'W'.repeat(48))
  const kept = drawnPages(long.html)
  assert.ok(!kept.includes('logo'), 'the logo page is left out for a 48-letter name')
  assert.ok(long.warns.some((w) => w.includes('guide page logo left out')))
  assert.deepEqual(folios(long.html), kept.map((_, i) => [i + 1, kept.length]))
  assert.deepEqual(long.md.match(/^## \d\d · .+$/gm), ['## 01 · Colour', '## 02 · Typography', '## 03 · Contrast', '## 04 · Tokens', '## 05 · Usage'])
})

test('Keynote: the usage card reaches 4.5 on a mid-grey raised colour', async () => {
  for (const colors of [['#8a8a8a', '#111111', '#f5f5f5'], ['#767676', '#222222', '#eeeeee'], ['#949494', '#101010', '#fafafa']]) {
    const { html, left } = await kHtml(colors)
    assert.deepEqual(left, [])
    const m = html.slice(html.indexOf('data-page="usage"')).match(/background:(#[0-9a-fA-F]{6});border:[^"]*"[^>]*><div [^>]*style="[^"]*color:(#[0-9a-fA-F]{6})/)
    assert.ok(m, `card found for ${colors}`)
    assert.ok(hexRatio(m[1], m[2]) >= 4.5, `card ${m[2]} on ${m[1]}`)
  }
})

test('Keynote: no border token still draws the usage page, and one-colour palettes hold no NaN or Infinity', async () => {
  const original = keynoteGuide.usage
  keynoteGuide.usage = (ctx) => { ctx.borders = ctx.borders.filter((b) => b.token !== 'border-control'); return original(ctx) }
  try {
    const { html, md, left } = await kHtml()
    assert.match(html, /data-page="usage"/)
    assert.deepEqual(left, [])
    assert.match(md, /not underlined/)
    assert.match(md, /no edge/)
  } finally { keynoteGuide.usage = original }
  for (const colors of [['#F96B76'], ['#336699', '#336699', '#336699'], ['#ffffff'], ['#000000', '#000000']]) {
    const { html, md, left } = await kHtml(colors)
    assert.doesNotMatch(html, /NaN|Infinity/)
    assert.doesNotMatch(md, /NaN|Infinity/)
    assert.deepEqual(drawnPages(html), PAGES)
    assert.deepEqual(left, [])
  }
})

test('Keynote: the contrast page still draws with twelve pairs', async () => {
  const original = keynoteGuide.contrast
  keynoteGuide.contrast = (ctx) => { const more = []; while (more.length < 12) more.push(...ctx.pairs); ctx.pairs = more.slice(0, 12); return original(ctx) }
  try {
    const { html, left } = await kHtml()
    assert.deepEqual(left.filter((w) => w.includes('contrast')), [])
    assert.ok(drawnPages(html).includes('contrast'))
  } finally { keynoteGuide.contrast = original }
})

test('Keynote: the colour page is drawn for 8, 12 and 40 distinct colours, with a cap note when it cannot show them all', async () => {
  const palette = (n) => Array.from({ length: n }, (_, i) => {
    const h = (i * 137.508) % 360, s = 0.55 + (i % 3) * 0.12, l = 0.3 + (i % 5) * 0.1
    const f = (k) => { const a = s * Math.min(l, 1 - l), q = (k + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(q - 3, 9 - q, 1)))) }
    return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('')
  })
  const original = keynoteGuide.colour
  try {
    for (const [n, total] of [[8, 8], [12, 12], [12, 40]]) {
      keynoteGuide.colour = (ctx) => {
        const extra = palette(total).slice(ctx.colours.length).map((hex, i) => ({ id: `x-${i}`, name: `Extra colour ${i + 1}`, hex, role: 'alternative', share: 0.001 }))
        const own = ctx.colours
        ctx.colours = [...own, ...extra].slice(0, Math.max(total, own.length))
        try { return original(ctx) } finally { ctx.colours = own }
      }
      const { html, warns, left } = await kHtml(palette(n))
      const page = html.slice(html.indexOf('data-page="colour"'), html.indexOf('data-page="ruler"'))
      assert.ok(drawnPages(html).includes('colour'), `drawn for ${total} colours`)
      assert.deepEqual(left.filter((w) => /colour/.test(w)), [])
      assert.deepEqual(warns.filter((w) => /colour/.test(w) && /too tall/.test(w)), [])
      assert.doesNotMatch(html, /NaN|Infinity/)
      const shown = (page.match(/>HEX</g) || []).length
      if (total <= 12) assert.doesNotMatch(page, /Showing the first/)
      else {
        const m = page.match(/Showing the first (\d+) of (\d+) colours/)
        assert.ok(m && +m[2] === total && +m[1] === shown && shown < total, `the note says ${m && m[0]}, and ${shown} are drawn`)
      }
    }
  } finally { keynoteGuide.colour = original }
})
