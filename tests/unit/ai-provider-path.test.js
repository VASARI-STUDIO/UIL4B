// The prompt tool runs OpenRouter as primary and Gemini as fallback, and the
// fallback is SILENT: a wrong, revoked or rate-limited OpenRouter key produces a
// perfectly good generation from Gemini, so the app looks healthy while the
// primary provider is dead. Nothing in the UI changes. Nothing is counted.
//
// WHAT THIS GUARDS. The only way anyone can tell the two apart is the `provider`
// field on the generation response, and the durable record that a failover
// happened is the provider-health counter plus one console.error line. All of
// it is easy to lose in a refactor, and losing any of it is invisible — which
// is the same fault one level up.
//
// docs/OWNER-ACTIONS.md tells the founder to read `provider` in devtools as THE
// procedure for closing `openrouter-path-verification`. These tests are what
// keep that procedure from quietly becoming impossible.
//
// ── WHAT CHANGED, AND WHY (2026-09-08) ──────────────────────────────────────
//
// The provider race used to be asserted by REGEX over the body of
// runGeneratePrompt: a match for `provider = 'openrouter'`, one for the
// `console.error('OpenRouter failed` inside a catch, an index comparison to
// prove callOpenRouter came before callGemini, and `configured:` values read
// out of the TASKS literal with a capture group. All of it proved the source
// CONTAINED those things. None of it proved a dead OpenRouter produced a
// response that said gemini, or that the health counter was written before the
// 502 went out, or that the alert did not fire twice in a day — the three
// things a refactor is most likely to break while leaving every string in
// place.
//
// api/ai.js is plain ESM, but it cannot be driven through its default export
// here: the handler verifies a Firebase ID token before it reaches any task,
// and runGeneratePrompt is not exported. So the module body is EXECUTED under
// node:vm with its eight _lib imports replaced by stubs that record what they
// are asked to do (a Firestore that keeps the documents it is handed, a fetch
// that answers per host and logs the order it was called in, a console that
// keeps its error lines) and with process.env under the test's control, which
// is what lets one file exercise "OpenRouter key missing", "both keys set" and
// "alerting unprovisioned" against the same source. Same harness shape as
// modal-contract.test.js and reduced-motion-resolution.test.js.
//
// The pure exports — buildProviderHealthPatch, summariseProviderHealth,
// describeProvider — were already imported for real and stay that way.
//
// WHAT STAYS A SOURCE ASSERTION, and why, one by one:
//   · src/pages/AiPromptGenerator.jsx and src/pages/Admin.jsx: .jsx cannot be
//     loaded here, and what is guarded on each is a WIRING LINE — that the
//     page keeps `data.provider` off the response, hands it to describeProvider,
//     and fetches the diagnostic behind the admin check. The behaviour on the
//     other side of each line (what describeProvider returns; what the
//     diagnostic refuses to a non-admin) is executed below, so the regex is
//     only ever proving the page still calls it. A helper that is right and
//     unwired is the failure this repository has already paid for.
//   · docs/OWNER-ACTIONS.md: the document is the artefact.
//   · the api/ route count: the files on disk are the artefact.
//   · firestore.rules: rules cannot be evaluated outside the emulator, and the
//     emulator layer is tests/rules/firestore-rules.test.js, which proves a
//     signed-in client and an anonymous one are both refused provider-health.
//     That suite needs a JDK and does not run under `npm run test:unit`, so the
//     one-line absence check is kept here so every unit run still checks the
//     property the code comment in api/ai.js relies on; the collection NAME is
//     pinned behaviourally below, from the path the executed write goes to.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { mailFrom, sendingDomainConfigured, REPLY_TO } from '../../api/_lib/mail.js'
import vm from 'node:vm'
import { timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto'

import { cleanKey } from '../../api/_lib/env.js'
import { stripJs } from '../helpers/strip-comments.js'

const AI_PATH = 'api/ai.js'

// ── Loading api/ai.js ───────────────────────────────────────────────────────

const aiSource = fs.readFileSync(path.join(process.cwd(), AI_PATH), 'utf8')

const INC = Symbol('FieldValue.increment(1)')
const OPENROUTER_KEY = 'sk-or-v1-0123456789abcdef0123456789abcdef'
const GEMINI_KEY = 'AIzaSy-gemini-0123456789abcdef'

/** A Response-like object for the fetch stub. */
const ok = (json) => ({ ok: true, status: 200, json: async () => json, text: async () => JSON.stringify(json) })
const fail = (status, text = '') => ({ ok: false, status, json: async () => ({}), text: async () => text })

const OPENROUTER_ANSWER = ok({ choices: [{ message: { content: 'A prompt from OpenRouter' } }] })
const GEMINI_ANSWER = ok({ candidates: [{ content: { parts: [{ text: 'A prompt from Gemini' }] } }] })

/**
 * Execute api/ai.js against stubs, and hand back the things a test drives —
 * runGeneratePrompt, the task registry, the HTTP handler — plus the ledgers the
 * stubs kept: every fetch in order, every Firestore write, every console.error.
 */
function loadAi({
  env = { OPENROUTER_API_KEY: OPENROUTER_KEY, GEMINI_API_KEY: GEMINI_KEY },
  openrouter = OPENROUTER_ANSWER,
  gemini = GEMINI_ANSWER,
  admin = { ok: true },
  credential = null,
} = {}) {
  let out = aiSource

  const rewrite = (re, to, what) => {
    assert.match(out, re,
      `this harness could not find ${what} in ${AI_PATH}. The file was refactored; `
      + 'update the rewrite so this test keeps executing the real source. Do NOT delete '
      + 'the test — it guards a failover that is silent by design.')
    out = out.replace(re, to)
  }

  // Every import, single- or multi-line. Non-greedy up to the first
  // ` from '…'` so a braced list stops at its own module specifier.
  const IMPORT = /^import\s[\s\S]*?\sfrom\s+'[^']+'\r?\n/m
  let imports = 0
  while (IMPORT.test(out)) { rewrite(IMPORT, '', `import #${imports + 1}`); imports += 1 }
  assert.ok(imports >= 6, `${AI_PATH} has ${imports} imports; the harness expected its _lib block`)
  assert.ok(!/^\s*import\s/m.test(out), `${AI_PATH} still has an import the harness did not strip`)

  rewrite(/^export default async function handler/m, 'async function handler', 'the default export')
  while (/^export (const|function) /m.test(out)) {
    rewrite(/^export (const|function) /m, '$1 ', 'a named export')
  }
  assert.ok(!/^\s*export\s/m.test(out), `${AI_PATH} still has an export the harness did not strip`)

  // ── the ledgers ──
  const fetches = []
  const writes = []
  const errors = []
  const store = new Map()        // Firestore documents by path
  const created = new Set()      // paths .create() has been called on

  const docRef = (docPath) => ({
    path: docPath,
    async set(data, opts) { writes.push({ path: docPath, data, opts }); store.set(docPath, { ...(store.get(docPath) || {}), ...data }) },
    async create(data) {
      if (created.has(docPath)) throw new Error(`${docPath} already exists`)
      created.add(docPath)
      writes.push({ path: docPath, data, create: true })
      store.set(docPath, data)
    },
    async get() { return { data: () => store.get(docPath) } },
  })
  const db = {
    doc: docRef,
    async getAll(...refs) { return refs.map((r) => ({ data: () => store.get(r.path) })) },
  }

  const sandbox = {
    console: { error: (...a) => errors.push(a.map(String).join(' ')), log() {}, warn() {} },
    process: { env: { ...env }, version: process.version },
    fetch: async (url, opts) => {
      fetches.push({ url, opts })
      if (url.startsWith('https://openrouter.ai/')) return openrouter
      if (url.startsWith('https://generativelanguage.googleapis.com/')) return gemini
      if (url.startsWith('https://api.resend.com/')) return ok({ id: 'email' })
      throw new Error(`unexpected fetch to ${url}`)
    },
    setTimeout, clearTimeout, AbortController, Buffer,
    // api/_lib stubs — only what the paths under test touch; the rest throw
    // so a test that wanders into them says so.
    cleanKey,
    nodeTimingSafeEqual,
    // api/_lib/mail.js — the outbound sender. Stubbed with the REAL helpers
    // rather than a literal so a change to the fallback shows up here: the
    // diagnostic prints mailFrom()'s answer, and the two failover tests below
    // assert an email was sent with it.
    mailFrom: () => mailFrom({ ...env }),
    sendingDomainConfigured: () => sendingDomainConfigured({ ...env }),
    REPLY_TO,
    adminDb: () => db,
    adminAuth: () => ({ verifyIdToken: async () => { throw new Error('not modelled here') } }),
    credentialProblem: () => credential,
    FieldValueIncrement: async () => INC,
    requireAdmin: async () => admin,
    planForUser: () => { throw new Error('not modelled here') },
    dailyLimitFor: () => { throw new Error('not modelled here') },
    monthlyLimitFor: () => { throw new Error('not modelled here') },
    modelFor: () => { throw new Error('not modelled here') },
    classifyGeminiFinish: () => { throw new Error('not modelled here') },
    BRAND_STARTER_TOOL_ID: 'brand-starter',
    MAX_PROMPT_CHARS: 0, MIN_PROMPT_CHARS: 0, PALETTE_MIN_ROLES: 0, PALETTE_MAX_ROLES: 0,
    BASE_MIN: 0, BASE_MAX: 0, RATIO_MIN: 0, RATIO_MAX: 0,
    fontChoiceList: () => [], generationBucket: () => ({}), exhaustedError: () => ({}),
    parseStarterJson: () => ({}), sanitizeBrandStarter: () => ({}), runMeteredTask: () => {},
  }

  const body = `(function(){\n${out}\n;return { runGeneratePrompt, TASKS, handler, PROVIDER_HEALTH };\n})()`
  const api = vm.runInNewContext(body, sandbox, { filename: AI_PATH })

  /** A res the way Vercel hands one to a route: chainable status().json(). */
  const response = () => ({
    statusCode: 200, headers: {}, body: undefined,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
    setHeader(k, v) { this.headers[k] = v },
  })

  const METER = { plan: { id: 'free' }, limit: 5, used: 1, monthUsed: 3, monthLimit: 60 }

  /** One generate-prompt call. Returns { result, res } — result is the body
   *  runGeneratePrompt returns on success, undefined when it answered via res. */
  const generate = async (description = 'a red bicycle at dusk') => {
    const res = response()
    const result = await api.runGeneratePrompt({ body: { description } }, res, METER)
    // On the error paths the function returns whatever res.json() returned —
    // the res itself here — so a generation is only a generation when it is
    // not the response object.
    return { result: result === res ? undefined : result, res }
  }

  return { ...api, fetches, writes, errors, store, response, generate }
}

const hosts = (ai) => ai.fetches.map((f) => new URL(f.url).hostname)
const healthWrites = (ai) => ai.writes.filter((w) => !w.create)

// ── The harness runs the real file ──────────────────────────────────────────

test('the harness executes api/ai.js, so nothing below is vacuous', () => {
  // Positive control. If the rewrites produced a module that defined nothing,
  // every "was not called" assertion below would pass on it.
  const ai = loadAi()
  assert.equal(typeof ai.runGeneratePrompt, 'function')
  assert.equal(typeof ai.handler, 'function')
  assert.deepEqual(Object.keys(ai.TASKS).sort(), ['alt-text', 'brand-starter', 'generate-prompt', 'scan-photo'],
    'the task registry changed shape — check the harness still reaches the real one')
})

// ── The race, EXECUTED ──────────────────────────────────────────────────────

test('THE ONE THAT MATTERS: a generation says which provider served it', async () => {
  // Without this field there is NO way, from outside the deployment, to tell a
  // healthy OpenRouter from a dead one — both return a good prompt. It is the
  // whole of the founder procedure in docs/OWNER-ACTIONS.md.
  const healthy = loadAi()
  const { result } = await healthy.generate()
  assert.ok(result, 'a healthy OpenRouter did not produce a generation')
  assert.equal(result.provider, 'openrouter', 'a response served by OpenRouter does not say so')
  assert.equal(result.prompt, 'A prompt from OpenRouter')

  const dead = loadAi({ openrouter: fail(401, '{"error":"invalid key"}') })
  const fallback = (await dead.generate()).result
  assert.ok(fallback, 'a dead OpenRouter took the tool down instead of failing over')
  assert.equal(fallback.provider, 'gemini', 'a response served by the Gemini fallback does not say so')
  assert.equal(fallback.prompt, 'A prompt from Gemini')

  assert.notEqual(result.provider, fallback.provider,
    'the two providers report the same name — the field could not distinguish them')
})

test('OpenRouter is the primary: it is tried first, and Gemini only if nothing came back', async () => {
  // If the order ever reverses, "primary provider" becomes a false statement in
  // the docs, the backlog and the module board — and every response would say
  // gemini, which reads as a failure that has not happened.
  const healthy = loadAi()
  await healthy.generate()
  assert.deepEqual(hosts(healthy), ['openrouter.ai'],
    'with OpenRouter healthy, Gemini was called anyway (or OpenRouter was not)')

  const dead = loadAi({ openrouter: fail(500, 'upstream down') })
  await dead.generate()
  assert.deepEqual(hosts(dead), ['openrouter.ai', 'generativelanguage.googleapis.com'],
    'Gemini must be attempted AFTER OpenRouter fails, and only then')
})

test('a missing OpenRouter key is not a failover, it is a configuration', async () => {
  // Only Gemini is configured: the tool still works, the response still names
  // its provider, and nothing is counted as a FAILURE — no primary was tried.
  const ai = loadAi({ env: { GEMINI_API_KEY: GEMINI_KEY } })
  const { result } = await ai.generate()
  assert.equal(result.provider, 'gemini')
  assert.deepEqual(hosts(ai), ['generativelanguage.googleapis.com'], 'OpenRouter was called without a key')
  const [write] = healthWrites(ai)
  assert.ok(write, 'the generation was not recorded at all')
  assert.equal(write.data.geminiOk, INC)
  assert.equal(write.data.openrouterFail, undefined, 'an untried primary was counted as a failure')
  assert.equal(write.data.lastFailoverAt, undefined, 'an untried primary was stamped as a failover')
})

test('a failover is not silent on the server, even though it is silent to the user', async () => {
  // One console.error is a thin record, but it is the ONLY immediate one: no
  // operator surface sees the request. Deleting it would leave the function
  // log with nothing to grep for.
  const ai = loadAi({ openrouter: fail(401, '{"error":"invalid key"}') })
  await ai.generate()
  assert.ok(ai.errors.some((line) => /OpenRouter failed/.test(line)),
    `the OpenRouter failure was swallowed without logging — a dead primary provider leaves no trace. Logged: ${JSON.stringify(ai.errors)}`)
  assert.ok(ai.errors.some((line) => /401/.test(line)), 'the log line does not carry the HTTP status')

  const healthy = loadAi()
  await healthy.generate()
  assert.deepEqual(healthy.errors, [], 'a healthy generation logged an error')
})

test('a failover is COUNTED, with the status, to the collection no client can reach', async () => {
  const ai = loadAi({ openrouter: fail(429, 'rate limited') })
  await ai.generate()
  const [write] = healthWrites(ai)
  assert.ok(write, 'nothing was written to provider health on a failover')
  assert.match(write.path, /^provider-health\/\d{4}-\d{2}-\d{2}$/,
    'the health counter is not a per-day document under provider-health/ — the rules test in '
    + 'tests/rules/firestore-rules.test.js proves THAT name is unreachable from a client, so a rename here must rename it there')
  assert.equal(write.path.split('/')[0], ai.PROVIDER_HEALTH)
  assert.equal(write.opts?.merge, true, 'the day document is overwritten rather than merged — a second request wipes the first')
  assert.equal(write.data.openrouterFail, INC)
  assert.equal(write.data.geminiOk, INC)
  assert.equal(write.data.lastFailoverStatus, '429', '429 vs 401 is out-of-credit vs wrong-key; the status is lost')
  assert.equal(write.data.lastFailoverServedBy, 'gemini')
})

test('the counter never persists the provider response body', async () => {
  // err.detail is the raw upstream body. Gateways have echoed the offending key
  // back inside one, and a health counter is not worth writing a credential
  // into Firestore for.
  const ai = loadAi({ openrouter: fail(401, `{"error":"invalid key ${OPENROUTER_KEY}"}`) })
  await ai.generate()
  const written = JSON.stringify(ai.writes.map((w) => w.data))
  assert.doesNotMatch(written, new RegExp(OPENROUTER_KEY), 'the raw provider response body was written to Firestore')
  assert.ok(!('lastFailoverDetail' in healthWrites(ai)[0].data), 'err.detail is persisted verbatim')
})

test('the outcome is recorded BEFORE the error returns, so an outage is not lost', async () => {
  // Both providers down is the case worth waking someone for, and it is also
  // the path that returns early — so it is the one most easily left uncounted.
  const ai = loadAi({ openrouter: fail(500, 'or down'), gemini: fail(503, 'gem down') })
  const { result, res } = await ai.generate()
  assert.equal(result, undefined, 'a total outage returned a generation')
  assert.equal(res.statusCode, 502)
  assert.match(res.body.error, /unavailable/)
  const [write] = healthWrites(ai)
  assert.ok(write, 'a request that no provider served was not recorded — the total outage is invisible')
  assert.equal(write.data.noProvider, INC)
  assert.equal(write.data.openrouterFail, INC)
  assert.equal(write.data.geminiFail, INC)
  assert.equal(write.data.lastFailoverServedBy, 'nothing')
})

test('a rejected key is reported as a rejected key, and a rate limit as a retry', async () => {
  const rejected = loadAi({ openrouter: fail(401, 'bad key'), gemini: fail(403, 'bad key') })
  const a = (await rejected.generate()).res
  assert.equal(a.statusCode, 502)
  assert.match(a.body.error, /rejected the API key \(403\)/)
  assert.match(a.body.error, /OPENROUTER_API_KEY/, 'the message does not name the env var to fix')

  const limited = loadAi({ openrouter: fail(500, 'down'), gemini: fail(429, 'slow down') })
  const b = (await limited.generate()).res
  assert.equal(b.statusCode, 429)
  assert.equal(b.body.retryAfter, 10)
})

// ── Which tasks each key unlocks, EXECUTED per configuration ────────────────

test('the prompt tool survives an OpenRouter outage, and the vision tools still require Gemini', () => {
  // This is also why an unauthenticated probe of /api/ai cannot isolate the
  // OpenRouter key: generate-prompt is configured when EITHER key is present,
  // so its 401 says nothing about which one.
  const configured = (env) => {
    const { TASKS } = loadAi({ env })
    return Object.fromEntries(Object.entries(TASKS).map(([name, t]) => [name, t.configured()]))
  }
  assert.deepEqual(configured({ OPENROUTER_API_KEY: OPENROUTER_KEY }), {
    'alt-text': false, 'scan-photo': false, 'generate-prompt': true, 'brand-starter': true,
  }, 'with only OpenRouter: the text tasks must work and the vision tasks must not')
  assert.deepEqual(configured({ GEMINI_API_KEY: GEMINI_KEY }), {
    'alt-text': true, 'scan-photo': true, 'generate-prompt': true, 'brand-starter': true,
  }, 'with only Gemini: everything must work — an OpenRouter outage would otherwise take the prompt tool down')
  assert.deepEqual(configured({}), {
    'alt-text': false, 'scan-photo': false, 'generate-prompt': false, 'brand-starter': false,
  })
  // The key's wrapping quotes and trailing newline — the deployment-dashboard
  // paste — are stripped before the presence check, or "set" means "broken".
  assert.equal(configured({ GEMINI_API_KEY: `"${GEMINI_KEY}"\n` })['alt-text'], true)
  assert.equal(configured({ GEMINI_API_KEY: '""' })['alt-text'], false, 'an empty quoted key counts as configured')
})

// ── The diagnostic, EXECUTED ────────────────────────────────────────────────

const diagRequest = (query = { diag: '1' }) => ({ method: 'GET', query, headers: {} })

test('the diagnostic reports that a key EXISTS, never what it is', async () => {
  // It also cannot report that a key WORKS, which is the point of the owner
  // action: "set (73 chars)" is what a revoked key looks like too.
  const ai = loadAi()
  const res = ai.response()
  await ai.handler(diagRequest(), res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.openrouterKey, `set (${OPENROUTER_KEY.length} chars)`)
  assert.equal(res.body.geminiKey, `set (${GEMINI_KEY.length} chars)`)
  const text = JSON.stringify(res.body)
  assert.doesNotMatch(text, new RegExp(OPENROUTER_KEY), 'the diagnostic returns the OpenRouter key itself')
  assert.doesNotMatch(text, new RegExp(GEMINI_KEY), 'the diagnostic returns the Gemini key itself')

  const bare = loadAi({ env: {} })
  const none = bare.response()
  await bare.handler(diagRequest(), none)
  assert.equal(none.body.openrouterKey, 'MISSING')
  assert.equal(none.body.geminiKey, 'MISSING')
})

test('the health verdict rides on the admin diagnostic, behind the gate it already has', async () => {
  // /api holds twelve route files and the Vercel limit on this plan is twelve,
  // so a health endpoint of its own is not available even in principle. The
  // diag GET is gated on a verified administrator, which is the precedent —
  // and the gate has to run BEFORE the health block is assembled, or the
  // seven-day failure history is readable by anyone.
  const asAdmin = loadAi()
  const res = asAdmin.response()
  await asAdmin.handler(diagRequest(), res)
  assert.ok(res.body.providerHealth, 'the diagnostic no longer returns the provider health block')
  assert.equal(res.body.providerHealth.status, 'no-data', 'an empty week must read as no-data, not ok')

  const asStranger = loadAi({ admin: { ok: false, status: 401 } })
  const refused = asStranger.response()
  await asStranger.handler(diagRequest(), refused)
  assert.equal(refused.statusCode, 404, 'a non-admin learns the diagnostic exists (or reads it)')
  assert.equal(refused.body.providerHealth, undefined, 'the health block is returned to a caller who is not the admin')
  assert.equal(refused.body.openrouterKey, undefined, 'the key presence is returned to a caller who is not the admin')
  assert.deepEqual(asStranger.writes, [], 'a refused diagnostic touched Firestore')

  const routes = fs.readdirSync(path.join(process.cwd(), 'api')).filter((f) => f.endsWith('.js'))
  assert.ok(routes.length <= 12,
    `/api holds ${routes.length} route files and Vercel allows 12 on this plan — a route was added, not reused`)
})

test('the break-glass exists only when DIAG_CODE is set, and a GET without ?diag is a 405', async () => {
  const shipped = loadAi({ admin: { ok: false, status: 401 } })
  const guessed = shipped.response()
  await shipped.handler(diagRequest({ diag: 'letmein' }), guessed)
  assert.equal(guessed.statusCode, 404, 'with DIAG_CODE unset, some code let a non-admin in')

  const provisioned = loadAi({
    env: { OPENROUTER_API_KEY: OPENROUTER_KEY, GEMINI_API_KEY: GEMINI_KEY, DIAG_CODE: 'letmein' },
    admin: { ok: false, status: 401 },
  })
  const opened = provisioned.response()
  await provisioned.handler(diagRequest({ diag: 'letmein' }), opened)
  assert.equal(opened.statusCode, 200, 'the break-glass code did not open the diagnostic when the admin credential is the thing that is broken')
  const wrong = provisioned.response()
  await provisioned.handler(diagRequest({ diag: 'letmeinx' }), wrong)
  assert.equal(wrong.statusCode, 404)

  const plain = loadAi()
  const nope = plain.response()
  await plain.handler({ method: 'GET', query: {}, headers: {} }, nope)
  assert.equal(nope.statusCode, 405)
})

// ── The alert, EXECUTED ─────────────────────────────────────────────────────

const ALERTING = {
  OPENROUTER_API_KEY: OPENROUTER_KEY, GEMINI_API_KEY: GEMINI_KEY,
  RESEND_API_KEY: 're_test_key', SUPPORT_NOTIFY_EMAIL: 'founder@example.com',
}
const resendCalls = (ai) => ai.fetches.filter((f) => f.url.startsWith('https://api.resend.com/'))

test('the alert is opt-in: unprovisioned, a failover sends nowhere and still counts', async () => {
  const ai = loadAi({ openrouter: fail(401, 'bad key') })
  await ai.generate()
  assert.deepEqual(resendCalls(ai), [], 'an unprovisioned alert path tried to send email')
  assert.equal(healthWrites(ai).length, 1, 'the counter was skipped because the alert was')
  assert.deepEqual(ai.errors.filter((l) => /alert/.test(l)), [], 'an unprovisioned alert path logged an error instead of staying silent')
})

test('provisioned, the FIRST failover of the day emails the operator and the second does not', async () => {
  const ai = loadAi({ env: ALERTING, openrouter: fail(401, 'bad key') })
  await ai.generate()
  assert.equal(resendCalls(ai).length, 1, 'the first failover of the day did not send the alert')
  const mail = JSON.parse(resendCalls(ai)[0].opts.body)
  assert.deepEqual(mail.to, ['founder@example.com'])
  assert.match(mail.subject, /OpenRouter/)
  assert.match(mail.text, /Gemini fallback answered/, 'the mail does not say the product still looks fine, which is the whole point')
  assert.match(mail.text, /401/, 'the mail does not carry the status the founder needs to choose a fix')
  assert.equal(resendCalls(ai)[0].opts.headers.Authorization, 'Bearer re_test_key')

  await ai.generate()
  await ai.generate()
  assert.equal(resendCalls(ai).length, 1,
    'a provider outage sends one email per REQUEST — the once-a-day marker is not being created with create()')
  assert.equal(healthWrites(ai).length, 3, 'the dedupe also swallowed the counter')
})

test('a healthy day sends nothing, and a total outage says the tool is down', async () => {
  const healthy = loadAi({ env: ALERTING })
  await healthy.generate()
  assert.deepEqual(resendCalls(healthy), [], 'a healthy generation emailed the operator')

  const down = loadAi({ env: ALERTING, openrouter: fail(500, 'or'), gemini: fail(500, 'gem') })
  await down.generate()
  assert.equal(resendCalls(down).length, 1)
  assert.match(JSON.parse(resendCalls(down)[0].opts.body).text, /DOWN/)
})

// ── the failover stops being invisible ───────────────────────────────────────
//
// Everything above pins that the DISTINCTION exists — that a response says which
// provider served it, and that the server counts it. None of it pins that anyone
// ever finds out in the product. Three surfaces say so, and each is guarded
// here: the badge on the result in the prompt tool, the durable per-day
// counters, and the verdict on the admin diagnostic. This file rather than
// api-abuse-hardening.test.js because this is the provider-path class, not the
// abuse class — the hardening file exists for surfaces reachable without
// credentials, and none of this is.

const {
  buildProviderHealthPatch,
  summariseProviderHealth,
} = await import('../../api/ai.js')
const { describeProvider, providerBadgeStyle } = await import('../../src/utils/aiProvider.js')

// Comments stripped, for the reason the top of this file already gives: these
// files EXPLAIN the failover at length, and an assertion that matched the
// explanation would stay green while guarding nothing. Caught in the act —
// swapping the admin fetch to a different endpoint left this suite green,
// because the comment above the fetch still named the old URL.
const srcFile = (f) => stripJs(fs.readFileSync(path.join(process.cwd(), 'src', f), 'utf8'))

// ── docs/OWNER-ACTIONS.md IS LOCAL-ONLY SINCE 2026-09-16 ────────────────────
// The repository is public and that document is the current-state list of what
// is not yet secured, so the founder keeps it on his machine and out of every
// clone (.gitignore carries the decision and the reason). The one test below
// that reads it SKIPS WITH A REASON where it is absent and runs in full where
// it is present — it must not go quietly green, because "the document does not
// contain the wrong sentence" is trivially true of a document that is not
// there, and the wrong sentence is the entire subject of the test.
const OWNER_ACTIONS = path.join(process.cwd(), 'docs/OWNER-ACTIONS.md')
const NO_OWNER_ACTIONS = !fs.existsSync(OWNER_ACTIONS)
  && 'docs/OWNER-ACTIONS.md is not in this checkout — it is local-only, by the founder '
  + 'decision of 2026-09-16 recorded in .gitignore — so the founder procedure this '
  + 'reads cannot be checked here.'

// ── the badge ────────────────────────────────────────────────────────────────

test('the two providers are visually distinguishable, or the badge proves nothing', () => {
  const primary = describeProvider('openrouter')
  const fallback = describeProvider('gemini')
  assert.equal(primary.fallback, false, 'the primary provider is labelled as a fallback')
  assert.equal(fallback.fallback, true, 'the Gemini fallback is not marked as one — it would read as the healthy state')
  assert.notEqual(primary.label, fallback.label,
    'both providers render the same text, so the badge cannot tell a healthy OpenRouter from a dead one')
  assert.match(fallback.label, /fallback/i,
    'the fallback badge does not say it is a fallback — "Gemini" alone means nothing to anyone who does not know the architecture')
  assert.notEqual(
    providerBadgeStyle(primary).color, providerBadgeStyle(fallback).color,
    'the healthy and failed states are the same colour — the badge would have to be read to be noticed')
})

test('the badge describes exactly the names the server can send', async () => {
  // The server's vocabulary and the badge's are two files. This drives one
  // into the other: whatever runGeneratePrompt reports, describeProvider must
  // know, or a real failover renders as "unknown provider" — which is louder
  // than silence, but wrong.
  const served = []
  for (const openrouter of [OPENROUTER_ANSWER, fail(401, 'x')]) {
    const ai = loadAi({ openrouter })
    served.push((await ai.generate()).result.provider)
  }
  for (const name of served) {
    const badge = describeProvider(name)
    assert.ok(badge, `the server reported provider ${JSON.stringify(name)} and the badge renders nothing for it`)
    assert.doesNotMatch(badge.label, /unrecognised/i,
      `the badge for ${name} fell through to the unrecognised-name branch — the server and the badge disagree on the vocabulary`)
    assert.equal(badge.fallback, name !== 'openrouter', `the badge marks ${name} wrongly as ${badge.fallback ? 'a fallback' : 'the primary'}`)
  }
})

test('an unrecognised provider fails loud, and a missing one renders nothing', () => {
  // If the server ever reports a third provider, treating the unknown name as
  // healthy would reinstate exactly the silence this item removed.
  const odd = describeProvider('some-new-gateway')
  assert.equal(odd.fallback, true, 'an unrecognised provider is presented as the healthy primary')
  assert.match(odd.label, /some-new-gateway/, 'the unrecognised provider name is hidden from the operator')
  for (const empty of [null, undefined, '', 0, {}]) {
    assert.equal(describeProvider(empty), null,
      'an absent provider produces a badge anyway, which would invent a status that was never reported')
  }
})

test('THE ONE THAT MATTERS: the prompt tool keeps `provider` and renders it', () => {
  // SOURCE ASSERTION, kept on purpose — see the header. The page used to
  // destructure data.prompt and data.platform and drop data.provider on the
  // floor. That single omission is what made a dead OpenRouter invisible
  // everywhere except a devtools Network tab. What is guarded here is the
  // wiring: that the page still carries the field and still hands it to
  // describeProvider, whose behaviour is executed above.
  //
  // WAS TWO PAGES. `pages/LandingPromptGenerator.jsx` was deleted in the
  // 2026-09-06 dead-source sweep — no importer, no route, absent from every
  // sourcemap in a production build — and this loop read it from disk by path,
  // so it failed with ENOENT rather than an assertion, which is how the
  // reference was proven load-bearing before it was removed.
  // AiPromptGenerator.jsx is deliberately NOT deleted: it is the only caller of
  // the OpenRouter path and docs/OWNER-ACTIONS.md §4.5 asks the founder to
  // choose between wiring it and cancelling OpenRouter. So this test still
  // guards the surface the item is about, on the one page that can reach it.
  for (const page of ['pages/AiPromptGenerator.jsx']) {
    const src = srcFile(page)
    assert.match(src, /provider:\s*data\.provider/,
      `${page} drops data.provider off the response again — the failover is invisible on this page`)
    assert.match(src, /describeProvider\(r\.provider\)/,
      `${page} stores the provider but never renders it, which is the same silence one step later`)
    assert.match(src, /data-testid="ai-provider-badge"/,
      `${page} renders the provider without a stable hook to find it by`)
  }
})

// ── the durable counters (pure) ──────────────────────────────────────────────

const NOW = '2026-09-03T10:00:00.000Z'

test('a failover is COUNTED, not just logged into a log nobody reads', () => {
  const patch = buildProviderHealthPatch(
    { openrouterFailed: Object.assign(new Error('OpenRouter 401'), { status: 401 }), geminiFailed: null, served: 'gemini' },
    INC, NOW,
  )
  assert.equal(patch.openrouterFail, INC, 'the OpenRouter failure is not counted')
  assert.equal(patch.geminiOk, INC, 'the fallback generation is not counted, so the two cannot be compared')
  assert.equal(patch.openrouterOk, undefined, 'a failed OpenRouter call was counted as a success')
  assert.equal(patch.lastFailoverStatus, '401', 'the HTTP status is lost — 401 vs 429 is wrong-key vs out-of-credit')
  assert.equal(patch.lastFailoverServedBy, 'gemini')
  assert.ok(patch.lastFailoverAt, 'a failover with no timestamp cannot be aged')
})

test('a healthy generation is counted too, or a rate can never be computed', () => {
  const patch = buildProviderHealthPatch({ openrouterFailed: null, geminiFailed: null, served: 'openrouter' }, INC, NOW)
  assert.equal(patch.openrouterOk, INC)
  assert.equal(patch.openrouterFail, undefined)
  assert.equal(patch.noProvider, undefined)
  assert.equal(patch.lastFailoverAt, undefined, 'a successful call stamped a failover time')
})

test('a TOTAL outage is counted as its own thing', () => {
  const patch = buildProviderHealthPatch(
    { openrouterFailed: new Error('OpenRouter 500'), geminiFailed: new Error('Gemini 503'), served: '' },
    INC, NOW,
  )
  assert.equal(patch.noProvider, INC, 'a request that no provider served was not recorded as an outage')
  assert.equal(patch.openrouterFail, INC)
  assert.equal(patch.geminiFail, INC)
  assert.equal(patch.lastFailoverServedBy, 'nothing')
})

test('the counters live where no client can reach them, and that needed no rules change', () => {
  // SOURCE ASSERTION, kept on purpose — see the header. firestore.rules
  // default-denies anything it does not match, which is the same property
  // daily-usage relies on. The emulator proves the refusal
  // (tests/rules/firestore-rules.test.js, "provider-health is unreachable");
  // this line keeps the property on every unit run, and the collection name it
  // relies on is pinned above from the path the executed write actually took.
  const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8')
  assert.doesNotMatch(rules, /provider-health/,
    'firestore.rules now matches provider-health — the counters are reachable from a client')
})

// ── the verdict an operator reads (pure) ─────────────────────────────────────

const day = (date, data) => ({ date, data })

test('a week of clean traffic reads as ok', () => {
  const v = summariseProviderHealth([day('2026-09-03', { openrouterOk: 12 }), day('2026-09-02', { openrouterOk: 8 })])
  assert.equal(v.status, 'ok')
  assert.equal(v.totals.openrouterOk, 20)
  assert.match(v.summary, /20/)
})

test('THE ONE THAT MATTERS: a dead primary reads as failing, in words that say what happened', () => {
  const v = summariseProviderHealth([
    day('2026-09-03', { openrouterFail: 9, geminiOk: 9, lastFailoverAt: '2026-09-03T09:00:00.000Z', lastFailoverStatus: '401' }),
    day('2026-09-02', { openrouterFail: 4, geminiOk: 4, lastFailoverAt: '2026-09-02T09:00:00.000Z', lastFailoverStatus: '401' }),
  ])
  assert.equal(v.status, 'failing',
    'every generation came from the fallback and the panel does not call that a failure')
  assert.match(v.summary, /EVERY generation came from the Gemini fallback/,
    'the verdict does not say the thing an operator has to understand: the app looked fine the whole time')
  assert.equal(v.lastFailover.at, '2026-09-03T09:00:00.000Z', 'the most recent failover is not the one reported')
  assert.equal(v.lastFailover.status, '401')
})

test('SILENCE IS NOT HEALTH: no traffic must never read as a pass', () => {
  // This is the exact trap the previous owner action fell into — "set (73
  // chars)" was read as "available" and a check that never ran was recorded as
  // a pass. An empty week must say so in as many words.
  const v = summariseProviderHealth([day('2026-09-03', {}), day('2026-09-02', null)])
  assert.equal(v.status, 'no-data', 'an untested week is being reported as healthy')
  assert.notEqual(v.status, 'ok')
  assert.match(v.summary, /not a pass/i,
    'the empty verdict does not warn that it proves nothing, so it will be read as a pass')
})

test('an intermittent primary is degraded, not ok and not failing', () => {
  const v = summariseProviderHealth([day('2026-09-03', { openrouterOk: 7, openrouterFail: 3, geminiOk: 3 })])
  assert.equal(v.status, 'degraded')
  assert.match(v.summary, /3 of 10/)
})

test('the panel says out loud when nothing will come and find the operator', () => {
  // Counters only work if someone looks. Whether anyone is TOLD depends on an
  // env pair the founder has to provision, so the absence is stated rather than
  // left as an empty field that reads like "fine".
  const off = summariseProviderHealth([day('2026-09-03', { openrouterOk: 1 })], { alerting: false })
  assert.match(off.alerting, /^OFF/, 'an unprovisioned alert path is not flagged as off')
  assert.match(off.alerting, /RESEND_API_KEY/, 'the panel does not name what has to be set')
  assert.match(off.alerting, /SUPPORT_NOTIFY_EMAIL/)
  const on = summariseProviderHealth([day('2026-09-03', { openrouterOk: 1 })], { alerting: true })
  assert.match(on.alerting, /^on/)

  // And the executed diagnostic reports the SAME thing from the real env.
  const provisioned = loadAi({ env: ALERTING })
  const res = provisioned.response()
  return provisioned.handler(diagRequest(), res).then(() => {
    assert.match(res.body.providerHealth.alerting, /^on/, 'a provisioned alert path is reported as off on the diagnostic')
  })
})

// ── the admin surface, and the founder's procedure ──────────────────────────

test('the Admin overview renders the verdict, and never on a page a non-admin can load', () => {
  // SOURCE ASSERTION, kept on purpose — see the header. Admin.jsx cannot be
  // loaded here; what is guarded is the wiring — that the page still fetches
  // THIS diagnostic, behind THIS check, and shows the sentence rather than a
  // light. What the diagnostic refuses to a non-admin is executed above.
  const admin = srcFile('pages/Admin.jsx')
  assert.match(admin, /\/api\/ai\?diag=1/, 'the admin page no longer reads the diagnostic')
  assert.match(admin, /AI provider health/, 'there is no provider-health card on the admin page')
  assert.match(admin, /isAdminUser \|\| tab !== 'overview'/,
    'the diagnostic is fetched without checking the viewer is the admin, or on every tab')
  assert.match(admin, /aiHealth\.summary/, 'the card shows a status light with no sentence explaining it')
})

test('the owner action does not tell the founder the diagnostic can close it', { skip: NO_OWNER_ACTIONS }, () => {
  // SOURCE ASSERTION over a document, which is the artefact. The previous
  // wording said "confirm the diagnostic now reports OpenRouter as available".
  // It cannot: it reports presence, which was already confirmed on 2026-08-07.
  // Following that instruction would have recorded a PASS for a check that
  // never ran — the silent failover reproduced in the runbook.
  const doc = fs.readFileSync(OWNER_ACTIONS, 'utf8')
  assert.ok(doc.length > 1000,
    `docs/OWNER-ACTIONS.md read as ${doc.length} bytes — an empty or truncated document `
    + 'satisfies every doesNotMatch below without satisfying anything')
  assert.doesNotMatch(doc, /diagnostic now reports OpenRouter as available/,
    'OWNER-ACTIONS.md asks for a confirmation the diagnostic is incapable of giving')
  assert.match(doc, /provider: "openrouter"/,
    'OWNER-ACTIONS.md must name the `provider` field and the value that means PASS — it is the only thing that closes this')
  assert.match(doc, /provider: "gemini"/,
    'OWNER-ACTIONS.md must say what a silent failover looks like, or the founder cannot recognise the failure')
})
