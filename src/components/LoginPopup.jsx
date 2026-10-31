import { Component, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../contexts/I18nContext'
import useModalDialog from '../hooks/useModalDialog'
import useMediaQuery from '../hooks/useMediaQuery'
import AuthForm from './auth/AuthForm'
// `lazy` in this file is lazyRoute, not React's: if the strip's file fails to
// download (a redeploy, a dropped connection) it recovers the way the pages do.
import { lazyRoute as lazy } from '../utils/lazyRoute'

// The wall (and its 22 KB table of generated exports) is a separate chunk: this
// file is reached from the entry chunk, and most visitors never open the strip.
// Its box (.ui-login-strip, in auth.css) is painted by the dialog itself, so the
// space is held while the chunk loads and nothing shifts when the wall arrives.
const AuthWall = lazy(() => import('./auth/AuthWall'))

// The strip is decoration. lazyRoute answers a stale chunk with a reload; if the
// load still fails, this keeps the dialog and its form, and the strip stays an
// empty panel instead of the failure reaching the page's error boundary.
class StripBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

// Single-click log-in. Opened over the current page (never navigates to
// /login) so the user resumes exactly where they were on success. This file is
// the shell: overlay, Close, the pane and "Not now". The form itself (copy,
// fields, errors, the AuthContext calls) lives in ./auth/AuthForm.
//
// When the visitor chose to log in or sign up (no reason given, not a switch)
// and the screen is 768 or wider, a still strip of the wall sits beside the
// form. An interruption stays plain: the thing they were doing is the reason.
//
// `reasons` is an optional short list of plain answers to "why do I need an
// account for this?" (the community submission gate uses it). `unlocks` is the
// caller's own list of what an account gives, shown only on an interruption.
// `signup` decides which form this OPENS on, so a "Start for free" control
// never presents a log-in form. Defaults to false.
export default function LoginPopup({ reason, reasons, unlocks, free = true, initialEmail = '', lockEmail = false, passwordOnly = false, signup: openAsSignup = false, onSuccess, onDismiss }) {
  const { t } = useI18n()
  const [mode, setMode] = useState(passwordOnly ? 'switch' : openAsSignup ? 'signup' : 'login')
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)
  const dismissRef = useRef(onDismiss)
  // Decided once, when the dialog opens: moving on to reset or sent keeps the
  // width it opened at, and an interruption that flips to sign-up never gains one.
  const [chosen] = useState(() => !reason && !passwordOnly)
  const wide = useMediaQuery('(min-width:768px)')
  const strip = chosen && wide

  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { dismissRef.current = onDismiss }, [onDismiss])

  // Closing is refused while an auth call is in flight. A popup dismissed
  // mid-`signInWithPopup` resolves the caller's promise with null while Firebase
  // is still working, so the gated action reports "cancelled" and then the user
  // silently becomes signed in.
  //
  // Read through refs and pinned with an empty dep list so the identity never
  // changes. useModalDialog no longer re-runs its effect when onClose changes, so
  // this is no longer needed for focus; the refs are what read the live loading state.
  const requestDismiss = useCallback(() => {
    if (!loadingRef.current) dismissRef.current()
  }, [])

  // The app's shared modal contract: focus trap, Escape, scroll lock, and focus
  // returned to whatever opened us. `initialFocus` keeps the landing spot this
  // dialog has always had: the fast path is one click on Continue with Google,
  // and in switch mode the email is already filled, so it is the password.
  const dialogRef = useModalDialog(requestDismiss, {
    initialFocus: passwordOnly ? '#ui-login-password' : '.auth-google-btn',
  })

  const isEntry = mode === 'login' || mode === 'signup'
  const interrupt = !!reason && isEntry

  return (
    <div className="ui-modal-overlay" onMouseDown={() => { if (!loading) onDismiss() }}>
      <div
        ref={dialogRef}
        className={'ui-modal ui-login' + (interrupt ? ' ui-login--interrupt' : '') + (strip ? ' ui-login--strip' : '')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-login-title"
        aria-describedby={interrupt ? 'ui-login-promise' : undefined}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* First in DOM order, so Shift+Tab off it wraps to the last control. */}
        <button type="button" className="ui-modal-x ui-login-x" onClick={onDismiss} aria-label="Close" disabled={loading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        {strip && <div className="ui-login-strip" aria-hidden="true"><StripBoundary><Suspense fallback={null}><AuthWall variant="strip" /></Suspense></StripBoundary></div>}

        <div className="ui-login-pane">
          <AuthForm
            mode={mode}
            onModeChange={setMode}
            initialEmail={initialEmail}
            lockEmail={lockEmail}
            onSuccess={onSuccess}
            // The dialog always sits over a page that has its own h1.
            headingLevel={2}
            reason={reason}
            reasons={reasons}
            unlocks={unlocks}
            free={free}
            onBusyChange={setLoading}
          />
          {/* The way out, stated as plainly as the way in. Resolves the
              caller's promise with null, exactly like Close. */}
          {isEntry && (
            <button type="button" className="auth-notnow" onClick={onDismiss} disabled={loading}>{t('auth.notNow')}</button>
          )}
        </div>
      </div>
    </div>
  )
}
