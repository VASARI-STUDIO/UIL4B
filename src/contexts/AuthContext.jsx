import { createContext, useContext, useState, useCallback } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth as firebaseAuth, googleProvider } from '../utils/firebase'

const AuthContext = createContext()
const USERS_KEY = 'vs-users'
const SESSION_KEY = 'vs-session'

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}') } catch { return {} }
}
function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)) }
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}
function saveSession(s) { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY) }

function hashPassword(p) {
  let h = 0
  for (let i = 0; i < p.length; i++) h = ((h << 5) - h + p.charCodeAt(i)) | 0
  return 'h_' + Math.abs(h).toString(36)
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getSession)

  const user = session ? { email: session.email, uid: session.uid } : null
  const userProfile = session ? {
    displayName: session.displayName || session.email?.split('@')[0] || 'User',
    email: session.email,
    photoURL: session.photoURL || '',
    tier: session.tier || 'free',
    location: session.location || '',
    website: session.website || '',
    bio: session.bio || '',
    company: session.company || '',
  } : null

  const login = useCallback(async (email, password) => {
    const users = getUsers()
    const key = email.toLowerCase()
    const u = users[key]
    if (!u) throw { code: 'auth/user-not-found' }
    if (u.passwordHash !== hashPassword(password)) throw { code: 'auth/wrong-password' }
    const s = { email: u.email, uid: u.uid, displayName: u.displayName, photoURL: u.photoURL, tier: u.tier }
    saveSession(s)
    setSession(s)
  }, [])

  const signup = useCallback(async (email, password, displayName) => {
    const users = getUsers()
    const key = email.toLowerCase()
    if (users[key]) throw { code: 'auth/email-already-in-use' }
    const uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const u = { email, uid, displayName: displayName || '', photoURL: '', tier: 'free', passwordHash: hashPassword(password), createdAt: new Date().toISOString() }
    users[key] = u
    saveUsers(users)
    const s = { email: u.email, uid, displayName: u.displayName, photoURL: '', tier: 'free' }
    saveSession(s)
    setSession(s)
  }, [])

  const logout = useCallback(() => { saveSession(null); setSession(null) }, [])

  const resetPassword = useCallback(async (email, newPassword) => {
    const users = getUsers()
    const key = email.toLowerCase()
    if (!users[key]) throw { code: 'auth/user-not-found' }
    users[key].passwordHash = hashPassword(newPassword)
    saveUsers(users)
  }, [])

  const loginWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(firebaseAuth, googleProvider)
    const gUser = result.user
    const email = gUser.email
    const key = email.toLowerCase()
    const users = getUsers()

    if (!users[key]) {
      users[key] = {
        email,
        uid: gUser.uid,
        displayName: gUser.displayName || '',
        photoURL: gUser.photoURL || '',
        tier: 'free',
        passwordHash: '',
        provider: 'google',
        createdAt: new Date().toISOString(),
      }
    } else {
      if (gUser.displayName) users[key].displayName = gUser.displayName
      if (gUser.photoURL) users[key].photoURL = gUser.photoURL
    }
    saveUsers(users)

    const s = {
      email,
      uid: users[key].uid,
      displayName: users[key].displayName,
      photoURL: users[key].photoURL,
      tier: users[key].tier,
    }
    saveSession(s)
    setSession(s)
  }, [])

  const updateProfile = useCallback((fields) => {
    if (!session) return
    const users = getUsers()
    const key = session.email.toLowerCase()
    if (users[key]) { Object.assign(users[key], fields); saveUsers(users) }
    const s = { ...session, ...fields }
    saveSession(s)
    setSession(s)
  }, [session])

  const updateDisplayName = useCallback((newName) => {
    updateProfile({ displayName: newName })
  }, [updateProfile])

  const updateEmail = useCallback((newEmail, password) => {
    if (!session) throw { code: 'auth/requires-recent-login' }
    const users = getUsers()
    const oldKey = session.email.toLowerCase()
    const newKey = newEmail.toLowerCase()
    if (oldKey !== newKey && users[newKey]) throw { code: 'auth/email-already-in-use' }
    const u = users[oldKey]
    if (!u) throw { code: 'auth/user-not-found' }
    if (u.provider !== 'google' && u.passwordHash !== hashPassword(password)) throw { code: 'auth/wrong-password' }
    delete users[oldKey]
    u.email = newEmail
    users[newKey] = u
    saveUsers(users)
    const s = { ...session, email: newEmail }
    saveSession(s)
    setSession(s)
  }, [session])

  const updatePassword = useCallback((currentPassword, newPassword) => {
    if (!session) throw { code: 'auth/requires-recent-login' }
    const users = getUsers()
    const key = session.email.toLowerCase()
    const u = users[key]
    if (!u) throw { code: 'auth/user-not-found' }
    if (u.provider !== 'google' && u.passwordHash !== hashPassword(currentPassword)) throw { code: 'auth/wrong-password' }
    u.passwordHash = hashPassword(newPassword)
    saveUsers(users)
  }, [session])

  const deleteAccount = useCallback((password) => {
    if (!session) return
    const users = getUsers()
    const key = session.email.toLowerCase()
    const u = users[key]
    if (!u) return
    if (u.provider !== 'google' && u.passwordHash !== hashPassword(password)) throw { code: 'auth/wrong-password' }
    delete users[key]
    saveUsers(users)
    saveSession(null)
    setSession(null)
  }, [session])

  const isProUser = () => userProfile?.tier === 'pro'

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading: false,
      login, signup, logout, resetPassword, loginWithGoogle,
      updateProfile, updateDisplayName, updateEmail, updatePassword, deleteAccount,
      isProUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
