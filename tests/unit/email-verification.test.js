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
import {
  needsEmailVerification, verifyLinkSettings, verifyBarVisible, verifyErrorText, sendVerificationLink,
  VERIFY_ERRORS, VERIFY_ERROR_FALLBACK, readVerifyDismissed, writeVerifyDismissed,
} from '../../src/utils/emailVerification.js'

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
  assert.match(body, /sendVerificationLink\(A, cred\.user, window\.location\.origin\)/)
  assert.match(body, /\.catch\(/)
  assert.doesNotMatch(body, /await sendVerificationLink/)
  assert.doesNotMatch(body, /A\.sendEmailVerification/)
})

test('a signup send that settles after the account changed is ignored', () => {
  const body = callbackBody(stripComments(read('src/contexts/AuthContext.jsx')), 'signup')
  assert.match(body, /A\.auth\.currentUser\?\.uid === sentFor/)
  assert.match(body, /if \(stillSentFor\(\)\) setSignupVerification\('sent'\)/)
  assert.match(body, /if \(stillSentFor\(\)\) setSignupVerification\('failed'\)/)
})

test('signup keeps the result of the send for onboarding to report', () => {
  const body = callbackBody(stripComments(read('src/contexts/AuthContext.jsx')), 'signup')
  assert.match(body, /setSignupVerification\('pending'\)/)
  assert.match(body, /setSignupVerification\('sent'\)/)
  assert.match(body, /setSignupVerification\('failed'\)/)
})

test('the resend from Settings and the bar passes the same return address', () => {
  const body = callbackBody(stripComments(read('src/contexts/AuthContext.jsx')), 'sendVerificationEmail')
  assert.match(body, /await sendVerificationLink\(A, firebaseUser, window\.location\.origin\)/)
  assert.doesNotMatch(body, /A\.sendEmailVerification/)
})

function fakeSdk(reject) {
  const calls = []
  return {
    calls,
    sendEmailVerification: async (...args) => {
      calls.push(args)
      if (reject && calls.length === 1) throw { code: reject }
    },
  }
}
const someUser = { uid: 'u1' }

test('the link is sent with its return address', async () => {
  const A = fakeSdk()
  await sendVerificationLink(A, someUser, 'https://uil4b.com')
  assert.deepEqual(A.calls, [[someUser, { url: 'https://uil4b.com/settings?verified=1' }]])
})

test('a refused return address falls back to the plain link, once', async () => {
  for (const code of ['auth/unauthorized-continue-uri', 'auth/invalid-continue-uri', 'auth/missing-continue-uri']) {
    const A = fakeSdk(code)
    await sendVerificationLink(A, someUser, 'https://uil4b.com')
    assert.equal(A.calls.length, 2, code)
    assert.equal(A.calls[1].length, 1, `${code}: the retry carries no settings`)
    assert.equal(A.calls[1][0], someUser)
  }
  // A second refusal is the caller's to report, not another retry.
  const stubborn = { calls: [], sendEmailVerification: async (...a) => { stubborn.calls.push(a); throw { code: 'auth/unauthorized-continue-uri' } } }
  await assert.rejects(sendVerificationLink(stubborn, someUser, 'https://uil4b.com'), { code: 'auth/unauthorized-continue-uri' })
  assert.equal(stubborn.calls.length, 2)
})

test('any other send error is thrown without a retry', async () => {
  const A = fakeSdk('auth/too-many-requests')
  await assert.rejects(sendVerificationLink(A, someUser, 'https://uil4b.com'), { code: 'auth/too-many-requests' })
  assert.equal(A.calls.length, 1)
})

test('the link brings the person back to Settings, which reads ?verified=1', () => {
  assert.deepEqual(verifyLinkSettings('https://uil4b.com'), { url: 'https://uil4b.com/settings?verified=1' })
  const settings = stripComments(read('src/pages/Settings.jsx'))
  assert.match(settings, /get\('verified'\) !== '1'/)
  // Signed out, the parameter proves nothing: Settings never says "verified" to it.
  assert.doesNotMatch(settings, /Sign in to carry on/)
  assert.match(settings, /if \(!user\) return/)
})

test('the bar and Settings share one set of refusal copy', () => {
  assert.equal(verifyErrorText({ code: 'auth/too-many-requests' }), VERIFY_ERRORS['auth/too-many-requests'])
  assert.equal(verifyErrorText({ code: 'auth/something-new' }), VERIFY_ERROR_FALLBACK)
  assert.equal(verifyErrorText(undefined), VERIFY_ERROR_FALLBACK)
  assert.doesNotMatch(stripComments(read('src/pages/Settings.jsx')), /VERIFY_ERRORS\s*=/)
  assert.doesNotMatch(stripComments(read('src/components/NoticeStack.jsx')), /VERIFY_ERRORS\s*=/)
})

test('the bar is for an owing account, online, away from onboarding and settings', () => {
  const on = { owed: true, online: true }
  assert.equal(verifyBarVisible({ ...on, pathname: '/projects' }), true)
  assert.equal(verifyBarVisible({ ...on, pathname: '/create/palette' }), true)
  assert.equal(verifyBarVisible({ ...on, pathname: '/onboarding' }), false)
  assert.equal(verifyBarVisible({ ...on, pathname: '/settings' }), false)
  assert.equal(verifyBarVisible({ ...on, pathname: '/settings/' }), false)
  assert.equal(verifyBarVisible({ owed: false, online: true, pathname: '/projects' }), false)
  assert.equal(verifyBarVisible({ owed: true, online: false, pathname: '/projects' }), false)
})

test('a dismissal is remembered for the visit, per account', () => {
  const store = new Map()
  globalThis.sessionStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
  }
  try {
    assert.equal(readVerifyDismissed('uid-a'), false)
    writeVerifyDismissed('uid-a')
    assert.equal(readVerifyDismissed('uid-a'), true)
    assert.equal(readVerifyDismissed('uid-b'), false)
    assert.ok(store.has('vs-verify-dismissed:uid-a'))
  } finally {
    delete globalThis.sessionStorage
  }
  // No storage at all (private mode): the bar is shown, not hidden.
  assert.equal(readVerifyDismissed('uid-a'), false)
})

test('the reminder bar is a third row in the strip and re-checks on focus', () => {
  const stack = stripComments(read('src/components/NoticeStack.jsx'))
  assert.match(stack, /<VerifyNotice \/>/)
  assert.match(stack, /useVerificationRecheck\(/)
  // The live region is the message text, never the wrapper holding the buttons,
  // and a failed line is its own alert beside it.
  assert.match(stack, /<p className="sync-notice-msg" role="status">/)
  assert.match(stack, /<p className="sync-notice-msg" role="alert">/)
  assert.doesNotMatch(stack, /aria-live=/)
  assert.doesNotMatch(stack, /verify-notice"\s+data-testid="verify-notice"\s+data-verify-state=\{[^}]*\}\s+role=/)
  assert.match(stack, /dismissRef\.current\?\.focus\(\)/)
  const hook = stripComments(read('src/hooks/useVerificationRecheck.js'))
  assert.match(hook, /addEventListener\('focus'/)
  assert.match(hook, /addEventListener\('visibilitychange'/)
  assert.match(stripComments(read('src/pages/Settings.jsx')), /useVerificationRecheck\(/)
})

test('onboarding says to check the inbox, or that the send failed', () => {
  const src = stripComments(read('src/pages/Onboarding.jsx'))
  assert.match(src, /Check your inbox: we sent a verification link to/)
  assert.match(src, /Your verification link didn't send\./)
  assert.match(src, /onb-greeting onb-verify-line.*role="status"/)
  // A failed send is read in the normal text colour, and a long address wraps.
  assert.match(src, /onb-verify-line--failed/)
  const css = read('src/styles/global.css')
  assert.match(css, /\.onb-verify-line\{overflow-wrap:anywhere\}/)
  assert.match(css, /\.onb-verify-line--failed\{color:var\(--t0\)\}/)
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
