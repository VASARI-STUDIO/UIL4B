import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import useModalDialog from '../hooks/useModalDialog'

// What a free account actually gets you. Shown when a gated action raised this
// popup, so "log in to continue" answers the obvious next question — what do I
// get for it? Every line is a real Free capability (see docs/reference/
// growth-persuasion.md: the taste of power has to be power the user keeps), and
// the list is overridable per caller via the `unlocks` prop.
const DEFAULT_UNLOCKS = [
  'Your work saves and follows you to any device',
  'Live preview links you can share',
  'Free — no card, no trial clock',
]

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

function Tick() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
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
// `signup` decides which form this OPENS on. A control labelled "Start for
// Free" that presents "Welcome Back / Sign In" is telling the visitor they
// already have an account — the actual signup was a small text link underneath.
// Defaults to false, so every existing caller keeps the sign-in form it had.
//
// `unlocks` is the plain answer to "what do I get for signing in?" — shown only
// when a gated ACTION raised this popup (i.e. `reason` is set), because a
// visitor who clicked "Log in" in the nav already knows why they're here.
// Callers can replace the list; passing `unlocks={[]}` suppresses it.
export default function LoginPopup({ reason, reasons, unlocks, free = true, initialEmail = '', lockEmail = false, passwordOnly = false, signup: openAsSignup = false, onSuccess, onDismiss }) {
  const { login, signup, resetPassword, loginWithGoogle } = useAuth()
  const { t } = useI18n()
  const [isSignup, setIsSignup] = useState(openAsSignup)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const loadingRef = useRef(false)
  const dismissRef = useRef(onDismiss)

  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { dismissRef.current = onDismiss }, [onDismiss])

  // Closing is refused while an auth call is in flight. A popup dismissed
  // mid-`signInWithPopup` resolves the caller's promise with null while Firebase
  // is still working, so the gated action reports "cancelled" and then the user
  // silently becomes signed in. The guard predates this redesign; it is kept
  // verbatim and simply moved behind the shared hook.
  //
  // Read through refs and pinned with an empty dep list so the identity never
  // changes: useModalDialog re-runs its whole effect when onClose changes, which
  // would re-lock scroll, re-capture the opener and restore focus mid-life.
  const requestDismiss = useCallback(() => {
    if (!loadingRef.current) dismissRef.current()
  }, [])

  // The app's shared modal contract — focus trap, Escape, scroll lock, and
  // focus returned to whatever opened us. This dialog used to hand-roll all
  // four, and the copy was subtly weaker than the original in two ways that
  // both cost a keyboard user their place:
  //
  //  1. It never restored focus at all. LoginPromptContext did that instead, by
  //     calling .focus() on the exact node it captured — which is a silent no-op
  //     once that node has unmounted. PillNav's "Log in" lives inside a popover
  //     that closeAll() tears down as the dialog opens, so the single most
  //     common way into this dialog dropped the user on <body> on close.
  //     useModalDialog remembers the opener's ANCESTOR CHAIN and hands focus to
  //     the nearest node still connected.
  //  2. Its keydown listener was bubble-phase on window with no stopPropagation,
  //     so Escape inside this dialog could also close a surface underneath it.
  //
  // `initialFocus` keeps the landing spot this dialog already had rather than
  // the hook's default of the dialog element: the fast path is one click on
  // Continue with Google, and it is constant for the life of an instance, so
  // the hook's effect never re-runs on it.
  const dialogRef = useModalDialog(requestDismiss, {
    initialFocus: passwordOnly ? '#ui-login-password' : '.auth-google-btn',
  })

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

  // The interrupted-action panel: what you were doing, what an account gives
  // you, and the promise that you land back on it. Suppressed for the two
  // popups that are not an interruption (password reset, account switch).
  const unlockList = Array.isArray(unlocks)
    ? unlocks.filter(u => typeof u === 'string' && u.trim())
    : DEFAULT_UNLOCKS
  const showIntent = !!reason && !resetMode && !passwordOnly

  // The pane also opens for a reason-less SIGN-UP. "Start for Free" in the nav,
  // the header pill, the overflow menu, the bottom CTA and SystemCTA all open
  // this popup with signup:true and no reason, and every one of them landed a
  // first-time visitor on a bare three-field form with nothing anywhere saying
  // what the account is for. `reason` gates the interruption copy; creating an
  // account is its own reason to answer the question.
  const showAside = showIntent || (isSignup && !resetMode && !passwordOnly)
  const showUnlocks = showAside && free && unlockList.length > 0 && !showWhy

  // "Log in to continue" — matching the NAV TRIGGER, which says "Log in".
  //
  // I changed this to "Sign in to continue" and broke three acceptance tests
  // that locate this dialog by its accessible name. The tests were right and
  // the change was wrong: a visitor who clicks a control labelled "Log in" and
  // lands on a dialog headed "Sign in" has been handed two names for one action
  // inside a second, which is the exact seam the V2 work exists to remove.
  //
  // The rest of this file's form controls DO say "Sign in" (submit button,
  // "Back to sign in", "Already have an account? Sign in"). That inconsistency
  // is real and predates this workstream. Fixing it means moving the nav, the
  // buttons, this title and the tests together — a proposal in docs/PROPOSALS.md,
  // not a one-line edit here. Do not half-do it again.
  const title = resetMode ? (t('auth.resetPassword') || 'Reset your password')
    : isSignup ? (t('auth.createAccount') || 'Create your free account')
      : passwordOnly ? 'Switch account'
        : reason ? 'Log in to continue' : (t('auth.welcomeBack') || 'Welcome back')

  return (
    <div className="ui-modal-overlay" onMouseDown={() => { if (!loading) onDismiss() }}>
      <div
        ref={dialogRef}
        className={'ui-modal ui-login' + (showAside ? ' ui-login--split' : '')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-login-title"
        aria-describedby={showAside ? 'ui-login-promise' : undefined}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Lifted out of .ui-modal-head and positioned over the dialog, the way
            the Pro modal's close button already is, because the head is no
            longer the top-left corner of this dialog at width — the reason pane
            is. It stays the FIRST focusable in DOM order, which is what makes
            Shift+Tab off it wrap round to the last control. */}
        <button type="button" className="ui-modal-x ui-login-x" onClick={onDismiss} aria-label="Close" disabled={loading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        {/* The reason pane.

            This was a tinted card stacked on top of the form, which pushed the
            single most important control on the surface — Continue with Google —
            below three boxed panels on a phone. It is now a column of its own
            beside the form at width, and a short band above it below 781px, on
            the same grid the Pro modal already uses for its proof rail. Nothing
            here is behind a hover: on touch the pane is simply there.

            The copy answers the two questions an interruption raises, in the
            order a person asks them: what was I doing, and do I lose it. Naming
            the action first is deliberate — "you must log in to X" reads as a
            scold and buries the thing the user cared about. The return promise
            is literally true: LoginPromptContext resolves a promise over the
            current page and never navigates. */}
        {showAside && (
          <aside className="ui-login-aside">
            <p className="ui-login-eyebrow">{showIntent ? 'Where you left off' : 'What a free account gets you'}</p>
            <p className="ui-login-promise" id="ui-login-promise">
              {showIntent
                ? <>You were about to <strong>{reason}</strong>.</>
                : <>Your palettes, type scales and gradients, <strong>kept</strong>.</>}
            </p>
            <p className="ui-login-aside-sub">
              {showIntent
                ? 'This opened over your work instead of navigating away, so signing in hands you straight back to it.'
                : 'An account is where your saved work lives. Without one, everything you build here goes when the tab does.'}
            </p>
            {showWhy && (
              <div className="ui-login-why">
                <p className="ui-login-why-h">Why we ask first</p>
                <ul className="ui-login-why-list">
                  {whyList.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
            {showUnlocks && (
              <ul className="ui-login-gets">
                {unlockList.map(item => (
                  <li className="ui-login-get" key={item}>
                    <span className="ui-login-get-tick"><Tick /></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {/* The way out, stated as plainly as the way in — the same rule
                that puts a real "Maybe later" button on the Pro modal
                (growth-persuasion.md guardrail 3). It is also the honest
                description of what dismissing does: onDismiss resolves the
                caller's promise with null and nothing navigates or is
                discarded. Anchored to the bottom of the pane at width, which
                is what stops the column reading as half-finished. */}
            <p className="ui-login-aside-foot">
              Not now? Closing this changes nothing — your work stays exactly as it is.
            </p>
          </aside>
        )}

        <div className="ui-modal-head">
          <h2 className="ui-modal-title" id="ui-login-title">{title}</h2>
        </div>

        <div className="ui-modal-body">
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
                  {/* The accent moved here from the submit button below.
                      Focus already landed on this control on open, so the app
                      was calling Google the primary path with its keyboard
                      behaviour while drawing it as the quiet outline and giving
                      the accent to the slower two-field one. The two now agree.
                      The mark keeps its white ground rather than being recoloured
                      onto the fill, which is both Google's brand requirement and
                      the only way the multicolour G stays legible on blue. */}
                  <button className="auth-google-btn auth-google-btn--primary" type="button" onClick={handleGoogle} disabled={loading}>
                    <span className="auth-google-mark"><GoogleIcon /></span>
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
                    <input id="ui-login-password" type="password" name="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('auth.passwordPlaceholder') || '••••••••'} required minLength={6} autoComplete={isSignup ? 'new-password' : 'current-password'} />
                  </div>
                )}
                {/* Deliberately NOT .btn-accent any more — see the Google
                    button above. Two accent fills on one surface is two
                    primaries, which is none. */}
                <button className="btn auth-submit" type="submit" disabled={loading}>
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
