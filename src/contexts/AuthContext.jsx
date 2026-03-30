import { createContext, useContext, useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '../utils/firebase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data())
          } else {
            const newProfile = {
              displayName: firebaseUser.displayName || '',
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || '',
              tier: 'free',
              createdAt: new Date().toISOString()
            }
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile)
            setUserProfile(newProfile)
          }
        } catch {
          // Firestore may not be configured yet — fall back to local profile
          setUserProfile({
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || '',
            tier: 'free'
          })
        }
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password)

  const signup = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) {
      await updateProfile(cred.user, { displayName })
    }
    return cred
  }

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider)

  const logout = () => signOut(auth)

  const resetPassword = (email) => sendPasswordResetEmail(auth, email)

  const isProUser = () => userProfile?.tier === 'pro'

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading,
      login, signup, loginWithGoogle, logout, resetPassword,
      isProUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
