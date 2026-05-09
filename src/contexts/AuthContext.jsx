import { createContext, useContext, useState, useCallback } from 'react'

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

  const resetPassword = useCallback(async (email) => {
    const users = getUsers()
    if (!users[email.toLowerCase()]) throw { code: 'auth/user-not-found' }
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
    if (!u || u.passwordHash !== hashPassword(password)) throw { code: 'auth/wrong-password' }
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
    if (!u || u.passwordHash !== hashPassword(currentPassword)) throw { code: 'auth/wrong-password' }
    u.passwordHash = hashPassword(newPassword)
    saveUsers(users)
  }, [session])

  const deleteAccount = useCallback((password) => {
    if (!session) return
    const users = getUsers()
    const key = session.email.toLowerCase()
    const u = users[key]
    if (!u || u.passwordHash !== hashPassword(password)) throw { code: 'auth/wrong-password' }
    delete users[key]
    saveUsers(users)
    saveSession(null)
    setSession(null)
  }, [session])

  const isProUser = () => userProfile?.tier === 'pro'

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading: false,
      login, signup, logout, resetPassword,
      updateProfile, updateDisplayName, updateEmail, updatePassword, deleteAccount,
      isProUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
