// The themed exports behind POST /api/ai?export=document { theme, row, format, design, projectName }.
//
// What is pinned here, and the change that makes each fail:
//  1. THE GATE: Pro gets any row in any theme; Free gets the UI kit in the free themes only; everything else is 403 pro_required.
//     Break: make isThemeExportPro in src/data/exportThemes.js return false for 'ui-kit'.
//  2. THE ALLOWLIST: a theme, row or format outside the table is a 400 before anything is built.
//     Break: drop the isThemeRowFormat check in api/_lib/exportThemeRoute.js.
//  3. ERRORS SAY NOTHING INSIDE: a BrandInputError is a 400 with a fixed message, its code and its path; any other throw is a bare 500.
//     Break: put e.message in either response.
//  4. NAMES COME FROM THE SLUG: the zip name is built from brand.slug and the theme id, never the project name.
//     Break: build the name from projectName.
//  5. THE ZIP IS REAL: it opens, and holds the kit page and the code package.
//     Break: leave 'ui-kit.html' out of the file map.
//  6. THE TABLE MATCHES THE ENGINE: ids, names and the free tier in src/data/exportThemes.js equal each theme's own meta.
//  7. PRINT HTML IS INERT AND STANDS ALONE: in every theme, the book and the slides print rows hold no script, no inline handler,
//     no link to a file outside the document, fonts as data URLs, and the CSP meta first in the head.
//     Break: leave the CSP meta out of withCsp, or build the print book with bookDoc(ctx, T) instead of bookPrintDoc.
//  8. A BAD THEME COSTS NO ACCOUNT READ, AND AN OVERSIZE Content-Length COSTS NO LIMITER WRITE.
//     Break: move themeRequestProblem below planOf in exportDocument.js; drop declaredLength in exportThemeRoute.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'
import { MAX_THEME_BODY_CHARS, PRINT_CSP } from '../../api/_lib/exportThemeRoute.js'
import { EXPORT_THEMES, THEME_ROW_FORMATS, FREE_UI_KIT_THEMES, isThemeExportPro } from '../../src/data/exportThemes.js'

const DESIGN = {
  palette: { base: '#2F6F5E', harmony: 'auto', colors: ['#2F6F5E', '#F2C14E', '#8FB8A8', '#F4F1EA', '#1D2B27'] },
  fonts: { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } },
}
const USERS = { 'pro-1': { subscription: { status: 'active', currentPeriodEnd: Date.now() + 10 * 86_400_000 } }, 'free-1': {} }

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

const deps = (extra = {}) => ({
  verifyIdToken: async (token) => ({ uid: token === 'tok-pro' ? 'pro-1' : 'free-1' }),
  readUser: async (uid) => USERS[uid],
  consume: async () => ({ allowed: true, remaining: 10, retryAfter: 0 }),
  ...extra,
})

const ask = async (token, body, extra) => {
  const res = fakeRes()
  await serveExportDocument({ headers: { authorization: `Bearer ${token}` }, body }, res, deps(extra))
  return res
}
const body = (over = {}) => ({ theme: '04-standards', row: 'ui-kit', format: 'zip', projectName: 'Tide & Co.', design: DESIGN, ...over })

test('Free: the UI kit in the free themes is served, every other row and theme is pro_required', async () => {
  for (const theme of EXPORT_THEMES.map((t) => t.id)) {
    for (const [row, formats] of Object.entries(THEME_ROW_FORMATS)) {
      for (const format of formats) {
        const stub = { projectToBrand() { throw new Error('stop here') } }
        const res = await ask('tok-free', body({ theme, row, format }), { engine: stub })
        const free = row === 'ui-kit' && FREE_UI_KIT_THEMES.includes(theme)
        assert.equal(isThemeExportPro(row, theme), !free)
        assert.equal(res.code, free ? 500 : 403, `${theme} ${row} ${format}`)
        if (!free) assert.equal(res.body.code, 'pro_required')
      }
    }
  }
})

test('Pro: a request for any row in any theme gets past the gate', async () => {
  for (const theme of EXPORT_THEMES.map((t) => t.id)) {
    const stub = { projectToBrand() { throw new Error('stop here') } }
    assert.equal((await ask('tok-pro', body({ theme, row: 'slides', format: 'pdf' }), { engine: stub })).code, 500)
  }
})

test('a theme, row or format outside the table is a 400 for everyone', async () => {
  for (const token of ['tok-pro', 'tok-free']) {
    for (const [over, code] of [
      [{ theme: 'nope' }, 'unknown_theme'], [{ theme: '4' }, 'unknown_theme'], [{ theme: ['04-standards'] }, 'unknown_theme'], [{ theme: '__proto__' }, 'unknown_theme'],
      [{ row: 'brand-kit' }, 'unknown_row'], [{ row: '__proto__' }, 'unknown_row'], [{ row: 'constructor' }, 'unknown_row'], [{ row: undefined }, 'unknown_row'],
      [{ format: 'png' }, 'unknown_format'], [{ row: 'ui-kit', format: 'pdf' }, 'unknown_format'], [{ format: '../x' }, 'unknown_format'], [{ format: 7 }, 'unknown_format'],
    ]) {
      const res = await ask(token, body(over))
      assert.equal(res.code, 400, JSON.stringify(over))
      assert.equal(res.body.code, code, JSON.stringify(over))
    }
  }
})

test('a body over the cap is a 413, after the plan check', async () => {
  const huge = body({ design: { ...DESIGN, logo: { src: 'x'.repeat(MAX_THEME_BODY_CHARS) } } })
  assert.equal((await ask('tok-pro', huge)).code, 413)
  assert.equal((await ask('tok-free', { ...huge, theme: '01-presentation' })).code, 403)
})

test('an oversize Content-Length is a 413 before the limiter, after the plan check', async () => {
  let consumed = 0
  const consume = async () => { consumed++; return { allowed: true } }
  const ask2 = async (token, length, over) => {
    const res = fakeRes()
    await serveExportDocument({ headers: { authorization: `Bearer ${token}`, 'content-length': length }, body: body(over) }, res, deps({ consume }))
    return res
  }
  assert.equal((await ask2('tok-pro', String(MAX_THEME_BODY_CHARS + 1))).code, 413)
  assert.equal(consumed, 0, 'the limiter was not touched')
  assert.equal((await ask2('tok-free', String(MAX_THEME_BODY_CHARS + 1), { theme: '01-presentation' })).code, 403)
  assert.equal((await ask2('tok-pro', String(MAX_THEME_BODY_CHARS))).code, 200)
  assert.equal((await ask2('tok-pro', 'not a number')).code, 200)
})

test('a theme, row or format outside the table is refused before the plan is read', async () => {
  let reads = 0
  const readUser = async (uid) => { reads++; return USERS[uid] }
  for (const over of [{ theme: 'nope' }, { row: 'brand-kit' }, { format: 'png' }]) {
    assert.equal((await ask('tok-free', body(over), { readUser })).code, 400)
  }
  assert.equal(reads, 0)
  assert.equal((await ask('tok-free', body({ theme: '01-presentation' }), { readUser })).code, 403)
  assert.equal(reads, 1, 'the plan gate still reads the plan')
})

test('a limiter that refuses is a 429 with Retry-After', async () => {
  const res = await ask('tok-pro', body(), { consume: async () => ({ allowed: false, retryAfter: 42 }) })
  assert.equal(res.code, 429)
  assert.equal(res.body.code, 'rate_limited')
  assert.equal(res.headers['Retry-After'], '42')
})

test('a BrandInputError is a 400 with a fixed message, its code and path, and none of its own text', async () => {
  const e = new Error('brand data: colours[0].hex has secret-text-here')
  e.name = 'BrandInputError'; e.code = 'brand_input'; e.path = 'colours[0].hex'; e.cause = new Error('inner-cause-text')
  const res = await ask('tok-pro', body(), { engine: { projectToBrand() { throw e } } })
  assert.equal(res.code, 400)
  assert.equal(res.body.code, 'invalid_project')
  assert.equal(res.body.path, 'colours[0].hex')
  const text = JSON.stringify(res.body)
  assert.ok(!/secret-text-here|inner-cause-text|stack|near/.test(text), text)
})

test('any other throw is a bare 500 with a fixed message', async () => {
  const e = new Error('leak <script>alert(1)</script> /srv/app/secret.js'); e.cause = new Error('inner-cause-text')
  const res = await ask('tok-pro', body(), { engine: { projectToBrand() { throw e } } })
  assert.equal(res.code, 500)
  assert.deepEqual(res.body, { error: 'The document could not be created', code: 'build_failed' })
})

test('a UI kit zip is named from the slug and theme, opens, and holds the kit page and the code package', async () => {
  const res = await ask('tok-free', body({ projectName: '../../evil "name"; x' }))
  assert.equal(res.code, 200, JSON.stringify(res.body))
  assert.equal(res.headers['Content-Type'], 'application/zip')
  const disp = res.headers['Content-Disposition']
  assert.match(disp, /^attachment; filename="p-[a-z0-9-]+-ui-kit-04-standards\.zip"$/)
  assert.ok(!/\.\.|\/|\\|'/.test(disp.slice('attachment; '.length).replace(/"/g, '')), 'only the slug and theme id reach the name')
  const zip = await JSZip.loadAsync(res.buffer)
  const names = Object.keys(zip.files)
  for (const f of ['ui-kit.html', 'tokens.css', 'tokens.json', 'tailwind.css', 'components.css', 'example.html']) {
    assert.ok(names.some((n) => n.endsWith('/' + f)), `${f} missing from ${names.slice(0, 5)}`)
  }
})

test('the brand guidelines: print HTML stands alone with fonts embedded, the zip holds the page and its fonts', async () => {
  const pdf = await ask('tok-pro', body({ row: 'slides', format: 'pdf' }))
  assert.equal(pdf.code, 200)
  assert.equal(pdf.body.ok, true)
  assert.match(pdf.body.html, /^<!doctype html>/i)
  assert.match(pdf.body.html, /data:font\/woff2;base64,/)
  assert.ok(!/<script/i.test(pdf.body.html))
  const html = await ask('tok-pro', body({ row: 'slides', format: 'html' }))
  assert.match(html.headers['Content-Disposition'], /-brand-guidelines-04-standards\.zip"$/)
  const names = Object.keys((await JSZip.loadAsync(html.buffer)).files)
  assert.ok(names.some((n) => n.endsWith('/brand-guidelines.html')) && names.some((n) => n.includes('/assets/fonts/')))
})

test('the brand book: print HTML and the site zip, with the kit named from the slug', async () => {
  const pdf = await ask('tok-pro', body({ row: 'book', format: 'pdf' }))
  assert.equal(pdf.code, 200)
  assert.match(pdf.body.html, /^<!doctype html>/i)
  const site = await ask('tok-pro', body({ row: 'book', format: 'html' }))
  assert.match(site.headers['Content-Disposition'], /^attachment; filename="p-[a-z0-9-]+-brand-book-04-standards\.zip"$/)
  const names = Object.keys((await JSZip.loadAsync(site.buffer)).files)
  assert.ok(names.some((n) => /\/assets\/p-[a-z0-9-]+-brand-kit\.zip$/.test(n)), names.filter((n) => n.includes('.zip')).join())
})

// A print document is shown in the browser's print window, so it must hold nothing that runs or loads: checks on the strings,
// over every theme and both print rows, with a project name that tries to break out of its text.
test('print HTML, every theme: no script, no handler, no outside link, fonts as data URLs, the CSP meta first in the head', async () => {
  for (const theme of EXPORT_THEMES.map((t) => t.id)) {
    for (const row of ['book', 'slides']) {
      const res = await ask('tok-pro', body({ theme, row, format: 'pdf', projectName: '"><script>alert(1)</script> <img src=x onerror=alert(2)>' }))
      const label = `${theme} ${row}`
      assert.equal(res.code, 200, label)
      const html = res.body.html
      assert.match(html, /^<!doctype html>/i, label)
      assert.ok(!/<script/i.test(html), `${label}: script`)
      assert.ok(!/\son[a-z]+\s*=/i.test(html), `${label}: inline handler`)
      assert.ok(!/<form/i.test(html), `${label}: form`)
      assert.ok(!/assets\//.test(html), `${label}: reference into assets/`)
      assert.ok(!/@import|<link|<iframe|<object|<embed|<base|<img/i.test(html), `${label}: element or rule that loads`)
      assert.ok(!/(?:src|href|action|poster)\s*=\s*(?!["']?(?:#|data:))/i.test(html), `${label}: link or source that is not a fragment or a data URL`)
      assert.ok(!/url\(\s*(?!["']?(?:#|data:))/i.test(html), `${label}: css url() that is not a fragment or a data URL`)
      assert.match(html, /data:font\/woff2;base64,/, label)
      assert.ok(!/url\([^)]*\.woff2/.test(html), `${label}: font by file name`)
      const head = html.slice(html.indexOf('<head>'))
      assert.ok(head.startsWith(`<head><meta http-equiv="Content-Security-Policy" content="${PRINT_CSP}">`), `${label}: CSP meta first in the head`)
      assert.equal(html.match(/Content-Security-Policy/g).length, 1, label)
    }
  }
  assert.equal(PRINT_CSP, "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'")
})

test('the book print edition leaves out the downloads section; the site zip keeps it, with its script', async () => {
  const pdf = (await ask('tok-pro', body({ row: 'book', format: 'pdf' }))).body.html
  assert.ok(!/id="downloads"|href="#downloads"/.test(pdf))
  const zip = await JSZip.loadAsync((await ask('tok-pro', body({ row: 'book', format: 'html' }))).buffer)
  const index = await zip.file(/\/index\.html$/)[0].async('string')
  assert.match(index, /id="downloads"/)
  assert.match(index, /<script>/)
})

test('the data table matches the themes: ids, names and the free tier', async () => {
  for (const t of EXPORT_THEMES) {
    const meta = (await import(`../../api/_lib/exportThemes/themes/${t.id}/index.js`)).meta
    assert.equal(meta.id, t.id)
    assert.equal(meta.name, t.name)
    assert.equal(meta.tier === 'Free', FREE_UI_KIT_THEMES.includes(t.id), `${t.id} tier`)
  }
})
