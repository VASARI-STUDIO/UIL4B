// GET /api/ai?animatedIcons=<prefix>[&icons=a,b,c] is the only way an animated
// icon's markup leaves the server, and it is Pro only. serveAnimatedIcons is the
// whole decision with the token check, the user document and the upstream fetch
// injected, so every refusal is exercised here without Firebase or the network.
//
// The rule under test: a caller who is not a verified Pro account gets a status
// and an error message, the upstream is NEVER asked, and nothing about the
// answer can be shared by a cache.
import test from 'node:test'
import assert from 'node:assert/strict'
import { ANIMATED_PREFIXES, MAX_ICONS_PER_CALL, ICONIFY_API, parseIconNames, serveAnimatedIcons } from '../../api/_lib/icons/animated.js'
import { ANIMATED_PACKS } from '../../src/data/iconPackTiers.js'
import { stripJs as strip } from '../helpers/strip-comments.js'
import fs from 'node:fs'

function fakeRes() {
  const res = {
    statusCode: null, body: null, headers: {},
    setHeader(name, value) { res.headers[name] = value },
    status(code) { res.statusCode = code; return res },
    json(body) { res.body = body; return res },
  }
  return res
}

const req = (query, authorization = 'Bearer good-token') => ({
  headers: authorization === null ? {} : { authorization },
  query,
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

/** An upstream that records every URL it is asked for. */
function upstream(body = { prefix: 'line-md', icons: { 'loading-loop': { body: '<g/>' } }, width: 24, height: 24 }) {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return { ok: true, status: 200, json: async () => body }
  }
  return { calls, fetchImpl }
}

const NEVER = () => assert.fail('the upstream must not be asked for a caller who has not passed the Pro check')

test('signed out is 401 and the upstream is never asked', async () => {
  const res = fakeRes()
  await serveAnimatedIcons(req({ animatedIcons: 'line-md', icons: 'loading-loop' }, null), res, {
    verifyIdToken: async () => assert.fail('no token, so nothing to verify'),
    readUser: async () => assert.fail('no token, so no user read'),
    fetchImpl: NEVER,
  })
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.icons, undefined)
})

test('a header that is not a Bearer token is 401', async () => {
  const res = fakeRes()
  await serveAnimatedIcons(req({ animatedIcons: 'line-md' }, 'Basic abc'), res, {
    verifyIdToken: async () => assert.fail('not a Bearer token'),
    readUser: async () => assert.fail('not a Bearer token'),
    fetchImpl: NEVER,
  })
  assert.equal(res.statusCode, 401)
})

test('a verify that throws is 401 and never Pro', async () => {
  const res = fakeRes()
  await serveAnimatedIcons(req({ animatedIcons: 'line-md' }), res, {
    verifyIdToken: async () => { throw new Error('auth/id-token-expired') },
    readUser: async () => assert.fail('an unverified caller must not reach the user read'),
    fetchImpl: NEVER,
  })
  assert.equal(res.statusCode, 401)
})

test('a Free account is 403 for the listing and for glyphs, and the upstream is never asked', async () => {
  for (const query of [
    { animatedIcons: 'line-md' },
    { animatedIcons: 'line-md', icons: 'loading-loop' },
    { animatedIcons: 'not-a-set', icons: 'Bad Name' }, // refused as Free before it is judged as malformed
  ]) {
    const res = fakeRes()
    await serveAnimatedIcons(req(query), res, { verifyIdToken: verifyAs(FREE_USER), readUser: userDocs(docs), fetchImpl: NEVER })
    assert.equal(res.statusCode, 403, JSON.stringify(query))
    assert.equal(res.body.icons, undefined)
    assert.equal(res.body.uncategorized, undefined)
  }
})

test('a user document that merely claims Pro is 403', async () => {
  const res = fakeRes()
  await serveAnimatedIcons(req({ animatedIcons: 'line-md', icons: 'loading-loop' }), res, {
    verifyIdToken: verifyAs({ uid: 'liar-1', email: 'liar@example.com', email_verified: true }),
    readUser: userDocs(docs),
    fetchImpl: NEVER,
  })
  assert.equal(res.statusCode, 403)
})

test('a user read that throws is refused, not served', async () => {
  const res = fakeRes()
  await serveAnimatedIcons(req({ animatedIcons: 'line-md' }), res, {
    verifyIdToken: verifyAs(PRO_USER),
    readUser: async () => { throw new Error('firestore unavailable') },
    fetchImpl: NEVER,
  })
  assert.equal(res.statusCode, 500)
})

test('a Pro account gets 200 and Iconify\'s answer for the icons it named', async () => {
  const up = upstream()
  const res = fakeRes()
  await serveAnimatedIcons(req({ animatedIcons: 'line-md', icons: 'loading-loop,home' }), res, {
    verifyIdToken: verifyAs(PRO_USER), readUser: userDocs(docs), fetchImpl: up.fetchImpl,
  })
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.icons['loading-loop'].body, '<g/>')
  assert.equal(up.calls.length, 1)
  assert.equal(up.calls[0].url, `${ICONIFY_API}/line-md.json?icons=loading-loop,home`)
  assert.ok(up.calls[0].init.signal, 'the upstream call carries a timeout')
})

test('a Pro account gets the pack listing when it names no icons', async () => {
  const listing = { prefix: 'meteocons', title: 'Meteocons', uncategorized: ['clear-day'] }
  const up = upstream(listing)
  const res = fakeRes()
  await serveAnimatedIcons(req({ animatedIcons: 'meteocons' }), res, {
    verifyIdToken: verifyAs(PRO_USER), readUser: userDocs(docs), fetchImpl: up.fetchImpl,
  })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, listing)
  assert.equal(up.calls[0].url, `${ICONIFY_API}/collection?prefix=meteocons&info=1`)
})

test('a prefix outside the animated allowlist is 400 for a Pro account, and never reaches the upstream', async () => {
  for (const prefix of ['lucide', 'simple-icons', '', 'line-md/../lucide', 'line-md?x=1', 'constructor', '__proto__', ['line-md', 'lucide'], undefined]) {
    const res = fakeRes()
    await serveAnimatedIcons(req({ animatedIcons: prefix, icons: 'home' }), res, {
      verifyIdToken: verifyAs(PRO_USER), readUser: userDocs(docs), fetchImpl: NEVER,
    })
    assert.equal(res.statusCode, 400, `animatedIcons=${JSON.stringify(prefix)}`)
  }
})

test('bad or too many icon names are 400 for a Pro account, and never reach the upstream', async () => {
  const tooMany = Array.from({ length: MAX_ICONS_PER_CALL + 1 }, (_, i) => `icon-${i}`).join(',')
  const bad = ['', 'Home', 'a b', 'a,,b', 'a,', ',a', 'a_b', '-a', 'a-', 'a--b', 'a/b', 'a?b=1', 'a&b', 'a%2Fb', '../x', 'a'.repeat(65), tooMany, ['a', 'b']]
  for (const icons of bad) {
    const res = fakeRes()
    await serveAnimatedIcons(req({ animatedIcons: 'line-md', icons }), res, {
      verifyIdToken: verifyAs(PRO_USER), readUser: userDocs(docs), fetchImpl: NEVER,
    })
    assert.equal(res.statusCode, 400, `icons=${JSON.stringify(icons).slice(0, 40)}`)
  }
})

test('exactly the cap is accepted, and duplicate names collapse', async () => {
  const full = Array.from({ length: MAX_ICONS_PER_CALL }, (_, i) => `icon-${i}`).join(',')
  assert.equal(parseIconNames(full).length, MAX_ICONS_PER_CALL)
  assert.deepEqual(parseIconNames('a,a,b'), ['a', 'b'])
  const up = upstream()
  const res = fakeRes()
  await serveAnimatedIcons(req({ animatedIcons: 'line-md', icons: full }), res, {
    verifyIdToken: verifyAs(PRO_USER), readUser: userDocs(docs), fetchImpl: up.fetchImpl,
  })
  assert.equal(res.statusCode, 200)
})

test('an upstream that fails or times out is 502, not a partial answer', async () => {
  for (const fetchImpl of [
    async () => ({ ok: false, status: 429, json: async () => ({}) }),
    async () => { throw new Error('timeout') },
    async () => ({ ok: true, status: 200, json: async () => null }),
    async () => ({ ok: true, status: 200, json: async () => [] }),
  ]) {
    const res = fakeRes()
    await serveAnimatedIcons(req({ animatedIcons: 'line-md', icons: 'home' }), res, {
      verifyIdToken: verifyAs(PRO_USER), readUser: userDocs(docs), fetchImpl,
    })
    assert.equal(res.statusCode, 502)
  }
})

test('every response is private, never shared, and varies on Authorization', async () => {
  const cases = [
    [null, verifyAs(PRO_USER)],
    ['Bearer good-token', verifyAs(FREE_USER)],
    ['Bearer good-token', verifyAs(PRO_USER)],
  ]
  for (const [authorization, verify] of cases) {
    const res = fakeRes()
    await serveAnimatedIcons(req({ animatedIcons: 'line-md', icons: 'home' }, authorization), res, {
      verifyIdToken: verify, readUser: userDocs(docs), fetchImpl: upstream().fetchImpl,
    })
    assert.equal(res.headers['Cache-Control'], 'private, no-store')
    assert.equal(res.headers.Vary, 'Authorization')
  }
})

test('the token is checked for revocation, so a disabled or revoked account loses the sets at once', async () => {
  let asked
  const res = fakeRes()
  await serveAnimatedIcons(req({ animatedIcons: 'line-md', icons: 'home' }), res, {
    verifyIdToken: async (token, checkRevoked) => { asked = checkRevoked; return PRO_USER },
    readUser: userDocs(docs),
    fetchImpl: upstream().fetchImpl,
  })
  assert.equal(asked, true)
  assert.equal(res.statusCode, 200)

  const revoked = fakeRes()
  await serveAnimatedIcons(req({ animatedIcons: 'line-md', icons: 'home' }), revoked, {
    verifyIdToken: async (token, checkRevoked) => {
      if (checkRevoked) throw new Error('auth/id-token-revoked')
      return PRO_USER
    },
    readUser: userDocs(docs),
    fetchImpl: NEVER,
  })
  assert.equal(revoked.statusCode, 401)
})

test('an admin address opens the sets only when Firebase has verified the email', async () => {
  const before = process.env.ADMIN_EMAILS
  process.env.ADMIN_EMAILS = 'owner@example.com'
  try {
    const res = fakeRes()
    await serveAnimatedIcons(req({ animatedIcons: 'line-md', icons: 'home' }), res, {
      verifyIdToken: verifyAs({ uid: 'owner-1', email: 'owner@example.com', email_verified: false }),
      readUser: userDocs(docs),
      fetchImpl: NEVER,
    })
    assert.equal(res.statusCode, 403)
  } finally {
    if (before === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = before
  }
})

test('the server allowlist and the client table name the same animated sets', () => {
  assert.deepEqual([...ANIMATED_PREFIXES].sort(), [...ANIMATED_PACKS].sort(),
    'api/_lib/icons/animated.js and the animated: true rows of src/data/iconPackTiers.js have drifted apart')
  assert.ok(ANIMATED_PREFIXES.length >= 3)
})

test('api/ai.js hosts the route, so there is no thirteenth function and no new rewrite', () => {
  const ai = strip(fs.readFileSync('api/ai.js', 'utf8'))
  assert.match(ai, /'animatedIcons' in \(req\.query \|\| \{\}\)/)
  assert.match(ai, /import\('\.\/_lib\/icons\/animated\.js'\)/)
  const vercel = fs.readFileSync('vercel.json', 'utf8')
  assert.ok(!vercel.includes('animatedIcons'), 'vercel.json rewrites are generated; the route needs none')
})
