import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext()
const USERS_KEY = 'vs-users'
const SESSION_KEY = 'vs-session'

function loadUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {} } catch { return {} }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}

function hashPassword(password) {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    hash = ((hash << 5) - hash + password.charCodeAt(i)) | 0
  }
  return 'h_' + Math.abs(hash).toString(36)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = loadSession()
    if (session) {
      setUser(session)
      setUserProfile(session)
    }
    setLoading(false)
  }, [])

  const persistSession = useCallback((profile) => {
    setUser(profile)
    setUserProfile(profile)
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile))
  }, [])

  const signup = useCallback(async (email, password, displayName) => {
    if (!email || !password) throw { code: 'auth/invalid-email', message: 'Email and password are required' }
    if (password.length < 6) throw { code: 'auth/weak-password', message: 'Password must be at least 6 characters' }
    const users = loadUsers()
    const key = email.toLowerCase()
    if (users[key]) throw { code: 'auth/email-already-in-use', message: 'An account with this email already exists' }
    const profile = {
      uid: 'u_' + Date.now().toString(36),
      email: key,
      displayName: displayName || key.split('@')[0],
      photoURL: '',
      tier: 'free',
      createdAt: new Date().toISOString()
    }
    users[key] = { ...profile, pw: hashPassword(password) }
    saveUsers(users)
    persistSession(profile)
    return { user: profile }
  }, [persistSession])

  const login = useCallback(async (email, password) => {
    if (!email || !password) throw { code: 'auth/invalid-email', message: 'Email and password are required' }
    const users = loadUsers()
    const key = email.toLowerCase()
    const stored = users[key]
    if (!stored || stored.pw !== hashPassword(password)) {
      throw { code: 'auth/invalid-credential', message: 'Invalid email or password' }
    }
    const { pw, ...profile } = stored
    persistSession(profile)
    return { user: profile }
  }, [persistSession])

  const loginWithGoogle = useCallback(async () => {
    const name = 'Google User'
    const email = 'google_' + Date.now().toString(36) + '@gmail.com'
    const profile = {
      uid: 'g_' + Date.now().toString(36),
      email,
      displayName: name,
      photoURL: '',
      tier: 'free',
      createdAt: new Date().toISOString()
    }
    const users = loadUsers()
    users[email] = { ...profile, pw: '' }
    saveUsers(users)
    persistSession(profile)
    return { user: profile }
  }, [persistSession])

  const logout = useCallback(async () => {
    setUser(null)
    setUserProfile(null)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  const resetPassword = useCallback(async (email) => {
    if (!email) throw { code: 'auth/invalid-email', message: 'Please enter a valid email address' }
    const users = loadUsers()
    if (!users[email.toLowerCase()]) throw { code: 'auth/user-not-found', message: 'No account found with this email' }
  }, [])

  const isProUser = useCallback(() => userProfile?.tier === 'pro', [userProfile])

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
