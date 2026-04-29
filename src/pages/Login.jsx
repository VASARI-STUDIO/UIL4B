import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login({ toast }) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, signup, resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (resetMode) {
        await resetPassword(email)
        toast('Password reset email sent')
        setResetMode(false)
      } else if (isSignup) {
        await signup(email, password, displayName)
        toast('Account created')
        navigate('/palette')
      } else {
        await login(email, password)
        toast('Signed in')
        navigate('/palette')
      }
    } catch (err) {
      const code = err.code
      const msg = code === 'auth/email-already-in-use' ? 'An account with this email already exists'
        : code === 'auth/invalid-email' ? 'Please enter a valid email address'
        : code === 'auth/weak-password' ? 'Password must be at least 6 characters'
        : code === 'auth/invalid-credential' ? 'Invalid email or password'
        : code === 'auth/too-many-requests' ? 'Too many attempts — try again later'
        : code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.' ? 'Service temporarily unavailable'
        : err.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim() || 'Authentication failed'
      toast(msg)
    }
    setLoading(false)
  }

  return (
    <div className="sec">
      <div className="auth-container">
        <div className="auth-card card">
          <div className="auth-header">
            <h1>{resetMode ? 'Reset Password' : isSignup ? 'Create Account' : 'Welcome Back'}</h1>
            <p>{resetMode ? 'Enter your email to receive a reset link.' : isSignup ? 'Sign up to save your work and access all features.' : 'Sign in to your Visari Studio account.'}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">
            {isSignup && !resetMode && (
              <div className="auth-field">
                <label>Display Name</label>
                <input type="text" name="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" autoComplete="name" />
              </div>
            )}
            <div className="auth-field">
              <label>Email</label>
              <input type="email" name="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            </div>
            {!resetMode && (
              <div className="auth-field">
                <label>Password</label>
                <input type="password" name="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} autoComplete={isSignup ? 'new-password' : 'current-password'} />
              </div>
            )}
            <button className="btn btn-accent auth-submit" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : resetMode ? 'Send Reset Link' : isSignup ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="auth-links">
            {resetMode ? (
              <button onClick={() => setResetMode(false)}>Back to sign in</button>
            ) : (
              <>
                <button onClick={() => setIsSignup(!isSignup)}>
                  {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
                {!isSignup && <button onClick={() => setResetMode(true)}>Forgot password?</button>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
