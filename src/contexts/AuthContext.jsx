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
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth as firebaseAuth, db } from '../utils/firebase'
// deleteUser/deleteDoc are deliberately gone: deletion is now a single
// server-side transaction (api/delete-account.js) that cancels billing and
// reaches the subcollections a client never could.
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { accountProviderIds, accountSelectionOutcome, authSwitchOutcome, isCurrentAuthSession } from '../utils/authSwitch'

const AuthContext = createContext()
const PROFILE_CACHE_KEY = 'vs-profile-cache'
const GOOGLE_RETURNING_KEY = 'vs-google-returning'
const ACCOUNTS_KEY = 'vs-accounts'
const MAX_KNOWN_ACCOUNTS = 5

// Billing/entitlement fields. `firestore.rules` rejects ANY client write that
// creates, changes or deletes one of these — they are written only by the
// server (Admin SDK, which bypasses rules) after a verified Stripe payment.
// The client must therefore never include them in a profile write; stripping
// them here is defence in depth so a future caller can't make every profile
// save start failing with permission-denied.
const SERVER_ONLY_PROFILE_FIELDS = ['lifetimeEntitlement', 'subscription', 'stripeCustomerId']

function withoutServerOnlyFields(data) {
  if (!data || typeof data !== 'object') return data
  const present = SERVER_ONLY_PROFILE_FIELDS.filter((key) => key in data)
  if (!present.length) return data
  console.error('AuthContext: refusing to write server-only billing fields from the client', present)
  const safe = { ...data }
  present.forEach((key) => { delete safe[key] })
  return safe
}

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
    if (!Array.isArray(list)) return []
    const normalised = list
      .filter((account) => account && typeof account.uid === 'string')
      .map((account) => {
        const providerIds = accountProviderIds(account)
        return { ...account, providerIds, provider: providerIds[0] || 'password' }
      })
    if (JSON.stringify(normalised) !== JSON.stringify(list)) persistKnownAccounts(normalised)
    return normalised
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

// Never swallows a failure. A rejected profile write means the user's edit only
// exists on this device, and previously that was invisible — the change looked
// saved, then vanished on the next sign-in. Returns a discriminated result so
// the provider can surface an honest message.
//
// Note: while offline the Firestore SDK queues the write and leaves this promise
// pending rather than rejecting, so this never fires a false "not saved" for a
// dropped connection.
async function saveProfileToFirestore(uid, data) {
  try {
    await setDoc(doc(db, 'users', uid), withoutServerOnlyFields(data), { merge: true })
    return { ok: true }
  } catch (error) {
    const code = error?.code || 'unknown'
    console.error('AuthContext: profile save to Firestore failed', { uid, code, message: error?.message })
    return { ok: false, code }
  }
}

function profileSaveMessage(code) {
  if (code === 'permission-denied') {
    return 'We couldn’t save that to your account — the change is only on this device. Sign out and back in, then try again.'
  }
  return 'We couldn’t save that to your account — the change is only on this device. Please try again.'
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
  // Non-null when the last profile write to Firestore was rejected. The local
  // (optimistic) edit is kept — discarding the user's typing would be worse —
  // but the UI says plainly that it did not reach their account.
  const [profileSyncError, setProfileSyncError] = useState(null)
  const profileRef = useRef(null)
  const authEpochRef = useRef(0)

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (fbUser) => {
      const authEpoch = ++authEpochRef.current
      if (fbUser) {
        const expectedUid = fbUser.uid
        setFirebaseUser(fbUser)
        setKnownAccounts(upsertKnownAccount({
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || '',
          photoURL: fbUser.photoURL || '',
          providerIds: accountProviderIds(fbUser),
          provider: accountProviderIds(fbUser)[0] || 'password',
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
          if (!isCurrentAuthSession(authEpochRef, authEpoch, expectedUid, firebaseAuth.currentUser)) return
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
            if (!isCurrentAuthSession(authEpochRef, authEpoch, expectedUid, firebaseAuth.currentUser)) return
            setCachedProfile(fbUser.uid, initial)
            saveProfileToFirestore(fbUser.uid, initial).then((result) => {
              if (!isCurrentAuthSession(authEpochRef, authEpoch, expectedUid, firebaseAuth.currentUser)) return
              setProfileSyncError(result.ok ? null : profileSaveMessage(result.code))
            })
          }
        }).catch(() => { /* keep cached/initial profile */ })
      } else {
        setFirebaseUser(null)
        setProfile(null)
        profileRef.current = null
        setProfileSyncError(null)
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
    return signInWithEmailAndPassword(firebaseAuth, email, password)
  }, [])

  const signup = useCallback(async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password)
    if (displayName) {
      await fbUpdateProfile(cred.user, { displayName })
    }
    const p = { ...DEFAULT_PROFILE, displayName: displayName || '', email }
    setCachedProfile(cred.user.uid, p)
    saveProfileToFirestore(cred.user.uid, p).then((result) => {
      setProfileSyncError(result.ok ? null : profileSaveMessage(result.code))
    })
    setPendingOnboarding(true)
    return cred
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
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const result = await signInWithPopup(firebaseAuth, provider)
      try { if (getAdditionalUserInfo(result)?.isNewUser) setPendingOnboarding(true) } catch { /* ignore */ }
      try { localStorage.setItem(GOOGLE_RETURNING_KEY, '1') } catch { /* ignore */ }
      return result
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
    return result
  }, [])

  // Switch to another known account without pre-emptively clearing the active
  // session. Google login_hint is only a hint, so the returned Firebase identity
  // is compared with the requested uid and reported honestly to the caller.
  const switchAccount = useCallback(async (target) => {
    if (!target?.uid) return authSwitchOutcome('error', { firebaseCode: 'auth/invalid-switch-target' })
    if (target.uid === firebaseAuth.currentUser?.uid) {
      return authSwitchOutcome('switched', { credential: null, user: firebaseAuth.currentUser })
    }
    const providerIds = accountProviderIds(target)
    if (!providerIds.includes('google.com')) {
      return authSwitchOutcome('requiresPassword', { email: target.email || '', uid: target.uid })
    }
    try {
      const provider = new GoogleAuthProvider()
      if (target.email) provider.setCustomParameters({ login_hint: target.email })
      const credential = await signInWithPopup(firebaseAuth, provider)
      try { localStorage.setItem(GOOGLE_RETURNING_KEY, '1') } catch { /* ignore */ }
      return accountSelectionOutcome(credential, target.uid)
    } catch (error) {
        // Popup closed or blocked — fall through to the manual login page.
      return authSwitchOutcome(error, { email: target.email || '', uid: target.uid })
    }
  }, [])

  const removeKnownAccount = useCallback((uid) => {
    // The signed-in account stays listed — sign out first to forget it.
    if (uid === firebaseAuth.currentUser?.uid) return
    const list = getKnownAccounts().filter((a) => a.uid !== uid)
    persistKnownAccounts(list)
    setKnownAccounts(list)
  }, [])

  const dismissProfileSyncError = useCallback(() => setProfileSyncError(null), [])

  const updateProfile = useCallback((fields) => {
    if (!firebaseUser || !profileRef.current) return
    const updated = { ...profileRef.current, ...fields }
    setProfile(updated)
    profileRef.current = updated
    setCachedProfile(firebaseUser.uid, updated)
    saveProfileToFirestore(firebaseUser.uid, fields).then((result) => {
      setProfileSyncError(result.ok ? null : profileSaveMessage(result.code))
    })
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
    const result = await saveProfileToFirestore(firebaseUser.uid, { email: newEmail })
    setProfileSyncError(result.ok ? null : profileSaveMessage(result.code))
  }, [firebaseUser])

  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    if (!firebaseUser) throw { code: 'auth/requires-recent-login' }
    await reauthenticate(currentPassword)
    await fbUpdatePassword(firebaseUser, newPassword)
  }, [firebaseUser])

  // True when this account can only sign in with Google, so the UI knows not to
  // ask for a password that does not exist. An account with BOTH providers
  // linked can still use its password.
  const isGoogleOnlyAccount = useCallback(() => {
    const ids = accountProviderIds(firebaseUser)
    return ids.includes('google.com') && !ids.includes('password')
  }, [firebaseUser])

  // Account deletion. See api/delete-account.js for the full reasoning; the
  // short version of what changed:
  //
  //  • It cancels the Stripe subscription. The old path did not, so a Pro user
  //    who deleted their account KEPT BEING CHARGED with no way to stop it —
  //    the billing portal needs an ID token they can never mint again.
  //  • It deletes the sync subcollection, community prompts, feedback, uploaded
  //    media and usage counters. The old path deleted `users/{uid}` alone, and
  //    Firestore does not remove subcollections with their parent, so every
  //    synced project survived a "delete all associated data".
  //  • It WORKS FOR GOOGLE ACCOUNTS. The old path skipped reauthentication for
  //    them and then called deleteUser(), which throws requires-recent-login —
  //    so deletion simply failed for the primary sign-in method.
  //
  // Reauthentication still happens here, in the browser, because that is where
  // the credential is. The server does not take our word for it: it reads
  // `auth_time` off the verified token and refuses anything older than five
  // minutes.
  const deleteAccount = useCallback(async (password) => {
    if (!firebaseUser) return
    const uid = firebaseUser.uid

    if (isGoogleOnlyAccount()) {
      await reauthenticateWithPopup(firebaseUser, new GoogleAuthProvider())
    } else {
      await reauthenticate(password)
    }

    // forceRefresh: reauthentication updates auth_time, but a cached token
    // still carries the OLD value — and the old value is exactly what the
    // server rejects.
    const token = await firebaseUser.getIdToken(true)
    const res = await fetch('/api/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(data?.error || 'We could not delete your account. Please try again.')
      err.code = data?.code || 'delete-failed'
      if (data?.correlationId) err.correlationId = data.correlationId
      throw err
    }

    // The auth user is already gone server-side, so this session is dead —
    // signOut just clears the local state and listeners tidily.
    try { await signOut(firebaseAuth) } catch { /* the user no longer exists; nothing to sign out of */ }
    removeCachedProfile(uid)
    const remaining = getKnownAccounts().filter((a) => a.uid !== uid)
    persistKnownAccounts(remaining)
    setKnownAccounts(remaining)
    return data
  }, [firebaseUser, isGoogleOnlyAccount])

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading,
      profileSyncError, dismissProfileSyncError,
      pendingOnboarding, clearPendingOnboarding,
      login, signup, logout, resetPassword, loginWithGoogle, loginWithGoogleCredential,
      knownAccounts, switchAccount, removeKnownAccount,
      updateProfile, updateDisplayName, updateEmail, updatePassword, deleteAccount,
      isGoogleOnlyAccount,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
