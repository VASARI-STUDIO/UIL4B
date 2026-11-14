// The CSP violation collector (api/_lib/cspReport.js, served as
// /api/support?report=csp) and the limitRequest helper the rate-limited routes use.
//
// /api is held at twelve functions by tests/unit/account-deletion.test.js, so the
// collector is a handler inside api/support.js rather than a file of its own.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { handleCspReport, CSP_REPORT_PATH, CSP_REPORT_LIMIT } from '../../api/_lib/cspReport.js'
import supportHandler from '../../api/support.js'
import { limitRequest } from '../../api/_lib/rateLimit.js'

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8'))

function limiterDb({ error = null } = {}) {
  const docs = new Map()
  return {
    collection: () => ({ doc: (id) => ({ id }) }),
    runTransaction: async (fn) => {
      if (error) throw error
      return fn({
        get: async ({ id }) => ({ exists: docs.has(id), data: () => docs.get(id) }),
        set: ({ id }, value, opts) => docs.set(id, opts?.merge ? { ...docs.get(id), ...value } : value),
      })
    },
  }
}

function fakeRes() {
  const res = {
    statusCode: null, body: undefined, headers: {}, ended: false,
    setHeader(k, v) { res.headers[k] = v },
    status(code) { res.statusCode = code; return res },
    json(b) { res.body = b; res.ended = true; return res },
    end() { res.ended = true; return res },
  }
  return res
}

const req = (over = {}) => ({
  method: 'POST',
  headers: { 'content-type': 'application/csp-report', 'x-vercel-forwarded-for': '203.0.113.9' },
  body: JSON.stringify({ 'csp-report': {} }),
  ...over,
})

async function run(request, db = limiterDb()) {
  const res = fakeRes()
  const warnings = []
  const original = console.warn
  console.warn = (...a) => warnings.push(a)
  try { await handleCspReport(request, res, { getDb: () => db }) } finally { console.warn = original }
  return { res, warnings }
}

test('the collector path in vercel.json headers is the one the handler answers on', () => {
  assert.equal(CSP_REPORT_PATH, '/api/support?report=csp')
  const csp = config.headers.flatMap((r) => r.headers).find((h) => h.key === 'Content-Security-Policy-Report-Only').value
  assert.ok(csp.includes(`report-uri ${CSP_REPORT_PATH}`))
})

test('a legacy report-uri report is logged as a compact summary and answered 204', async () => {
  const body = { 'csp-report': {
    'blocked-uri': 'https://evil.example/x.js?token=secret#frag',
    'violated-directive': 'script-src-elem',
    'effective-directive': 'script-src-elem',
    'document-uri': 'https://uil4b.com/discover?q=private',
    'original-policy': 'default-src \'self\'; a very long policy',
  } }
  const { res, warnings } = await run(req({ body: JSON.stringify(body) }))
  assert.equal(res.statusCode, 204)
  assert.deepEqual(warnings, [['csp-report', {
    blocked: 'https://evil.example/x.js',
    directive: 'script-src-elem',
    document: 'https://uil4b.com/discover',
  }]])
})

test('a Reporting API batch is read too, and a pre-parsed body works', async () => {
  const body = [
    { type: 'csp-violation', body: { blockedURL: 'inline', effectiveDirective: 'script-src', documentURL: 'https://uil4b.com/' } },
    { type: 'deprecation', body: { id: 'x' } },
  ]
  const { res, warnings } = await run(req({ headers: { ...req().headers, 'content-type': 'application/reports+json; charset=utf-8' }, body }))
  assert.equal(res.statusCode, 204)
  assert.deepEqual(warnings, [['csp-report', { blocked: 'inline', directive: 'script-src', document: 'https://uil4b.com/' }]])
})

test('any other method is a 405 that names POST', async () => {
  for (const method of ['GET', 'PUT', 'DELETE', 'OPTIONS']) {
    const { res } = await run(req({ method }))
    assert.equal(res.statusCode, 405, method)
    assert.equal(res.headers.Allow, 'POST')
  }
})

test('an unexpected content type is a 415, and an oversize body is a 413', async () => {
  const wrong = await run(req({ headers: { ...req().headers, 'content-type': 'text/plain' } }))
  assert.equal(wrong.res.statusCode, 415)

  const big = await run(req({ body: JSON.stringify({ 'csp-report': { 'blocked-uri': 'x'.repeat(20000) } }) }))
  assert.equal(big.res.statusCode, 413)

  const declared = await run(req({ headers: { ...req().headers, 'content-length': '99999' } }))
  assert.equal(declared.res.statusCode, 413)
})

test('a body that is not JSON is a 400 and logs nothing', async () => {
  const { res, warnings } = await run(req({ body: '{not json' }))
  assert.equal(res.statusCode, 400)
  assert.equal(warnings.length, 0)
})

test('fields are cut to a fixed length and at most ten entries are logged', async () => {
  const many = Array.from({ length: 25 }, () => ({
    type: 'csp-violation',
    body: { blockedURL: 'a'.repeat(500), effectiveDirective: 'img-src', documentURL: 'https://uil4b.com/' },
  }))
  const { warnings } = await run(req({ headers: { ...req().headers, 'content-type': 'application/reports+json' }, body: many }))
  assert.equal(warnings.length, 10)
  assert.equal(warnings[0][1].blocked.length, 200)
})

test('the collector is rate limited per address, and the verdict is a 429 with Retry-After', async () => {
  const db = limiterDb()
  let last
  for (let i = 0; i <= CSP_REPORT_LIMIT.limit; i += 1) last = await run(req(), db)
  assert.equal(last.res.statusCode, 429)
  assert.ok(Number(last.res.headers['Retry-After']) >= 1)
  assert.equal(last.warnings.length, 0)

  const other = await run(req({ headers: { ...req().headers, 'x-vercel-forwarded-for': '198.51.100.1' } }), db)
  assert.equal(other.res.statusCode, 204, 'a different address has its own allowance')
})

test('api/support.js routes ?report=csp to the collector and everything else to the form', async () => {
  const res = fakeRes()
  await supportHandler({ method: 'GET', query: { report: 'csp' }, headers: {} }, res)
  assert.equal(res.statusCode, 405)
  assert.equal(res.headers.Allow, 'POST')
})

// ── limitRequest ─────────────────────────────────────────────────────────────

const LIMIT = { bucket: 'limit-request-test', limit: 2, windowMs: 60000 }

test('limitRequest lets calls through up to the limit, then answers 429 and says so', async () => {
  const db = limiterDb()
  const request = { headers: { 'x-vercel-forwarded-for': '203.0.113.20' } }
  for (let i = 0; i < LIMIT.limit; i += 1) {
    const res = fakeRes()
    assert.equal(await limitRequest(request, res, () => db, LIMIT), false)
    assert.equal(res.ended, false, 'an allowed call must not have been answered')
  }
  const res = fakeRes()
  assert.equal(await limitRequest(request, res, () => db, LIMIT), true)
  assert.equal(res.statusCode, 429)
  assert.ok(res.headers['Retry-After'])
})

test('limitRequest fails open when the database cannot be opened or read', async () => {
  const request = { headers: { 'x-vercel-forwarded-for': '203.0.113.21' } }
  const original = console.error
  console.error = () => {}
  try {
    const res = fakeRes()
    assert.equal(await limitRequest(request, res, () => { throw new Error('no credentials') }, LIMIT), false)
    assert.equal(await limitRequest(request, res, () => limiterDb({ error: Object.assign(new Error('outage'), { code: 'unavailable' }) }), LIMIT), false)
    assert.equal(res.ended, false)
  } finally { console.error = original }
})

test('limitRequest lets a request through that has no address to count', async () => {
  const res = fakeRes()
  assert.equal(await limitRequest({ headers: {} }, res, () => limiterDb(), LIMIT), false)
})

test('every route that handles a credential or a payment is rate limited', () => {
  for (const file of ['verify-admin', 'create-portal', 'delete-account', 'checkout-status']) {
    const src = fs.readFileSync(path.join(process.cwd(), 'api', `${file}.js`), 'utf8')
    assert.match(src, /await limitRequest\(req, res, adminDb,/, `${file} has no rate limit`)
  }
  const checkout = fs.readFileSync(path.join(process.cwd(), 'api/create-checkout.js'), 'utf8')
  assert.match(checkout, /checkoutRateLimit/, 'create-checkout lost its rate limit')
})
