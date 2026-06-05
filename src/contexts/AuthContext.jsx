import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
  updateEmail as fbUpdateEmail,
  updatePassword as fbUpdatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth as firebaseAuth, googleProvider, db } from '../utils/firebase'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'

const AuthContext = createContext()
const PROFILE_CACHE_KEY = 'vs-profile-cache'

const DEFAULT_PROFILE = {
  displayName: '',
  email: '',
  photoURL: '',
  tier: 'free',
  location: '',
  website: '',
  bio: '',
  company: '',
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
  const profileRef = useRef(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser)

        const cached = getCachedProfile(fbUser.uid)
        const initial = cached || {
          ...DEFAULT_PROFILE,
          displayName: fbUser.displayName || '',
          email: fbUser.email || '',
          photoURL: fbUser.photoURL || '',
        }
        setProfile(initial)
        profileRef.current = initial

        const fsProfile = await loadProfileFromFirestore(fbUser.uid)
        if (fsProfile) {
          const merged = { ...initial, ...fsProfile, email: fbUser.email || fsProfile.email }
          setProfile(merged)
          profileRef.current = merged
          setCachedProfile(fbUser.uid, merged)
        } else {
          setCachedProfile(fbUser.uid, initial)
          saveProfileToFirestore(fbUser.uid, initial)
        }
      } else {
        setFirebaseUser(null)
        setProfile(null)
        profileRef.current = null
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const user = firebaseUser ? { email: firebaseUser.email, uid: firebaseUser.uid } : null

  const userProfile = profile ? {
    displayName: profile.displayName || user?.email?.split('@')[0] || 'User',
    email: profile.email,
    photoURL: profile.photoURL || '',
    tier: profile.tier || 'free',
    location: profile.location || '',
    website: profile.website || '',
    bio: profile.bio || '',
    company: profile.company || '',
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
  }, [])

  const logout = useCallback(async () => {
    await signOut(firebaseAuth)
  }, [])

  const resetPassword = useCallback(async (email) => {
    await sendPasswordResetEmail(firebaseAuth, email)
  }, [])

  const loginWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(firebaseAuth, googleProvider)
    } catch (err) {
      if (err?.code === 'auth/configuration-not-found' || err?.code === 'auth/invalid-api-key' || err?.code === 'auth/api-key-not-valid') {
        throw { code: 'auth/google-unavailable' }
      }
      throw err
    }
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
    await deleteUser(firebaseUser)
  }, [firebaseUser])

  const isProUser = () => userProfile?.tier === 'pro'

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading,
      login, signup, logout, resetPassword, loginWithGoogle,
      updateProfile, updateDisplayName, updateEmail, updatePassword, deleteAccount,
      isProUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
