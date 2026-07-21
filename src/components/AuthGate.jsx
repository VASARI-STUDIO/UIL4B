import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AuthGate({ children, featureLabel }) {
  const { user, loginWithGoogle, login, signup, loading } = useAuth()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  if (user) return children

  const handleGoogle = async () => {
    setBusy(true)
    setError(null)
    try {
      await loginWithGoogle()
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.code === 'auth/unauthorized-domain' ? 'Google sign-in unavailable on this domain' : 'Sign-in failed — try again')
      }
    }
    setBusy(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signup') {
        await signup(email, password, name)
      } else {
        await login(email, password)
      }
    } catch (err) {
      const code = err.code
      if (code === 'auth/user-not-found' && mode === 'login') {
        setMode('signup')
        setError('No account found — create one below')
      } else {
        setError(
          code === 'auth/invalid-credential' ? 'Invalid email or password'
            : code === 'auth/email-already-in-use' ? 'Email already in use'
            : code === 'auth/weak-password' ? 'Password must be at least 6 characters'
            : err.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim() || 'Sign-in failed'
        )
      }
    }
    setBusy(false)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="fg-loader" /></div>

  if (!show) {
    return (
      <div className="auth-gate-prompt">
        <div className="auth-gate-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <p className="auth-gate-text">Sign in to {featureLabel || 'use this feature'}</p>
        <div className="auth-gate-actions">
          <button className="btn btn-accent" onClick={handleGoogle} disabled={busy}>
            <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          <button className="btn btn-s" onClick={() => setShow(true)}>Use email instead</button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-gate-prompt">
      <form onSubmit={handleSubmit} className="auth-gate-form">
        <h3 className="auth-gate-title">{mode === 'signup' ? 'Create account' : 'Sign in'}</h3>
        {error && <div className="auth-gate-error">{error}</div>}
        {mode === 'signup' && (
          <input type="text" placeholder="Display name" value={name} onChange={e => setName(e.target.value)} />
        )}
        <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" className="btn btn-accent" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Signing in...' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
        <div className="auth-gate-footer">
          <button type="button" onClick={handleGoogle} disabled={busy} className="auth-gate-google-link">
            <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>
          <span className="auth-gate-sep">|</span>
          <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="auth-gate-switch">
            {mode === 'login' ? 'Create account' : 'Sign in instead'}
          </button>
        </div>
      </form>
    </div>
  )
}
