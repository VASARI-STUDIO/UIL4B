import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'

export default function Login({ toast }) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, signup, resetPassword } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (resetMode) {
        await resetPassword(email)
        toast(t('auth.resetSent'))
        setResetMode(false)
      } else if (isSignup) {
        await signup(email, password, displayName)
        toast(t('auth.accountCreated'))
        navigate('/color')
      } else {
        await login(email, password)
        toast(t('auth.signedIn'))
        navigate('/color')
      }
    } catch (err) {
      const code = err.code
      const msg = code === 'auth/email-already-in-use' ? t('auth.errors.emailInUse')
        : code === 'auth/invalid-email' ? t('auth.errors.invalidEmail')
        : code === 'auth/weak-password' ? t('auth.errors.weakPassword')
        : code === 'auth/invalid-credential' ? t('auth.errors.invalidCredential')
        : code === 'auth/too-many-requests' ? t('auth.errors.tooManyRequests')
        : code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.' ? t('auth.errors.serviceUnavailable')
        : code === 'auth/user-not-found' ? t('auth.errors.userNotFound')
        : err.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim() || t('auth.errors.authFailed')
      toast(msg)
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
            {!resetMode && (
              <div className="auth-field">
                <label>{t('auth.password')}</label>
                <input type="password" name="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('auth.passwordPlaceholder')} required minLength={6} autoComplete={isSignup ? 'new-password' : 'current-password'} />
              </div>
            )}
            <button className="btn btn-accent auth-submit" type="submit" disabled={loading}>
              {loading ? t('auth.pleaseWait') : resetMode ? t('auth.sendResetLink') : isSignup ? t('auth.createAccount') : t('common.signIn')}
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
