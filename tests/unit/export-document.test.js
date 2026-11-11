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
import { serveExportDocument, BUILDERS, MAX_DESIGN_CHARS, MAX_COLOURS } from '../../api/_lib/exportDocument.js'
import { proOnlyFormats, EXPORT_FORMATS } from '../../src/config/exportFormats.js'
import {
  requestExportDocument, documentDesign, withPrintBootstrap, reservePrintWindow, showInPrintWindow, releasePrintWindow,
} from '../../src/utils/exportDocument.js'

// The Pro documents the server builds. The app-ready bundle is Pro too, but it is
// zipped in the browser (utils/appBundle.js), so it has no server builder.
const CLIENT_BUILT = new Set(['app-bundle'])
const serverPro = () => proOnlyFormats().filter((f) => !CLIENT_BUILT.has(f.id))

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
  for (const f of serverPro()) {
    table[f.id] = async () => { loaded.push(f.id); return () => `<html>${f.id}</html>` }
  }
  return { loaded, table }
}

test('every Pro format has a server builder, and the builders are exactly the Pro formats', () => {
  const pro = serverPro().map((f) => f.id).sort()
  assert.ok(pro.length >= 2, 'the export table lost its Pro documents')
  assert.deepEqual(Object.keys(BUILDERS).sort(), pro,
    'a Pro format with no server builder cannot be exported, and a builder for a non-Pro format would be dead code')
})

for (const format of serverPro().map((f) => f.id)) {
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
  // The allowlist is read from ADMIN_EMAILS on every call, so the test sets its own
  // and puts the old value back: the answer no longer depends on the machine's env.
  const before = process.env.ADMIN_EMAILS
  process.env.ADMIN_EMAILS = 'admin@example.test'
  try {
    const { deps } = fakeDeps()
    const verified = await ask('tok-admin', { format: 'book', design: DESIGN }, deps)
    assert.equal(verified.code, 200, 'a verified email on the allowlist is Pro, whatever the account record says')
    assert.equal(verified.body.ok, true)
    assert.equal(verified.headers.Vary, 'Authorization', 'the answer depends on who asked, so a cache must key on the token')

    // The same address, unverified: the allowlist alone is not enough.
    const unverified = fakeDeps({
      verifyIdToken: async () => ({ uid: 'free-1', email: 'admin@example.test', email_verified: false }),
    })
    const refused = await ask('t', { format: 'book', design: DESIGN }, unverified.deps)
    assert.equal(refused.code, 403)
    assert.equal(refused.body.html, undefined)

    // A verified email that is not on the list is just a Free account.
    const stranger = fakeDeps({
      verifyIdToken: async () => ({ uid: 'free-1', email: 'anyone@example.test', email_verified: true }),
    })
    assert.equal((await ask('t', { format: 'book', design: DESIGN }, stranger.deps)).code, 403)
  } finally {
    if (before === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = before
  }
})

test('every response carries Vary: Authorization, refusals included', async () => {
  const { deps } = fakeDeps()
  for (const [token, body] of [[null, { format: 'book' }], ['tok-free', { format: 'book' }], ['tok-pro', { format: 'nope' }]]) {
    assert.equal((await ask(token, body, deps)).headers.Vary, 'Authorization')
  }
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

// A builder table that records the template each build was asked for.
function templateSpy() {
  const loaded = []
  const built = []
  const table = {}
  for (const f of serverPro()) {
    table[f.id] = async () => {
      loaded.push(f.id)
      return (d, o) => { built.push({ format: f.id, template: o.template }); return `<html>${f.id}</html>` }
    }
  }
  return { loaded, built, table }
}

const DEFAULT_TEMPLATES = { book: 'specification', guidelines: 'presentation' }
// Every live id per Pro format (src/config/exportTemplates.js, listed by hand here so a stray live flag is caught).
const LIVE_TEMPLATES = { book: ['specification', 'monograph', 'atlas'], guidelines: ['presentation', 'poster', 'grid'] }

test('a missing, null or empty template is the format\'s default, and the reply says which', async () => {
  assert.deepEqual(Object.keys(DEFAULT_TEMPLATES).sort(), Object.keys(BUILDERS).sort(), 'a Pro format has no default named here')
  for (const [format, expected] of Object.entries(DEFAULT_TEMPLATES)) {
    for (const body of [{}, { template: undefined }, { template: null }, { template: '' }]) {
      const { built, table } = templateSpy()
      const { deps } = fakeDeps({ builders: table })
      const res = await ask('tok-pro', { format, design: DESIGN, ...body }, deps)
      assert.equal(res.code, 200, `${format} ${JSON.stringify(body)}`)
      assert.equal(res.body.template, expected, `${format}: the reply names the template that was used`)
      assert.deepEqual(built, [{ format, template: expected }], `${format}: the generator is handed the resolved id`)
    }
  }
})

test('a live template id is served and echoed back', async () => {
  for (const [format, id] of Object.entries(DEFAULT_TEMPLATES)) {
    const { built, table } = templateSpy()
    const { deps } = fakeDeps({ builders: table })
    const res = await ask('tok-pro', { format, design: DESIGN, template: id }, deps)
    assert.equal(res.code, 200)
    assert.equal(res.body.template, id)
    assert.equal(built[0].template, id)
  }
})

test('every live template id is served and echoed back, and an id live for the other format is not', async () => {
  for (const [format, ids] of Object.entries(LIVE_TEMPLATES)) {
    for (const id of ids) {
      const { built, table } = templateSpy()
      const { deps } = fakeDeps({ builders: table })
      const res = await ask('tok-pro', { format, design: DESIGN, template: id }, deps)
      assert.equal(res.code, 200, `${format} ${id}`)
      assert.equal(res.body.template, id, `${format} ${id}`)
      assert.deepEqual(built, [{ format, template: id }], `${format} ${id}`)
    }
  }
  const other = { book: 'poster', guidelines: 'atlas' }
  for (const [format, template] of Object.entries(other)) {
    const { deps } = fakeDeps({ builders: templateSpy().table })
    assert.equal((await ask('tok-pro', { format, design: DESIGN, template }, deps)).code, 400, `${format} ${template}`)
  }
})

test('the real generators serve their default template and say so', async () => {
  const { deps } = fakeDeps()
  for (const [format, expected] of Object.entries(DEFAULT_TEMPLATES)) {
    const res = await ask('tok-pro', { format, projectName: 'Harbour', design: DESIGN, template: expected }, deps)
    assert.equal(res.code, 200)
    assert.equal(res.body.template, expected)
    assert.match(res.body.html, /^<!doctype html>/i)
  }
})

test('a template that is not live for the format is a 400 unknown_template and no generator loads', async () => {
  const bad = [
    'nope', 'Specification', ' specification', 'specification ', 'poster', 'presentation', 'studio',
    'grid', 'monograph', 'atlas', 'Poster', 'grid ', ' poster',
    'constructor', '__proto__', 'toString', 'hasOwnProperty',
    { id: 'specification' }, { toString: () => 'specification' }, 7, 0, true, false, ['specification'], [],
  ]
  for (const format of Object.keys(DEFAULT_TEMPLATES)) {
    for (const template of bad) {
      // Each id above is live for the format that owns it, and only that one.
      if (LIVE_TEMPLATES[format].includes(template)) continue
      const { loaded, table } = templateSpy()
      const { deps } = fakeDeps({ builders: table })
      const res = await ask('tok-pro', { format, design: DESIGN, template }, deps)
      const label = `${format} ${JSON.stringify(template)}`
      assert.equal(res.code, 400, label)
      assert.equal(res.body.code, 'unknown_template', label)
      assert.equal(res.body.html, undefined, label)
      assert.deepEqual(loaded, [], `${label}: a generator ran for a template it should have refused`)
    }
  }
})

test('the template is checked after the plan: Free gets 403 and learns nothing, signed-out gets 401', async () => {
  for (const template of ['nope', { a: 1 }, 7, ['book']]) {
    const { loaded, table } = templateSpy()
    const { deps } = fakeDeps({ builders: table })
    const free = await ask('tok-free', { format: 'book', design: DESIGN, template }, deps)
    assert.equal(free.code, 403, JSON.stringify(template))
    assert.equal(free.body.code, 'pro_required')
    assert.equal(free.body.html, undefined)
    const ended = await ask('tok-ended', { format: 'guidelines', design: DESIGN, template }, deps)
    assert.equal(ended.code, 403)
    const out = await ask(null, { format: 'book', design: DESIGN, template }, deps)
    assert.equal(out.code, 401)
    assert.deepEqual(loaded, [], 'no generator is loaded for a caller who is not Pro')
  }
})

test('CONTROL: the same request with a good template is served, so the 400s above are about the template', async () => {
  const { table } = templateSpy()
  const { deps } = fakeDeps({ builders: table })
  assert.equal((await ask('tok-pro', { format: 'book', design: DESIGN, template: 'nope' }, deps)).code, 400)
  assert.equal((await ask('tok-pro', { format: 'book', design: DESIGN, template: 'specification' }, deps)).code, 200)
})

test('more than MAX_COLOURS colours is a 400 too_many_colours, before any generator loads and after the plan check', async () => {
  // MAX_DESIGN_CHARS bounds the request, not the document: 5,000 colours make a 17 MB book.
  assert.equal(MAX_COLOURS, 200)
  const colours = (n) => Array.from({ length: n }, (_, i) => `#${(i + 1).toString(16).padStart(6, '0').toUpperCase()}`)
  const { loaded, table } = spyBuilders()
  const { deps } = fakeDeps({ builders: table })

  const over = { ...DESIGN, palette: { ...DESIGN.palette, colors: colours(MAX_COLOURS + 1) } }
  for (const format of serverPro().map((f) => f.id)) {
    const res = await ask('tok-pro', { format, design: over }, deps)
    assert.equal(res.code, 400, `${format}: ${MAX_COLOURS + 1} colours were not refused`)
    assert.equal(res.body.code, 'too_many_colours')
    assert.equal(res.body.html, undefined)
  }
  assert.deepEqual(loaded, [], 'a generator ran for a palette it should have refused')

  // The same cap on the gradient's stops, which the book also lays out one by one.
  const stops = colours(MAX_COLOURS + 1).map((color, i) => ({ color, position: i }))
  const overStops = { ...DESIGN, gradient: { stops } }
  const res = await ask('tok-pro', { format: 'book', design: overStops }, deps)
  assert.equal(res.code, 400)
  assert.equal(res.body.code, 'too_many_colours')

  // Junk entries count too: padding with non-colours must not dodge the cap.
  const junk = { ...DESIGN, palette: { colors: Array.from({ length: MAX_COLOURS + 1 }, () => 'x') } }
  assert.equal((await ask('tok-pro', { format: 'book', design: junk }, deps)).code, 400)

  // After the plan check, so a Free caller learns nothing about the limit.
  assert.equal((await ask('tok-free', { format: 'book', design: over }, deps)).code, 403)

  // CONTROL: exactly MAX_COLOURS is served, so the 400 above is the cap and not a broken request.
  const exact = { ...DESIGN, palette: { ...DESIGN.palette, colors: colours(MAX_COLOURS) } }
  const fine = await ask('tok-pro', { format: 'book', design: exact }, deps)
  assert.equal(fine.code, 200)
  assert.deepEqual(loaded, ['book'])
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

// The generators and the template modules they pick from. A template is the layout of
// the paid document, so one the app can reach would ship it just as the generator would.
const GENERATORS = [
  'src/utils/designSystemBook.js', 'src/utils/brandGuidelines.js',
  'src/utils/exportTemplates/book/index.js', 'src/utils/exportTemplates/book/specification.js',
  'src/utils/exportTemplates/guidelines/index.js', 'src/utils/exportTemplates/guidelines/presentation.js',
  'src/utils/exportTemplates/guidelines/poster.js', 'src/utils/exportTemplates/guidelines/grid.js', 'src/utils/exportTemplates/guidelines/notes.js',
].map((p) => path.resolve(p))

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
  assert.ok(reach.has(path.resolve('src/components/export/ExportDialog.jsx')), 'the walk no longer reaches the export dialog')
  assert.ok(reach.has(path.resolve('src/hooks/useExportRunner.js')), 'the walk no longer reaches the export engine')
  for (const g of GENERATORS) {
    assert.ok(fs.existsSync(g), `${g} moved; update this test`)
    assert.ok(!reach.has(g), `${path.basename(g)} is in the client bundle again: anyone can call it and skip the Pro check`)
  }
})

test('CONTROL: the walk does find a lazily imported module', () => {
  const reach = reachableFrom('src/main.jsx')
  assert.ok(reach.has(path.resolve('src/utils/styleGuideRaster.js')), 'dynamic imports are not being followed')
})

// The import walk above reads source text, so it cannot see an import written
// another way (import.meta.glob, a computed specifier) or one a build plugin adds.
// The built files are the truth: no shipped script may contain a line only a
// generator's output has. Skips when there is no build, like the other dist tests.
const DIST = path.join(process.cwd(), process.env.DIST_DIR || 'dist')
const builtAssets = path.join(DIST, 'assets')
const noBuild = !fs.existsSync(builtAssets) && 'run a build first (see DIST_DIR)'

// Text that each generator writes into its document and that nothing else in the app has.
const MARKERS = [
  { file: 'src/utils/designSystemBook.js', text: ' | Design System</title>' },
  { file: 'src/utils/exportTemplates/guidelines/presentation.js', text: '<span class="cv-name">' },
  { file: 'src/utils/exportTemplates/guidelines/poster.js', text: '<header class="pn-top">' },
  { file: 'src/utils/exportTemplates/guidelines/grid.js', text: '<span class="mh-name">' },
  { file: 'src/utils/exportTemplates/book/specification.js', text: '<span class="cv-mark">Design system</span>' },
]

test('CONTROL: each bundle marker is really in its generator', () => {
  for (const m of MARKERS) {
    assert.ok(fs.readFileSync(m.file, 'utf8').includes(m.text), `${m.file} no longer contains ${JSON.stringify(m.text)}; pick a new marker`)
  }
})

test('the built bundle carries neither generator, whichever way it was imported', { skip: noBuild }, () => {
  const scripts = fs.readdirSync(builtAssets).filter((f) => /\.(m?js|html)$/.test(f))
  assert.ok(scripts.length > 5, `only ${scripts.length} built scripts found in ${builtAssets}; the scan has gone blind`)
  for (const f of scripts) {
    const code = fs.readFileSync(path.join(builtAssets, f), 'utf8')
    for (const m of MARKERS) {
      assert.ok(!code.includes(m.text), `${f} contains the text of ${m.file}: that generator is in the browser bundle`)
    }
  }
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
  assert.deepEqual(Object.keys(documentDesign(null)).sort(), ['fonts', 'gradient', 'identity', 'logo', 'palette', 'typeScale'])
})

test('of the identity only the description is sent: trimmed, folded, capped at 280, and absent when blank', () => {
  const long = 'x'.repeat(400)
  assert.deepEqual(documentDesign({ identity: { name: 'Harbour', description: '  A calm\n  harbour.  ', extra: 1 } }).identity, { description: 'A calm harbour.' })
  assert.equal(documentDesign({ identity: { description: long } }).identity.description.length, 280)
  for (const identity of [undefined, null, 'text', { description: '   ' }, { description: 7 }, { name: 'Only a name' }]) {
    assert.equal(documentDesign({ identity }).identity, undefined, JSON.stringify(identity))
  }
})

test('a description sent to the server reaches the Grid cover, escaped, and nothing else of the identity does', async () => {
  const { deps } = fakeDeps()
  const description = 'Calm <b>water</b> & "light"'
  const res = await ask('tok-pro', {
    format: 'guidelines', template: 'grid', projectName: 'Harbour',
    design: { ...DESIGN, identity: { name: 'SECRET-NAME', description, extra: 'SECRET-EXTRA' } },
  }, deps)
  assert.equal(res.code, 200)
  assert.ok(res.body.html.includes('<p class="cv-stand">Calm &lt;b&gt;water&lt;/b&gt; &amp; &quot;light&quot;</p>'), 'the escaped description is the cover standfirst')
  assert.ok(!res.body.html.includes('<b>water</b>'), 'the description is never raw markup')
  assert.ok(!res.body.html.includes('SECRET-'), 'only the description is read from the identity')
  const capped = await ask('tok-pro', { format: 'guidelines', template: 'grid', design: { ...DESIGN, identity: { description: `${'a'.repeat(280)}OVER` } } }, deps)
  assert.ok(capped.body.html.includes(`<p class="cv-stand">${'a'.repeat(280)}</p>`) && !capped.body.html.includes('OVER'), 'capped at 280 on the server too')
  const none = await ask('tok-pro', { format: 'guidelines', template: 'grid', design: DESIGN }, deps)
  assert.ok(!none.body.html.includes('cv-stand">'), 'no description, no standfirst')
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

test('413 and 400 too_many_colours get their own statuses; any other 400 stays a plain error', async () => {
  const run = (fetchImpl) => requestExportDocument(sent, { loadAuth: sdkFor(async () => 't'), fetchImpl })
  assert.deepEqual(await run(async () => reply(413, { code: 'design_too_large' })), { status: 'too-large' })
  assert.deepEqual(await run(async () => reply(413, null)), { status: 'too-large' }, 'the platform\'s own 413 carries no JSON')
  assert.deepEqual(await run(async () => reply(400, { code: 'too_many_colours' })), { status: 'too-many-colours' })
  assert.deepEqual(await run(async () => reply(400, { code: 'unknown_format' })), { status: 'error' })
  assert.deepEqual(await run(async () => ({ status: 400, ok: false, json: async () => { throw new Error('not json') } })), { status: 'error' })
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

test('the gradient goes to the server as colours and positions only, without the tool\'s lock flags', () => {
  const sent = documentDesign({
    gradient: {
      stops: [{ color: '#112233', position: 0, lockColour: true, lockPosition: false }, { color: '#445566', position: 100, lockColour: false, lockPosition: true }],
      angle: 90, type: 'Linear',
    },
  }).gradient
  assert.deepEqual(sent, { stops: [{ color: '#112233', position: 0 }, { color: '#445566', position: 100 }], angle: 90, type: 'Linear' })
  assert.equal(documentDesign({}).gradient, undefined, 'no gradient stays no gradient')
})
