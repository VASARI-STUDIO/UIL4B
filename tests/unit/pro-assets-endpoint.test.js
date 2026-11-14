// GET /api/ai?proAsset=<kind>&id=<id>: the Pro prompt previews, by entitlement
// (api/_lib/library/proAssets.js). The auth seams and the preview data are
// injected; nothing here reaches Firebase or the generated modules.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serveProAsset, PRO_ASSET_KINDS } from '../../api/_lib/library/proAssets.js'

function fakeRes() {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(n, v) { res.headers[n] = v },
    status(c) { res.statusCode = c; return res },
    json(b) { res.body = b; return res },
    end(b) { res.body = b; return res },
  }
  return res
}

const req = (kind, id, authorization = 'Bearer good-token') => ({
  headers: authorization === null ? {} : { authorization },
  query: { proAsset: kind, id },
})
const verifyAs = (decoded) => async (token) => { assert.equal(token, 'good-token'); return decoded }
const userDocs = (docs) => async (uid) => docs[uid]

const FREE_USER = { uid: 'free-1', email_verified: true }
const PRO_USER = { uid: 'pro-1', email_verified: true }
const DOCS = { 'free-1': {}, 'pro-1': { lifetimeEntitlement: { active: true } } }

const IMG = Buffer.from('RIFF....WEBPVP8 fake')
const PAGE = '<!doctype html><title>demo</title><p>héllo</p>'
const PREVIEWS = {
  poster: { 'c-4': IMG.toString('base64') },
  anim: { 'c-4': IMG.toString('base64') },
  page: { 'c-4': PAGE },
}

const proDeps = (extra = {}) => ({
  verifyIdToken: verifyAs(PRO_USER),
  readUser: userDocs(DOCS),
  loadPreviews: async (kind) => PREVIEWS[kind],
  ...extra,
})

test('the kinds are poster, anim and page', () => {
  assert.deepEqual([...PRO_ASSET_KINDS], ['poster', 'anim', 'page'])
})

test('no token is a 401 and serves nothing', async () => {
  const res = fakeRes()
  let loaded = false
  await serveProAsset(req('poster', 'c-4', null), res, proDeps({ loadPreviews: async () => { loaded = true; return PREVIEWS.poster } }))
  assert.equal(res.statusCode, 401)
  assert.equal(loaded, false)
  assert.ok(!Buffer.isBuffer(res.body))
})

test('a free account is a 403 and serves nothing', async () => {
  const res = fakeRes()
  let loaded = false
  await serveProAsset(req('poster', 'c-4'), res, proDeps({
    verifyIdToken: verifyAs(FREE_USER),
    loadPreviews: async () => { loaded = true; return PREVIEWS.poster },
  }))
  assert.equal(res.statusCode, 403)
  assert.equal(loaded, false)
  assert.equal(res.headers['Cache-Control'], 'private, no-store')
})

test('an unknown kind is a 400 that names the kinds', async () => {
  const res = fakeRes()
  await serveProAsset(req('video', 'c-4'), res, proDeps())
  assert.equal(res.statusCode, 400)
  assert.match(res.body.error, /poster, anim, page/)
})

test('an inherited property name is not a kind', async () => {
  const res = fakeRes()
  await serveProAsset(req('constructor', 'c-4'), res, proDeps())
  assert.equal(res.statusCode, 400)
})

for (const id of [undefined, '', 'c-', 'x-4', 'c-4/../c-5', 'c-12345', ['c-4']]) {
  test(`a bad id (${JSON.stringify(id)}) is a 400`, async () => {
    const res = fakeRes()
    await serveProAsset(req('poster', id), res, proDeps())
    assert.equal(res.statusCode, 400)
    assert.equal(res.body.error, 'Bad preview id')
  })
}

test('a deployment with no preview data answers 503, not a fallback', async () => {
  const res = fakeRes()
  const errors = []
  const orig = console.error
  console.error = (...a) => errors.push(a)
  try {
    await serveProAsset(req('poster', 'c-4'), res, proDeps({ loadPreviews: async () => null }))
  } finally {
    console.error = orig
  }
  assert.equal(res.statusCode, 503)
  assert.equal(errors.length, 1)
})

test('an id with no preview is a 404', async () => {
  const res = fakeRes()
  await serveProAsset(req('poster', 'c-99'), res, proDeps())
  assert.equal(res.statusCode, 404)
})

test('Pro gets the poster bytes with an image type and private caching', async () => {
  const res = fakeRes()
  await serveProAsset(req('poster', 'c-4'), res, proDeps())
  assert.equal(res.statusCode, 200)
  assert.ok(Buffer.isBuffer(res.body))
  assert.ok(res.body.equals(IMG))
  assert.equal(res.headers['Content-Type'], 'image/webp')
  assert.equal(res.headers['Content-Length'], String(IMG.length))
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff')
  assert.equal(res.headers['Cache-Control'], 'private, no-store')
  assert.match(String(res.headers.Vary), /Authorization/)
  assert.equal(res.headers['Content-Security-Policy'], undefined)
})

test('Pro gets the animation from the anim data, not the poster data', async () => {
  const res = fakeRes()
  const asked = []
  await serveProAsset(req('anim', 'c-4'), res, proDeps({ loadPreviews: async (kind) => { asked.push(kind); return PREVIEWS[kind] } }))
  assert.equal(res.statusCode, 200)
  assert.deepEqual(asked, ['anim'])
})

test('the page is UTF-8 HTML under a sandbox CSP and noindex', async () => {
  const res = fakeRes()
  await serveProAsset(req('page', 'c-4'), res, proDeps())
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.toString('utf8'), PAGE)
  assert.equal(res.headers['Content-Type'], 'text/html; charset=utf-8')
  assert.equal(res.headers['Content-Length'], String(Buffer.byteLength(PAGE)))
  assert.equal(res.headers['Content-Security-Policy'], 'sandbox allow-scripts')
  assert.equal(res.headers['X-Robots-Tag'], 'noindex')
})

test('the route is wired into api/ai.js as a GET branch', async () => {
  const { readFile } = await import('node:fs/promises')
  const src = await readFile(new URL('../../api/ai.js', import.meta.url), 'utf8')
  assert.match(src, /'proAsset' in \(?req\.query/)
  assert.match(src, /import\(['"]\.\/_lib\/library\/proAssets\.js['"]\)/)
})
