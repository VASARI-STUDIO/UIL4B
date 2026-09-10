import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
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

// The gate half of this used to be pinned to two named files: App.jsx, and
// TopBar.jsx — which was the app's nav when the gate was written. TopBar has
// since been deleted (it was unreachable: App.jsx moved to PillNav, nothing
// rendered <TopBar>, and no built bundle contained a line of it), and a test
// that reads a deleted file by name fails for the wrong reason. Re-pinning the
// assertion to whichever file is the nav TODAY would only buy the next nav
// rewrite the same failure.
//
// So the invariant is kept and the filenames are dropped. "Signing in must
// never be punted to a popup window" is a property of the WHOLE app, not of one
// component, and scanning src/ for it is both stricter than the two file-pinned
// checks were and immune to the next rename. The population floor is what stops
// it passing by walking nothing.
function srcFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return srcFiles(full)
    return /\.jsx?$/.test(entry.name) ? [full] : []
  })
}

test('legacy login window gate is removed and nav handles switch outcomes in place', async () => {
  const files = srcFiles(new URL('../../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
  assert.ok(files.length >= 150,
    `expected to walk the whole of src/, found only ${files.length} files`)
  const gated = files.filter((f) => fs.readFileSync(f, 'utf8').includes('gate=1'))
  assert.deepEqual(gated, [],
    'the legacy login popup gate is back. Signing in happens in place — a popup '
    + 'window is blocked by default on mobile and loses the return path.\n\n'
    + 'If the file named above is src/data/pipeline.js, the match is PROSE, not a '
    + 'gate: a backlog note has quoted the query flag literally, and this scan '
    + 'reads that file like any other because it is inside src/. Reword the note '
    + 'to describe the flag instead of spelling it. That is not a quirk of this '
    + 'test — a grep proof written into a file that ships is how the neighbouring '
    + 'item in that same pipeline came to disprove its own claim about uip-modal.')

  const pillNav = await readFile(new URL('../../src/components/PillNav.jsx', import.meta.url), 'utf8')
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
  // The identity guard, and it has two spellings for one meaning. The Firebase
  // deferral (docs/design/firebase-deferral-gated.patch, applied by
  // `npm run apply:gated`) replaces the static `firebaseAuth` with `authNow()`,
  // a synchronous peek that answers null until the SDK lands — which every one
  // of these guards already treats as "not the current session", the same
  // answer they give today when auth has not resolved yet.
  //
  // Both are pinned rather than loosened to `isCurrentAuthSession(`: the
  // FOURTH argument is the whole point of the call, and a version that passed
  // something else would still match a looser pattern.
  assert.ok(
    auth.includes('isCurrentAuthSession(authEpochRef, authEpoch, expectedUid, firebaseAuth.currentUser)')
    || auth.includes('isCurrentAuthSession(authEpochRef, authEpoch, expectedUid, authNow()?.auth?.currentUser)'),
    'the auth-epoch guard no longer compares against the live current user',
  )
  assert.ok(pillNav.includes('requestAnimationFrame(() => accountBtnRef.current?.focus())'))
})
