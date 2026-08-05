import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

// Single-click sign-in. Opened over the current page (never navigates to
// /login) so the user resumes exactly where they were on success. Composes the
// existing HVZ auth functions — it does not touch AuthContext itself.
//
// `reasons` is optional: a short list of plain-language answers to "why do I
// need an account for this?". Callers that pass nothing render exactly as
// before. Used by the community submission gate, where the honest answer
// (attribution, moderation, withdrawal) is the whole reason we ask up front.
export default function LoginPopup({ reason, reasons, free = true, initialEmail = '', lockEmail = false, passwordOnly = false, onSuccess, onDismiss }) {
  const { login, signup, resetPassword, loginWithGoogle } = useAuth()
  const { t } = useI18n()
  const [isSignup, setIsSignup] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef(null)
  const googleRef = useRef(null)
  const passwordRef = useRef(null)
  const loadingRef = useRef(false)

  useEffect(() => { loadingRef.current = loading }, [loading])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = requestAnimationFrame(() => {
      ;(passwordOnly ? passwordRef.current : googleRef.current)?.focus()
    })
    const onKey = (e) => {
      if (e.key === 'Escape' && !loadingRef.current) {
        e.preventDefault()
        onDismiss()
        return
      }
      if (e.key !== 'Tab') return
      const focusable = [...(dialogRef.current?.querySelectorAll(
        'button:not([disabled]),input:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])',
      ) || [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onDismiss, passwordOnly])

  const mapError = (err) => {
    const code = err?.code
    return code === 'auth/email-already-in-use' ? (t('auth.errors.emailInUse') || 'That email already has an account.')
      : code === 'auth/invalid-email' ? (t('auth.errors.invalidEmail') || 'That email doesn’t look right.')
        : code === 'auth/weak-password' ? (t('auth.errors.weakPassword') || 'Use at least 6 characters.')
          : code === 'auth/invalid-credential' || code === 'auth/wrong-password' ? (t('auth.errors.invalidCredential') || 'Wrong email or password.')
            : code === 'auth/too-many-requests' ? (t('auth.errors.tooManyRequests') || 'Too many attempts — try again shortly.')
              : (err?.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim() || t('auth.errors.authFailed') || 'Something went wrong. Try again.')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (resetMode) {
        await resetPassword(email)
        setResetSent(true)
      } else if (isSignup) {
        const cred = await signup(email, password, displayName)
        onSuccess(cred?.user)
        return
      } else {
        const cred = await login(email, password)
        onSuccess(cred?.user)
        return
      }
    } catch (err) {
      if (err?.code === 'auth/user-not-found' && !isSignup && !resetMode && !passwordOnly) {
        setIsSignup(true)
        setError(t('auth.errors.noAccountSwitched') || 'No account yet — finish signing up below.')
      } else {
        setError(mapError(err))
      }
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      const cred = await loginWithGoogle()
      onSuccess(cred?.user)
      return
    } catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setError(mapError(err))
      }
    }
    setLoading(false)
  }

  // Only shown on the first (sign-in / sign-up) step — a password reset or an
  // account switch is a different job and the list would just be noise there.
  const whyList = Array.isArray(reasons) ? reasons.filter(r => typeof r === 'string' && r.trim()) : []
  const showWhy = whyList.length > 0 && !resetMode && !passwordOnly

  const title = resetMode ? (t('auth.resetPassword') || 'Reset your password')
    : isSignup ? (t('auth.createAccount') || 'Create your free account')
      : passwordOnly ? 'Switch account'
        : reason ? 'Log in to continue' : (t('auth.welcomeBack') || 'Welcome back')

  return (
    <div className="ui-modal-overlay" onMouseDown={() => { if (!loading) onDismiss() }}>
      <div
        ref={dialogRef}
        className="ui-modal ui-login"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-login-title"
        aria-describedby={showWhy ? 'ui-login-why' : undefined}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ui-modal-head">
          <h2 className="ui-modal-title" id="ui-login-title">{title}</h2>
          <button type="button" className="ui-modal-x" onClick={onDismiss} aria-label="Close" disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="ui-modal-body">
          {reason && free && !resetMode && (
            <p className="ui-login-note">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>
              <span>You must log in to {reason} — don’t worry, it’s still free.</span>
            </p>
          )}
          {showWhy && (
            <div className="ui-login-why" id="ui-login-why">
              <p className="ui-login-why-h">Why we ask first</p>
              <ul className="ui-login-why-list">
                {whyList.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {passwordOnly && (
            <p className="ui-login-note">
              <span>Sign in as <strong>{initialEmail}</strong>. Your current account stays active unless this sign-in succeeds.</span>
            </p>
          )}

          {error && <p className="ui-login-err" role="alert">{error}</p>}

          {resetMode && resetSent ? (
            <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
              <p style={{ fontSize: 14, color: 'var(--t0)', marginBottom: 6 }}>Check your email</p>
              <p style={{ fontSize: 12.5, color: 'var(--t2)', marginBottom: 14 }}>
                We sent a reset link to <strong>{email}</strong>.
              </p>
              <button type="button" className="btn" onClick={() => { setResetMode(false); setResetSent(false) }}>Back to sign in</button>
            </div>
          ) : (
            <>
              {!resetMode && !passwordOnly && (
                <>
                  <button ref={googleRef} className="auth-google-btn" type="button" onClick={handleGoogle} disabled={loading}>
                    <GoogleIcon />
                    {t('auth.continueWithGoogle') || 'Continue with Google'}
                  </button>
                  <div className="auth-divider"><span>{t('auth.orEmail') || 'or with email'}</span></div>
                </>
              )}

              <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">
                {isSignup && !resetMode && (
                  <div className="auth-field">
                    <label htmlFor="ui-login-name">{t('auth.displayName') || 'Name'}</label>
                    <input id="ui-login-name" type="text" name="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t('auth.namePlaceholder') || 'Your name'} autoComplete="name" />
                  </div>
                )}
                <div className="auth-field">
                  <label htmlFor="ui-login-email">{t('auth.email') || 'Email'}</label>
                  <input id="ui-login-email" type="email" name="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('auth.emailPlaceholder') || 'you@example.com'} required autoComplete="email" readOnly={lockEmail} />
                </div>
                {!resetMode && (
                  <div className="auth-field">
                    <label htmlFor="ui-login-password">{t('auth.password') || 'Password'}</label>
                    <input ref={passwordRef} id="ui-login-password" type="password" name="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('auth.passwordPlaceholder') || '••••••••'} required minLength={6} autoComplete={isSignup ? 'new-password' : 'current-password'} />
                  </div>
                )}
                <button className="btn btn-accent auth-submit" type="submit" disabled={loading}>
                  {loading ? (t('auth.pleaseWait') || 'Please wait…') : resetMode ? (t('auth.sendResetLink') || 'Send reset link') : isSignup ? (t('auth.createAccount') || 'Create account') : passwordOnly ? 'Switch account' : (t('common.signIn') || 'Sign in')}
                </button>
              </form>

              {!passwordOnly && <div className="auth-links">
                {resetMode ? (
                  <button type="button" onClick={() => { setResetMode(false); setError('') }}>{t('auth.backToSignIn') || 'Back to sign in'}</button>
                ) : (
                  <>
                    <button type="button" onClick={() => { setIsSignup(!isSignup); setError('') }}>
                      {isSignup ? (t('auth.haveAccount') || 'Already have an account? Sign in') : (t('auth.noAccount') || 'No account? Sign up free')}
                    </button>
                    {!isSignup && <button type="button" onClick={() => { setResetMode(true); setError('') }}>{t('auth.forgotPassword') || 'Forgot password?'}</button>}
                  </>
                )}
              </div>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
