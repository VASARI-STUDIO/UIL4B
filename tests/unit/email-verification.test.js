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
  VERIFY_RESEND_COOLDOWN_S, verifyResendBlocked, verifyResendLabel, verifiedLandingMessage,
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
  // Signed out, the parameter proves nothing: Settings says the link was opened
  // and offers Sign in, and says "verified" only after the re-read says so.
  assert.match(settings, /verifiedLandingMessage\(\{ signedIn: false \}\)/)
  assert.match(settings, /requireLogin\(/)
  assert.match(settings, /verifiedLandingMessage\(\{ signedIn: true, verified \}\)/)
})

test('the landing from the link says what is true for who is there', () => {
  // Signed out (another browser or device): the link was opened, nothing is claimed.
  const out = verifiedLandingMessage({ signedIn: false })
  assert.equal(out.text, 'Your email link was opened. Sign in to finish.')
  assert.equal(out.signIn, true)
  assert.doesNotMatch(out.text, /verified/i)
  // Signed in and the re-read shows verified.
  assert.deepEqual(verifiedLandingMessage({ signedIn: true, verified: true }), { text: 'Email verified', kind: 'success', signIn: false })
  // Signed in as an account the link did not verify: said plainly, no Sign in.
  const other = verifiedLandingMessage({ signedIn: true, verified: false })
  assert.match(other.text, /still isn't verified/)
  assert.equal(other.signIn, false)
  // Unknown is silent rather than a guess.
  assert.equal(verifiedLandingMessage({ signedIn: true, verified: null }), null)
})

test('Resend waits out a cooldown after a send, and stays usable to focus', () => {
  assert.equal(VERIFY_RESEND_COOLDOWN_S, 30)
  assert.equal(verifyResendBlocked('idle', 0), false)
  assert.equal(verifyResendBlocked('sending', 0), true)
  assert.equal(verifyResendBlocked('sent', 12), true)
  assert.equal(verifyResendBlocked('sent', 0), false)
  assert.equal(verifyResendBlocked('failed', 0), false)
  assert.equal(verifyResendLabel('idle', 0), 'Resend link')
  assert.equal(verifyResendLabel('sending', 0), 'Sending…')
  assert.equal(verifyResendLabel('sent', 30), 'Resend in 30s')
  assert.equal(verifyResendLabel('sent', 1), 'Resend in 1s')
  assert.equal(verifyResendLabel('sent', 0), 'Resend link')
  const stack = stripComments(read('src/components/NoticeStack.jsx'))
  // aria-disabled, never disabled: a disabled button that holds focus drops it to <body>.
  assert.match(stack, /aria-disabled=\{blocked \|\| undefined\}/)
  assert.doesNotMatch(stack, /[^-]disabled=\{/)
  // Resend is not hidden by the sent state.
  assert.doesNotMatch(stack, /state !== 'sent' &&/)
})

test('the notice strip sits right after the skip link, before the nav and the page', () => {
  const app = stripComments(read('src/App.jsx'))
  const skip = app.indexOf('className="skip-link"')
  const strip = app.indexOf('<NoticeStack />')
  const shell = app.indexOf('<AppInner ')
  assert.ok(skip > 0 && strip > skip, 'the strip follows the skip link')
  assert.ok(strip < shell, 'the strip precedes the app shell (nav and #main)')
  assert.equal(app.split('<NoticeStack />').length - 1, 1, 'mounted once')
  assert.doesNotMatch(app, /tabIndex=\{[1-9]/, 'no positive tabindex')
})

test('the bar and Settings share one set of refusal copy', () => {
  assert.equal(verifyErrorText({ code: 'auth/too-many-requests' }), VERIFY_ERRORS['auth/too-many-requests'])
  assert.equal(verifyErrorText({ code: 'auth/something-new' }), VERIFY_ERROR_FALLBACK)
  assert.equal(verifyErrorText(undefined), VERIFY_ERROR_FALLBACK)
  assert.doesNotMatch(stripComments(read('src/pages/Settings.jsx')), /VERIFY_ERRORS\s*=/)
  assert.doesNotMatch(stripComments(read('src/components/NoticeStack.jsx')), /VERIFY_ERRORS\s*=/)
})

test('the refusal copy is short enough for two lines beside Resend on a phone', () => {
  // The bar keeps one height, so every string it can show fits the ~28-character
  // column in two lines (56 characters at most, with room for a word break).
  for (const text of [...Object.values(VERIFY_ERRORS), VERIFY_ERROR_FALLBACK]) {
    assert.ok(text.length <= 52, `${text} is ${text.length} characters`)
  }
  assert.equal(VERIFY_ERROR_FALLBACK, "The link didn't send. Try again.")
})

test('the bar keeps one height in every state, and the phone sentence drops the address', () => {
  const css = stripComments(read('src/styles/global.css'))
  const stack = stripComments(read('src/components/NoticeStack.jsx'))
  // 62px above 520px, 54px at 520px and below, whatever the bar says.
  assert.match(css, /\.verify-notice\{align-items:center;min-height:62px\}/)
  const phone = css.match(/@media \(max-width:520px\)\{\s*\.verify-notice\{[^}]*\}[\s\S]*?\n\}/)
  assert.ok(phone, 'the phone block for the verify bar exists')
  assert.match(phone[0], /\.verify-notice\{[^}]*min-height:54px/)
  assert.match(phone[0], /\.verify-to\{display:none\}|\.verify-to[^{]*\{display:none\}/)
  // Backstop: two lines, and an address is ellipsised, never allowed to grow the bar.
  assert.match(css, /\.verify-notice \.sync-notice-msg\{[^}]*-webkit-line-clamp:2/)
  assert.match(css, /\.verify-notice \.verify-addr\{[^}]*text-overflow:ellipsis/)
  // The sent sentence keeps the address in the text, in a span a phone can hide.
  assert.match(stack, /Link sent<span className="verify-to"> to <span className="verify-addr">\{email\}<\/span><\/span>\. Check your inbox and spam folder\./)
  // The failed state wears the error tile and glyph.
  assert.match(css, /\.verify-notice\[data-verify-state="failed"\] \.sync-notice-ico\{[^}]*var\(--err\)/)
  assert.match(stack, /state === 'failed' \? <Alert \/>/)
})

test('Resend and Dismiss have 44px targets on a phone and on any touch screen, without growing the bar', () => {
  const css = stripComments(read('src/styles/global.css'))
  const block = css.match(/@media \(max-width:520px\),\(pointer:coarse\)\{[\s\S]*?\n\}/)
  assert.ok(block, 'a block for narrow widths and touch screens exists')
  assert.match(block[0], /\.verify-notice \.btn-s::after\{[^}]*inset:-8px 0/)
  assert.match(block[0], /\.verify-notice \.sync-notice-dismiss::after\{[^}]*inset:-10px -14px -10px -6px/)
  assert.doesNotMatch(block[0], /min-height|padding/)
})

test('a keyboard landing on <main> draws no page-sized frame', () => {
  const css = stripComments(read('src/styles/global.css'))
  assert.match(css, /main\[tabindex="-1"\]:focus-visible\{outline:none\}/)
  assert.match(stripComments(read('src/App.jsx')), /<main[^>]*id="main"[^>]*tabIndex=\{-1\}/)
})

test('signing in from the signed-out landing re-reads the account and says the answer', () => {
  const settings = stripComments(read('src/pages/Settings.jsx'))
  assert.match(settings, /requireLogin\('finish verifying your email'\)\.then\(\(signedIn\) =>/)
  assert.match(settings, /if \(signedIn\) \{\s*setActive\('account'\)\s*setPhoneView\('section'\)\s*setFinishAfterSignIn\(true\)/)
  // The re-read runs once the account is in (the callback belongs to the signed-in user).
  assert.match(settings, /if \(!finishAfterSignIn \|\| !user\) return\s*setFinishAfterSignIn\(false\)\s*refreshEmailVerified\(\)\.then/)
  // An account that changed mid-read answers null, which says nothing.
  const refresh = callbackBody(stripComments(read('src/contexts/AuthContext.jsx')), 'refreshEmailVerified')
  assert.match(refresh, /reloadVerified\(A, firebaseUser\)/)
  assert.match(refresh, /if \(verified === null\) return null/)
  assert.equal(verifiedLandingMessage({ signedIn: true, verified: null }), null)
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
  // Two live regions that stay mounted, the status text and a separate alert
  // beside it; neither wraps the other, and neither wraps the buttons.
  assert.match(stack, /<span role="status">/)
  assert.match(stack, /<span role="alert">/)
  assert.doesNotMatch(stack, /<p[^>]*role=/)
  assert.doesNotMatch(stack, /aria-live=/)
  assert.doesNotMatch(stack, /data-verify-state=\{[^}]*\}\s+role=/)
  // Focus is handed on when the bar or Resend leaves the page, in every state.
  assert.match(stack, /useFocusFallback\(ref, \(\) => document\.getElementById\('main'\)\)/)
  assert.match(stack, /useFocusFallback\(ref, \(\) => dismissRef\.current\)/)
  const hook = stripComments(read('src/hooks/useVerificationRecheck.js'))
  assert.match(hook, /addEventListener\('focus'/)
  assert.match(hook, /addEventListener\('visibilitychange'/)
  assert.match(stripComments(read('src/pages/Settings.jsx')), /useVerificationRecheck\(/)
})

test('onboarding says to check the inbox, or that the send failed', () => {
  const src = stripComments(read('src/pages/Onboarding.jsx'))
  assert.match(src, /Check your inbox: we sent a verification link to/)
  assert.match(src, /Your verification link didn't send\./)
  // The status region is on the page before the line arrives, so it is announced.
  assert.match(src, /<div role="status">\s*\{lineReady && verifyLine && <p className=\{`onb-greeting onb-verify-line/)
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
