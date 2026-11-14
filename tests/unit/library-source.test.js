// Where the server's library data comes from (api/_lib/library/load.js), and
// what happens when there is none.
//
//   - Production never serves fixtures and ignores UIL4B_LIBRARY_SOURCE.
//   - The fixtures render the same public client rows as the real data, so
//     every test that only reads the public split passes on either.
//   - The fixtures carry no real Pro value.
//   - With no data, the endpoint is 503 with no items, even for a Pro account.
import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveLibrary } from '../../api/_lib/library/load.js'
import { serveLibrary } from '../../api/_lib/library/serve.js'
import { freeSplit, clientRows, brandRows } from '../../scripts/library/clientRows.js'

const KINDS = ['palettes', 'gradients', 'prompts']
const LISTS = ['GALLERY_PALETTES', 'BRAND_PALETTES', 'CURATED_LIBRARY_PALETTES', 'BRAND_LIBRARY_PALETTES', 'LIBRARY_PALETTES', 'GALLERY_GRADIENTS', 'COMMUNITY_PROMPTS']

test('production never resolves to fixtures and ignores the override', async () => {
  const lib = await resolveLibrary({ VERCEL_ENV: 'production', UIL4B_LIBRARY_SOURCE: 'fixtures' })
  assert.notEqual(lib.source, 'fixtures')
})

test('an unknown forced source is an error, not a silent fallback', async () => {
  await assert.rejects(resolveLibrary({ UIL4B_LIBRARY_SOURCE: 'nope' }), /unknown source/)
})

test('the fixtures render the same public rows as the real data and no real Pro value', async (t) => {
  const real = await resolveLibrary({})
  const fake = await resolveLibrary({ UIL4B_LIBRARY_SOURCE: 'fixtures' })
  assert.equal(fake.source, 'fixtures')
  if (real.source === 'fixtures') return t.skip('no real data in this checkout')

  for (const name of LISTS) assert.equal(fake[name].length, real[name].length, `${name} length`)
  for (const kind of KINDS) {
    const r = real.LIBRARIES[kind]
    const f = fake.LIBRARIES[kind]
    assert.deepEqual(clientRows(kind, f), clientRows(kind, r), `${kind}: client rows`)
    const free = new Set(freeSplit(kind, r).open.map((item) => item.id))
    const byId = new Map(r.map((item) => [item.id, item]))
    const payload = (item) => JSON.stringify(item.colors ?? item.stops ?? item.text)
    // A free brand (pro: false) is public in full through brandRows.
    const leaked = f.filter((item) => !free.has(item.id) && item.pro !== false && payload(item) === payload(byId.get(item.id)))
    assert.deepEqual(leaked.map((item) => item.id), [], `${kind}: fixture rows carrying real values`)
  }
  assert.deepEqual(brandRows(fake.BRAND_PALETTES), brandRows(real.BRAND_PALETTES))
})

test('with no library data the endpoint is 503 with no items, even for Pro', async () => {
  const res = {
    statusCode: null, body: null, headers: {},
    setHeader(name, value) { res.headers[name] = value },
    status(code) { res.statusCode = code; return res },
    json(body) { res.body = body; return res },
  }
  const missing = await resolveLibrary({ UIL4B_LIBRARY_SOURCE: 'fixtures' }).then((lib) => ({ ...lib, source: 'missing' }))
  const errors = []
  const original = console.error
  console.error = (...args) => errors.push(args)
  try {
    await serveLibrary({ headers: { authorization: 'Bearer t' }, query: { library: 'palettes' } }, res, {
      verifyIdToken: async () => ({ uid: 'pro-1', email: 'pro@example.com', email_verified: true }),
      readUser: async () => ({ lifetimeEntitlement: { active: true } }),
      loadLibrary: async () => missing,
    })
  } finally {
    console.error = original
  }
  assert.equal(res.statusCode, 503)
  assert.equal(res.body.items, undefined)
  assert.equal(res.headers['Cache-Control'], 'private, no-store')
  assert.equal(errors.length, 1)
})
