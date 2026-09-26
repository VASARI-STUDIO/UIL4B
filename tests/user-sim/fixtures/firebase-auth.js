/* `firebase/auth`, as the TEST BUILD sees it. UIL4B_SIGNED_IN_FIXTURE_ONLY.
 *
 * Routed here by the `uil4b-test-session-double` plugin in vite.config.js,
 * which exists ONLY when `mode === 'test'`. A production build never constructs
 * that plugin, so `firebase/auth` resolves to the real package and this file is
 * not in the graph at all. See test-session.js for the whole argument, and
 * tests/unit/test-session-not-in-production.test.js for the proof.
 *
 * ── THE DISPATCH RULE, AND WHY IT IS AN OBJECT IDENTITY CHECK ─────────────
 *
 * Every override below asks ONE question: is the auth (or user) it was handed
 * the fake one? If it is not, the call goes straight to the real SDK, byte for
 * byte. So when no session is declared, `getAuth()` returns the REAL Auth
 * instance, every downstream call therefore takes the real branch, and the 56
 * specs that run signed out are running against the real Firebase SDK exactly
 * as they were before this file existed.
 *
 * That property is structural rather than a flag someone must remember to
 * check: there is no fake object to dispatch on, so there is no fake path to
 * take. tests/unit/test-session-not-in-production.test.js pins it by asserting
 * every override in this file dispatches on the symbol.
 */
import {
  getAuth as realGetAuth,
  onAuthStateChanged as realOnAuthStateChanged,
  signOut as realSignOut,
  signInWithEmailAndPassword as realSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as realCreateUserWithEmailAndPassword,
  signInWithPopup as realSignInWithPopup,
  signInWithCredential as realSignInWithCredential,
  sendPasswordResetEmail as realSendPasswordResetEmail,
  getAdditionalUserInfo as realGetAdditionalUserInfo,
  updateProfile as realUpdateProfile,
  updateEmail as realUpdateEmail,
  updatePassword as realUpdatePassword,
  reauthenticateWithCredential as realReauthenticateWithCredential,
  reauthenticateWithPopup as realReauthenticateWithPopup,
  sendEmailVerification as realSendEmailVerification,
  verifyBeforeUpdateEmail as realVerifyBeforeUpdateEmail,
  reload as realReload,
} from 'firebase/auth'
import { fakeAuth, IS_FAKE_AUTH, authError, FIXTURE_MARKER, authFailFor } from './test-session.js'

// GoogleAuthProvider, EmailAuthProvider and everything else the app imports
// come through untouched. A name explicitly exported below shadows this.
export * from 'firebase/auth'

const isFakeAuth = (a) => !!(a && a[IS_FAKE_AUTH])
const isFakeUser = (u) => !!(u && fakeAuth && u === fakeAuth.currentUser)

export function getAuth(app) {
  // The fake is returned INSTEAD of constructing the real Auth, not alongside
  // it. That matters: a real `getAuth()` starts persistence, reads IndexedDB
  // and can refresh a token over the network. Not calling it is what makes
  // "zero requests to Firebase hosts" a property of the design rather than
  // something a route handler has to catch.
  return fakeAuth || realGetAuth(app)
}

export function onAuthStateChanged(auth, next, error, complete) {
  if (!isFakeAuth(auth)) return realOnAuthStateChanged(auth, next, error, complete)
  return auth.onAuthStateChanged(next)
}

export function signOut(auth) {
  if (!isFakeAuth(auth)) return realSignOut(auth)
  return auth.signOut()
}

/* Signing IN is deliberately refused rather than faked.
 *
 * A test session is declared before the page loads; there is no credential
 * here for a form to check and inventing "any password works" would make the
 * login form look like it validated something. A named refusal is what a spec
 * driving that form should see — it is a real Firebase error code, so the app's
 * own error handling renders it, and the message says what to do instead. */
const refuse = (what) => Promise.reject(authError(
  'auth/operation-not-supported-in-this-environment',
  `[${FIXTURE_MARKER}] ${what} is not available in a declared test session. `
  + 'Use signIn(page, {plan}) from tests/user-sim/helpers.js to choose the session '
  + 'before the page loads.',
))

export function signInWithEmailAndPassword(auth, email, password) {
  if (!isFakeAuth(auth)) return realSignInWithEmailAndPassword(auth, email, password)
  return refuse('Signing in with a password')
}

export function createUserWithEmailAndPassword(auth, email, password) {
  if (!isFakeAuth(auth)) return realCreateUserWithEmailAndPassword(auth, email, password)
  return refuse('Creating an account')
}

export function signInWithPopup(auth, provider, resolver) {
  if (!isFakeAuth(auth)) return realSignInWithPopup(auth, provider, resolver)
  return refuse('The Google popup')
}

export function signInWithCredential(auth, credential) {
  if (!isFakeAuth(auth)) return realSignInWithCredential(auth, credential)
  return refuse('Signing in with a credential')
}

export function sendPasswordResetEmail(auth, email, settings) {
  if (!isFakeAuth(auth)) return realSendPasswordResetEmail(auth, email, settings)
  return refuse('Sending a password reset email')
}

export function getAdditionalUserInfo(credential) {
  // Only ever reached with a real credential; a declared session never mints
  // one (every sign-in path above refuses). Guarded anyway so a future caller
  // gets `null` — what the real function returns for an unknown credential —
  // rather than a throw inside somebody's try/catch.
  try { return realGetAdditionalUserInfo(credential) } catch { return null }
}

export function updateProfile(user, fields) {
  if (!isFakeUser(user)) return realUpdateProfile(user, fields)
  if (fields?.displayName !== undefined) user.displayName = fields.displayName
  if (fields?.photoURL !== undefined) user.photoURL = fields.photoURL
  fakeAuth.notify()
  return Promise.resolve()
}

export function updateEmail(user, newEmail) {
  if (!isFakeUser(user)) return realUpdateEmail(user, newEmail)
  const refused = authFailFor('updateEmail')
  if (refused) return Promise.reject(refused)
  user.email = newEmail
  user.providerData[0].email = newEmail
  fakeAuth.notify()
  return Promise.resolve()
}

/* Links that would be emailed are recorded in `fakeAuth.mail` instead, so a
 * spec can read what was sent and to whom. Opening one is modelled by the
 * spec setting `fakeAuth.account.emailVerified`, the server-side copy of the
 * flag; only `reload()` brings it onto the user, as the real SDK does. */
export function sendEmailVerification(user, settings) {
  if (!isFakeUser(user)) return realSendEmailVerification(user, settings)
  const refused = authFailFor('sendEmailVerification')
  if (refused) return Promise.reject(refused)
  fakeAuth.mail.push({ kind: 'verify-email', to: user.email })
  return Promise.resolve()
}

export function verifyBeforeUpdateEmail(user, newEmail, settings) {
  if (!isFakeUser(user)) return realVerifyBeforeUpdateEmail(user, newEmail, settings)
  const refused = authFailFor('verifyBeforeUpdateEmail')
  if (refused) return Promise.reject(refused)
  // Nothing about the user changes until the link is opened.
  fakeAuth.mail.push({ kind: 'change-email', to: newEmail })
  return Promise.resolve()
}

export function reload(user) {
  if (!isFakeUser(user)) return realReload(user)
  user.emailVerified = fakeAuth.account.emailVerified === true
  return Promise.resolve()
}

export function updatePassword(user, newPassword) {
  if (!isFakeUser(user)) return realUpdatePassword(user, newPassword)
  return Promise.resolve()
}

/* Reauthentication SUCCEEDS for a declared session, and that is a decision.
 *
 * The alternative — refusing — would make Settings' email, password and delete
 * flows unreachable, which is a large part of what this fixture is for. What is
 * lost is the ability to test a WRONG password, and nothing here claims to test
 * that: the credential is never checked against anything, so a spec must not
 * read a resolved reauthentication as proof the password was right. */
export function reauthenticateWithCredential(user, credential) {
  if (!isFakeUser(user)) return realReauthenticateWithCredential(user, credential)
  return Promise.resolve({ user, providerId: 'password', operationType: 'reauthenticate' })
}

export function reauthenticateWithPopup(user, provider, resolver) {
  if (!isFakeUser(user)) return realReauthenticateWithPopup(user, provider, resolver)
  return Promise.resolve({ user, providerId: 'google.com', operationType: 'reauthenticate' })
}
