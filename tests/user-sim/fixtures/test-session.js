/* A SIGNED-IN SESSION THE APP CANNOT TELL FROM A REAL ONE — and that cannot
 * exist in a production build.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHY THIS FILE EXISTS
 * ═══════════════════════════════════════════════════════════════════════════
 * The acceptance suite had no way to be signed in. 20-billing-banner.spec.js
 * said so in its own header ("needs a signed-in user … which this suite has no
 * way to create") and injected a hand-written copy of BillingBanner's markup
 * instead. `multi-breakpoint-ux-audit` and `audit-coverage-not-run` both record
 * that whole CATEGORIES are unaudited because they are unreachable from a
 * signed-out session, and #388 shipped the plans overhaul with the caveat that
 * the `isPro` branches were "verified by reading them, not rendering them".
 *
 * Firebase's hosts are unreachable from the sandboxed runner by design — the
 * suite proves on every run that not one request escapes to accounts.google.com
 * — so a real sign-in was never available. What was available, and is what this
 * builds, is a Firebase that never needs the network at all.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THE SEAM, AND WHY IT IS THIS ONE
 * ═══════════════════════════════════════════════════════════════════════════
 * `src/contexts/AuthContext.jsx` is founder-gated by
 * docs/reference/human-validation-zones.md and is NOT TOUCHED by any of this.
 * It does not need to be. Every piece of session state in the app descends from
 * one line inside it:
 *
 *     onAuthStateChanged(firebaseAuth, (fbUser) => { … })
 *
 * where `firebaseAuth` is the `auth` export of `src/utils/firebase.js`. Give
 * that line a user and the ENTIRE app is signed in — `RequireAuth`,
 * `useSessionHint`, `canSaveProjects`, the project cap, `useSubscription()`,
 * the export gate and `auth.currentUser` (which is how #390's
 * `useModerationRole` reads roles without touching the gated file either).
 *
 * So the double is installed one level BELOW the gated file, at the two Firebase
 * entry points it imports: `firebase/auth` and `firebase/firestore`. See
 * `firebase-auth.js` and `firebase-firestore.js` beside this file, and the
 * `uil4b-test-session-double` plugin in vite.config.js that routes those two
 * specifiers here — ONLY under `vite build --mode test`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHY IT CANNOT SHIP
 * ═══════════════════════════════════════════════════════════════════════════
 * Three independent reasons, in order of how hard they are to defeat:
 *
 *   1. The redirect plugin is only constructed when `mode === 'test'`. A
 *      production `vite build` never creates it, so `firebase/auth` and
 *      `firebase/firestore` resolve to the real packages and nothing under
 *      tests/ is ever pulled into the graph.
 *   2. These files live under tests/, which is not an entry point of the
 *      production build and is not imported by anything under src/.
 *   3. Even in the test build the double is INERT until a session is declared
 *      on `window` by the Playwright helper, and no production page has one.
 *
 * Reason 1 is the one that matters, and it is asserted rather than argued:
 * tests/unit/test-session-not-in-production.test.js runs a real production
 * build and scans every emitted file for the markers below. It was verified by
 * planting a leak and watching it fail.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHAT IS NOT FAKED
 * ═══════════════════════════════════════════════════════════════════════════
 * The app. Nothing here re-implements a page, a gate, a plan or a cap. The
 * fixtures the repository already had (ui-system-pro.jsx, type-save.jsx,
 * user-home.jsx) mount COMPONENTS with props; this mounts nothing at all — the
 * real index.html boots the real app with the real router and the real
 * providers, and the only thing supplied is the answer Firebase would have
 * given. That is the difference between rendering a Pro branch and rendering a
 * Pro USER, and it is why /projects, /settings, /admin and the Pro half of
 * every gate are reachable now and were not before.
 */

/** The declaration `signIn()` writes with page.addInitScript, before any app code runs. */
export const SESSION_GLOBAL = '__UIL4B_TEST_SESSION__'

/* A literal that exists nowhere in src/ and nowhere in a production bundle.
 * tests/unit/test-session-not-in-production.test.js greps the production build
 * for it; the shims carry it too, so any one of the three files reaching dist/
 * fails that test. */
export const FIXTURE_MARKER = 'UIL4B_SIGNED_IN_FIXTURE_ONLY'

function declaration() {
  try {
    return (typeof window !== 'undefined' && window[SESSION_GLOBAL]) || null
  } catch {
    return null
  }
}

/**
 * Is a test session declared on this page?
 *
 * Read ONCE, at module evaluation, deliberately: `addInitScript` runs before
 * every page script, so the answer cannot change under the app, and a single
 * read means the two shims can never disagree about which world they are in.
 */
const DECLARED = declaration()

/** True when this page is running as a signed-in fixture. */
export const isTestSession = () => DECLARED !== null

/* ── The fake user ─────────────────────────────────────────────────────────
 *
 * Shaped to satisfy every reader in src/ rather than to mimic the whole
 * firebase User class:
 *   · uid / email / displayName / photoURL  — AuthContext's `user` and profile
 *   · providerData                          — utils/authSwitch accountProviderIds()
 *   · getIdToken / getIdTokenResult         — SubscriptionContext's billing calls
 *                                             and hooks/useModerationRole
 * Anything else a caller reaches for is `undefined`, which is what a partially
 * hydrated real user gives them too.
 */
function buildUser(d) {
  const providerId = d.provider || 'password'
  const claims = { ...(d.claims || {}) }
  const user = {
    uid: d.uid,
    email: d.email,
    displayName: d.displayName || '',
    photoURL: d.photoURL || '',
    emailVerified: d.emailVerified !== false,
    isAnonymous: false,
    phoneNumber: null,
    tenantId: null,
    providerId: 'firebase',
    providerData: [{
      providerId,
      uid: d.uid,
      email: d.email,
      displayName: d.displayName || '',
      photoURL: d.photoURL || '',
      phoneNumber: null,
    }],
    metadata: {
      creationTime: d.creationTime || new Date(Date.now() - 86_400_000).toUTCString(),
      lastSignInTime: new Date().toUTCString(),
    },
    // A token is a STRING to every caller in src/ — it is put in an
    // Authorization header and sent to /api/*, which `vite preview` answers
    // with a 404 in this runner either way. Nothing here signs anything, and
    // nothing here would be accepted by a server.
    getIdToken: async () => `uil4b-test-session.${d.uid}`,
    getIdTokenResult: async () => ({
      token: `uil4b-test-session.${d.uid}`,
      claims,
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3_600_000).toISOString(),
      signInProvider: providerId,
      signInSecondFactor: null,
    }),
    reload: async () => {},
    delete: async () => { throw authError('auth/operation-not-supported-in-this-environment') },
    toJSON: () => ({ uid: d.uid, email: d.email, displayName: d.displayName || '' }),
  }
  return user
}

export function authError(code, message) {
  const err = new Error(message || `Firebase: Error (${code}).`)
  err.code = code
  err.name = 'FirebaseError'
  return err
}

/* ── The fake Auth ─────────────────────────────────────────────────────────
 *
 * Not a subclass of anything and deliberately not passed to a real Firebase
 * function: every `firebase/auth` export the app uses is intercepted in
 * firebase-auth.js and dispatched on `IS_FAKE_AUTH`, so the real SDK never sees
 * this object. That is why it can be this small — it only has to satisfy the
 * app, not the SDK.
 */
export const IS_FAKE_AUTH = Symbol.for('uil4b.testSession.auth')
export const IS_FAKE_DB = Symbol.for('uil4b.testSession.db')

function createFakeAuth(d) {
  const listeners = new Set()
  const auth = {
    [IS_FAKE_AUTH]: true,
    name: '[DEFAULT]',
    currentUser: null,
    languageCode: null,
    tenantId: null,
    settings: { appVerificationDisabledForTesting: false },
    config: { apiKey: 'uil4b-test-session', authDomain: 'localhost' },
    // Firebase resolves auth ASYNCHRONOUSLY on every real load, and AuthContext
    // starts at (loading: true, user: null) because of it. Resolving
    // synchronously here would hand the app a world it never sees in
    // production and would hide exactly the class of bug useSessionHint and
    // Projects.jsx's three-state render exist to handle. So the first callback
    // is deferred a macrotask, the same shape as the real thing.
    onAuthStateChanged(next) {
      const cb = typeof next === 'function' ? next : next?.next
      listeners.add(cb)
      setTimeout(() => { if (listeners.has(cb)) cb(auth.currentUser) }, 0)
      return () => listeners.delete(cb)
    },
    notify() {
      for (const cb of [...listeners]) cb(auth.currentUser)
    },
    async signOut() {
      auth.currentUser = null
      auth.notify()
    },
  }
  auth.currentUser = buildUser(d)
  return auth
}

/* ── The fake Firestore ────────────────────────────────────────────────────
 *
 * An in-memory document store: a Map from '/'-joined path to a plain object.
 * It covers exactly the sixteen `firebase/firestore` exports src/ imports and
 * nothing else — an unfaked call would be a silent hole, so firebase-firestore.js
 * throws by name rather than returning a plausible empty result.
 *
 * WHY A STORE AND NOT A STUB THAT ANSWERS ONE DOCUMENT: three different readers
 * hit `users/{uid}` (AuthContext's profile, SubscriptionContext's entitlement
 * snapshot, Settings) and two more hit subcollections under it (useFirestoreSync,
 * ProjectContext's cross-device sync). A stub keyed to one path would let a
 * writer and a reader disagree, which is the shape of bug a fixture must not
 * introduce into the thing it is measuring.
 */
class FakeStore {
  constructor(seed) {
    this.docs = new Map(Object.entries(seed || {}).map(([k, v]) => [k, { ...v }]))
    this.listeners = new Map()
  }

  get(path) {
    const d = this.docs.get(path)
    return d ? { ...d } : null
  }

  set(path, data, merge) {
    const prev = merge ? this.docs.get(path) || {} : {}
    this.docs.set(path, applyFieldOps({ ...prev }, data))
    this.emit(path)
  }

  remove(path) {
    this.docs.delete(path)
    this.emit(path)
  }

  /** Every document directly inside a collection path (not in a subcollection). */
  list(collectionPath) {
    const prefix = `${collectionPath}/`
    const out = []
    for (const [path, data] of this.docs) {
      if (!path.startsWith(prefix)) continue
      if (path.slice(prefix.length).includes('/')) continue
      out.push({ id: path.slice(prefix.length), path, data: { ...data } })
    }
    return out
  }

  watch(path, cb) {
    if (!this.listeners.has(path)) this.listeners.set(path, new Set())
    this.listeners.get(path).add(cb)
    return () => this.listeners.get(path)?.delete(cb)
  }

  emit(path) {
    for (const cb of this.listeners.get(path) || []) cb()
    // A collection listener is keyed by the collection path, so a write to a
    // document has to wake it too.
    const parent = path.slice(0, path.lastIndexOf('/'))
    for (const cb of this.listeners.get(parent) || []) cb()
  }
}

/** Sentinels. `increment()` and `deleteField()` are values until a write reads them. */
export const FIELD_OP = Symbol.for('uil4b.testSession.fieldOp')

function applyFieldOps(target, patch) {
  for (const [key, value] of Object.entries(patch || {})) {
    if (value && value[FIELD_OP] === 'delete') { delete target[key]; continue }
    if (value && value[FIELD_OP] === 'increment') {
      target[key] = (Number(target[key]) || 0) + value.by
      continue
    }
    target[key] = value
  }
  return target
}

/* ── A Firestore that can be told to refuse ────────────────────────────────
 *
 * WHY A FIXTURE NEEDS THIS AT ALL. The double answers every write from memory,
 * so a write through it ALWAYS SUCCEEDS. That is exactly right for rendering a
 * signed-in session and exactly wrong for rendering what a signed-in session
 * looks like when sync has stopped — and "what does the user see when the write
 * fails" is the whole of `project-sync-single-document`. Before this, the only
 * honest answer a browser test could give was that it could not reach that
 * state, which is how the state went unrendered for as long as it did.
 *
 * `signIn(page, { deny: ['sync/projects'] })` names PATH SUBSTRINGS that must
 * answer with a FirebaseError instead of data. It models the production failure
 * it is named after: a rules refusal is a permission-denied on one path, not a
 * broken database. Nothing is denied unless a spec asks for it, so every
 * existing test sees exactly the store it saw before.
 *
 * AN ENTRY MAY NAME THE OPERATIONS it refuses — { path, ops: ['get'] } — and
 * that is not decoration. A blanket denial breaks the read AND the write, so a
 * test of "the failed pull was reported" is also satisfied by the failed push
 * being reported, and the pull's own reporting goes unproved. That exact hole
 * was found by mutation: swallowing the pull's error left the suite green.
 * Firestore rules can allow one and refuse the other, so this models something
 * real as well as something separable.
 *
 * ops: 'get' (getDoc), 'set' (setDoc), 'list' (getDocs), 'watch' (onSnapshot).
 */
export const denials = DECLARED?.deny || []

/* AN AUTH CALL THAT CAN BE TOLD TO REFUSE, for the same reason as `deny`.
 * `signIn(page, { authFail: { updateEmail: 'auth/operation-not-allowed' } })`
 * makes that one call reject with that Firebase code, so a spec can render what
 * a person sees when Firebase says no — without it, "Email updated" on a
 * failed change would go unseen. Nothing refuses unless
 * a spec asks. */
export function authFailFor(op) {
  const code = DECLARED?.authFail?.[op]
  return code ? authError(code, `[${FIXTURE_MARKER}] ${op} refused by the spec (${code})`) : null
}

export function deniedFor(path, op) {
  for (const entry of denials) {
    const pattern = typeof entry === 'string' ? entry : entry?.path
    if (!pattern || !String(path).includes(pattern)) continue
    const ops = typeof entry === 'string' ? null : entry?.ops
    if (Array.isArray(ops) && op && !ops.includes(op)) continue
    const code = (typeof entry === 'string' ? null : entry?.code) || 'permission-denied'
    const err = new Error(`Firebase: Error (${code}). [${FIXTURE_MARKER}]`)
    err.code = code
    err.name = 'FirebaseError'
    return err
  }
  return null
}

/* ── What the helper declared, resolved once ───────────────────────────── */

export const fakeAuth = DECLARED ? createFakeAuth(DECLARED) : null
export const store = DECLARED ? new FakeStore(DECLARED.docs) : null
export const fakeDb = DECLARED ? { [IS_FAKE_DB]: true, store, type: 'firestore' } : null

/* WHAT ACTUALLY REACHED "FIRESTORE", READABLE FROM A SPEC.
 *
 * Without this the suite can assert what a page RENDERS and what localStorage
 * HOLDS, but not what was pushed to the account — so "the delete propagated"
 * could only ever be half-proved. A delete that clears the local list and
 * pushes nothing is precisely the defect `project-sync-single-document`
 * describes, and it is invisible to both of the other two.
 *
 * Only ever attached when a session is declared, which no production page has
 * (see WHY IT CANNOT SHIP above), and it is the SAME store object the app
 * writes through — not a copy, and not a log a spec could mistake for one.
 */
if (DECLARED) {
  try { window.__UIL4B_TEST_STORE__ = store } catch { /* no window: nothing to expose */ }
}
