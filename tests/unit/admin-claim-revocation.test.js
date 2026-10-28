// THE `admin` CLAIM MUST LEAVE WITH THE ALLOWLIST ENTRY, AND ADMIN TOKENS ARE
// REVOCATION-CHECKED (security audit M2).
//
// The claim is permanent and Firestore/Storage rules trust it on its own, so
// removing an address from ADMIN_EMAILS stopped the server routes and nothing
// else. These tests run the real routes against an in-memory Admin SDK (see
// helpers/api-stub-loader.mjs); nothing here touches Firebase.
import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { read, stripComments } from './helpers/source-text.js'

register('./helpers/api-stub-loader.mjs', import.meta.url)

const { fakeRes, fakeAuth, fakeDb, install, revokedError } = await import('./helpers/api-fakes.js')
const { default: verifyAdmin } = await import('../../api/verify-admin.js')
const { requireAdmin } = await import('../../api/_lib/admin.js')

const ADMIN = 'owner@uil4b-test.example'
const req = (token, body = {}) => ({ method: 'POST', headers: { authorization: `Bearer ${token}` }, body })
const token = (uid, extra = {}) => ({ uid, email: `${uid}@example.com`, email_verified: true, ...extra })

function setup({ tokens, users = {}, admins = ADMIN, roster = {} }) {
  process.env.ADMIN_EMAILS = admins
  const auth = fakeAuth({ tokens, users })
  install({ auth, db: fakeDb(roster) })
  return auth
}

test('a stale admin claim is cleared, the other claims are kept and the sessions are revoked', async () => {
  const auth = setup({
    tokens: { t: token('ex-admin', { admin: true }) },
    users: { 'ex-admin': { customClaims: { admin: true, beta: 'yes' } } },
  })
  const res = fakeRes()
  await verifyAdmin(req('t'), res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.isAdmin, false)
  assert.equal(res.body.claimUpdated, true)
  const claims = auth.accounts.get('ex-admin').customClaims
  assert.equal('admin' in claims, false, 'the admin claim must be gone')
  assert.equal(claims.beta, 'yes', 'an unrelated claim must survive')
  assert.deepEqual(auth.calls.revoke, ['ex-admin'])
})

test('a current admin keeps the claim and is not revoked', async () => {
  const auth = setup({
    tokens: { t: { uid: 'boss', email: ADMIN, email_verified: true, admin: true } },
    users: { boss: { customClaims: { admin: true } } },
  })
  const res = fakeRes()
  await verifyAdmin(req('t'), res)
  assert.equal(res.body.isAdmin, true)
  assert.equal(auth.accounts.get('boss').customClaims.admin, true)
  assert.deepEqual(auth.calls.revoke, [])
})

test('an empty allowlist clears nothing: an unset ADMIN_EMAILS is a slip, not a decision', async () => {
  const auth = setup({
    tokens: { t: token('someone', { admin: true }) },
    users: { someone: { customClaims: { admin: true } } },
    admins: '',
  })
  await verifyAdmin(req('t'), fakeRes())
  assert.equal(auth.accounts.get('someone').customClaims.admin, true)
  assert.deepEqual(auth.calls.revoke, [])
  assert.deepEqual(auth.calls.setClaims, [])
})

test('a user who never had the claim is not written to', async () => {
  const auth = setup({
    tokens: { t: token('plain') },
    users: { plain: { customClaims: {} } },
  })
  await verifyAdmin(req('t'), fakeRes())
  assert.deepEqual(auth.calls.revoke, [])
  assert.deepEqual(auth.calls.setClaims, [])
})

test('verify-admin checks revocation, and a revoked token is a 401, not a 500', async () => {
  const auth = setup({ tokens: { gone: revokedError(), ok: { uid: 'u', email: ADMIN, email_verified: true } }, users: { u: {} } })
  const res = fakeRes()
  await verifyAdmin(req('gone'), res)
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.code, 'session-revoked')
  assert.equal(res.body.isAdmin, false)
  await verifyAdmin(req('ok'), fakeRes())
  assert.ok(auth.calls.verify.length === 2 && auth.calls.verify.every((c) => c.checkRevoked === true),
    'every verifyIdToken call must pass checkRevoked')
})

test('requireAdmin checks revocation, and a revoked token is a 401', async () => {
  const auth = setup({ tokens: { gone: revokedError(), ok: { uid: 'u', email: ADMIN, email_verified: true } }, users: { u: {} } })
  const refused = await requireAdmin({ headers: { authorization: 'Bearer gone' } })
  assert.equal(refused.ok, false)
  assert.equal(refused.status, 401)
  assert.equal(refused.code, 'session-revoked')
  const allowed = await requireAdmin({ headers: { authorization: 'Bearer ok' } })
  assert.equal(allowed.ok, true)
  assert.ok(auth.calls.verify.every((c) => c.checkRevoked === true))
})

/* ── The sweep script ─────────────────────────────────────────────────────── */

const { sweepAdminClaims } = await import('../../scripts/sweep-admin-claims.mjs')

function sweepAccounts() {
  process.env.ADMIN_EMAILS = ADMIN
  const auth = fakeAuth({
    pageSize: 2, // three pages for five accounts
    users: {
      boss: { email: ADMIN, emailVerified: true, customClaims: { admin: true } },
      'ex-admin': { email: 'gone@example.com', emailVerified: true, customClaims: { admin: true, beta: 'yes' } },
      // On the allowlist but never proved the address: not an administrator.
      squatter: { email: ADMIN.toUpperCase(), emailVerified: false, customClaims: { admin: true } },
      plain: { email: 'plain@example.com', emailVerified: true, customClaims: {} },
      late: { email: 'late@example.com', emailVerified: true, customClaims: { admin: true } },
    },
  })
  install({ auth, db: fakeDb() })
  return auth
}

test('the sweep is a dry run unless told otherwise: it lists the stale claims and writes nothing', async () => {
  const auth = sweepAccounts()
  const lines = []
  const out = await sweepAdminClaims(auth, { log: (l) => lines.push(l) })
  assert.equal(out.scanned, 5, 'every page must be walked')
  assert.deepEqual(out.stale.map((s) => s.uid).sort(), ['ex-admin', 'late', 'squatter'])
  assert.deepEqual(out.cleared, [])
  assert.deepEqual(auth.calls.setClaims, [])
  assert.deepEqual(auth.calls.revoke, [])
  assert.equal(lines.length, 3)
})

test('--apply clears only the stale claims, keeps the other claims and revokes each account', async () => {
  const auth = sweepAccounts()
  const out = await sweepAdminClaims(auth, { apply: true })
  assert.deepEqual(out.cleared.sort(), ['ex-admin', 'late', 'squatter'])
  assert.deepEqual(auth.calls.revoke.sort(), ['ex-admin', 'late', 'squatter'])
  assert.deepEqual(auth.accounts.get('ex-admin').customClaims, { beta: 'yes' })
  assert.equal(auth.accounts.get('boss').customClaims.admin, true, 'a current administrator keeps the claim')
})

/* ── Revoke first, clear second (fix round 2, item 1) ─────────────────────── */

test('the stale claim is cleared AFTER the sessions are revoked, never before', async () => {
  const auth = setup({
    tokens: { t: token('ex-admin', { admin: true }) },
    users: { 'ex-admin': { customClaims: { admin: true } } },
  })
  await verifyAdmin(req('t'), fakeRes())
  assert.deepEqual(auth.calls.order, ['revoke:ex-admin', 'claims:ex-admin'])
})

test('if the revoke fails the claim stays, so the next call finds it and tries again', async () => {
  process.env.ADMIN_EMAILS = ADMIN
  const auth = fakeAuth({
    tokens: { t: token('ex-admin', { admin: true }) },
    users: { 'ex-admin': { customClaims: { admin: true } } },
    failRevoke: ['ex-admin'],
  })
  install({ auth, db: fakeDb() })
  const res = fakeRes()
  await verifyAdmin(req('t'), res)
  assert.equal(res.body.claimUpdated, false)
  assert.equal(auth.accounts.get('ex-admin').customClaims.admin, true, 'the claim must still be there to be found again')
  assert.deepEqual(auth.calls.setClaims, [])
})

test('the sweep revokes before it clears the claim', async () => {
  const auth = sweepAccounts()
  await sweepAdminClaims(auth, { apply: true })
  for (const uid of ['ex-admin', 'late', 'squatter']) {
    assert.ok(auth.calls.order.indexOf(`revoke:${uid}`) < auth.calls.order.indexOf(`claims:${uid}`), `${uid}: revoke must come first`)
  }
})

test('one account failing does not stop the sweep, and the failure is reported with the claim left in place', async () => {
  process.env.ADMIN_EMAILS = ADMIN
  const auth = fakeAuth({
    users: {
      a: { email: 'a@example.com', emailVerified: true, customClaims: { admin: true } },
      b: { email: 'b@example.com', emailVerified: true, customClaims: { admin: true } },
      c: { email: 'c@example.com', emailVerified: true, customClaims: { admin: true } },
    },
    failRevoke: ['b'],
    failSetClaims: ['c'],
  })
  const out = await sweepAdminClaims(auth, { apply: true })
  assert.deepEqual(out.cleared, ['a'])
  assert.deepEqual(out.failed.map((f) => f.uid), ['b', 'c'])
  assert.match(out.failed[0].error, /revokeRefreshTokens failed/)
  assert.equal(auth.accounts.get('b').customClaims.admin, true, 'revoke failed first, so the claim is still there for a retry')
})

test('the sweep prints the Firebase project id before it acts, and exits non-zero on failures', () => {
  const src = stripComments(read('scripts/sweep-admin-claims.mjs'))
  const projectAt = src.indexOf('Firebase project:')
  assert.ok(projectAt > 0, 'the project id must be printed')
  assert.ok(projectAt < src.indexOf('await sweepAdminClaims(adminAuth()'), 'before the sweep starts')
  assert.match(src, /process\.exitCode = 1/)
})
