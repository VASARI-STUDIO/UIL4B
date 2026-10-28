// Rate limiter hardening (abuse audit M3, M4, M5 and the support email cap).
//
//   M3  production with no RATE_LIMIT_SALT refuses instead of counting per instance
//   M4  an IPv6 client is keyed on its /64, an IPv4-mapped address as its IPv4
//   M5  `failOpen: false` refuses on a database outage; the default still allows
//   --  at most 30 founder emails an hour site-wide; the message is still stored
//
// Runs the real limiter and the real support handler against in-memory fakes.
// tests/unit/api-abuse-hardening.test.js covers the limiter's base behaviour and
// tests/unit/checkout-rate-limit.test.js the checkout route's use of failOpen.
import test from 'node:test'
import assert from 'node:assert/strict'
import { clientIp, consume } from '../../api/_lib/rateLimit.js'
import { handleSupport, MAIL_CAP } from '../../api/support.js'

/** A Firestore stand-in with the transaction shape the limiter uses. */
function limiterDb({ error = null } = {}) {
  const docs = new Map()
  const db = {
    docs,
    transactions: 0,
    collection: () => ({ doc: (id) => ({ id }) }),
    runTransaction: async (fn) => {
      db.transactions += 1
      if (error) throw error
      return fn({
        get: async ({ id }) => ({ exists: docs.has(id), data: () => docs.get(id) }),
        set: ({ id }, value, opts) => docs.set(id, opts?.merge ? { ...docs.get(id), ...value } : value),
      })
    },
  }
  return db
}

const WINDOW = { bucket: 'test', limit: 3, windowMs: 60000, now: 1000 }
const ip = (address) => clientIp({ headers: { 'x-vercel-forwarded-for': address } })

// ── M4: IPv6 is keyed on its /64 ─────────────────────────────────────────────

test('two addresses in one /64 are one client, a different /64 is another', () => {
  const a = ip('2001:db8:1:2:aaaa:bbbb:cccc:dddd')
  const b = ip('2001:db8:1:2::1')
  assert.equal(a, b, 'two addresses in the same /64 got different keys')
  assert.notEqual(a, ip('2001:db8:1:3::1'), 'a neighbouring /64 shares the key')
  assert.notEqual(a, ip('2001:db9:1:2::1'), 'a different prefix shares the key')
})

test('compressed, padded and upper-case spellings of one /64 give one key', () => {
  const key = ip('2001:db8::1')
  assert.equal(ip('2001:0db8:0000:0000:ffff:0:0:9'), key)
  assert.equal(ip('2001:DB8:0:0::abcd'), key)
  assert.equal(ip('[2001:db8::1]'), key)
  assert.equal(ip('2001:db8::1%eth0'), key)
})

test('the /64 key is used whichever header carried the address', () => {
  const viaForwarded = clientIp({ headers: { 'x-forwarded-for': '2001:db8:1:2:1:1:1:1, 10.0.0.1' } })
  const viaRealIp = clientIp({ headers: { 'x-real-ip': '2001:db8:1:2:2:2:2:2' } })
  const viaSocket = clientIp({ headers: {}, socket: { remoteAddress: '2001:db8:1:2:3:3:3:3' } })
  assert.equal(viaForwarded, ip('2001:db8:1:2::'))
  assert.equal(viaRealIp, viaForwarded)
  assert.equal(viaSocket, viaForwarded)
})

test('an IPv4-mapped IPv6 address is the IPv4 address it wraps, and IPv4 stays whole', () => {
  assert.equal(ip('::ffff:1.2.3.4'), '1.2.3.4')
  assert.equal(ip('::ffff:0102:0304'), '1.2.3.4', 'the hex spelling of the same address')
  assert.equal(ip('::FFFF:203.0.113.7'), ip('203.0.113.7'))
  assert.equal(ip('203.0.113.7'), '203.0.113.7')
  assert.equal(ip('198.51.100.4'), '198.51.100.4')
  assert.notEqual(ip('203.0.113.7'), ip('203.0.113.8'), 'IPv4 neighbours must stay separate')
})

test('text that is not an address is left alone rather than throwing', () => {
  assert.equal(ip('not-an-ip'), 'not-an-ip')
  assert.equal(ip('1.2.3.4:5678'), '1.2.3.4:5678')
  assert.equal(ip('1:2:3'), '1:2:3')
  assert.equal(ip('::ffff:999.1.1.1'), '::ffff:999.1.1.1')
  assert.equal(clientIp({ headers: {} }), '')
})

test('addresses in one /64 spend one shared budget in the limiter', async () => {
  const db = limiterDb()
  const verdicts = []
  for (const address of ['2001:db8:1:2::1', '2001:db8:1:2:aaaa::2', '2001:db8:1:2:bbbb::3', '2001:db8:1:2:cccc::4']) {
    verdicts.push((await consume(db, { ...WINDOW, key: ip(address) })).allowed)
  }
  assert.deepEqual(verdicts, [true, true, true, false], 'a fourth address in the same /64 had its own budget')
  assert.equal((await consume(db, { ...WINDOW, key: ip('2001:db8:1:3::1') })).allowed, true, 'a different /64 shares the budget')
})

test('a mapped IPv4 address spends the budget of the plain IPv4 address', async () => {
  const db = limiterDb()
  await consume(db, { ...WINDOW, key: ip('203.0.113.7') })
  await consume(db, { ...WINDOW, key: ip('::ffff:203.0.113.7') })
  await consume(db, { ...WINDOW, key: ip('::ffff:cb00:7107') })
  assert.equal((await consume(db, { ...WINDOW, key: ip('203.0.113.7') })).allowed, false)
})

// ── M3: production with no salt refuses ──────────────────────────────────────

/** A private copy of the limiter, loaded with the given environment (the salt is read at load). */
async function freshLimiter(tag, env) {
  const names = ['RATE_LIMIT_SALT', 'VERCEL_ENV', 'NODE_ENV']
  const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]))
  for (const n of names) {
    if (env[n] === undefined) delete process.env[n]
    else process.env[n] = env[n]
  }
  try {
    const mod = await import(`../../api/_lib/rateLimit.js?${tag}`)
    return {
      consume: mod.consume,
      // The environment is also read per call, so keep it set for the caller.
      restore: () => names.forEach((n) => { if (saved[n] === undefined) delete process.env[n]; else process.env[n] = saved[n] }),
    }
  } catch (err) {
    names.forEach((n) => { if (saved[n] === undefined) delete process.env[n]; else process.env[n] = saved[n] })
    throw err
  }
}

test('production with no RATE_LIMIT_SALT refuses and logs once, without touching the database', async (t) => {
  const errors = t.mock.method(console, 'error', () => {})
  const limiter = await freshLimiter('prod-no-salt', { VERCEL_ENV: 'production' })
  t.after(limiter.restore)
  const db = limiterDb()

  const first = await limiter.consume(db, { ...WINDOW, key: '203.0.113.7' })
  const second = await limiter.consume(db, { ...WINDOW, key: '198.51.100.4' })

  for (const verdict of [first, second]) {
    assert.equal(verdict.allowed, false)
    assert.equal(verdict.remaining, 0)
    assert.ok(verdict.retryAfter >= 1, 'a refusal says when to try again')
  }
  assert.equal(db.transactions, 0, 'the counter was used even though it cannot be shared between instances')
  const salted = errors.mock.calls.filter((c) => /RATE_LIMIT_SALT/.test(String(c.arguments[0])))
  assert.equal(salted.length, 1, 'the missing salt must be logged exactly once')
})

test('NODE_ENV=production also counts as production where VERCEL_ENV is absent', async (t) => {
  t.mock.method(console, 'error', () => {})
  const limiter = await freshLimiter('node-env-prod', { NODE_ENV: 'production' })
  t.after(limiter.restore)
  assert.equal((await limiter.consume(limiterDb(), { ...WINDOW, key: '203.0.113.7' })).allowed, false)
})

test('production WITH a salt, and any non-production run without one, keep counting as before', async (t) => {
  t.mock.method(console, 'error', () => {})
  for (const [tag, env] of [
    ['prod-salted', { VERCEL_ENV: 'production', RATE_LIMIT_SALT: 'a-configured-salt' }],
    ['preview-unsalted', { VERCEL_ENV: 'preview', NODE_ENV: 'production' }],
    ['dev-unsalted', {}],
  ]) {
    const limiter = await freshLimiter(tag, env)
    try {
      const db = limiterDb()
      const verdicts = []
      for (let i = 0; i < 4; i += 1) verdicts.push((await limiter.consume(db, { ...WINDOW, key: '203.0.113.7' })).allowed)
      assert.deepEqual(verdicts, [true, true, true, false], `${tag}: the limiter stopped counting`)
    } finally {
      limiter.restore()
    }
  }
})

// ── M5: failOpen ─────────────────────────────────────────────────────────────

test('on a database outage the default lets the request through and failOpen:false refuses it', async (t) => {
  t.mock.method(console, 'error', () => {})
  for (const code of [14, 4, 'unavailable', 'deadline-exceeded']) {
    const error = Object.assign(new Error('firestore unavailable'), { code })
    const open = await consume(limiterDb({ error }), { ...WINDOW, key: '203.0.113.7' })
    assert.equal(open.allowed, true, `code ${code}: the default must still fail open`)
    assert.equal(open.degraded, true)

    const closed = await consume(limiterDb({ error }), { ...WINDOW, key: '203.0.113.7', failOpen: false })
    assert.equal(closed.allowed, false, `code ${code}: failOpen:false let the request through`)
    assert.equal(closed.remaining, 0)
    assert.ok(closed.retryAfter >= 1, 'a refusal says when to try again')
    assert.notEqual(closed.degraded, true)
  }
})

test('failOpen:false changes nothing when the database is healthy', async () => {
  // Same counting as the default; only an outage is treated differently.
  const db = limiterDb()
  const verdicts = []
  for (let i = 0; i < 4; i += 1) verdicts.push((await consume(db, { ...WINDOW, key: '203.0.113.7', failOpen: false })).allowed)
  assert.deepEqual(verdicts, [true, true, true, false])
})

// ── Support: at most 30 founder emails an hour, site-wide ────────────────────

/** Firestore stand-in for the support route: feedback writes plus the limiter's transactions. */
function supportDb() {
  const docs = new Map()
  const db = {
    docs,
    failFeedback: false,
    stored: () => [...docs.keys()].filter((k) => k.startsWith('feedback/')).length,
    collection: (name) => ({
      doc: (id) => ({ id }),
      add: async (value) => {
        if (db.failFeedback) throw new Error('firestore unavailable')
        docs.set(`${name}/auto-${docs.size}`, value)
      },
    }),
    runTransaction: async (fn) => fn({
      get: async ({ id }) => ({ exists: docs.has(`rl/${id}`), data: () => docs.get(`rl/${id}`) }),
      set: ({ id }, value) => docs.set(`rl/${id}`, value),
    }),
  }
  return db
}

/** The notification settings and a recording `fetch`; restored when the test ends. */
function withEmail(t) {
  const names = ['GOOGLE_SHEETS_WEBHOOK_URL', 'RESEND_API' + '_KEY', 'SUPPORT_NOTIFY_EMAIL']
  const saved = names.map((n) => process.env[n])
  delete process.env.GOOGLE_SHEETS_WEBHOOK_URL
  process.env[names[1]] = 'fake'
  process.env.SUPPORT_NOTIFY_EMAIL = 'notify@example.test'
  t.after(() => names.forEach((n, i) => { if (saved[i] === undefined) delete process.env[n]; else process.env[n] = saved[i] }))
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true }))
  return { emails: () => fetchMock.mock.calls.filter((c) => String(c.arguments[0]).includes('resend')).length }
}

/** One POST from its own address, so the per-address limits are not what is under test. */
async function send(db, n) {
  const res = {
    code: 0, body: null,
    setHeader() {},
    status(c) { res.code = c; return res },
    json(b) { res.body = b; return res },
    end() { return res },
  }
  const pending = []
  const req = {
    method: 'POST',
    headers: { 'x-vercel-forwarded-for': `203.0.113.${n}` },
    body: { type: 'bug', subject: `Report ${n}`, message: `Something broke, report ${n}.`, email: '', source: 'inline' },
  }
  await handleSupport(req, res, { getDb: () => db, defer: (p) => pending.push(p) })
  await Promise.all(pending)
  return res
}

test('the cap is 30 emails an hour for the whole site', () => {
  assert.equal(MAIL_CAP.limit, 30)
  assert.equal(MAIL_CAP.windowMs, 60 * 60 * 1000)
})

test('the 31st support message in an hour is stored and confirmed but not emailed', async (t) => {
  const warnings = t.mock.method(console, 'warn', () => {})
  const mail = withEmail(t)
  const db = supportDb()

  const replies = []
  for (let n = 1; n <= 31; n += 1) replies.push(await send(db, n))

  assert.deepEqual([...new Set(replies.map((r) => r.code))], [200], 'every sender must still see success')
  assert.ok(replies.every((r) => r.body.ok === true))
  assert.equal(db.stored(), 31, 'a message past the cap was not stored')
  assert.equal(mail.emails(), 30, 'the founder got more (or fewer) than 30 emails')
  const skipped = warnings.mock.calls.filter((c) => /email skipped/.test(String(c.arguments[0])))
  assert.equal(skipped.length, 1, 'the skipped email was not logged')
})

test('an unstored message is still emailed past the cap, because the email is its only copy', async (t) => {
  t.mock.method(console, 'warn', () => {})
  t.mock.method(console, 'error', () => {})
  const mail = withEmail(t)
  const db = supportDb()
  for (let n = 1; n <= 30; n += 1) await send(db, n)
  assert.equal(mail.emails(), 30)

  db.failFeedback = true
  const res = await send(db, 31)
  assert.equal(res.code, 200)
  assert.equal(mail.emails(), 31)
})
