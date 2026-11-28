// A FREE ACCOUNT CANNOT GET A PRO EXPORT, WHATEVER THE BROWSER SAYS.
//
// The rule: every Pro theme, format and page is checked on the server, against the Firebase ID token and the plan in the account's own
// user document. A Free account gets 403 and no file, with one exception: the guidelines and the style guide of a Pro theme are served
// as the free edition, cut on the server to seven pages with "Made with UIL4B" on every page. The UI kit, the book, the whole page set
// and a copy without the credit stay Pro. Nothing the request or the page carries (a flag, a stored key, a query string, an edited
// body) can unlock Pro or the whole edition.
//
// `vite preview` has no /api, so the export route is answered here by the REAL serveExportDocument (api/_lib/exportDocument.js) with
// the account's user document standing in for Firestore, the same way helpers.js runs the library routes. So the plan is decided by the
// deployed code's planForUser and assertThemeAccess, not by a canned reply. Two things are mocked: the token check (a token named
// below stands for an account) and the method gate in api/ai.js (POST only, 405 otherwise), which is mirrored here.
//
// Two accounts exist and they are separate on purpose: the one the SERVER holds (`server`) and the one the PAGE believes it is
// (signIn's plan). A page that claims Pro while the server holds a Free account is a tampered client.
//
//   (a) direct calls          no token, a bad token, a Free token; every Pro theme x row x format and every Pro document
//   (b) an edited body        a legitimate Free request rewritten on the wire to a Pro theme, row or format
//   (c) a flipped client      stored keys, a window flag and a query string all claiming Pro; and a page that really believes it is Pro
//   (d) guessed URLs          GETs at the export, library and Pro asset routes with a Free token
//   (e) caches                a Pro answer, then the same request from Free; no-store and Vary on every answer
//   (f) the gallery           choosing a Pro theme in the dialog and exporting
//
// The two file formats (app-bundle, book-png) are asked the way the page asks: the bundle with its date and name, the book pages with a
// small measuring table (METRICS). The server must refuse Free before it reads either.
//
// MUTATION (each must fail this spec): make assertThemeAccess in api/_lib/themeAccess.js return { ok: true } for every plan; let the
// free edition include 'ui-kit' or 'book' in FREE_EDITION_ROWS; drop the page cap in pagesDoc or styleGuide; drop withFreeCredit in
// api/_lib/exportThemeRoute.js.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { EXPORT_THEMES, THEME_ROW_FORMATS, themeHasRow } from '../../src/data/exportThemes.js'
import { chooseFormat, chooseTemplate, exportPanel, primaryButton } from './export-rows.js'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'
import JSZip from 'jszip'

const ROUTE = '/projects/harbour/export'
const ACCOUNTS = {
  'test-free': {},
  'test-pro': { subscription: { status: 'active', interval: 'monthly', currentPeriodEnd: Date.now() + 10 * 86_400_000 } },
  // a subscription that has ended: not Pro, so it is answered as Free
  'test-lapsed': { subscription: { status: 'canceled', interval: 'monthly', currentPeriodEnd: Date.now() - 10 * 86_400_000 } },
}
// The documents the server builds. The offline-HTML ids (book-html, guidelines-html) are themed rows ({ row, format: 'html' }), so
// they are walked in PRO_COMBOS; sent as a bare document format they are not a built document and are 400 with no file.
// app-bundle (a zip) and book-png (draw operations for the pages) are built on the server too, so Free gets neither.
const PRO_DOCS = ['book', 'guidelines', 'app-bundle', 'book-png']
const THEMED_DOCS = ['book-html', 'guidelines-html']
// Every request to the export route, whatever its query string carries (a glob would stop at the first extra parameter).
const EXPORT_ROUTE = (url) => url.pathname === '/api/ai' && url.searchParams.get('export') === 'document'

// The free tier, written out (not read from src/): the guidelines in Label, Swiss Field and Flyleaf, the UI kit in Standards.
const isFree = (theme, row) => ['25-label', '27-swissfield', '33-flyleaf'].includes(theme) || (theme === '04-standards' && row === 'ui-kit')
// The free edition, written out too: the guidelines (row slides) and the style guide (row guide) of a Pro theme, seven pages at most.
const FREE_EDITION_ROWS = ['slides', 'guide']
const FREE_EDITION_PAGES = 7
const PRO_COMBOS = []
const FREE_EDITION_COMBOS = []
for (const { id: theme } of EXPORT_THEMES) {
  for (const [row, formats] of Object.entries(THEME_ROW_FORMATS)) {
    if (!themeHasRow(theme, row) || isFree(theme, row)) continue
    for (const format of formats) (FREE_EDITION_ROWS.includes(row) ? FREE_EDITION_COMBOS : PRO_COMBOS).push({ theme, row, format })
  }
}

// A small, valid measuring table for book-png: one face, a few characters.
const METRICS = { fonts: { '400|Inter': { w: { a: 0.5, b: 0.55, ' ': 0.28 }, d: 0.2 } } }

const DESIGN = structuredClone(DEFAULT_DESIGN)
DESIGN.palette.colors = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
const NOW = new Date().toISOString()
const savedProject = () => ({ id: 'harbour', name: 'Harbour', design: DESIGN, createdAt: NOW, updatedAt: NOW })

/**
 * Answer the export route with the real server code and record what it said. `server` is the account the SERVER holds for any token
 * the page itself sends ('free' or 'pro'); tokens 'tok-free', 'tok-pro' and 'bad' are the direct callers. `state.tamper` rewrites
 * the body on the wire before the server sees it, the way an edited request would.
 */
async function serveExport(page, { server = 'free' } = {}) {
  const state = { tamper: null }
  const log = []
  await page.route(EXPORT_ROUTE, async (route) => {
    const req = route.request()
    const sent = req.headers()
    if (req.method() !== 'POST') {
      // api/ai.js: anything but a POST without a known GET param is 405, with no body of ours in it.
      log.push({ method: req.method(), status: 405 })
      return route.fulfill({ status: 405, headers: { Allow: 'POST', 'Cache-Control': 'private, no-store' }, contentType: 'application/json', body: JSON.stringify({ error: 'Method not allowed' }) })
    }
    let body = req.postDataJSON()
    if (state.tamper) body = state.tamper(structuredClone(body))
    const reply = { status: 200, headers: {}, body: null, bytes: null }
    const res = {
      setHeader: (k, v) => { reply.headers[k] = v },
      status: (code) => { reply.status = code; return res },
      json: (b) => { reply.body = b; return res },
      send: (b) => { reply.bytes = b; return res },
    }
    await serveExportDocument({ headers: sent, body }, res, {
      verifyIdToken: async (token) => {
        if (token === 'bad') { const e = new Error('bad token'); e.code = 'auth/argument-error'; throw e }
        const uid = token === 'tok-pro' ? 'test-pro' : token === 'tok-free' ? 'test-free' : token === 'tok-lapsed' ? 'test-lapsed' : `test-${server}`
        return { uid, email_verified: true }
      },
      readUser: async (uid) => ACCOUNTS[uid],
      consume: async () => ({ allowed: true, remaining: 10, retryAfter: 0 }),
    })
    log.push({ method: 'POST', body, status: reply.status, headers: reply.headers, json: reply.body, bytes: reply.bytes })
    return route.fulfill({
      status: reply.status,
      headers: reply.headers,
      contentType: reply.bytes ? reply.headers['Content-Type'] : 'application/json',
      body: reply.bytes || JSON.stringify(reply.body ?? {}),
    })
  })
  return { log, state }
}

/** POST to the export route from inside the page, as a script on it (or any other client) could. */
function post(page, body, token = 'tok-free') {
  return page.evaluate(async ({ body: b, token: t }) => {
    const headers = { 'Content-Type': 'application/json' }
    if (t) headers.Authorization = 'Bearer ' + t
    const r = await fetch('/api/ai?export=document', { method: 'POST', headers, body: JSON.stringify(b) })
    const buf = new Uint8Array(await r.arrayBuffer())
    return {
      status: r.status,
      cacheControl: r.headers.get('cache-control'),
      vary: r.headers.get('vary'),
      type: r.headers.get('content-type'),
      text: new TextDecoder().decode(buf),
      zip: buf[0] === 0x50 && buf[1] === 0x4b,
    }
  }, { body, token })
}

/** What a refusal must be: 403, a JSON error and nothing else (no document, no zip, no draw ops). */
function expectRefusal(r, what) {
  expect(r.status, what).toBe(403)
  expect(r.zip, what + ': no zip bytes').toBe(false)
  expect(r.type, what).toMatch(/application\/json/)
  const json = JSON.parse(r.text)
  expect(json.code, what).toBe('pro_required')
  const fields = Object.keys(json).every((k) => ['error', 'code', 'row', 'theme', 'format'].includes(k))
  expect(fields, what + ': only the error fields (' + Object.keys(json) + ')').toBe(true)
  expect(r.text, what + ': no document in the body').not.toMatch(/<html|<!doctype|<svg|"ops"/i)
}
// A page frame (an element whose class list holds "pg") and the free credit drawn on it. The phone edition's own credit line carries a
// second class, so it is not counted as a page's credit.
const FRAME = /<[a-z][a-z0-9]*\b[^>]*\bclass="(?:[^"]*\s)?pg(?:\s[^"]*)?"[^>]*>/g
const CREDIT = 'Made with UIL4B'
const PAGE_CREDIT = /<p class="uil4b-credit">Made with UIL4B<\/p>/g
const countOf = (text, re) => (text.match(re) || []).length

/** The html and markdown documents in one answer the server gave: a print document, the files of a zip, or a markdown file. */
async function documentsOf(entry) {
  const type = String(entry.headers['Content-Type'] || '')
  if (entry.json && typeof entry.json.html === 'string') return { html: [['print document', entry.json.html]], md: [] }
  if (/markdown/.test(type)) return { html: [], md: [['markdown', String(entry.bytes)]] }
  const out = { html: [], md: [] }
  if (!/zip/.test(type)) return out
  const zip = await JSZip.loadAsync(entry.bytes)
  for (const f of Object.values(zip.files)) {
    if (f.dir) continue
    // only pages, the markdown and fonts: no other file can carry a page the cut left out
    expect(f.name, 'a file the free edition may hold').toMatch(/(\.html|\.md|\/fonts\/[^/]+\.(woff2?|ttf|otf))$/)
    if (/\.html$/.test(f.name)) out.html.push([f.name, await f.async('string')])
    else if (/\.md$/.test(f.name)) out.md.push([f.name, await f.async('string')])
  }
  return out
}

/** What the free edition must be: served, every html document at most seven pages with the credit on each, every markdown credited. */
async function expectFreeEdition(entry, what) {
  expect(entry.status, what + ': served').toBe(200)
  const { html, md } = await documentsOf(entry)
  expect(html.length + md.length, what + ': a document').toBeGreaterThan(0)
  for (const [name, doc] of html) {
    const frames = countOf(doc, FRAME)
    expect(frames, what + ', ' + name + ': drawn as pages').toBeGreaterThan(0)
    expect(frames, what + ', ' + name + ': seven pages at most').toBeLessThanOrEqual(FREE_EDITION_PAGES)
    expect(countOf(doc, PAGE_CREDIT), what + ', ' + name + ': the credit on every page').toBe(frames)
    // every page the engine names is a counted frame, so a page drawn without the frame class cannot slip past the cap and the credit
    expect(countOf(doc, /<[a-z][a-z0-9]*\b[^>]*\sdata-page="/g), what + ', ' + name + ': every named page is a frame').toBe(frames)
    // a style guide site shows its phone edition below the screen break, where the frames are hidden: it carries a credit of its own
    if (doc.includes('class="sg-screen')) {
      expect(countOf(doc, /<p class="uil4b-credit uil4b-credit--screen">Made with UIL4B<\/p>/g), what + ', ' + name + ': the phone edition credit').toBe(1)
      expect(doc.indexOf('uil4b-credit--screen">'), what + ', ' + name + ': the phone credit before the pages').toBeLessThan(doc.indexOf('<div class="sg-pages">'))
    }
  }
  for (const [name, doc] of md) {
    expect(doc.trimEnd().endsWith(CREDIT), what + ', ' + name + ': the credit').toBe(true)
    // the markdown describes only the pages drawn: a section per page at most
    expect(countOf(doc, /^## \d+ · /gm), what + ', ' + name + ': sections').toBeLessThanOrEqual(FREE_EDITION_PAGES)
  }
  // a style guide zip holds index.html, one file per page and style-guide.md: seven page files at most
  expect(html.filter(([n]) => !/(^|\/)index\.html$/.test(n)).length, what + ': page files').toBeLessThanOrEqual(FREE_EDITION_PAGES)
}

const expectUncached = (r, what) => {
  expect(r.cacheControl, what + ': Cache-Control').toBe('private, no-store')
  expect(r.vary, what + ': Vary').toMatch(/Authorization/i)
}

/** Open the dialog on a saved project. The page believes it is `client`; the server holds `server`. */
async function openDialog(page, { client = 'free', server = 'free', file = 'kit' } = {}) {
  const served = await serveExport(page, { server })
  await signIn(page, { plan: client, projects: [savedProject()] })
  await go(page, ROUTE)
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  await panel.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
  await chooseFormat(panel, file)
  await page.mouse.move(0, 0)
  return { panel, ...served }
}

// The template is chosen in the dialog's "View templates" grid: open it, click the card, and the dialog returns to the preview.
const pick = (panel, name) => chooseTemplate(panel, name)

/** Count what a click produces: files saved and windows opened. */
function watchOutputs(page) {
  const out = { downloads: 0, popups: 0 }
  page.on('download', () => { out.downloads += 1 })
  page.context().on('page', () => { out.popups += 1 })
  return out
}

test.describe('(a) direct calls', () => {
  test('no token is 401 and a bad token is 401, with no file', async ({ page }) => {
    watch(page, 'a script calling the export route without a valid session')
    await serveExport(page)
    await go(page, '/')
    for (const [token, what] of [[null, 'no token'], ['bad', 'a bad token']]) {
      const r = await post(page, { theme: '01-presentation', row: 'book', format: 'html', design: DESIGN }, token)
      expect(r.status, what).toBe(401)
      expect(r.zip, what).toBe(false)
      expect(r.text, what).not.toMatch(/<html|<!doctype/i)
      expectUncached(r, what)
    }
  })

  test('a Free token gets 403 for every Pro theme, row and format and no file', async ({ page }) => {
    watch(page, 'a Free account calling every Pro themed export')
    await serveExport(page)
    await go(page, '/')
    expect(PRO_COMBOS.length, 'the walk must be wide').toBeGreaterThanOrEqual(50)
    expect(PRO_COMBOS.some((c) => FREE_EDITION_ROWS.includes(c.row)), 'no free edition row in the Pro walk').toBe(false)
    const results = await page.evaluate(async (combos) => {
      const out = []
      for (const c of combos) {
        const r = await fetch('/api/ai?export=document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-free' },
          body: JSON.stringify({ ...c, projectName: 'Harbour', design: {} }),
        })
        const text = await r.text()
        out.push({ c, status: r.status, cc: r.headers.get('cache-control'), vary: r.headers.get('vary'), text })
      }
      return out
    }, PRO_COMBOS)
    const bad = results.filter((r) => r.status !== 403 || r.cc !== 'private, no-store' || !/Authorization/i.test(r.vary || '')
      || JSON.parse(r.text).code !== 'pro_required' || /<html|PK/.test(r.text))
    expect(bad.map((r) => r.c.theme + ' ' + r.c.row + ' ' + r.c.format + ' -> ' + r.status), 'every Pro combination refused, uncached').toEqual([])
  })

  test('a Free token gets only the seven-page edition, credited on every page, of every Pro guidelines and style guide', async ({ page }) => {
    test.setTimeout(300_000)
    watch(page, 'a Free account calling every Pro guidelines and style guide')
    const { log } = await serveExport(page)
    await go(page, '/')
    expect(FREE_EDITION_COMBOS.length, 'the walk must be wide').toBeGreaterThanOrEqual(40)
    for (const c of FREE_EDITION_COMBOS) {
      const what = 'Free ' + c.theme + ' ' + c.row + ' ' + c.format
      expectUncached(await post(page, { ...c, projectName: 'Harbour', design: DESIGN }), what)
      await expectFreeEdition(log.at(-1), what)
    }
    // The control: Pro gets the whole document with no credit, and it is longer than seven pages, so the cap above is a real cut.
    const longest = []
    for (const c of FREE_EDITION_COMBOS.filter((x) => x.format === 'pdf')) {
      const r = await post(page, { ...c, projectName: 'Harbour', design: DESIGN }, 'tok-pro')
      expect(r.status, 'Pro ' + c.theme + ' ' + c.row).toBe(200)
      const html = JSON.parse(r.text).html
      expect(countOf(html, PAGE_CREDIT), 'Pro ' + c.theme + ' ' + c.row + ': no free credit on the pages').toBe(0)
      longest.push(countOf(html, FRAME))
    }
    expect(Math.max(...longest), 'a Pro guidelines or style guide longer than the free edition').toBeGreaterThan(FREE_EDITION_PAGES)
  })

  test('an account whose subscription has ended is answered as Free: 403 for the UI kit and book, the free edition otherwise', async ({ page }) => {
    watch(page, 'a lapsed account calling Pro exports')
    const { log } = await serveExport(page)
    await go(page, '/')
    for (const c of [{ theme: '24-standards', row: 'ui-kit', format: 'zip' }, { theme: '24-standards', row: 'book', format: 'pdf' }]) {
      expectRefusal(await post(page, { ...c, projectName: 'Harbour', design: DESIGN }, 'tok-lapsed'), 'lapsed ' + c.row)
    }
    for (const c of [{ theme: '24-standards', row: 'slides', format: 'html' }, { theme: '24-standards', row: 'guide', format: 'html' }]) {
      await post(page, { ...c, projectName: 'Harbour', design: DESIGN }, 'tok-lapsed')
      await expectFreeEdition(log.at(-1), 'lapsed ' + c.row)
    }
  })

  test('a Free token gets 403 for every Pro document, and the same request from Pro is served', async ({ page }) => {
    watch(page, 'a Free account calling the Pro documents')
    await serveExport(page)
    await go(page, '/')
    for (const format of PRO_DOCS) {
      const refused = await post(page, { format, projectName: 'Harbour', design: DESIGN }, 'tok-free')
      expectRefusal(refused, 'Free ' + format)
      expectUncached(refused, 'Free ' + format)
      expect(JSON.parse(refused.text).format).toBe(format)
    }
    for (const format of THEMED_DOCS) {
      const r = await post(page, { format, projectName: 'Harbour', design: DESIGN }, 'tok-free')
      expect(r.status, 'Free ' + format + ' as a bare document').toBe(400)
      expect(JSON.parse(r.text).code).toBe('unknown_format')
      expect(r.text, 'no document').not.toMatch(/<html|<!doctype/i)
      expect(r.zip).toBe(false)
    }
    // The control: the same call from Pro does return a document, so "no file" is the answer and not a route that never worked.
    const served = await post(page, { format: 'book', projectName: 'Harbour', design: DESIGN }, 'tok-pro')
    expect(served.status).toBe(200)
    expect(JSON.parse(served.text).html).toMatch(/<html/i)
  })

  test('a Free or signed-out caller gets nothing for app-bundle and book-png, with the options the page sends', async ({ page }) => {
    watch(page, 'a Free and a signed-out caller asking for the zip and the book pages')
    await serveExport(page)
    await go(page, '/')
    const asked = {
      'app-bundle': { format: 'app-bundle', projectName: 'Harbour', design: DESIGN, date: '2026-01-15', name: 'Harbour' },
      'book-png': { format: 'book-png', projectName: 'Harbour', design: DESIGN, metrics: METRICS, date: '2026-01-15', missingFonts: [] },
    }
    for (const [format, body] of Object.entries(asked)) {
      const refused = await post(page, body, 'tok-free')
      expectRefusal(refused, 'Free ' + format)
      expectUncached(refused, 'Free ' + format)
      expect(JSON.parse(refused.text).format).toBe(format)
      expect(refused.text, 'Free ' + format + ': no zip and no pages').not.toMatch(/"zip"|"pages"|"fonts"/)
      for (const [token, what] of [[null, 'no token'], ['bad', 'a bad token']]) {
        const r = await post(page, body, token)
        expect(r.status, what + ' ' + format).toBe(401)
        expect(r.zip, what + ' ' + format).toBe(false)
        expect(r.text, what + ' ' + format + ': no zip and no pages').not.toMatch(/"zip"|"pages"/)
      }
      // The control: the same request from Pro is served, so the refusal is the plan and not a route that never worked.
      const served = await post(page, body, 'tok-pro')
      expect(served.status, 'Pro ' + format).toBe(200)
      const json = JSON.parse(served.text)
      if (format === 'app-bundle') expect(typeof json.zip, 'a base64 zip').toBe('string')
      else expect(Array.isArray(json.pages) && json.pages.length > 0, 'draw operations for the pages').toBe(true)
    }
  })

  test('a Free token gets 403 for app-bundle and book-png before the body is read, however malformed', async ({ page }) => {
    watch(page, 'a Free account sending broken options for the file formats')
    await serveExport(page)
    await go(page, '/')
    for (const format of ['app-bundle', 'book-png']) {
      for (const extra of [{ metrics: 'x' }, { metrics: { fonts: { '400|Inter': { w: { a: 99 } } } } }, { date: 'not-a-date' }, { missingFonts: 7 }]) {
        expectRefusal(await post(page, { format, design: DESIGN, ...extra }, 'tok-free'), format + ' ' + JSON.stringify(extra).slice(0, 40))
      }
    }
  })

  test('a Free token does get the free kit, so the refusals above are about Pro and not a broken route', async ({ page }) => {
    watch(page, 'a Free account calling the free UI kit')
    await serveExport(page)
    await go(page, '/')
    const r = await post(page, { theme: '04-standards', row: 'ui-kit', format: 'zip', projectName: 'Harbour', design: DESIGN })
    expect(r.status).toBe(200)
    expect(r.zip).toBe(true)
  })
})

test.describe('(b) an edited body', () => {
  const edits = [
    ['a Pro theme swapped in', (b) => ({ ...b, theme: '01-presentation' })],
    ['the book row swapped in', (b) => ({ ...b, row: 'book', format: 'pdf' })],
    ['the book as html swapped in', (b) => ({ ...b, row: 'book', format: 'html' })],
    ['a Pro document format (the theme and row dropped)', (b) => ({ format: 'book', projectName: b.projectName, design: b.design })],
    ['a Pro document format beside a free theme', (b) => ({ ...b, theme: undefined, row: undefined, format: 'guidelines' })],
    ['a plan claimed in the body', (b) => ({ ...b, theme: '03-broadsheet', plan: 'pro', pro: true, isPro: true, user: { plan: 'pro' } })],
  ]
  for (const [name, tamper] of edits) {
    test('a Free kit request rewritten to ' + name + ' is refused and saves nothing', async ({ page }) => {
      watch(page, 'a Free account whose kit request is edited: ' + name)
      const { panel, log, state } = await openDialog(page, { client: 'free', server: 'free', file: 'kit' })
      const out = watchOutputs(page)
      state.tamper = tamper
      await primaryButton(panel).click()
      await expect.poll(() => log.length, 'the request reached the server').toBe(1)
      expect(log[0].status).toBe(403)
      expect(log[0].bytes, 'no file').toBeNull()
      expect(JSON.stringify(log[0].json)).not.toMatch(/<html|PK/)
      expect(out.downloads, 'no download').toBe(0)
      expect(out.popups, 'no window').toBe(0)
    })
  }

  // Rewritten to a Pro theme's guidelines or style guide, the answer is the free edition and never the whole document, whatever the
  // body claims about the plan or the edition.
  const toFreeEdition = [
    ['the guidelines swapped in', (b) => ({ ...b, row: 'slides', format: 'html' })],
    ['a Pro theme and the guidelines', (b) => ({ ...b, theme: '24-standards', row: 'slides', format: 'pdf' })],
    ['a Pro style guide as markdown', (b) => ({ ...b, theme: '24-standards', row: 'guide', format: 'md' })],
    ['the whole edition claimed in the body', (b) => ({ ...b, theme: '24-standards', row: 'guide', format: 'html', plan: 'pro', isPro: true,
      freeEdition: false, edition: 'full', skeleton: false, credit: false, pages: 99 })],
  ]
  for (const [name, tamper] of toFreeEdition) {
    test('a Free kit request rewritten to ' + name + ' gets only the free edition', async ({ page }) => {
      watch(page, 'a Free account whose kit request is edited: ' + name)
      const { panel, log, state } = await openDialog(page, { client: 'free', server: 'free', file: 'kit' })
      state.tamper = tamper
      await primaryButton(panel).click()
      await expect.poll(() => log.length, 'the request reached the server').toBe(1)
      await expectFreeEdition(log[0], name)
    })
  }

  test('the control: the same request untouched is served and downloads', async ({ page }) => {
    watch(page, 'a Free account exporting the free kit')
    const { panel, log } = await openDialog(page, { client: 'free', server: 'free', file: 'kit' })
    const [download] = await Promise.all([page.waitForEvent('download'), primaryButton(panel).click()])
    expect(download.suggestedFilename()).toMatch(/\.zip$/)
    expect(log[0].status).toBe(200)
  })
})

test.describe('(c) a flipped client', () => {
  test('stored keys, a window flag and a query string claiming Pro do not change the answer', async ({ page }) => {
    watch(page, 'a Free account claiming Pro from the page')
    const { log } = await serveExport(page)
    await page.addInitScript(() => {
      for (const k of ['vs-plan', 'plan', 'pro', 'isPro', 'uil4b-pro', 'uil4b-plan', 'vs-pro']) localStorage.setItem(k, 'pro')
      localStorage.setItem('subscription', JSON.stringify({ status: 'active' }))
      window.__PRO__ = true
      window.isPro = true
    })
    await go(page, '/?plan=pro&pro=1&isPro=true&admin=1')
    for (const c of PRO_COMBOS.slice(0, 6)) {
      expectRefusal(await post(page, { ...c, projectName: 'Harbour', design: DESIGN }), c.theme + ' ' + c.row + ' ' + c.format)
    }
    for (const format of PRO_DOCS) expectRefusal(await post(page, { format, design: DESIGN }), format)
    for (const c of [{ theme: '24-standards', row: 'slides', format: 'pdf' }, { theme: '24-standards', row: 'guide', format: 'md' }]) {
      await post(page, { ...c, projectName: 'Harbour', design: DESIGN })
      await expectFreeEdition(log.at(-1), 'a flipped client asking for ' + c.row + ' ' + c.format)
    }
  })

  test('a page that believes it is Pro, over a Free account, gets 403 for the UI kit in a Pro theme', async ({ page }) => {
    watch(page, 'a tampered client that thinks it is Pro, exporting the UI kit in a Pro theme')
    const { panel, log } = await openDialog(page, { client: 'pro', server: 'free', file: 'kit' })
    const out = watchOutputs(page)
    await pick(panel, 'Studio')
    await expect(primaryButton(panel), 'the tampered page offers the export').toHaveText('Export UI kit')
    await primaryButton(panel).click()
    await expect.poll(() => log.length).toBe(1)
    expect(log[0].body).toMatchObject({ theme: '06-studio', row: 'ui-kit', format: 'zip' })
    expect(log[0].status).toBe(403)
    expect(log[0].bytes).toBeNull()
    expect(out.downloads).toBe(0)
  })

  for (const file of ['book', 'book-html']) {
    test('a page that believes it is Pro, over a Free account, gets 403 and nothing for ' + file, async ({ page }) => {
      watch(page, 'a tampered client exporting ' + file)
      const { panel, log } = await openDialog(page, { client: 'pro', server: 'free', file })
      const out = watchOutputs(page)
      await primaryButton(panel).click()
      await expect.poll(() => log.length).toBe(1)
      expect(log[0].status).toBe(403)
      expect(log[0].bytes).toBeNull()
      expect(JSON.stringify(log[0].json)).not.toMatch(/<html/i)
      expect(out.downloads).toBe(0)
    })
  }
})

test.describe('(c) a flipped client: the guidelines', () => {
  for (const file of ['guidelines', 'guidelines-html']) {
    test('a page that believes it is Pro, over a Free account, gets only the free edition of ' + file, async ({ page }) => {
      watch(page, 'a tampered client exporting ' + file)
      const { panel, log } = await openDialog(page, { client: 'pro', server: 'free', file })
      await primaryButton(panel).click()
      await expect.poll(() => log.length).toBe(1)
      await expectFreeEdition(log[0], 'a tampered client, ' + file)
    })
  }
})

test.describe('(d) guessed URLs', () => {
  test('GETs at the export route, however they are dressed, return no file', async ({ page }) => {
    watch(page, 'someone guessing an export URL with a Free token')
    await serveExport(page)
    await go(page, '/')
    const urls = [
      '/api/ai?export=document',
      '/api/ai?export=document&theme=01-presentation&row=book&format=html',
      '/api/ai?export=document&format=book',
      '/api/ai?export=document&theme=04-standards&row=ui-kit&format=zip',
    ]
    for (const url of urls) {
      const r = await page.evaluate(async (u) => {
        const res = await fetch(u, { headers: { Authorization: 'Bearer tok-free' } })
        const buf = new Uint8Array(await res.arrayBuffer())
        return { status: res.status, text: new TextDecoder().decode(buf).slice(0, 300), zip: buf[0] === 0x50 && buf[1] === 0x4b }
      }, url)
      expect(r.status, url).toBe(405)
      expect(r.zip, url).toBe(false)
      expect(r.text, url).not.toMatch(/<html|<!doctype/i)
    }
  })
})

test.describe('(e) caches', () => {
  test('a Pro answer does not serve the next Free request, and every answer says no-store and Vary: Authorization', async ({ page }) => {
    watch(page, 'a Free request straight after a Pro one for the same export')
    const { log } = await serveExport(page)
    await go(page, '/')
    const ask = { format: 'book', projectName: 'Harbour', design: DESIGN }
    const pro = await post(page, ask, 'tok-pro')
    expect(pro.status, 'the Pro request is served').toBe(200)
    expect(JSON.parse(pro.text).html).toMatch(/<html/i)
    expectUncached(pro, 'the Pro answer')
    const free = await post(page, ask, 'tok-free')
    expectRefusal(free, 'Free straight after Pro')
    expectUncached(free, 'the Free refusal')
    expect(log.map((l) => l.status), 'both reached the server, so nothing came from a cache').toEqual([200, 403])
    expectRefusal(await post(page, ask, 'tok-free'), 'Free again')
    expect((await post(page, ask, 'tok-pro')).status).toBe(200)
    expect(log).toHaveLength(4)
  })

  test('401, 403 and 400 answers are no-store with Vary: Authorization too', async ({ page }) => {
    watch(page, 'reading the headers on every refusal')
    await serveExport(page)
    await go(page, '/')
    const themed = { theme: '01-presentation', row: 'book', format: 'html', design: DESIGN }
    const asks = [
      [themed, null],
      [themed, 'tok-free'],
      [{ ...themed, theme: 'nope' }, 'tok-free'],
      [{ format: 'made-up', design: DESIGN }, 'tok-free'],
      [{ format: 'book', design: DESIGN }, 'tok-free'],
    ]
    const seen = []
    for (const [b, token] of asks) {
      const r = await post(page, b, token)
      seen.push(r.status)
      expectUncached(r, 'status ' + r.status)
    }
    expect(seen).toEqual([401, 403, 400, 400, 403])
  })
})

test.describe('(f) the gallery: choosing a Pro template and exporting', () => {
  test('an honest Free account choosing a Pro theme is sent to the plans page and the server is never asked', async ({ page }) => {
    watch(page, 'a Free account choosing a Pro theme for the UI kit')
    const { panel, log } = await openDialog(page, { client: 'free', server: 'free', file: 'kit' })
    await pick(panel, 'Studio')
    await expect(primaryButton(panel)).toHaveText('Upgrade to Pro')
    await primaryButton(panel).click()
    await expect(page).toHaveURL(/\/(plans|checkout)(\?|$)/)
    expect(log, 'a locked theme never reaches the route').toHaveLength(0)
  })

  test('a tampered page choosing several Pro book themes still gets 403 each time', async ({ page }) => {
    watch(page, 'a tampered client choosing Pro themes for the book')
    const { panel, log } = await openDialog(page, { client: 'pro', server: 'free', file: 'book-html' })
    const out = watchOutputs(page)
    const names = ['Presentation', 'Blueprint', 'Fluted']
    for (const [i, name] of names.entries()) {
      await pick(panel, name)
      await primaryButton(panel).click()
      await expect.poll(() => log.length, name + ': the server was asked').toBe(i + 1)
      expect(log[i].status, name).toBe(403)
      expect(log[i].bytes, name).toBeNull()
    }
    expect(out.downloads).toBe(0)
  })
})
