// An account's email address is proved, not assumed.
//
// `emailVerified` is read by the admin table and by role resolution, which
// refuses every elevated role to an unverified address. Password accounts are
// sent a link at signup and from Settings.
//
// The rule is tested directly. The two call sites are read from source because
// the signed-in test double refuses account creation, so no browser test can
// reach `signup()`.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { needsEmailVerification } from '../../src/utils/emailVerification.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const passwordUser = (emailVerified) => ({
  email: 'someone@example.com',
  emailVerified,
  providerData: [{ providerId: 'password' }],
})

/** The body of `const name = useCallback(async (...) => { ... }` in AuthContext. */
function callbackBody(src, name) {
  const start = src.indexOf(`const ${name} = useCallback(`)
  assert.ok(start >= 0, `AuthContext defines ${name}`)
  const end = src.indexOf('}, [', start)
  assert.ok(end > start, `${name} has a dependency list`)
  return src.slice(start, end)
}

test('an unverified password account owes verification', () => {
  assert.equal(needsEmailVerification(passwordUser(false)), true)
})

test('a verified password account does not', () => {
  assert.equal(needsEmailVerification(passwordUser(true)), false)
})

test('the flag held in state wins over a stale User object', () => {
  // reload() updates the User in place; the caller passes what it re-read.
  assert.equal(needsEmailVerification(passwordUser(false), true), false)
  assert.equal(needsEmailVerification(passwordUser(true), false), true)
})

test('a Google-only account is never asked', () => {
  const google = { email: 'someone@example.com', emailVerified: false, providerData: [{ providerId: 'google.com' }] }
  assert.equal(needsEmailVerification(google), false)
})

test('no user, or no address, owes nothing', () => {
  assert.equal(needsEmailVerification(null), false)
  assert.equal(needsEmailVerification({ emailVerified: false, providerData: [{ providerId: 'password' }] }), false)
})

test('signup sends a verification link to the new account', () => {
  const body = callbackBody(stripComments(read('src/contexts/AuthContext.jsx')), 'signup')
  // A failed send must not fail, or hold up, the signup it follows.
  assert.match(body, /A\.sendEmailVerification\(cred\.user\)\.catch\(/)
  assert.doesNotMatch(body, /await A\.sendEmailVerification/)
})

test('an email change is proved by a link to the new address before it applies', () => {
  const body = callbackBody(stripComments(read('src/contexts/AuthContext.jsx')), 'updateEmail')
  assert.match(body, /A\.verifyBeforeUpdateEmail\(firebaseUser, newEmail\)/)
  assert.doesNotMatch(body, /A\.updateEmail\(/)
})

test('both Firebase brokers expose the calls AuthContext uses', () => {
  for (const file of ['src/utils/firebaseAccess.js', 'src/utils/firebaseAccess.lazy.js']) {
    const src = stripComments(read(file))
    for (const name of ['sendEmailVerification', 'verifyBeforeUpdateEmail', 'reload']) {
      assert.match(src, new RegExp(`\\b${name}\\b`), `${file} exposes ${name}`)
    }
  }
})
