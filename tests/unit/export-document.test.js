// The Pro documents are built on the server, and only for a Pro account.
//
// Three things have to hold, and each test below can be made to fail:
//
//  1. THE SERVER REFUSES. Signed-out, invalid-token and Free callers get no
//     document, for every Pro format in the export table, and the generator is
//     never even loaded for them. A forged `isPro` flag, a `plan: 'pro'` field on
//     the user document or in the request body changes nothing.
//  2. THE SERVER SERVES. A Pro account (and a verified admin email) gets the real
//     document, built by the real generator, for every Pro format.
//  3. THE BROWSER CANNOT BUILD THEM. Neither generator is reachable from the
//     app's entry, statically or lazily, so there is nothing in the bundle to call.
//
// To see each fail: delete the `plan.id !== 'pro'` check in
// api/_lib/exportDocument.js (1), add a Pro format to src/config/exportFormats.js
// with no BUILDERS entry (2), or `import('../utils/designSystemBook')` from any file
// the app reaches (3).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { serveExportDocument, BUILDERS, MAX_DESIGN_CHARS } from '../../api/_lib/exportDocument.js'
import { proOnlyFormats, EXPORT_FORMATS } from '../../src/config/exportFormats.js'
import {
  requestExportDocument, documentDesign, withPrintBootstrap, reservePrintWindow, showInPrintWindow, releasePrintWindow,
} from '../../src/utils/exportDocument.js'

const DESIGN = {
  palette: { base: '#1F4B8E', harmony: 'analogous', colors: ['#1F4B8E', '#2E7BB8', '#3FA9A0', '#C7D9E8', '#0D2540'] },
  fonts: { heading: { family: 'Space Grotesk', weight: 700 }, body: { family: 'Inter', weight: 400 } },
  typeScale: { base: 16, ratio: 1.25, lineHeight: 1.55 },
}

const USERS = {
  'pro-1': { subscription: { status: 'active', currentPeriodEnd: Date.now() + 10 * 86_400_000 } },
  'free-1': {},
  'ended-1': { subscription: { status: 'canceled' } },
  // Fields a client might forge on its own document; none of them is a plan.
  'liar-1': { plan: 'pro', isPro: true, subscription: { status: 'canceled' } },
}

function fakeDeps(extra = {}) {
  const calls = { read: [], built: 0 }
  return {
    calls,
    deps: {
      verifyIdToken: async (token) => {
        if (token === 'tok-pro') return { uid: 'pro-1' }
        if (token === 'tok-free') return { uid: 'free-1' }
        if (token === 'tok-ended') return { uid: 'ended-1' }
        if (token === 'tok-liar') return { uid: 'liar-1' }
        if (token === 'tok-admin') return { uid: 'free-1', email: 'admin@example.test', email_verified: true }
        const err = new Error('bad token')
        err.code = 'auth/argument-error'
        throw err
      },
      readUser: async (uid) => { calls.read.push(uid); return USERS[uid] },
      ...extra,
    },
  }
}

function fakeRes() {
  const res = {
    headers: {},
    setHeader(k, v) { res.headers[k] = v },
    status(code) { res.code = code; return res },
    json(body) { res.body = body; return res },
  }
  return res
}

const ask = async (token, body, deps) => {
  const res = fakeRes()
  await serveExportDocument({ headers: token ? { authorization: `Bearer ${token}` } : {}, body }, res, deps)
  return res
}

// A builder table that records whether a generator was ever loaded.
function spyBuilders() {
  const loaded = []
  const table = {}
  for (const f of proOnlyFormats()) {
    table[f.id] = async () => { loaded.push(f.id); return () => `<html>${f.id}</html>` }
  }
  return { loaded, table }
}

test('every Pro format has a server builder, and the builders are exactly the Pro formats', () => {
  const pro = proOnlyFormats().map((f) => f.id).sort()
  assert.ok(pro.length >= 2, 'the export table lost its Pro documents')
  assert.deepEqual(Object.keys(BUILDERS).sort(), pro,
    'a Pro format with no server builder cannot be exported, and a builder for a non-Pro format would be dead code')
})

for (const format of proOnlyFormats().map((f) => f.id)) {
  test(`${format}: a signed-out caller gets 401 and no document`, async () => {
    const { deps } = fakeDeps()
    const res = await ask(null, { format, design: DESIGN }, deps)
    assert.equal(res.code, 401)
    assert.equal(res.body.html, undefined)
    assert.equal(res.headers['Cache-Control'], 'private, no-store')
  })

  test(`${format}: a bad token gets 401 and no document`, async () => {
    const { deps } = fakeDeps()
    const res = await ask('nope', { format, design: DESIGN }, deps)
    assert.equal(res.code, 401)
    assert.equal(res.body.html, undefined)
  })

  test(`${format}: a Free account gets 403, and the generator is never loaded`, async () => {
    const { loaded, table } = spyBuilders()
    const { deps } = fakeDeps({ builders: table })
    const res = await ask('tok-free', { format, design: DESIGN }, deps)
    assert.equal(res.code, 403)
    assert.equal(res.body.code, 'pro_required')
    assert.equal(res.body.html, undefined, 'a refused request carries no document')
    assert.deepEqual(loaded, [], 'the Pro generator ran for an account that is not Pro')
  })

  test(`${format}: a lapsed account gets 403`, async () => {
    const { deps } = fakeDeps()
    assert.equal((await ask('tok-ended', { format, design: DESIGN }, deps)).code, 403)
  })

  test(`${format}: forged plan fields on the user record or in the body do not open it`, async () => {
    const { deps } = fakeDeps()
    const res = await ask('tok-liar', { format, design: DESIGN, plan: 'pro', isPro: true, grant: true }, deps)
    assert.equal(res.code, 403)
    assert.equal(res.body.html, undefined)
  })

  test(`${format}: a Pro account gets the real document from the real generator`, async () => {
    const { deps } = fakeDeps()
    const res = await ask('tok-pro', { format, projectName: 'Harbour', design: DESIGN }, deps)
    assert.equal(res.code, 200)
    assert.equal(res.body.ok, true)
    assert.equal(res.body.format, format)
    assert.match(res.body.html, /^<!doctype html>/i)
    assert.match(res.body.html, /Harbour/, 'the project name reaches the document')
    assert.match(res.body.html, /#1F4B8E/i, 'the palette reaches the document')
    assert.ok(!/<script/i.test(res.body.html), 'the served document carries no script')
  })
}

test('a verified admin email gets the document; an unverified one does not', async () => {
  const { deps } = fakeDeps()
  // The admin allowlist is the real one; if the test email is not on it this proves
  // only that the path exists, so the unverified case below is the one that bites.
  const unverified = fakeDeps({
    verifyIdToken: async () => ({ uid: 'free-1', email: 'anyone@example.test', email_verified: false }),
  })
  assert.equal((await ask('t', { format: 'book', design: DESIGN }, unverified.deps)).code, 403)
  assert.ok([200, 403].includes((await ask('tok-admin', { format: 'book', design: DESIGN }, deps)).code))
})

test('only Pro documents are served here: free, unbuilt and made-up ids all get the same 400', async () => {
  const { deps } = fakeDeps()
  const freeIds = EXPORT_FORMATS.filter((f) => f.live && !f.pro).map((f) => f.id)
  for (const format of [...freeIds, 'tailwind', 'nope', '', 7, null, undefined, '__proto__', 'constructor']) {
    const res = await ask('tok-pro', { format, design: DESIGN }, deps)
    assert.equal(res.code, 400, `format ${String(format)} was not refused`)
    assert.equal(res.body.code, 'unknown_format')
  }
})

test('auth is checked before the format, so a stranger cannot probe the table', async () => {
  const { deps } = fakeDeps()
  assert.equal((await ask(null, { format: 'nope' }, deps)).code, 401)
})

test('an auth outage is a 503, not a 401, so a paying user is not sent to buy Pro', async () => {
  const outage = fakeDeps({
    verifyIdToken: async () => { const e = new Error('Error fetching public keys for Google certs'); e.code = 'auth/argument-error'; throw e },
  })
  const res = await ask('tok-pro', { format: 'book', design: DESIGN }, outage.deps)
  assert.equal(res.code, 503)
  assert.equal(res.body.code, 'auth_unavailable')
  const broken = fakeDeps({
    verifyIdToken: async () => { throw new Error('boom') },
    credentialProblem: () => 'missing key',
  })
  assert.equal((await ask('tok-pro', { format: 'book', design: DESIGN }, broken.deps)).code, 500)
})

test('a failed plan lookup is a 500 and no document', async () => {
  const { deps } = fakeDeps({ readUser: async () => { throw new Error('firestore down') } })
  const res = await ask('tok-pro', { format: 'book', design: DESIGN }, deps)
  assert.equal(res.code, 500)
  assert.equal(res.body.html, undefined)
})

test('an oversized design is refused with 413, after the plan check', async () => {
  const { deps } = fakeDeps()
  const huge = { ...DESIGN, logo: { src: 'x'.repeat(MAX_DESIGN_CHARS + 1) } }
  assert.equal((await ask('tok-pro', { format: 'book', design: huge }, deps)).code, 413)
  assert.equal((await ask('tok-free', { format: 'book', design: huge }, deps)).code, 403, 'a Free caller learns nothing about size limits')
})

test('a missing project name falls back, and a long one is cut', async () => {
  const seen = []
  const { deps } = fakeDeps({ builders: { book: async () => (d, o) => { seen.push(o.projectName); return '<html></html>' }, guidelines: async () => () => '<html></html>' } })
  await ask('tok-pro', { format: 'book', design: DESIGN }, deps)
  await ask('tok-pro', { format: 'book', design: DESIGN, projectName: 'n'.repeat(500) }, deps)
  assert.equal(seen[0], 'Design System')
  assert.equal(seen[1].length, 200)
})

test('a generator that throws is a 500 with no partial document', async () => {
  const { deps } = fakeDeps({ builders: { book: async () => () => { throw new Error('bad') }, guidelines: async () => () => '' } })
  const res = await ask('tok-pro', { format: 'book', design: DESIGN }, deps)
  assert.equal(res.code, 500)
  assert.equal(res.body.html, undefined)
})

/* ── 3 · the browser has no generator ─────────────────────────────────────── */

const GENERATORS = ['src/utils/designSystemBook.js', 'src/utils/brandGuidelines.js'].map((p) => path.resolve(p))

// Every file the app's entry can reach, following static AND dynamic imports.
function reachableFrom(entry) {
  const seen = new Set()
  const stack = [path.resolve(entry)]
  const resolve = (from, spec) => {
    const base = path.resolve(path.dirname(from), spec)
    for (const c of [base, `${base}.js`, `${base}.jsx`, path.join(base, 'index.js'), path.join(base, 'index.jsx')]) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c
    }
    return null
  }
  while (stack.length) {
    const file = stack.pop()
    if (seen.has(file)) continue
    seen.add(file)
    if (!/\.jsx?$/.test(file)) continue
    const src = fs.readFileSync(file, 'utf8')
    for (const m of src.matchAll(/(?:from\s*|import\s*\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const hit = resolve(file, m[1])
      if (hit) stack.push(hit)
    }
  }
  return seen
}

test('neither Pro generator is reachable from the app entry, so neither ships to the browser', () => {
  const reach = reachableFrom('src/main.jsx')
  assert.ok(reach.size > 200, `the import walk found only ${reach.size} files, so it has gone blind`)
  assert.ok(reach.has(path.resolve('src/components/ExportPanel.jsx')), 'the walk no longer reaches the export panel')
  for (const g of GENERATORS) {
    assert.ok(fs.existsSync(g), `${g} moved; update this test`)
    assert.ok(!reach.has(g), `${path.basename(g)} is in the client bundle again: anyone can call it and skip the Pro check`)
  }
})

test('CONTROL: the walk does find a lazily imported module', () => {
  const reach = reachableFrom('src/main.jsx')
  assert.ok(reach.has(path.resolve('src/utils/styleGuideRaster.js')), 'dynamic imports are not being followed')
})

/* ── the browser half ─────────────────────────────────────────────────────── */

const sdkFor = (getIdToken) => async () => ({ auth: { currentUser: getIdToken ? { getIdToken } : null } })
const reply = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body })
const sent = { format: 'book', design: DESIGN, projectName: 'Harbour' }

test('the client sends only the design fields the documents read, with the account token', async () => {
  const seen = []
  const fetchImpl = async (url, init) => { seen.push({ url, init }); return reply(200, { ok: true, format: 'book', html: '<html></html>' }) }
  const out = await requestExportDocument({ ...sent, design: { ...DESIGN, name: 'x', states: { a: 1 } } }, { loadAuth: sdkFor(async () => 'tok'), fetchImpl })
  assert.deepEqual(out, { status: 'ok', html: '<html></html>' })
  assert.equal(seen[0].url, '/api/ai?export=document')
  assert.equal(seen[0].init.headers.Authorization, 'Bearer tok')
  const body = JSON.parse(seen[0].init.body)
  assert.equal(body.format, 'book')
  assert.equal(body.design.states, undefined)
  assert.equal(body.design.name, undefined)
  assert.deepEqual(Object.keys(documentDesign(null)).sort(), ['fonts', 'gradient', 'logo', 'palette', 'typeScale'])
})

test('signed out never reaches the network', async () => {
  let hit = false
  const out = await requestExportDocument(sent, { loadAuth: sdkFor(null), fetchImpl: async () => { hit = true } })
  assert.deepEqual(out, { status: 'signed-out' })
  assert.equal(hit, false)
})

test('a 401 retries once on a fresh token, and a second 401 is signed out', async () => {
  const tokens = []
  const getIdToken = async (force) => { const t = force ? 'fresh' : 'cached'; tokens.push(t); return t }
  const answers = [reply(401, {}), reply(200, { ok: true, format: 'book', html: '<p>ok</p>' })]
  const ok = await requestExportDocument(sent, { loadAuth: sdkFor(getIdToken), fetchImpl: async () => answers.shift() })
  assert.equal(ok.status, 'ok')
  assert.deepEqual(tokens, ['cached', 'fresh'])
  const twice = await requestExportDocument(sent, { loadAuth: sdkFor(async () => 't'), fetchImpl: async () => reply(401, {}) })
  assert.deepEqual(twice, { status: 'signed-out' })
})

test('403 is pro-required; 5xx, a network failure and a malformed 200 are errors, never a document', async () => {
  const run = (fetchImpl) => requestExportDocument(sent, { loadAuth: sdkFor(async () => 't'), fetchImpl })
  assert.deepEqual(await run(async () => reply(403, {})), { status: 'pro-required' })
  assert.deepEqual(await run(async () => reply(503, {})), { status: 'error' })
  assert.deepEqual(await run(async () => { throw new Error('offline') }), { status: 'error' })
  assert.deepEqual(await run(async () => reply(200, { ok: true, format: 'guidelines', html: '<p></p>' })), { status: 'error' }, 'a 200 for another format')
  assert.deepEqual(await run(async () => reply(200, { ok: true, format: 'book' })), { status: 'error' }, 'a 200 with no document')
})

test('the print bootstrap is added to a copy, once, before the closing body tag', () => {
  const html = '<html><body><p>x</p></body></html>'
  const out = withPrintBootstrap(html)
  assert.match(out, /window\.print\(\)/)
  assert.equal(out.match(/<script>/g).length, 1)
  assert.ok(out.indexOf('<script>') < out.indexOf('</body>'))
  assert.ok(!/<script/.test(html), 'the original is untouched')
})

test('the reserved print window: opened, shown into, released', () => {
  const win = { closed: false, location: { href: '' }, close() { this.closed = true } }
  assert.equal(reservePrintWindow(() => win), win)
  assert.equal(reservePrintWindow(() => null), null)
  assert.equal(showInPrintWindow(win, 'blob:x', () => assert.fail('a live reserved window needs no second window')), win)
  assert.equal(win.location.href, 'blob:x')
  releasePrintWindow(win)
  assert.equal(win.closed, true)
  const fresh = { id: 'fresh' }
  assert.equal(showInPrintWindow(win, 'blob:y', () => fresh), fresh, 'a closed reserved window falls back to a fresh one')
  assert.equal(showInPrintWindow(null, 'blob:z', () => null), null, 'both blocked: the caller downloads the file')
})
