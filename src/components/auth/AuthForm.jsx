import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import useOnline from '../../hooks/useOnline'
import { authNow, loadAuthSdk, openFirebaseGate } from '../../utils/firebaseAccess'
import ReportProblemLink from '../ReportProblemLink'
import { passwordProblem, EMAIL_MAX } from '../../utils/signupInput'
import '../../styles/pages/auth.css'
import '../../styles/v3-pro-auth.css'

// The log-in / sign-up / reset / switch form, shared by the popup, the /login
// page, the Pro sign-up layer and the export dock. It calls the AuthContext
// functions exactly as it always has; only the presentation and copy live here.
//
// Log in and sign up are two steps: the email first (with Google above it), then
// the password. Reset, sent and switch are one screen. The step is held here
// unless the caller passes `step` and `onStepChange` (the Pro layer keeps it in
// the browser history). `controlRef.current.back()` steps back one screen and
// says whether it did, so a caller's Escape can ask first.

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
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  headingLevel = 2, headingId = 'ui-login-title', reason, reasons, unlocks, free = true, onBusyChange, showLoginSub = false, showReport = false,
  step: stepProp, onStepChange, controlRef, heading, loginHeading, subtitle, onEmailChange,
}) {
  const { login, signup, resetPassword, loginWithGoogle } = useAuth()
  // The form is on screen, so the next thing that happens may be a sign-in. Start
  // the SDK now: the Google popup has to open inside the click that asked for it.
  useEffect(() => { openFirebaseGate() }, [])
  // The Google button is aria-disabled (still focusable, click ignored) until the
  // auth SDK is in: signInWithPopup must run inside the click, and awaiting the
  // download first can lose the browser's user activation. A failed load enables
  // it so the click reports it.
  const [sdkReady, setSdkReady] = useState(() => !!authNow())
  useEffect(() => {
    let live = true
    loadAuthSdk().catch(() => {}).then(() => { if (live) setSdkReady(true) })
    return () => { live = false }
  }, [])
  const { t } = useI18n()
  const online = useOnline()
  const [offlineSeen, setOfflineSeen] = useState(false)
  const offline = online === false && !offlineSeen
  useEffect(() => { if (online) setOfflineSeen(false) }, [online])
  const [email, setEmailState] = useState(initialEmail)
  const setEmail = (v) => { setEmailState(v); onEmailChange?.(v) }
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(null) // null | 'google' | 'submit'
  const [error, setError] = useState(null) // { key, tick }
  const [cooldown, setCooldown] = useState(0)
  const [stepInner, setStepInner] = useState(1)
  const step = stepProp || stepInner
  const setStep = (n) => { if (onStepChange) onStepChange(n); else setStepInner(n) }
  const titleRef = useRef(null)
  const errRef = useRef(null)
  const offlineRef = useRef(null)
  const emailRef = useRef(null)
  const pwRef = useRef(null)
  const mounted = useRef(false)
  const [swapped, setSwapped] = useState(false)

  useEffect(() => { onBusyChange?.(!!busy) }, [busy, onBusyChange])

  const isEntry = mode === 'login' || mode === 'signup'
  const onPassword = isEntry && step === 2
  const onEmail = isEntry && step === 1

  // A new screen moves focus: the password on step 2, the email on reset,
  // otherwise the title. A failed attempt then moves it to the error line
  // (declared second, so it wins when both change together).
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    setSwapped(true)
    if (onPassword) pwRef.current?.focus()
    else if (mode === 'reset' && emailRef.current) { emailRef.current.focus(); emailRef.current.select() }
    else titleRef.current?.focus()
  }, [mode, step]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!error) return
    // A wrong password clears the field and puts the cursor back in it, so the
    // next try starts empty; the alert still announces the line.
    if (error.key === 'invalidCredential' && pwRef.current) { setPassword(''); pwRef.current.focus(); return }
    if (error.key === 'invalidEmail' && emailRef.current) { emailRef.current.focus(); return }
    errRef.current?.focus()
  }, [error])

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const id = setTimeout(() => setCooldown((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const fail = (key) => setError({ key, tick: Date.now() })
  const go = (next) => {
    setError(null)
    // Coming back from reset with an address already typed lands on the password.
    if ((next === 'login' || next === 'signup') && (mode === 'reset' || mode === 'sent')) setStep(email.trim() ? 2 : 1)
    onModeChange(next)
  }

  // One screen back, keeping the email. Returns false when there is nowhere
  // further back to go (the caller then closes). While a request is in flight it
  // answers true and does nothing: the request cannot be taken back.
  const backRef = useRef(null)
  backRef.current = () => {
    if (busy) return true
    if (mode === 'reset' || mode === 'sent') { go('login'); return true }
    if (onPassword) { setError(null); setStep(1); return true }
    return false
  }
  useEffect(() => {
    if (!controlRef) return undefined
    controlRef.current = { back: () => backRef.current() }
    return () => { controlRef.current = null }
  }, [controlRef])

  const sendReset = async () => {
    await resetPassword(email)
    setCooldown(RESEND_SECONDS)
    onModeChange('sent')
  }

  const handleContinue = (e) => {
    e.preventDefault()
    if (busy) return
    if (offline) { offlineRef.current?.focus(); return }
    if (!LOOKS_LIKE_EMAIL.test(email.trim())) { fail('invalidEmail'); return }
    setError(null)
    setEmail(email.trim())
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (offline) { offlineRef.current?.focus(); return }
    // Refused before any request: a password of spaces satisfies the input's
    // own minLength, and the server would accept it.
    const weak = mode === 'signup' ? passwordProblem(password) : null
    if (weak) { fail(weak); return }
    setError(null)
    setBusy('submit')
    try {
      if (mode === 'reset') {
        await sendReset()
      } else if (mode === 'signup') {
        // No name is asked for: the greeting and avatar fall back to the email,
        // and the account can add a name later.
        const cred = await signup(email, password, '')
        onSuccess(cred?.user, { created: true })
        return
      } else {
        const cred = await login(email, password)
        onSuccess(cred?.user, { created: false })
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
    if (busy || cooldown > 0) return
    if (offline) { offlineRef.current?.focus(); return }
    setError(null)
    setBusy('submit')
    try { await sendReset() } catch (err) { fail(errorKey(err)) }
    setBusy(null)
  }

  // The link in the wrong-password line: the reset goes to the email already
  // typed, with no second form to fill.
  const resetFromError = async () => {
    if (busy) return
    setError(null)
    setBusy('submit')
    try { await sendReset() } catch (err) { fail(errorKey(err)) }
    setBusy(null)
  }

  const handleGoogle = async () => {
    if (busy) return
    // Google stays enabled offline: pressing it moves focus to the offline line.
    if (offline) { offlineRef.current?.focus(); return }
    if (!sdkReady) return
    setError(null)
    setBusy('google')
    try {
      const cred = await loginWithGoogle()
      onSuccess(cred?.user, { created: !!cred?.additionalUserInfo?.isNewUser })
      return
    } catch (err) {
      if (!SILENT_CODES.has(err?.code)) fail(errorKey(err))
    }
    setBusy(null)
  }

  const tryAgain = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine !== false) setOfflineSeen(true)
    else offlineRef.current?.focus()
  }

  const interrupt = !!reason && isEntry
  const strong = (v) => <strong>{v}</strong>
  const mono = <span className="auth-mono">{email}</span>

  const loginTitle = loginHeading || (reason ? t('auth.logInContinue') : t('auth.logInTitle'))
  const title = mode === 'reset' ? t('auth.resetTitle')
    : mode === 'sent' ? t('auth.sentTitle')
      : mode === 'switch' ? t('auth.switchTitle')
        : mode === 'signup' ? (onPassword ? t('auth.chooseTitle') : heading || t('auth.createAccount'))
          : loginTitle
  const forEmail = (
    <>
      {fill(t('auth.forEmail'), { email: mono })}
      {' '}<button type="button" className="auth-inline" onClick={() => { setError(null); setStep(1) }} disabled={!!busy}>{t('auth.change')}</button>
    </>
  )
  const sub = mode === 'reset' ? t('auth.resetSub')
    : mode === 'sent' ? fill(t('auth.sentSub'), { email: mono })
      : mode === 'switch' ? fill(t('auth.switchSub'), { email: strong(email) })
        : onPassword ? forEmail
          : subtitle && mode === 'signup' ? subtitle
            : interrupt ? fill(t(mode === 'signup' ? 'auth.interruptSignUp' : 'auth.interruptLogIn'), { reason: strong(reason) })
              : mode === 'signup' ? t('auth.signUpSub') : showLoginSub ? t('auth.logInSub') : null

  const whyList = onEmail && Array.isArray(reasons) ? reasons.filter((r) => typeof r === 'string' && r.trim()) : []
  const unlockList = interrupt && onEmail && free && !whyList.length && Array.isArray(unlocks)
    ? unlocks.filter((u) => typeof u === 'string' && u.trim()) : []
  const Heading = headingLevel === 1 ? 'h1' : 'h2'

  const disabled = !!busy
  const errKey = error?.key
  const emailBad = errKey === 'invalidEmail'
  const weakKey = errKey === 'weakPassword' || errKey === 'weakPasswordSpaces'
  const pwBad = weakKey || errKey === 'invalidCredential' || errKey === 'emailInUse'
  // The sent screen has no submit button, so it has no label to look up.
  const submitKey = (busy === 'submit'
    ? { login: 'auth.loadingLogin', signup: 'auth.loadingSignup', reset: 'auth.loadingReset', switch: 'auth.loadingSwitch' }
    : { login: 'auth.submitLogin', signup: 'auth.submitSignup', reset: 'auth.sendResetLink', switch: 'auth.submitSwitch' })[mode]
  const submitLabel = submitKey ? t(submitKey) : ''
  const offlineDesc = offline ? 'ui-login-offline' : undefined

  const emailField = (
    <div className="auth-field">
      <label htmlFor="ui-login-email">{t('auth.email')}</label>
      <input ref={emailRef} id="ui-login-email" type="email" name="email" maxLength={EMAIL_MAX} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.emailPlaceholder')} required inputMode="email" autoComplete="email" autoCapitalize="off" spellCheck={false} readOnly={lockEmail} disabled={disabled} aria-invalid={emailBad || undefined} aria-describedby={emailBad ? 'ui-login-error' : undefined} />
    </div>
  )

  const googleBtn = (
    <>
      <button className="auth-google-btn auth-google-btn--primary" type="button" onClick={handleGoogle} disabled={busy === 'submit'} aria-disabled={(!sdkReady && !offline) || busy === 'google' || undefined} aria-busy={busy === 'google' || (!sdkReady && !offline) || undefined} aria-describedby={offlineDesc}>
        {busy === 'google' ? <Spinner /> : <span className="auth-google-mark"><GoogleIcon /></span>}
        {busy === 'google' ? t('auth.googleLoading') : t('auth.continueWithGoogle')}
      </button>
      <div className="auth-divider"><span>{t('auth.orEmail')}</span></div>
    </>
  )

  const pwField = (
    <div className="auth-field">
      <label htmlFor="ui-login-password">{t('auth.password')}</label>
      <div className="auth-pw">
        <input ref={pwRef} id="ui-login-password" type={showPw ? 'text' : 'password'} name="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} disabled={disabled} aria-invalid={pwBad || undefined} aria-describedby={pwBad ? 'ui-login-error' : mode === 'signup' ? 'ui-login-pw-help' : undefined} />
        <button type="button" className="auth-show" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw} aria-controls="ui-login-password" disabled={disabled}>{showPw ? t('auth.hidePassword') : t('auth.showPassword')}</button>
      </div>
      {mode === 'signup' && <p className={'auth-help' + (weakKey ? ' auth-help--err' : '')} id="ui-login-pw-help">{t('auth.passwordHelp')}</p>}
      {mode === 'login' && errKey !== 'invalidCredential' && (
        <button type="button" className="auth-link auth-forgot" onClick={() => go('reset')} disabled={disabled}>{t('auth.forgotPassword')}</button>
      )}
    </div>
  )

  return (
    <div className="auth-form-root" data-mode={mode} data-step={isEntry ? step : undefined} aria-busy={busy ? 'true' : undefined}>
      <div className={'auth-swap' + (swapped ? ' auth-swap--in' : '')} key={mode + ':' + step}>
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
                {errKey === 'invalidCredential'
                  ? fill(t('auth.errors.invalidCredential'), { reset: <button type="button" className="auth-inline" onClick={resetFromError} disabled={!!busy}>{t('auth.errors.resetLink')}</button> })
                  : t('auth.errors.' + errKey, { email })}
                {errKey === 'emailInUse' && <>{' '}<button type="button" className="auth-inline" onClick={() => go('login')}>{t('auth.errors.emailInUseAction')}</button></>}
              </span>
            </p>
          )}
          {offline && (
            <p className="auth-msg auth-msg--quiet" id="ui-login-offline" role="status" tabIndex={-1} ref={offlineRef}>
              <MsgIcon offline />
              <span>{t('auth.errors.offline')} <button type="button" className="auth-inline" onClick={tryAgain}>{t('auth.tryAgain')}</button></span>
            </p>
          )}

          {mode === 'sent' ? (
            <button type="button" className="auth-link auth-resend" onClick={handleResend} aria-disabled={cooldown > 0 || !!busy || undefined}>
              {cooldown > 0 ? t('auth.resendWait', { n: cooldown }) : t('auth.resend')}
            </button>
          ) : (
            <>
              {onEmail ? (
                <form noValidate onSubmit={handleContinue} className="auth-form" autoComplete="on">
                  {googleBtn}
                  {emailField}
                  <button className="btn auth-continue" type="submit" disabled={disabled} aria-describedby={offlineDesc}>{t('auth.continueEmail')}</button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">
                  {(mode === 'reset' || mode === 'switch') && emailField}
                  {mode !== 'reset' && pwField}
                  {/* A pill that is working keeps focus: aria-disabled, never `disabled`. */}
                  <button className="btn auth-submit" type="submit" aria-disabled={busy === 'submit' || undefined} aria-busy={busy === 'submit' || undefined} disabled={busy === 'google'} aria-describedby={offlineDesc}>
                    {busy === 'submit' && <Spinner />}{submitLabel}
                  </button>
                </form>
              )}

              {/* Both modes can create an account (Google from log-in does), so
                  both carry it. New tab, so the form keeps its values. */}
              {isEntry && (
                <p className="auth-legal" inert={disabled || undefined}>
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
                <button type="button" className="auth-link" onClick={() => go('signup')} disabled={disabled}>{t('auth.noAccount')} <span className="auth-link-strong">{t('auth.noAccountAction')}</span></button>
              )}
              {mode === 'signup' && (
                <button type="button" className="auth-link" onClick={() => go('login')} disabled={disabled}>{t('auth.haveAccount')} <span className="auth-link-strong">{t('auth.haveAccountAction')}</span></button>
              )}
              {(mode === 'reset' || mode === 'sent') && (
                <button type="button" className="auth-link auth-link--quiet" onClick={() => go('login')} disabled={disabled}>{t('auth.backToLogIn')}</button>
              )}
              {/* Where the Feedback bubble is hidden (small screens). Shares the
                  links row so the sign-up form keeps its height. */}
              {showReport && <ReportProblemLink subject="Problem signing in" />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
