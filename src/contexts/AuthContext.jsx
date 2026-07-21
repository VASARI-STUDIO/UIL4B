import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import {
  signInWithPopup,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  signOut,
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
  updateEmail as fbUpdateEmail,
  updatePassword as fbUpdatePassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth as firebaseAuth, googleProvider, db } from '../utils/firebase'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'

const AuthContext = createContext()
const PROFILE_CACHE_KEY = 'vs-profile-cache'
const GOOGLE_RETURNING_KEY = 'vs-google-returning'
const ACCOUNTS_KEY = 'vs-accounts'
const MAX_KNOWN_ACCOUNTS = 5

const DEFAULT_PROFILE = {
  displayName: '',
  email: '',
  photoURL: '',
  location: '',
  website: '',
  bio: '',
  company: '',
  flair: '',
}

function getCachedProfile(uid) {
  try {
    const all = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || '{}')
    return all[uid] || null
  } catch { return null }
}

function setCachedProfile(uid, profile) {
  try {
    const all = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || '{}')
    all[uid] = profile
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(all))
  } catch {}
}

function removeCachedProfile(uid) {
  try {
    const all = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || '{}')
    delete all[uid]
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(all))
  } catch {}
}

// Device-level registry of accounts that have signed in here, powering the
// account switcher. Holds display data only (no tokens, no credentials) —
// switching always re-authenticates through Firebase.
function getKnownAccounts() {
  try {
    const list = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch { return [] }
}

function persistKnownAccounts(list) {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

function upsertKnownAccount(account) {
  const rest = getKnownAccounts().filter((a) => a.uid !== account.uid)
  const list = [account, ...rest].slice(0, MAX_KNOWN_ACCOUNTS)
  persistKnownAccounts(list)
  return list
}

async function loadProfileFromFirestore(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? snap.data() : null
  } catch { return null }
}

async function saveProfileToFirestore(uid, data) {
  try {
    await setDoc(doc(db, 'users', uid), data, { merge: true })
  } catch {}
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [knownAccounts, setKnownAccounts] = useState(getKnownAccounts)
  // Set true the moment a brand-new account is created (email signup or a
  // first-time Google sign-in). Keyed off the account-creation event — never
  // set for returning users — so the onboarding router can send new sign-ups to
  // /onboarding exactly once without ever bouncing a returning user (AUDIT-A1).
  const [pendingOnboarding, setPendingOnboarding] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser)
        setKnownAccounts(upsertKnownAccount({
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || '',
          photoURL: fbUser.photoURL || '',
          provider: fbUser.providerData?.[0]?.providerId || 'password',
          lastUsed: Date.now(),
        }))

        const cached = getCachedProfile(fbUser.uid)
        const initial = cached || {
          ...DEFAULT_PROFILE,
          displayName: fbUser.displayName || '',
          email: fbUser.email || '',
          photoURL: fbUser.photoURL || '',
        }
        setProfile(initial)
        profileRef.current = initial

        // Resolve auth state immediately so the UI never blocks (a blank page)
        // on a slow or failing Firestore read. Hydrate the profile in the
        // background and merge it in once it arrives.
        setLoading(false)
        loadProfileFromFirestore(fbUser.uid).then((fsProfile) => {
          if (fsProfile) {
            const merged = { ...initial, ...fsProfile, email: fbUser.email || fsProfile.email }
            setProfile(merged)
            profileRef.current = merged
            setCachedProfile(fbUser.uid, merged)
            // Returning users who completed onboarding on another device — sync
            // the flag to localStorage so they skip it here too (AUTH-03).
            if (fsProfile.onboarding?.completedAt) {
              try { localStorage.setItem('vs-onboarded', '1') } catch {}
            }
          } else {
            setCachedProfile(fbUser.uid, initial)
            saveProfileToFirestore(fbUser.uid, initial)
          }
        }).catch(() => { /* keep cached/initial profile */ })
      } else {
        setFirebaseUser(null)
        setProfile(null)
        profileRef.current = null
        setLoading(false)
      }
    })
    return unsub
  }, [])

  const user = firebaseUser ? { email: firebaseUser.email, uid: firebaseUser.uid } : null

  const userProfile = profile ? {
    displayName: profile.displayName || user?.email?.split('@')[0] || 'User',
    email: profile.email,
    photoURL: profile.photoURL || '',
    location: profile.location || '',
    website: profile.website || '',
    bio: profile.bio || '',
    company: profile.company || '',
    flair: profile.flair || '',
  } : null

  const login = useCallback(async (email, password) => {
    await signInWithEmailAndPassword(firebaseAuth, email, password)
  }, [])

  const signup = useCallback(async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password)
    if (displayName) {
      await fbUpdateProfile(cred.user, { displayName })
    }
    const p = { ...DEFAULT_PROFILE, displayName: displayName || '', email }
    setCachedProfile(cred.user.uid, p)
    saveProfileToFirestore(cred.user.uid, p)
    setPendingOnboarding(true)
    return cred.user
  }, [])

  const clearPendingOnboarding = useCallback(() => setPendingOnboarding(false), [])

  const logout = useCallback(async () => {
    await signOut(firebaseAuth)
  }, [])

  const resetPassword = useCallback(async (email) => {
    await sendPasswordResetEmail(firebaseAuth, email)
  }, [])

  const loginWithGoogle = useCallback(async () => {
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider)
      try { if (getAdditionalUserInfo(result)?.isNewUser) setPendingOnboarding(true) } catch { /* ignore */ }
      try { localStorage.setItem(GOOGLE_RETURNING_KEY, '1') } catch { /* ignore */ }
    } catch (err) {
      if (err?.code === 'auth/configuration-not-found' || err?.code === 'auth/invalid-api-key' || err?.code === 'auth/api-key-not-valid') {
        throw { code: 'auth/google-unavailable' }
      }
      throw err
    }
  }, [])

  // Sign in with a Google ID token from Google Identity Services (One Tap).
  const loginWithGoogleCredential = useCallback(async (idToken) => {
    const credential = GoogleAuthProvider.credential(idToken)
    const result = await signInWithCredential(firebaseAuth, credential)
    try { if (getAdditionalUserInfo(result)?.isNewUser) setPendingOnboarding(true) } catch { /* ignore */ }
    try { localStorage.setItem(GOOGLE_RETURNING_KEY, '1') } catch { /* ignore */ }
  }, [])

  // Switch to another known account. Firebase holds a single session, so a
  // switch is always sign-out + re-authenticate — we never store credentials.
  // Google accounts re-auth through a popup pre-selected via login_hint; for
  // password accounts the caller sends the user to /login with the email
  // prefilled ({ needsLogin: true }).
  const switchAccount = useCallback(async (target) => {
    if (!target?.uid || target.uid === firebaseAuth.currentUser?.uid) return { switched: false }
    await signOut(firebaseAuth)
    if (target.provider === 'google.com') {
      try {
        const provider = new GoogleAuthProvider()
        if (target.email) provider.setCustomParameters({ login_hint: target.email })
        await signInWithPopup(firebaseAuth, provider)
        try { localStorage.setItem(GOOGLE_RETURNING_KEY, '1') } catch { /* ignore */ }
        return { switched: true }
      } catch {
        // Popup closed or blocked — fall through to the manual login page.
        return { switched: false, needsLogin: true, email: target.email }
      }
    }
    return { switched: false, needsLogin: true, email: target.email }
  }, [])

  const removeKnownAccount = useCallback((uid) => {
    // The signed-in account stays listed — sign out first to forget it.
    if (uid === firebaseAuth.currentUser?.uid) return
    const list = getKnownAccounts().filter((a) => a.uid !== uid)
    persistKnownAccounts(list)
    setKnownAccounts(list)
  }, [])

  const updateProfile = useCallback((fields) => {
    if (!firebaseUser || !profileRef.current) return
    const updated = { ...profileRef.current, ...fields }
    setProfile(updated)
    profileRef.current = updated
    setCachedProfile(firebaseUser.uid, updated)
    saveProfileToFirestore(firebaseUser.uid, fields)
    if (fields.displayName || fields.photoURL) {
      const fbFields = {}
      if (fields.displayName) fbFields.displayName = fields.displayName
      if (fields.photoURL) fbFields.photoURL = fields.photoURL
      fbUpdateProfile(firebaseUser, fbFields).catch(() => {})
    }
  }, [firebaseUser])

  const updateDisplayName = useCallback((newName) => {
    updateProfile({ displayName: newName })
  }, [updateProfile])

  const reauthenticate = async (password) => {
    if (!firebaseUser?.email) throw { code: 'auth/requires-recent-login' }
    const credential = EmailAuthProvider.credential(firebaseUser.email, password)
    await reauthenticateWithCredential(firebaseUser, credential)
  }

  const updateEmail = useCallback(async (newEmail, password) => {
    if (!firebaseUser) throw { code: 'auth/requires-recent-login' }
    await reauthenticate(password)
    await fbUpdateEmail(firebaseUser, newEmail)
    const updated = { ...profileRef.current, email: newEmail }
    setProfile(updated)
    profileRef.current = updated
    setCachedProfile(firebaseUser.uid, updated)
    saveProfileToFirestore(firebaseUser.uid, { email: newEmail })
  }, [firebaseUser])

  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    if (!firebaseUser) throw { code: 'auth/requires-recent-login' }
    await reauthenticate(currentPassword)
    await fbUpdatePassword(firebaseUser, newPassword)
  }, [firebaseUser])

  const deleteAccount = useCallback(async (password) => {
    if (!firebaseUser) return
    if (firebaseUser.providerData?.[0]?.providerId !== 'google.com') {
      await reauthenticate(password)
    }
    const uid = firebaseUser.uid
    try { await deleteDoc(doc(db, 'users', uid)) } catch {}
    removeCachedProfile(uid)
    const remaining = getKnownAccounts().filter((a) => a.uid !== uid)
    persistKnownAccounts(remaining)
    setKnownAccounts(remaining)
    await deleteUser(firebaseUser)
  }, [firebaseUser])

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading,
      pendingOnboarding, clearPendingOnboarding,
      login, signup, logout, resetPassword, loginWithGoogle, loginWithGoogleCredential,
      knownAccounts, switchAccount, removeKnownAccount,
      updateProfile, updateDisplayName, updateEmail, updatePassword, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
