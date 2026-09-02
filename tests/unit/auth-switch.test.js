import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  accountProviderIds,
  accountSelectionOutcome,
  authSwitchOutcome,
  isCurrentAuthSession,
} from '../../src/utils/authSwitch.js'

test('provider migration preserves every linked provider', () => {
  assert.deepEqual(
    accountProviderIds({
      provider: 'password',
      providerData: [{ providerId: 'google.com' }, { providerId: 'password' }],
    }),
    ['google.com', 'password'],
  )
  assert.deepEqual(accountProviderIds({ provider: 'google.com' }), ['google.com'])
  assert.deepEqual(accountProviderIds({}), ['password'])
})

test('Firebase popup failures map to exact discriminated switch outcomes', () => {
  assert.equal(authSwitchOutcome({ code: 'auth/popup-closed-by-user' }).outcome, 'cancelled')
  assert.equal(authSwitchOutcome({ code: 'auth/cancelled-popup-request' }).code, 'cancelled')
  assert.equal(authSwitchOutcome({ code: 'auth/popup-blocked' }).outcome, 'popupBlocked')
  assert.equal(authSwitchOutcome({ code: 'auth/network-request-failed' }).outcome, 'error')
  assert.deepEqual(
    authSwitchOutcome('requiresPassword', { email: 'person@example.com' }),
    { outcome: 'requiresPassword', code: 'requiresPassword', email: 'person@example.com' },
  )
})

test('a different Google identity is reported honestly after Firebase commits it', () => {
  const credential = {
    user: { uid: 'actual-uid', email: 'actual@example.com', displayName: 'Actual Person' },
  }
  const result = accountSelectionOutcome(credential, 'requested-uid')
  assert.equal(result.outcome, 'selectedDifferentAccount')
  assert.equal(result.actualUser.uid, 'actual-uid')
  assert.equal(result.actualUser.email, 'actual@example.com')
  assert.equal(result.user, credential.user)
  assert.equal(accountSelectionOutcome(credential, 'actual-uid').outcome, 'switched')
})

test('stale profile hydration is rejected after auth epoch or uid changes', () => {
  const epochRef = { current: 4 }
  assert.equal(isCurrentAuthSession(epochRef, 4, 'uid-b', { uid: 'uid-b' }), true)
  assert.equal(isCurrentAuthSession(epochRef, 3, 'uid-a', { uid: 'uid-b' }), false)
  assert.equal(isCurrentAuthSession(epochRef, 4, 'uid-a', { uid: 'uid-b' }), false)
  assert.equal(isCurrentAuthSession(epochRef, 4, 'uid-b', null), false)
})

test('account switching never signs out before target authentication', async () => {
  const source = await readFile(new URL('../../src/contexts/AuthContext.jsx', import.meta.url), 'utf8')
  const switchBody = source.slice(source.indexOf('const switchAccount'), source.indexOf('const removeKnownAccount'))
  assert.ok(switchBody.includes('signInWithPopup'))
  assert.ok(!switchBody.includes('signOut('))
  for (const outcome of ['switched', 'cancelled', 'popupBlocked', 'requiresPassword', 'error']) {
    assert.ok(
      source.includes(`'${outcome}'`) || (await readFile(new URL('../../src/utils/authSwitch.js', import.meta.url), 'utf8')).includes(`'${outcome}'`),
      `missing outcome ${outcome}`,
    )
  }
})

test('legacy login window gate is removed and nav handles switch outcomes in place', async () => {
  const [topBar, app, pillNav] = await Promise.all([
    readFile(new URL('../../src/components/TopBar.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/components/PillNav.jsx', import.meta.url), 'utf8'),
  ])
  assert.ok(!topBar.includes("window.open(`${window.location.origin}/login?gate=1`"))
  assert.ok(!app.includes('gate=1'))
  assert.ok(pillNav.includes('switchingUid'))
  assert.ok(pillNav.includes('aria-live="polite"'))
  assert.ok(!pillNav.includes("navigate('/login', { state: { email: res.email"))
})

test('forced password switching and prompt re-entrancy are guarded', async () => {
  const [popup, prompt, pillNav, auth] = await Promise.all([
    readFile(new URL('../../src/components/LoginPopup.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/contexts/LoginPromptContext.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/components/PillNav.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/contexts/AuthContext.jsx', import.meta.url), 'utf8'),
  ])
  assert.ok(popup.includes('!resetMode && !passwordOnly'))
  assert.ok(popup.includes('!passwordOnly && <div className="auth-links">'))
  assert.ok(popup.includes('readOnly={lockEmail}'))
  // Switching account must land focus on the password field — the email is
  // already filled and read-only, so anywhere else costs a keyboard user a tab
  // every time. This used to be pinned as a bare ref={passwordRef}; LoginPopup
  // now takes the shared useModalDialog contract and asks for the same landing
  // spot through its initialFocus selector. Same guarantee, named mechanism.
  assert.ok(popup.includes("initialFocus: passwordOnly ? '#ui-login-password' : '.auth-google-btn'"))
  assert.ok(prompt.includes('if (pendingPromiseRef.current) return pendingPromiseRef.current'))
  assert.ok(prompt.includes('key={prompt.id}'))
  assert.ok(prompt.includes("passwordOnly: opts.mode === 'switch'"))
  assert.ok(pillNav.includes('switchLockRef.current = true'))
  assert.ok(pillNav.includes('switchLockRef.current = false'))
  assert.ok(pillNav.includes('finally'))
  assert.ok(auth.includes("prompt: 'select_account'"))
  assert.ok(auth.includes('++authEpochRef.current'))
  assert.ok(auth.includes('isCurrentAuthSession(authEpochRef, authEpoch, expectedUid, firebaseAuth.currentUser)'))
  assert.ok(pillNav.includes('requestAnimationFrame(() => accountBtnRef.current?.focus())'))
})
