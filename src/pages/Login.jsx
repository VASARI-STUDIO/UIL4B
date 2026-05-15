import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function Login({ toast }) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, signup, resetPassword, loginWithGoogle } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (resetMode) {
        if (!password) {
          toast(t('auth.errors.invalidCredential'))
          setLoading(false)
          return
        }
        if (!newPassword || newPassword.length < 6) {
          toast(t('auth.errors.weakPassword'))
          setLoading(false)
          return
        }
        await resetPassword(email, password, newPassword)
        toast(t('auth.passwordReset'))
        setResetMode(false)
        setNewPassword('')
      } else if (isSignup) {
        await signup(email, password, displayName)
        toast(t('auth.accountCreated'))
        navigate('/')
      } else {
        await login(email, password)
        toast(t('auth.signedIn'))
        navigate('/')
      }
    } catch (err) {
      const code = err.code
      if (code === 'auth/user-not-found' && !isSignup && !resetMode) {
        setIsSignup(true)
        toast(t('auth.errors.noAccountSwitched'))
        setLoading(false)
        return
      }
      const msg = code === 'auth/email-already-in-use' ? t('auth.errors.emailInUse')
        : code === 'auth/invalid-email' ? t('auth.errors.invalidEmail')
        : code === 'auth/weak-password' ? t('auth.errors.weakPassword')
        : code === 'auth/invalid-credential' ? t('auth.errors.invalidCredential')
        : code === 'auth/too-many-requests' ? t('auth.errors.tooManyRequests')
        : code === 'auth/user-not-found' ? t('auth.errors.userNotFound')
        : code === 'auth/wrong-password' ? t('auth.errors.invalidCredential')
        : err.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim() || t('auth.errors.authFailed')
      toast(msg)
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      await loginWithGoogle()
      toast(t('auth.signedIn'))
      navigate('/')
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast(err.code === 'auth/unauthorized-domain' ? t('auth.errors.googleUnavailable') : t('auth.errors.authFailed'))
      }
    }
    setLoading(false)
  }

  return (
    <div className="sec">
      <div className="auth-container">
        <div className="auth-card card">
          <div className="auth-header">
            <h1>{resetMode ? t('auth.resetPassword') : isSignup ? t('auth.createAccount') : t('auth.welcomeBack')}</h1>
            <p>{resetMode ? t('auth.resetSubtitle') : isSignup ? t('auth.signUpSubtitle') : t('auth.signInSubtitle')}</p>
          </div>

          {!resetMode && (
            <>
              <button className="auth-google-btn" type="button" onClick={handleGoogleLogin} disabled={loading}>
                <GoogleIcon />
                {t('auth.continueWithGoogle')}
              </button>

              <div className="auth-divider">
                <span>{t('auth.orEmail')}</span>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">
            {isSignup && !resetMode && (
              <div className="auth-field">
                <label>{t('auth.displayName')}</label>
                <input type="text" name="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t('auth.namePlaceholder')} autoComplete="name" />
              </div>
            )}
            <div className="auth-field">
              <label>{t('auth.email')}</label>
              <input type="email" name="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('auth.emailPlaceholder')} required autoComplete="email" />
            </div>
            <div className="auth-field">
              <label>{resetMode ? t('auth.currentPassword') || 'Current Password' : t('auth.password')}</label>
              <input type="password" name="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('auth.passwordPlaceholder')} required minLength={6} autoComplete="current-password" />
            </div>
            {resetMode && (
              <div className="auth-field">
                <label>{t('auth.newPassword')}</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('auth.passwordPlaceholder')} required minLength={6} autoComplete="new-password" />
              </div>
            )}
            <button className="btn btn-accent auth-submit" type="submit" disabled={loading}>
              {loading ? t('auth.pleaseWait') : resetMode ? t('auth.resetPassword') : isSignup ? t('auth.createAccount') : t('common.signIn')}
            </button>
          </form>

          <div className="auth-links">
            {resetMode ? (
              <button onClick={() => setResetMode(false)}>{t('auth.backToSignIn')}</button>
            ) : (
              <>
                <button onClick={() => setIsSignup(!isSignup)}>
                  {isSignup ? t('auth.haveAccount') : t('auth.noAccount')}
                </button>
                {!isSignup && <button onClick={() => setResetMode(true)}>{t('auth.forgotPassword')}</button>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
