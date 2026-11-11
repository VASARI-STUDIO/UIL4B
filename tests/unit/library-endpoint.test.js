// GET /api/ai?library=<kind> is the only way a Pro row's VALUES leave the server as data. A blurred picture of a
// locked palette also leaves it, from GET /api/ai?palettePreview=<id> (api/_lib/library/preview.js; pinned by
// palette-preview-png.test.js): the colours as pixels, never as hex text.
// serveLibrary is the whole decision, with the token check and the user document
// injected, so every refusal is exercised here without Firebase.
//
// The rule under test: a caller who is not a verified Pro account gets a status
// and an error message and NO library values, whatever else goes wrong.
import test from 'node:test'
import assert from 'node:assert/strict'
import { serveLibrary, LIBRARIES } from '../../api/_lib/library/serve.js'
import { freeSplit } from '../../scripts/library/clientRows.js'

function fakeRes() {
  const res = {
    statusCode: null, body: null, headers: {},
    setHeader(name, value) { res.headers[name] = value },
    status(code) { res.statusCode = code; return res },
    json(body) { res.body = body; return res },
  }
  return res
}

const req = (library, authorization = 'Bearer good-token') => ({
  headers: authorization === null ? {} : { authorization },
  query: { library },
})

const verifyAs = (decoded) => async (token) => {
  assert.equal(token, 'good-token')
  return decoded
}
const userDocs = (docs) => async (uid) => docs[uid]

const FREE_USER = { uid: 'free-1', email: 'free@example.com', email_verified: true }
const PRO_USER = { uid: 'pro-1', email: 'pro@example.com', email_verified: true }
const docs = {
  'free-1': {},
  'pro-1': { lifetimeEntitlement: { active: true } },
  // A client-writable-looking field must never grant Pro.
  'liar-1': { plan: 'pro', isPro: true, subscription: { status: 'canceled' } },
}

/** Values only a Pro account may receive: every row outside the free set. */
function proNeedles(kind) {
  const free = new Set(freeSplit(kind).open.map((item) => item.id))
  return LIBRARIES[kind]
    .filter((item) => !free.has(item.id))
    .map((item) => JSON.stringify(item.colors ?? item.stops ?? item.text))
}

function assertNoProValues(res, kind) {
  const wire = JSON.stringify(res.body)
  assert.equal(res.body?.items, undefined, 'a refusal carries no items')
  for (const needle of proNeedles(kind)) {
    assert.ok(!wire.includes(needle), `a refusal leaked ${needle.slice(0, 40)}`)
  }
}

for (const kind of Object.keys(LIBRARIES)) {
  test(`${kind}: signed out is 401 with no values`, async () => {
    const res = fakeRes()
    await serveLibrary(req(kind, null), res, {
      verifyIdToken: async () => assert.fail('no token, so nothing to verify'),
      readUser: async () => assert.fail('no token, so no user read'),
    })
    assert.equal(res.statusCode, 401)
    assertNoProValues(res, kind)
  })

  test(`${kind}: a header that is not a Bearer token is 401`, async () => {
    const res = fakeRes()
    await serveLibrary(req(kind, 'Basic abc'), res, {
      verifyIdToken: async () => assert.fail('not a Bearer token'),
      readUser: async () => assert.fail('not a Bearer token'),
    })
    assert.equal(res.statusCode, 401)
    assertNoProValues(res, kind)
  })

  test(`${kind}: a Free account is 403 with no values`, async () => {
    const res = fakeRes()
    await serveLibrary(req(kind), res, { verifyIdToken: verifyAs(FREE_USER), readUser: userDocs(docs) })
    assert.equal(res.statusCode, 403)
    assertNoProValues(res, kind)
  })

  test(`${kind}: a user document that merely claims Pro is 403`, async () => {
    const res = fakeRes()
    await serveLibrary(req(kind), res, {
      verifyIdToken: verifyAs({ uid: 'liar-1', email: 'liar@example.com', email_verified: true }),
      readUser: userDocs(docs),
    })
    assert.equal(res.statusCode, 403)
    assertNoProValues(res, kind)
  })

  test(`${kind}: a verify that throws is 401 and never Pro`, async () => {
    const res = fakeRes()
    await serveLibrary(req(kind), res, {
      verifyIdToken: async () => { throw new Error('auth/id-token-expired') },
      readUser: async () => assert.fail('an unverified caller must not reach the user read'),
    })
    assert.equal(res.statusCode, 401)
    assertNoProValues(res, kind)
  })

  test(`${kind}: a user read that throws is refused, not served`, async () => {
    const res = fakeRes()
    await serveLibrary(req(kind), res, {
      verifyIdToken: verifyAs(PRO_USER),
      readUser: async () => { throw new Error('firestore unavailable') },
    })
    assert.equal(res.statusCode, 500)
    assertNoProValues(res, kind)
  })

  test(`${kind}: a Pro account gets 200 and the whole library, Pro rows in full`, async () => {
    const res = fakeRes()
    await serveLibrary(req(kind), res, { verifyIdToken: verifyAs(PRO_USER), readUser: userDocs(docs) })
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.kind, kind)
    assert.equal(res.body.total, LIBRARIES[kind].length)
    assert.deepEqual(res.body.items.map((item) => item.id), LIBRARIES[kind].map((item) => item.id))
    const wire = JSON.stringify(res.body)
    for (const needle of proNeedles(kind)) assert.ok(wire.includes(needle), `a Pro account is missing ${needle.slice(0, 40)}`)
  })
}

test('an unknown library is 400 for a Pro account', async () => {
  for (const name of ['fonts', '', 'constructor', '__proto__', 'toString']) {
    const res = fakeRes()
    await serveLibrary(req(name), res, { verifyIdToken: verifyAs(PRO_USER), readUser: userDocs(docs) })
    assert.equal(res.statusCode, 400, `library=${name}`)
    assert.equal(res.body.items, undefined)
  }
})

test('an unknown library does not reveal anything to a Free account either', async () => {
  const res = fakeRes()
  await serveLibrary(req('fonts'), res, { verifyIdToken: verifyAs(FREE_USER), readUser: userDocs(docs) })
  assert.equal(res.statusCode, 403)
})

test('every response is private and varies on Authorization', async () => {
  for (const [authorization, verify] of [[null, verifyAs(PRO_USER)], ['Bearer good-token', verifyAs(FREE_USER)], ['Bearer good-token', verifyAs(PRO_USER)]]) {
    const res = fakeRes()
    await serveLibrary(req('palettes', authorization), res, { verifyIdToken: verify, readUser: userDocs(docs) })
    assert.equal(res.headers['Cache-Control'], 'private, no-store')
    assert.equal(res.headers.Vary, 'Authorization')
  }
})

test('the token is checked for revocation, so a disabled or revoked account loses the library at once', async () => {
  let asked
  const res = fakeRes()
  await serveLibrary(req('palettes'), res, {
    verifyIdToken: async (token, checkRevoked) => { asked = checkRevoked; return PRO_USER },
    readUser: userDocs(docs),
  })
  assert.equal(asked, true)
  assert.equal(res.statusCode, 200)

  // A revoked token is what the Admin SDK rejects only when asked to check.
  const revoked = fakeRes()
  await serveLibrary(req('palettes'), revoked, {
    verifyIdToken: async (token, checkRevoked) => {
      if (checkRevoked) throw new Error('auth/id-token-revoked')
      return PRO_USER
    },
    readUser: userDocs(docs),
  })
  assert.equal(revoked.statusCode, 401)
  assertNoProValues(revoked, 'palettes')
})

test('the served rows carry no field the pages do not read', async () => {
  const res = fakeRes()
  await serveLibrary(req('prompts'), res, { verifyIdToken: verifyAs(PRO_USER), readUser: userDocs(docs) })
  for (const item of res.body.items) {
    assert.equal('outputPreview' in item, false)
    assert.equal('outputAnim' in item, false)
  }
})

test('an admin address opens the library only when Firebase has verified the email', async () => {
  const before = process.env.ADMIN_EMAILS
  process.env.ADMIN_EMAILS = 'owner@example.com'
  try {
    for (const verified of [false, undefined, 'true']) {
      const res = fakeRes()
      const decoded = { uid: 'owner-1', email: 'owner@example.com', email_verified: verified }
      await serveLibrary(req('prompts'), res, { verifyIdToken: verifyAs(decoded), readUser: userDocs(docs) })
      if (verified === 'true') continue
      assert.equal(res.statusCode, 403, `email_verified: ${String(verified)} must not open the library`)
      assertNoProValues(res, 'prompts')
    }
    const res = fakeRes()
    await serveLibrary(req('prompts'), res, {
      verifyIdToken: verifyAs({ uid: 'owner-1', email: 'owner@example.com', email_verified: true }),
      readUser: userDocs(docs),
    })
    assert.equal(res.statusCode, 200, 'a verified admin email is Pro, which proves the allowlist was live in this test')
  } finally {
    if (before === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = before
  }
})
