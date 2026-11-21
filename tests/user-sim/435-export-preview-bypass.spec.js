// A FREE ACCOUNT CANNOT GET THE CLEAN PREVIEW OF A PRO EXPORT THEME, WHATEVER IT GUESSES.
//
// The rule: the public pictures of a Pro pair are a watermarked 1x. The clean 2x of every page is a server-only file that only the
// preview route (api/_lib/exportPreview.js) sends, to an account whose plan, read from its own user document, is Pro.
//
// Like 434, `vite preview` has no /api, so the route is answered here by the REAL serveExportPreview with the account's user document
// standing in for Firestore and the tokens 'tok-free', 'tok-pro' and 'bad' standing for accounts. What is real is the plan check, the
// manifest check and the files on disk.
//
//   (a) guessed URLs   the clean 2x of a Pro pair asked for from the public folder, at every name it could have, and from api/_lib
//   (b) the route      no token, a bad token and a Free token get 403 and no bytes; a Pro token gets the webp
//   (c) edited queries a Free pair's name on a Pro row, a made-up id, a path out of the folder
//   (d) caches         a Pro answer, then the same URL from Free
//
// MUTATION (each of (b), (c) and (d) must fail): make assertThemeAccess in api/_lib/themeAccess.js return { ok: true } for every plan.
// For (a): copy a clean 2x of a Pro pair into public/export-themes/pages/<id>/<row>/<n>@2x.webp.
import fs from 'node:fs'
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { serveExportPreview } from '../../api/_lib/exportPreview.js'
import manifest from '../../src/config/exportPreviewPages.js'
import { isThemeExportPro } from '../../src/data/exportThemes.js'

const ACCOUNTS = {
  'test-free': {},
  'test-pro': { subscription: { status: 'active', interval: 'monthly', currentPeriodEnd: Date.now() + 10 * 86_400_000 } },
}
const PREVIEW_ROUTE = (url) => url.pathname === '/api/ai' && url.searchParams.get('export') === 'preview'
const CLEAN_DIR = new URL('../../api/_lib/pro/export-previews/', import.meta.url)

// The clean 2x pictures are not in this repository: scripts/fetch-pro-data.mjs writes them from the private data repository at build
// time. Where they are absent (CI, a clone without the token) the handler is given a stand-in reader that answers only a path under
// pro/export-previews that the handler built itself, so the gate is still tested end to end; its bytes are a tagged WEBP.
const HAVE_CLEAN = fs.existsSync(CLEAN_DIR)
const standIn = (rel) => {
  const tag = Buffer.from(`stub:${rel}`)
  const head = Buffer.alloc(12)
  head.write('RIFF', 0, 'latin1'); head.writeUInt32LE(4 + tag.length, 4); head.write('WEBP', 8, 'latin1')
  return Buffer.concat([head, tag])
}
const relOf = (url) => (String(url).match(/\/pro\/export-previews\/([^?#]+\.webp)$/) || [])[1]
const readClean = async (url) => {
  if (HAVE_CLEAN) return fs.promises.readFile(url)
  const rel = relOf(url)
  if (!rel) { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e }
  return standIn(rel)
}
const cleanBytes = (theme, row, n) => (HAVE_CLEAN ? fs.readFileSync(new URL(`${theme}/${row}/${n}.webp`, CLEAN_DIR)) : standIn(`${theme}/${row}/${n}.webp`))
const CLEAN = cleanBytes

const PRO_PAIRS = []
for (const [theme, rows] of Object.entries(manifest.themes)) {
  for (const row of Object.keys(rows)) if (isThemeExportPro(row, theme)) PRO_PAIRS.push({ theme, row })
}
const PRO = { theme: '01-presentation', row: 'slides', n: 1 }
const query = (o) => `/api/ai?export=preview&theme=${o.theme}&row=${o.row}&n=${o.n}&dpr=2`

/** Answer the preview route with the real server code. `log` records every answer the server gave. */
async function servePreview(page) {
  const log = []
  await page.route(PREVIEW_ROUTE, async (route) => {
    const sent = route.request().headers()
    const url = new URL(route.request().url())
    const reply = { status: 200, headers: {}, body: null, bytes: null }
    const res = {
      setHeader: (k, v) => { reply.headers[k] = v },
      status: (code) => { reply.status = code; return res },
      json: (b) => { reply.body = b; return res },
      send: (b) => { reply.bytes = b; return res },
    }
    // Vercel parses a repeated key into an array; Object.fromEntries would keep only the last one.
    const parsed = {}
    for (const k of new Set(url.searchParams.keys())) { const all = url.searchParams.getAll(k); parsed[k] = all.length > 1 ? all : all[0] }
    await serveExportPreview({ headers: sent, query: parsed }, res, {
      verifyIdToken: async (token) => {
        if (token === 'bad') { const e = new Error('bad token'); e.code = 'auth/argument-error'; throw e }
        return { uid: token === 'tok-pro' ? 'test-pro' : 'test-free', email_verified: true }
      },
      readUser: async (uid) => ACCOUNTS[uid],
      read: readClean,
    })
    log.push({ status: reply.status })
    return route.fulfill({
      status: reply.status,
      headers: reply.headers,
      contentType: reply.bytes ? reply.headers['Content-Type'] : 'application/json',
      body: reply.bytes || JSON.stringify(reply.body ?? {}),
    })
  })
  return log
}

/** GET from inside the page, as a script on it (or any other client) could. */
const get = (page, url, token) => page.evaluate(async ({ u, t }) => {
  const res = await fetch(u, t ? { headers: { Authorization: 'Bearer ' + t } } : {})
  const buf = new Uint8Array(await res.arrayBuffer())
  const head = (a, b) => String.fromCharCode(...buf.slice(a, b))
  return {
    status: res.status,
    type: res.headers.get('content-type') || '',
    cacheControl: res.headers.get('cache-control'),
    vary: res.headers.get('vary'),
    webp: head(0, 4) === 'RIFF' && head(8, 12) === 'WEBP',
    length: buf.length,
    base64: buf.length < 400_000 ? btoa(String.fromCharCode(...buf)) : '',
    text: buf.length < 2000 ? new TextDecoder().decode(buf) : '',
  }
}, { u: url, t: token })

test.describe('(a) guessed URLs', () => {
  test('the clean 2x of a Pro pair is not in the public folder under any name', async ({ page }) => {
    watch(page, 'a Free account guessing the path of a clean preview')
    await go(page, '/')
    const clean = CLEAN(PRO.theme, PRO.row, PRO.n).toString('base64')
    const names = [
      `/export-themes/pages/${PRO.theme}/${PRO.row}/${PRO.n}@2x.webp`,
      `/export-themes/pages/${PRO.theme}/${PRO.row}/${PRO.n}-2x.webp`,
      `/export-themes/pages/${PRO.theme}/${PRO.row}/${PRO.n}@3x.webp`,
      `/export-themes/pages/${PRO.theme}/${PRO.row}/${PRO.n}.webp`,
      `/api/_lib/pro/export-previews/${PRO.theme}/${PRO.row}/${PRO.n}.webp`,
      `/_lib/pro/export-previews/${PRO.theme}/${PRO.row}/${PRO.n}.webp`,
      `/pro/export-previews/${PRO.theme}/${PRO.row}/${PRO.n}.webp`,
      `/export-previews/${PRO.theme}/${PRO.row}/${PRO.n}.webp`,
      `/api/_lib/exportThemes/previews/${PRO.theme}/${PRO.row}/${PRO.n}.webp`,
      `/api/exportThemes/previews/${PRO.theme}/${PRO.row}/${PRO.n}.webp`,
      `/_lib/exportThemes/previews/${PRO.theme}/${PRO.row}/${PRO.n}.webp`,
      `/exportThemes/previews/${PRO.theme}/${PRO.row}/${PRO.n}.webp`,
      `/previews/${PRO.theme}/${PRO.row}/${PRO.n}.webp`,
      `/src/config/exportPreviews.js`,
    ]
    for (const url of names) {
      const r = await get(page, url)
      expect(r.base64 === clean, url + ' must not be the clean picture').toBe(false)
      if (!url.endsWith(`${PRO.n}.webp`) || url.includes('previews')) expect(r.webp, url + ' must not be an image').toBe(false)
    }
  })

  test('no Pro pair has an @2x picture in the public folder', async ({ page }) => {
    watch(page, 'a Free account asking for the 2x of every Pro pair')
    await go(page, '/')
    expect(PRO_PAIRS.length, 'the walk must be wide').toBeGreaterThan(40)
    const urls = PRO_PAIRS.map(({ theme, row }) => `/export-themes/pages/${theme}/${row}/1@2x.webp`)
    const out = await page.evaluate(async (list) => {
      const bad = []
      for (const u of list) {
        const res = await fetch(u)
        const b = new Uint8Array(await res.arrayBuffer())
        if (String.fromCharCode(...b.slice(0, 4)) === 'RIFF') bad.push(u)
      }
      return bad
    }, urls)
    expect(out, 'a 2x picture served from public').toEqual([])
  })
})

test.describe('(b) the route', () => {
  test('no token, a bad token and a Free token get 403 and no bytes; a Pro token gets the clean webp', async ({ page }) => {
    watch(page, 'every kind of caller asking for a Pro preview')
    await servePreview(page)
    await go(page, '/')
    for (const [token, what] of [[null, 'no token'], ['bad', 'a bad token'], ['tok-free', 'a Free token']]) {
      const r = await get(page, query(PRO), token)
      expect(r.status, what).toBe(403)
      expect(r.webp, what + ': no image bytes').toBe(false)
      expect(r.type, what).toMatch(/application\/json/)
      expect(JSON.parse(r.text), what).toEqual({ error: 'pro_required' })
    }
    const pro = await get(page, query(PRO), 'tok-pro')
    expect(pro.status).toBe(200)
    expect(pro.webp).toBe(true)
    expect(pro.type).toBe('image/webp')
    expect(pro.base64, 'it is the clean file').toBe(CLEAN(PRO.theme, PRO.row, PRO.n).toString('base64'))
  })

  test('a Free token is refused for the first page of every Pro pair', async ({ page }) => {
    watch(page, 'a Free account walking every Pro pair')
    await servePreview(page)
    await go(page, '/')
    const rows = await page.evaluate(async (pairs) => {
      const out = []
      for (const p of pairs) {
        const r = await fetch(`/api/ai?export=preview&theme=${p.theme}&row=${p.row}&n=1&dpr=2`, { headers: { Authorization: 'Bearer tok-free' } })
        const b = new Uint8Array(await r.arrayBuffer())
        out.push({ ...p, status: r.status, webp: String.fromCharCode(...b.slice(0, 4)) === 'RIFF' })
      }
      return out
    }, PRO_PAIRS)
    expect(rows.filter((r) => r.status !== 403 || r.webp)).toEqual([])
  })
})

test.describe('(c) edited queries', () => {
  test('a Free pair is not a way in to a Pro pair, and bad ids and paths are 400', async ({ page }) => {
    watch(page, 'a Free account editing the preview query')
    await servePreview(page)
    await go(page, '/')
    // The Free pair is public, so the route has no copy of it to send, even to Pro.
    for (const token of ['tok-free', 'tok-pro']) {
      const free = await get(page, query({ theme: '25-label', row: 'slides', n: 1 }), token)
      expect(free.status, 'a Free pair, ' + token).toBe(404)
      expect(free.webp).toBe(false)
    }
    // The same theme name with a Pro row is judged on its own pair.
    expect((await get(page, query({ theme: '04-standards', row: 'slides', n: 1 }), 'tok-free')).status).toBe(403)
    expect((await get(page, query({ theme: '04-standards', row: 'book', n: 1 }), 'tok-free')).status).toBe(403)
    expect((await get(page, query({ theme: '04-standards', row: 'slides', n: 1 }), 'tok-pro')).status).toBe(200)
    // A row the theme does not have, a made-up id, a page that does not exist, a path out of the folder.
    const bad = [
      query({ theme: '25-label', row: 'ui-kit', n: 1 }),
      query({ theme: 'nope', row: 'slides', n: 1 }),
      query({ theme: PRO.theme, row: 'nope', n: 1 }),
      query({ theme: PRO.theme, row: 'slides', n: 99 }),
      query({ theme: PRO.theme, row: 'slides', n: 0 }),
      query({ theme: '..%2F..%2F..%2Fpackage', row: 'slides', n: 1 }),
      query({ theme: PRO.theme, row: '..%2F..', n: 1 }),
      query({ theme: PRO.theme, row: 'slides', n: '1.webp%00' }),
      query({ theme: PRO.theme, row: 'slides', n: '..%2F1' }),
      `/api/ai?export=preview&theme=${PRO.theme}&row=slides&n=1&dpr=3`,
      `/api/ai?export=preview&theme=${PRO.theme}&row=slides&n=1&theme=04-standards`,
    ]
    for (const url of bad) {
      for (const token of ['tok-free', 'tok-pro']) {
        const r = await get(page, url, token)
        expect(r.status, url + ' ' + token).toBe(400)
        expect(r.webp, url + ' ' + token).toBe(false)
      }
    }
  })
})

test.describe('(d) caches', () => {
  test('a Pro answer does not serve the next Free request for the same URL, and every answer is no-store', async ({ page }) => {
    watch(page, 'a Free request straight after a Pro one for the same preview')
    const log = await servePreview(page)
    await go(page, '/')
    const pro = await get(page, query(PRO), 'tok-pro')
    expect(pro.status).toBe(200)
    expect(pro.cacheControl).toBe('private, no-store')
    expect(pro.vary).toMatch(/Authorization/i)
    const free = await get(page, query(PRO), 'tok-free')
    expect(free.status, 'Free straight after Pro').toBe(403)
    expect(free.webp).toBe(false)
    expect(free.cacheControl).toBe('private, no-store')
    expect(free.vary).toMatch(/Authorization/i)
    expect((await get(page, query(PRO))).status, 'no token after Pro').toBe(403)
    expect(log.map((l) => l.status), 'every request reached the server, so nothing came from a cache').toEqual([200, 403, 403])
  })
})
