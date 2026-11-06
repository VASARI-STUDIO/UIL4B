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
import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'
import { MAX_THEME_BODY_CHARS } from '../../api/_lib/exportThemeRoute.js'
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

test('the data table matches the themes: ids, names and the free tier', async () => {
  for (const t of EXPORT_THEMES) {
    const meta = (await import(`../../api/_lib/exportThemes/themes/${t.id}/index.js`)).meta
    assert.equal(meta.id, t.id)
    assert.equal(meta.name, t.name)
    assert.equal(meta.tier === 'Free', FREE_UI_KIT_THEMES.includes(t.id), `${t.id} tier`)
  }
})
