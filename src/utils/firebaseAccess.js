// EAGER Firebase access — the default, and byte-for-byte today's behaviour.
//
// ────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS
// ────────────────────────────────────────────────────────────────────────
// `firebase-*.js` is 116268 bytes on the wire — 25% of the homepage's first
// request wave, requested at 216 ms alongside the entry bundle, and the second
// heaviest thing on the page (#402 measured it). It is on the critical path not
// because of its network calls (blocking every third-party host moved LCP by
// 49 ms, inside noise) but because of the CHUNK: it is a static import of the
// entry graph, so the browser is told to `modulepreload` it before it has
// painted anything.
//
// A chunk is static or async at BUILD time. Nothing at runtime can move those
// bytes out of the first wave — which is why the flag that switches this is a
// build flag, not a query param. See `firebaseAccess.lazy.js` for the deferred
// half and `vite.config.js` for the switch.
//
// ────────────────────────────────────────────────────────────────────────
// THE CONTRACT BOTH HALVES IMPLEMENT
// ────────────────────────────────────────────────────────────────────────
//   whenAuthSdk()   PATIENT. "Resolve the session when it is cheap to do so."
//                   The auth bootstrap listener — and only it — uses this.
//   loadAuthSdk()   URGENT. "Someone is trying to sign in / is standing at a
//   loadFirestore() gate right now." Opens the gate immediately.
//   loadFirebase()
//   authNow()       SYNCHRONOUS PEEK. The already-resolved namespace, or null.
//   firestoreNow()  For guards that must not await — e.g. analytics' existing
//                   `if (!auth?.currentUser) return`.
//
// In THIS file every promise is already resolved and every peek is non-null, so
// callers written against the contract behave exactly as they do today.
import { auth, db, storage, googleProvider, GOOGLE_CLIENT_ID } from './firebase'
import {
  doc, getDoc, setDoc, onSnapshot,
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  query, orderBy, limit, increment, deleteField,
} from 'firebase/firestore'
import {
  signInWithPopup, signInWithCredential, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, getAdditionalUserInfo, signOut,
  onAuthStateChanged, updateProfile, updateEmail, updatePassword,
  EmailAuthProvider, GoogleAuthProvider,
  reauthenticateWithCredential, reauthenticateWithPopup, sendPasswordResetEmail,
} from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export const DEFERRED = false

const firebaseNs = { auth, db, storage, googleProvider, GOOGLE_CLIENT_ID }
const firestoreNs = {
  db, doc, getDoc, setDoc, onSnapshot,
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  query, orderBy, limit, increment, deleteField,
}
const authNs = {
  auth, googleProvider,
  signInWithPopup, signInWithCredential, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, getAdditionalUserInfo, signOut,
  onAuthStateChanged, updateProfile, updateEmail, updatePassword,
  EmailAuthProvider, GoogleAuthProvider,
  reauthenticateWithCredential, reauthenticateWithPopup, sendPasswordResetEmail,
}
const storageNs = { storage, ref, uploadBytes, getDownloadURL }

export function firebaseNow() { return firebaseNs }
export function firestoreNow() { return firestoreNs }
export function authNow() { return authNs }
export function storageNow() { return storageNs }

export function loadFirebase() { return Promise.resolve(firebaseNs) }
export function loadFirestore() { return Promise.resolve(firestoreNs) }
export function loadAuthSdk() { return Promise.resolve(authNs) }
export function loadStorageSdk() { return Promise.resolve(storageNs) }

// PATIENT variant. Identical here; the difference only exists in the lazy half.
export function whenAuthSdk() { return Promise.resolve(authNs) }
export function whenFirestore() { return Promise.resolve(firestoreNs) }

// No gate to open when nothing is deferred.
export function openFirebaseGate() {}
export function whenFirebaseGate() { return Promise.resolve() }
