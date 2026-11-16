// A FREE ACCOUNT CANNOT GET A PRO EXPORT, WHATEVER THE BROWSER SAYS.
//
// The rule: every Pro theme, format and page is checked on the server, against the Firebase ID token and the plan in the account's own
// user document. A Free account gets 403 and no file. Nothing the request or the page carries (a flag, a stored key, a query string,
// an edited body) can unlock Pro.
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
// MUTATION (each must fail this spec and tests/unit/theme-access.test.js): make assertThemeAccess in api/_lib/themeAccess.js return
// { ok: true } for every plan.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { EXPORT_THEMES, THEME_ROW_FORMATS, themeHasRow } from '../../src/data/exportThemes.js'
import { chooseFormat, exportPanel, primaryButton } from './export-rows.js'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'

const ROUTE = '/projects/harbour/export'
const ACCOUNTS = {
  'test-free': {},
  'test-pro': { subscription: { status: 'active', interval: 'monthly', currentPeriodEnd: Date.now() + 10 * 86_400_000 } },
}
// The documents the server builds. The offline-HTML ids (book-html, guidelines-html) are themed rows ({ row, format: 'html' }), so
// they are walked in PRO_COMBOS; sent as a bare document format they are not a built document and are 400 with no file.
const PRO_DOCS = ['book', 'guidelines']
const THEMED_DOCS = ['book-html', 'guidelines-html']
// Every request to the export route, whatever its query string carries (a glob would stop at the first extra parameter).
const EXPORT_ROUTE = (url) => url.pathname === '/api/ai' && url.searchParams.get('export') === 'document'

// The free tier, written out (not read from src/): the guidelines in Label and Swiss Field, the UI kit in Standards.
const isFree = (theme, row) => ['25-label', '27-swissfield'].includes(theme) || (theme === '04-standards' && row === 'ui-kit')
const PRO_COMBOS = []
for (const { id: theme } of EXPORT_THEMES) {
  for (const [row, formats] of Object.entries(THEME_ROW_FORMATS)) {
    if (!themeHasRow(theme, row)) continue
    for (const format of formats) if (!isFree(theme, row)) PRO_COMBOS.push({ theme, row, format })
  }
}

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
        const uid = token === 'tok-pro' ? 'test-pro' : token === 'tok-free' ? 'test-free' : `test-${server}`
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

// The Theme step: a radiogroup, one row per theme. On a phone the list is folded under a "Theme: <name>" row, so open it first.
const themes = (panel) => panel.getByRole('radiogroup', { name: 'Theme' })
async function pick(panel, name) {
  const toggle = panel.getByRole('button', { name: /^Theme:/ })
  if (await toggle.count() && (await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
  await themes(panel).getByRole('radio').filter({ has: panel.page().locator('.xd-theme-opt-n').getByText(name, { exact: true }) }).click()
}

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
    expect(PRO_COMBOS.length, 'the walk must be wide').toBeGreaterThanOrEqual(80)
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
    ['the slides swapped in', (b) => ({ ...b, row: 'slides', format: 'html' })],
    ['a Pro theme and the slides', (b) => ({ ...b, theme: '24-standards', row: 'slides', format: 'pdf' })],
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
    await serveExport(page)
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

  for (const file of ['book', 'book-html', 'guidelines', 'guidelines-html']) {
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
    await expect(primaryButton(panel)).toHaveText('Unlock with Pro')
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
