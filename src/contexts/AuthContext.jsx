import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
// FIREBASE ARRIVES THROUGH THE ACCESS BROKER, NOT AS A STATIC IMPORT.
//
// Nothing about the session machinery below changes. What changes is WHEN the
// 116268-byte SDK chunk is fetched: a static import of it here put it in the
// entry graph and in index.html's `modulepreload` list, so every visitor — the
// overwhelming majority of whom never sign in — paid for it in the first
// request wave, contending with the CSS and the entry bundle before anything
// had painted (#402 measured it at 25% of that wave).
//
//   whenAuthSdk()  PATIENT. Used by the bootstrap listener ONLY. Waits for the
//                  deferral gate — LCP, idle, first touch, or a signed-in hint,
//                  whichever comes first. See src/utils/firebaseAccess.lazy.js.
//   loadAuthSdk()  URGENT. Used by every action a person actually initiates:
//   loadFirestore() sign in, sign up, sign out, reset, switch, profile writes,
//                  delete. These open the gate rather than wait on it, so no
//                  human ever waits on the optimisation.
//   authNow()      Synchronous peek for the `currentUser` identity guards. Null
//                  before the SDK lands, which every one of those guards already
//                  treats as "not the current session" — the same answer they
//                  give today when auth has not resolved yet.
//
// In an UNFLAGGED build the broker is `firebaseAccess.js`, where every promise
// is already resolved and `authNow()` is never null, so this file behaves
// exactly as it did before this change.
//
// deleteUser/deleteDoc are deliberately gone: deletion is now a single
// server-side transaction (api/delete-account.js) that cancels billing and
// reaches the subcollections a client never could.
import { whenAuthSdk, loadAuthSdk, loadFirestore, authNow } from '../utils/firebaseAccess'
import { accountProviderIds, accountSelectionOutcome, authSwitchOutcome, isCurrentAuthSession } from '../utils/authSwitch'
import { openOnboardingRecord, planProfileRead } from '../utils/onboardingState'
import { needsEmailVerification } from '../utils/emailVerification'

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

// Found, missing or failed — never a bare null. "No document" and "could not
// read" call for opposite actions: the first creates the account's profile, the
// second must write nothing (see planProfileRead).
async function loadProfileFromFirestore(uid) {
  try {
    const fs = await loadFirestore()
    const snap = await fs.getDoc(fs.doc(fs.db, 'users', uid))
    return snap.exists() ? { status: 'found', data: snap.data() } : { status: 'missing' }
  } catch (error) {
    return { status: 'failed', code: error?.code || 'unknown' }
  }
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
    const fs = await loadFirestore()
    await fs.setDoc(fs.doc(fs.db, 'users', uid), withoutServerOnlyFields(data), { merge: true })
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
  // True once this session's profile document has been read from Firestore.
  // Until then the profile is a cache or a default, and cannot say whether the
  // account has finished onboarding.
  const [profileLoaded, setProfileLoaded] = useState(false)
  // Held in state because `reload()` updates the flag on the same User object,
  // which would not re-render anything that read it.
  const [emailVerified, setEmailVerified] = useState(false)
  const profileRef = useRef(null)
  const authEpochRef = useRef(0)

  useEffect(() => {
    // The ONE patient caller. Subscribing is now asynchronous, so `cancelled`
    // and the deferred `unsub` replace the direct return value: without them a
    // provider unmounted before the SDK lands would leak a live listener that
    // nothing could ever detach.
    let cancelled = false
    let unsub = null
    const onAuthUser = (fbUser) => {
      const authEpoch = ++authEpochRef.current
      setProfileLoaded(false)
      if (fbUser) {
        const expectedUid = fbUser.uid
        setFirebaseUser(fbUser)
        setEmailVerified(fbUser.emailVerified === true)
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
        const hydrate = () => loadProfileFromFirestore(fbUser.uid).then((read) => {
          if (!isCurrentAuthSession(authEpochRef, authEpoch, expectedUid, authNow()?.auth?.currentUser)) return
          // profileRef rather than `initial`: a retry must keep edits made
          // while the read was waiting.
          const plan = planProfileRead(read, profileRef.current || initial, Date.now())
          if (plan.action === 'wait') {
            // No answer from the account. Keep the cached/initial profile, write
            // nothing, and read again once the browser is back online.
            window.addEventListener('online', hydrate, { once: true })
            return
          }
          if (plan.action === 'merge') {
            const fsProfile = read.data
            const merged = { ...plan.profile, email: fbUser.email || fsProfile.email }
            setProfile(merged)
            profileRef.current = merged
            setCachedProfile(fbUser.uid, merged)
            // An email change completes from a link in the new inbox, away from
            // this page, so the stored copy catches up on the next load.
            if (fbUser.email && fsProfile.email !== fbUser.email) {
              saveProfileToFirestore(fbUser.uid, { email: fbUser.email })
            }
            // Returning users who completed onboarding on another device — sync
            // the flag to localStorage so they skip it here too (AUTH-03).
            if (fsProfile.onboarding?.completedAt) {
              try { localStorage.setItem('vs-onboarded', '1') } catch {}
            }
          } else {
            // No profile document yet: this is the account's first one, and the
            // plan has opened the onboarding record that marks onboarding owed.
            const created = plan.profile
            setProfile(created)
            profileRef.current = created
            setCachedProfile(fbUser.uid, created)
            saveProfileToFirestore(fbUser.uid, created).then((result) => {
              if (!isCurrentAuthSession(authEpochRef, authEpoch, expectedUid, authNow()?.auth?.currentUser)) return
              setProfileSyncError(result.ok ? null : profileSaveMessage(result.code))
            })
          }
          setProfileLoaded(true)
        }).catch(() => { /* keep cached/initial profile; completion stays unknown */ })
        hydrate()
      } else {
        setFirebaseUser(null)
        setEmailVerified(false)
        setProfile(null)
        profileRef.current = null
        setProfileSyncError(null)
        setLoading(false)
      }
    }
    whenAuthSdk().then((A) => {
      if (cancelled) return
      unsub = A.onAuthStateChanged(A.auth, onAuthUser)
    }).catch(() => {
      // The SDK could not be fetched at all — offline, or a chunk that no
      // longer exists after a redeploy. Resolve as signed out rather than
      // holding every RequireAuth spinner forever: it is the same answer this
      // browser would get from a failed auth round trip, and `useSessionHint`
      // is what stops that answer being written down as the truth.
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true; if (unsub) unsub() }
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
    onboarding: profile.onboarding || null,
  } : null

  // Every action below is URGENT: a person is waiting on it, so it opens the
  // deferral gate instead of queueing behind it.
  const login = useCallback(async (email, password) => {
    const A = await loadAuthSdk()
    return A.signInWithEmailAndPassword(A.auth, email, password)
  }, [])

  const signup = useCallback(async (email, password, displayName) => {
    const A = await loadAuthSdk()
    const cred = await A.createUserWithEmailAndPassword(A.auth, email, password)
    if (displayName) {
      await A.updateProfile(cred.user, { displayName })
    }
    // Establishes that the address belongs to the person signing up. A send
    // that fails does not fail the signup: Settings keeps offering the link
    // until the address is verified.
    A.sendEmailVerification(cred.user).catch((error) => {
      console.error('AuthContext: verification email was not sent', { code: error?.code })
    })
    const p ={ ...DEFAULT_PROFILE, displayName: displayName || '', email, onboarding: openOnboardingRecord(Date.now()) }
    setCachedProfile(cred.user.uid, p)
    saveProfileToFirestore(cred.user.uid, p).then((result) => {
      setProfileSyncError(result.ok ? null : profileSaveMessage(result.code))
    })
    setPendingOnboarding(true)
    return cred
  }, [])

  const clearPendingOnboarding = useCallback(() => setPendingOnboarding(false), [])

  const logout = useCallback(async () => {
    const A = await loadAuthSdk()
    await A.signOut(A.auth)
  }, [])

  const resetPassword = useCallback(async (email) => {
    const A = await loadAuthSdk()
    await A.sendPasswordResetEmail(A.auth, email)
  }, [])

  const loginWithGoogle = useCallback(async () => {
    try {
      const A = await loadAuthSdk()
      const provider = new A.GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const result = await A.signInWithPopup(A.auth, provider)
      try { if (A.getAdditionalUserInfo(result)?.isNewUser) setPendingOnboarding(true) } catch { /* ignore */ }
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
    const A = await loadAuthSdk()
    const credential = A.GoogleAuthProvider.credential(idToken)
    const result = await A.signInWithCredential(A.auth, credential)
    try { if (A.getAdditionalUserInfo(result)?.isNewUser) setPendingOnboarding(true) } catch { /* ignore */ }
    try { localStorage.setItem(GOOGLE_RETURNING_KEY, '1') } catch { /* ignore */ }
    return result
  }, [])

  // Switch to another known account without pre-emptively clearing the active
  // session. Google login_hint is only a hint, so the returned Firebase identity
  // is compared with the requested uid and reported honestly to the caller.
  const switchAccount = useCallback(async (target) => {
    if (!target?.uid) return authSwitchOutcome('error', { firebaseCode: 'auth/invalid-switch-target' })
    const A = await loadAuthSdk()
    if (target.uid === A.auth.currentUser?.uid) {
      return authSwitchOutcome('switched', { credential: null, user: A.auth.currentUser })
    }
    const providerIds = accountProviderIds(target)
    if (!providerIds.includes('google.com')) {
      return authSwitchOutcome('requiresPassword', { email: target.email || '', uid: target.uid })
    }
    try {
      const provider = new A.GoogleAuthProvider()
      if (target.email) provider.setCustomParameters({ login_hint: target.email })
      const credential = await A.signInWithPopup(A.auth, provider)
      try { localStorage.setItem(GOOGLE_RETURNING_KEY, '1') } catch { /* ignore */ }
      return accountSelectionOutcome(credential, target.uid)
    } catch (error) {
        // Popup closed or blocked — fall through to the manual login page.
      return authSwitchOutcome(error, { email: target.email || '', uid: target.uid })
    }
  }, [])

  const removeKnownAccount = useCallback((uid) => {
    // The signed-in account stays listed — sign out first to forget it.
    // `authNow()` is null only before the SDK lands, and the account switcher
    // this is called from cannot be open until a session has resolved.
    if (uid === authNow()?.auth?.currentUser?.uid) return
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
      loadAuthSdk().then((A) => A.updateProfile(firebaseUser, fbFields)).catch(() => {})
    }
  }, [firebaseUser])

  const updateDisplayName = useCallback((newName) => {
    updateProfile({ displayName: newName })
  }, [updateProfile])

  const reauthenticate = async (password) => {
    if (!firebaseUser?.email) throw { code: 'auth/requires-recent-login' }
    const A = await loadAuthSdk()
    const credential = A.EmailAuthProvider.credential(firebaseUser.email, password)
    await A.reauthenticateWithCredential(firebaseUser, credential)
  }

  // The new address has to be proved before it replaces the old one, so this
  // sends a confirmation link to it and changes nothing yet. The account keeps
  // its current address until that link is opened; the profile copy follows on
  // the next load (see the hydration above).
  const updateEmail = useCallback(async (newEmail, password) => {
    if (!firebaseUser) throw { code: 'auth/requires-recent-login' }
    await reauthenticate(password)
    const A = await loadAuthSdk()
    await A.verifyBeforeUpdateEmail(firebaseUser, newEmail)
  }, [firebaseUser])

  const sendVerificationEmail = useCallback(async () => {
    if (!firebaseUser) throw { code: 'auth/requires-recent-login' }
    const A = await loadAuthSdk()
    await A.sendEmailVerification(firebaseUser)
  }, [firebaseUser])

  // The link is opened in another tab or on another device, so the flag here
  // only changes when the account is re-read. Returns the fresh value.
  const refreshEmailVerified = useCallback(async () => {
    if (!firebaseUser) return false
    const A = await loadAuthSdk()
    await A.reload(firebaseUser)
    if (firebaseUser !== A.auth.currentUser) return false
    const verified = firebaseUser.emailVerified === true
    setEmailVerified(verified)
    // Roles are read from the ID token, which carries its own copy of the
    // flag, so a fresh token is minted as soon as the address is verified.
    if (verified) await firebaseUser.getIdToken(true).catch(() => {})
    return verified
  }, [firebaseUser])

  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    if (!firebaseUser) throw { code: 'auth/requires-recent-login' }
    await reauthenticate(currentPassword)
    const A = await loadAuthSdk()
    await A.updatePassword(firebaseUser, newPassword)
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

    const A = await loadAuthSdk()
    if (isGoogleOnlyAccount()) {
      await A.reauthenticateWithPopup(firebaseUser, new A.GoogleAuthProvider())
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
    try { await A.signOut(A.auth) } catch { /* the user no longer exists; nothing to sign out of */ }
    removeCachedProfile(uid)
    const remaining = getKnownAccounts().filter((a) => a.uid !== uid)
    persistKnownAccounts(remaining)
    setKnownAccounts(remaining)
    return data
  }, [firebaseUser, isGoogleOnlyAccount])

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading, profileLoaded,
      profileSyncError, dismissProfileSyncError,
      pendingOnboarding, clearPendingOnboarding,
      login, signup, logout, resetPassword, loginWithGoogle, loginWithGoogleCredential,
      knownAccounts, switchAccount, removeKnownAccount,
      updateProfile, updateDisplayName, updateEmail, updatePassword, deleteAccount,
      isGoogleOnlyAccount,
      emailVerificationOwed: needsEmailVerification(firebaseUser, emailVerified),
      sendVerificationEmail, refreshEmailVerified,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
