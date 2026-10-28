import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import useOnline from '../../hooks/useOnline'
import { passwordIsWeak, cleanDisplayName, NAME_MAX, EMAIL_MAX } from '../../utils/signupInput'
import '../../styles/pages/auth.css'

// The log-in / sign-up / reset / switch form, shared by the modal (and, later,
// the /login page). It calls the AuthContext functions exactly as the modal
// always has; only the presentation and copy live here.

const RESEND_SECONDS = 30
const SILENT_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])
const ERROR_KEYS = {
  'auth/invalid-email': 'invalidEmail',
  'auth/invalid-credential': 'invalidCredential',
  'auth/wrong-password': 'invalidCredential',
  'auth/email-already-in-use': 'emailInUse',
  'auth/weak-password': 'weakPassword',
  'auth/too-many-requests': 'tooManyRequests',
  'auth/network-request-failed': 'network',
  'auth/popup-blocked': 'popupBlocked',
  'auth/google-unavailable': 'googleUnavailable',
}
// Never Firebase's own text: anything unmapped reads as `generic`.
const errorKey = (err) => ERROR_KEYS[err?.code] || 'generic'

// Splits "…{slot}…" copy so a slot can hold an element (bold, a link).
function fill(template, slots) {
  return String(template).split(/(\{\w+\})/).map((part, i) => {
    const m = part.match(/^\{(\w+)\}$/)
    return m && m[1] in slots ? <Fragment key={i}>{slots[m[1]]}</Fragment> : part
  })
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function MsgIcon({ offline }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {offline
        ? <path d="M2 2l20 20M8.5 16.4a5 5 0 017 0M5 12.9a10 10 0 015.2-2.7M2 8.8a15 15 0 014.2-2.8M12 20h.01" />
        : <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />}
    </svg>
  )
}

const Spinner = () => <span className="auth-spin" aria-hidden="true" />

export default function AuthForm({
  mode, onModeChange, initialEmail = '', lockEmail = false, onSuccess,
  headingLevel = 2, headingId = 'ui-login-title', reason, reasons, unlocks, free = true, onBusyChange, showLoginSub = false,
}) {
  const { login, signup, resetPassword, loginWithGoogle } = useAuth()
  const { t } = useI18n()
  const online = useOnline()
  const offline = online === false
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(null) // null | 'google' | 'submit'
  const [error, setError] = useState(null) // { key, tick }
  const [cooldown, setCooldown] = useState(0)
  const titleRef = useRef(null)
  const errRef = useRef(null)
  const mounted = useRef(false)
  const [swapped, setSwapped] = useState(false)

  useEffect(() => { onBusyChange?.(!!busy) }, [busy, onBusyChange])

  // A new mode moves focus to its title; a failed attempt then moves it to the
  // error line (declared second, so it wins when both change together).
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    setSwapped(true)
    titleRef.current?.focus()
  }, [mode])
  useEffect(() => { if (error) errRef.current?.focus() }, [error])

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const id = setTimeout(() => setCooldown((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const fail = (key) => setError({ key, tick: Date.now() })
  const go = (next) => { setError(null); onModeChange(next) }

  const sendReset = async () => {
    await resetPassword(email)
    setCooldown(RESEND_SECONDS)
    onModeChange('sent')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (offline) return
    // Refused before any request: a password of spaces satisfies the input's
    // own minLength, and the server would accept it.
    if (mode === 'signup' && passwordIsWeak(password)) { fail('weakPassword'); return }
    setError(null)
    setBusy('submit')
    try {
      if (mode === 'reset') {
        await sendReset()
      } else if (mode === 'signup') {
        const cred = await signup(email, password, cleanDisplayName(displayName))
        onSuccess(cred?.user)
        return
      } else {
        const cred = await login(email, password)
        onSuccess(cred?.user)
        return
      }
    } catch (err) {
      if (err?.code === 'auth/user-not-found' && mode === 'login') {
        onModeChange('signup')
        fail('noAccountSwitched')
      } else if (err?.code === 'auth/user-not-found' && mode === 'reset') {
        // Same answer whether or not the address has an account.
        setCooldown(RESEND_SECONDS)
        onModeChange('sent')
      } else {
        fail(errorKey(err))
      }
    }
    setBusy(null)
  }

  const handleResend = async () => {
    setError(null)
    setBusy('submit')
    try { await sendReset() } catch (err) { fail(errorKey(err)) }
    setBusy(null)
  }

  const handleGoogle = async () => {
    if (offline) return
    setError(null)
    setBusy('google')
    try {
      const cred = await loginWithGoogle()
      onSuccess(cred?.user)
      return
    } catch (err) {
      if (!SILENT_CODES.has(err?.code)) fail(errorKey(err))
    }
    setBusy(null)
  }

  const isEntry = mode === 'login' || mode === 'signup'
  const interrupt = !!reason && isEntry
  const strong = (v) => <strong>{v}</strong>

  const title = mode === 'reset' ? t('auth.resetTitle')
    : mode === 'sent' ? t('auth.sentTitle')
      : mode === 'switch' ? t('auth.switchTitle')
        : mode === 'signup' ? t('auth.createAccount')
          : reason ? t('auth.logInContinue') : t('auth.logInTitle')
  const sub = mode === 'reset' ? t('auth.resetSub')
    : mode === 'sent' ? fill(t('auth.sentSub'), { email: strong(email) })
      : mode === 'switch' ? fill(t('auth.switchSub'), { email: strong(email) })
        : interrupt ? fill(t(mode === 'signup' ? 'auth.interruptSignUp' : 'auth.interruptLogIn'), { reason: strong(reason) })
          : mode === 'signup' ? t('auth.signUpSub') : showLoginSub ? t('auth.logInSub') : null

  const whyList = isEntry && Array.isArray(reasons) ? reasons.filter((r) => typeof r === 'string' && r.trim()) : []
  const unlockList = interrupt && free && !whyList.length && Array.isArray(unlocks)
    ? unlocks.filter((u) => typeof u === 'string' && u.trim()) : []
  const Heading = headingLevel === 1 ? 'h1' : 'h2'

  const disabled = !!busy
  const blocked = disabled || offline
  const errKey = error?.key
  const emailBad = errKey === 'invalidEmail' || errKey === 'emailInUse' || errKey === 'invalidCredential'
  const pwBad = errKey === 'weakPassword' || errKey === 'invalidCredential'
  // The sent screen has no submit button, so it has no label to look up.
  const submitKey = (busy === 'submit'
    ? { login: 'auth.loadingLogin', signup: 'auth.loadingSignup', reset: 'auth.loadingReset', switch: 'auth.loadingSwitch' }
    : { login: 'auth.submitLogin', signup: 'auth.submitSignup', reset: 'auth.sendResetLink', switch: 'auth.submitSwitch' })[mode]
  const submitLabel = submitKey ? t(submitKey) : ''

  const emailField = (
    <div className="auth-field">
      <label htmlFor="ui-login-email">{t('auth.email')}</label>
      <input id="ui-login-email" type="email" name="email" maxLength={EMAIL_MAX} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.emailPlaceholder')} required inputMode="email" autoComplete="email" autoCapitalize="off" spellCheck={false} readOnly={lockEmail} disabled={disabled} aria-invalid={emailBad || undefined} aria-describedby={emailBad ? 'ui-login-error' : undefined} />
    </div>
  )

  return (
    <div className="auth-form-root" data-mode={mode} aria-busy={busy ? 'true' : undefined}>
      <div className={'auth-swap' + (swapped ? ' auth-swap--in' : '')} key={mode}>
        <Heading className="auth-title" id={headingId} ref={titleRef} tabIndex={-1}>{title}</Heading>
        {sub && <p className="auth-sub" id="ui-login-promise">{sub}</p>}
        {whyList.length > 0 && (
          <div className="auth-why">
            <p className="auth-why-h">{t('auth.whyWeAsk')}</p>
            <ul className="auth-list">{whyList.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        )}
        {unlockList.length > 0 && (
          <ul className="auth-list auth-why">{unlockList.map((item) => <li key={item}>{item}</li>)}</ul>
        )}

        <div className="auth-body">
          {error && (
            <p className="auth-msg auth-msg--err" id="ui-login-error" role="alert" tabIndex={-1} ref={errRef}>
              <MsgIcon />
              <span>
                {t('auth.errors.' + error.key, { email })}
                {error.key === 'emailInUse' && <>{' '}<button type="button" className="auth-inline" onClick={() => go('login')}>{t('auth.errors.emailInUseAction')}</button></>}
              </span>
            </p>
          )}
          {offline && <p className="auth-msg" id="ui-login-offline" role="status"><MsgIcon offline /><span>{t('auth.errors.offline')}</span></p>}

          {mode === 'sent' ? (
            <button type="button" className="auth-link auth-resend" onClick={handleResend} disabled={disabled || offline || cooldown > 0}>
              {cooldown > 0 ? t('auth.resendWait', { n: cooldown }) : t('auth.resend')}
            </button>
          ) : (
            <>
              {isEntry && (
                <>
                  <button className="auth-google-btn auth-google-btn--primary" type="button" onClick={handleGoogle} disabled={blocked} aria-describedby={offline ? 'ui-login-offline' : undefined}>
                    {busy === 'google' ? <Spinner /> : <span className="auth-google-mark"><GoogleIcon /></span>}
                    {busy === 'google' ? t('auth.googleLoading') : t('auth.continueWithGoogle')}
                  </button>
                  <div className="auth-divider"><span>{t('auth.orEmail')}</span></div>
                </>
              )}

              <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">
                {mode === 'signup' && (
                  <div className="auth-field">
                    <label htmlFor="ui-login-name">{t('auth.name')}</label>
                    <input id="ui-login-name" type="text" name="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" maxLength={NAME_MAX} disabled={disabled} />
                  </div>
                )}
                {emailField}
                {mode !== 'reset' && (
                  <div className="auth-field">
                    <label htmlFor="ui-login-password">{t('auth.password')}</label>
                    <div className="auth-pw">
                      <input id="ui-login-password" type={showPw ? 'text' : 'password'} name="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} disabled={disabled} aria-invalid={pwBad || undefined} aria-describedby={pwBad ? 'ui-login-error' : mode === 'signup' ? 'ui-login-pw-help' : undefined} />
                      <button type="button" className="auth-show" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw} aria-controls="ui-login-password" disabled={disabled}>{showPw ? t('auth.hidePassword') : t('auth.showPassword')}</button>
                    </div>
                    {mode === 'signup' && <p className={'auth-help' + (errKey === 'weakPassword' ? ' auth-help--err' : '')} id="ui-login-pw-help">{t('auth.passwordHelp')}</p>}
                  </div>
                )}
                <button className="btn auth-submit" type="submit" disabled={blocked} aria-describedby={offline ? 'ui-login-offline' : undefined}>
                  {busy === 'submit' && <Spinner />}{submitLabel}
                </button>
              </form>

              {/* Both modes can create an account (Google from log-in does), so
                  both carry it. New tab, so the form keeps its values. */}
              {isEntry && (
                <p className="auth-legal">
                  {fill(t('auth.legal'), {
                    terms: <Link to="/terms" target="_blank" rel="noopener noreferrer">{t('auth.legalTerms')}</Link>,
                    privacy: <Link to="/privacy" target="_blank" rel="noopener noreferrer">{t('auth.legalPrivacy')}</Link>,
                  })}
                </p>
              )}
            </>
          )}

          {mode !== 'switch' && (
            <div className="auth-links">
              {mode === 'login' && (
                <>
                  <button type="button" className="auth-link" onClick={() => go('signup')} disabled={disabled}>{t('auth.noAccount')} <span className="auth-link-strong">{t('auth.noAccountAction')}</span></button>
                  <button type="button" className="auth-link auth-link--quiet" onClick={() => go('reset')} disabled={disabled}>{t('auth.forgotPassword')}</button>
                </>
              )}
              {mode === 'signup' && (
                <button type="button" className="auth-link" onClick={() => go('login')} disabled={disabled}>{t('auth.haveAccount')} <span className="auth-link-strong">{t('auth.haveAccountAction')}</span></button>
              )}
              {(mode === 'reset' || mode === 'sent') && (
                <button type="button" className="auth-link auth-link--quiet" onClick={() => go('login')} disabled={disabled}>{t('auth.backToLogIn')}</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
