// DEFERRED Firebase access. Same contract as `firebaseAccess.js`, but every
// path into the SDK is a dynamic `import()`, so rolldown emits `firebase-*.js`
// as an ASYNC chunk: it leaves the entry graph, leaves the `modulepreload`
// list, and stops competing for the pipe with the CSS and the entry bundle
// during the first request wave.
//
// This file is only reachable when `vite.config.js` aliases it in — see
// VITE_DEFER_FIREBASE there. Nothing imports it by name.
//
// ────────────────────────────────────────────────────────────────────────
// THE GATE, AND WHY IT IS NOT JUST "load it later"
// ────────────────────────────────────────────────────────────────────────
// Deferring the fetch is trivial. Deferring it WITHOUT making a signed-in
// visitor wait longer than they do today is the whole design, and there are two
// distinct callers who must be told apart:
//
//   PATIENT — the auth bootstrap listener. It runs on every page load,
//   including the visits that never sign in. Its only job on a public page is
//   to conclude "signed out", and nothing on the sales page is waiting for that
//   answer: `useSessionHint` refuses to write while loading, and
//   `rootDestination` already answers from the synchronous localStorage hint
//   (#385). This caller waits for the gate.
//
//   URGENT — anyone who is actually blocked. RequireAuth rendering its loader,
//   a sign-in button, a Firestore read for a page the visitor is looking at.
//   These OPEN the gate rather than wait on it: a person standing in front of a
//   spinner must never be held back by a performance optimisation.
//
// THE GATE OPENS on the earliest of:
//   · immediately, if `readSessionHint()` says this browser had a session —
//     these are the people the deferral must not cost, and for them the only
//     change is which wave the chunk is fetched in;
//   · immediately, if any URGENT caller asks;
//   · the largest-contentful-paint entry, plus a frame — the point after which
//     the number this whole item is about has already been recorded;
//   · a `requestIdleCallback`, or a 2500 ms backstop, whichever lands first.
//     LCP never fires on a page nobody looks at (a background tab), and a
//     session that resolves only when the tab is foregrounded would be a new
//     bug, not an optimisation.
//
// `?firebase=eager` on the URL opens the gate at once. That is the runtime dial
// for comparing a deferred build against itself without a rebuild; it cannot
// undo the chunk split, which is decided at build time.
import { readSessionHint } from './sessionHint'

export const DEFERRED = true

const IDLE_BACKSTOP_MS = 2500

let firebasePromise = null
let firestorePromise = null
let authPromise = null
let storagePromise = null

let firebaseNs = null
let firestoreNs = null
let authNs = null
let storageNs = null

export function firebaseNow() { return firebaseNs }
export function firestoreNow() { return firestoreNs }
export function authNow() { return authNs }
export function storageNow() { return storageNs }

// ── the gate ───────────────────────────────────────────────────────────
let openGate = null
const gate = new Promise((resolve) => { openGate = resolve })
let gateArmed = false

/** Open the gate now. Idempotent, and safe to call before the schedule is armed. */
export function openFirebaseGate() { if (openGate) openGate() }

function eagerRequested() {
  try {
    return new URLSearchParams(window.location.search).get('firebase') === 'eager'
  } catch { return false }
}

function armGate() {
  if (gateArmed) return
  gateArmed = true
  if (typeof window === 'undefined') { openFirebaseGate(); return }

  // A browser that already had a session, or an explicit request, pays nothing.
  if (eagerRequested() || readSessionHint()) { openFirebaseGate(); return }

  let done = false
  const fire = () => { if (done) return; done = true; openFirebaseGate() }

  // After LCP — plus one frame, so the entry is recorded before we compete
  // with anything for the main thread again.
  try {
    const po = new PerformanceObserver(() => {
      po.disconnect()
      requestAnimationFrame(() => requestAnimationFrame(fire))
    })
    po.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch { /* no LCP support — the backstop below still fires */ }

  // LCP never arrives in a background tab. Idle, then a hard backstop.
  const idle = window.requestIdleCallback
  if (typeof idle === 'function') idle(fire, { timeout: IDLE_BACKSTOP_MS })
  setTimeout(fire, IDLE_BACKSTOP_MS)

  // FIRST TOUCH. The catch-all that makes "nobody ever waits on this" true by
  // construction rather than by remembering to call an urgent loader at every
  // sign-in affordance. Someone who has touched the page can see it, so LCP has
  // happened for them in the only sense that matters — and they might be
  // reaching for Sign in. `once` and passive, so it costs one listener.
  window.addEventListener('pointerdown', fire, { once: true, passive: true })
  window.addEventListener('keydown', fire, { once: true, passive: true })
}

// ── loaders ────────────────────────────────────────────────────────────
function importFirebase() {
  if (!firebasePromise) {
    firebasePromise = import('./firebase.js').then((m) => {
      firebaseNs = {
        auth: m.auth, db: m.db, storage: m.storage,
        googleProvider: m.googleProvider, GOOGLE_CLIENT_ID: m.GOOGLE_CLIENT_ID,
      }
      return firebaseNs
    })
  }
  return firebasePromise
}

function importFirestore() {
  if (!firestorePromise) {
    firestorePromise = Promise.all([importFirebase(), import('firebase/firestore')])
      .then(([f, sdk]) => {
        firestoreNs = {
          db: f.db,
          doc: sdk.doc, getDoc: sdk.getDoc, setDoc: sdk.setDoc, onSnapshot: sdk.onSnapshot,
          collection: sdk.collection, addDoc: sdk.addDoc, getDocs: sdk.getDocs,
          updateDoc: sdk.updateDoc, deleteDoc: sdk.deleteDoc,
          query: sdk.query, orderBy: sdk.orderBy, limit: sdk.limit,
          increment: sdk.increment, deleteField: sdk.deleteField,
        }
        return firestoreNs
      })
  }
  return firestorePromise
}

function importAuthSdk() {
  if (!authPromise) {
    authPromise = Promise.all([importFirebase(), import('firebase/auth')])
      .then(([f, sdk]) => {
        authNs = {
          auth: f.auth, googleProvider: f.googleProvider,
          signInWithPopup: sdk.signInWithPopup, signInWithCredential: sdk.signInWithCredential,
          signInWithEmailAndPassword: sdk.signInWithEmailAndPassword,
          createUserWithEmailAndPassword: sdk.createUserWithEmailAndPassword,
          getAdditionalUserInfo: sdk.getAdditionalUserInfo, signOut: sdk.signOut,
          onAuthStateChanged: sdk.onAuthStateChanged, updateProfile: sdk.updateProfile,
          updateEmail: sdk.updateEmail, updatePassword: sdk.updatePassword,
          EmailAuthProvider: sdk.EmailAuthProvider, GoogleAuthProvider: sdk.GoogleAuthProvider,
          reauthenticateWithCredential: sdk.reauthenticateWithCredential,
          reauthenticateWithPopup: sdk.reauthenticateWithPopup,
          sendPasswordResetEmail: sdk.sendPasswordResetEmail,
          sendEmailVerification: sdk.sendEmailVerification,
          verifyBeforeUpdateEmail: sdk.verifyBeforeUpdateEmail,
          reload: sdk.reload,
        }
        return authNs
      })
  }
  return authPromise
}

function importStorageSdk() {
  if (!storagePromise) {
    storagePromise = Promise.all([importFirebase(), import('firebase/storage')])
      .then(([f, sdk]) => {
        storageNs = { storage: f.storage, ref: sdk.ref, uploadBytes: sdk.uploadBytes, getDownloadURL: sdk.getDownloadURL }
        return storageNs
      })
  }
  return storagePromise
}

// URGENT — opens the gate.
export function loadFirebase() { openFirebaseGate(); return importFirebase() }
export function loadFirestore() { openFirebaseGate(); return importFirestore() }
export function loadAuthSdk() { openFirebaseGate(); return importAuthSdk() }
export function loadStorageSdk() { openFirebaseGate(); return importStorageSdk() }

/**
 * The gate itself, for a consumer that must not MOUNT before it opens rather
 * than one waiting on a namespace — `oneTapMount.lazy.jsx` is the case: merely
 * importing GoogleOneTap pulls the Firebase chunk in, because it reads
 * GOOGLE_CLIENT_ID from it, so the import has to be held back too.
 */
export function whenFirebaseGate() { armGate(); return gate }

// PATIENT — waits for the gate, and arms the schedule the first time it is asked.
export function whenAuthSdk() { armGate(); return gate.then(importAuthSdk) }
export function whenFirestore() { armGate(); return gate.then(importFirestore) }
