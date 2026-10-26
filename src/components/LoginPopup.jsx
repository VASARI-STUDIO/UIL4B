import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../contexts/I18nContext'
import useModalDialog from '../hooks/useModalDialog'
import AuthForm from './auth/AuthForm'

// Single-click log-in. Opened over the current page (never navigates to
// /login) so the user resumes exactly where they were on success. This file is
// the shell: overlay, Close, the pane and "Not now". The form itself (copy,
// fields, errors, the AuthContext calls) lives in ./auth/AuthForm.
//
// `reasons` is an optional short list of plain answers to "why do I need an
// account for this?" (the community submission gate uses it). `unlocks` is the
// caller's own list of what an account gives, shown only on an interruption.
// `signup` decides which form this OPENS on, so a "Start for free" control
// never presents a log-in form. Defaults to false.
export default function LoginPopup({ reason, reasons, unlocks, free = true, initialEmail = '', lockEmail = false, passwordOnly = false, signup: openAsSignup = false, isPageTitle = false, onSuccess, onDismiss }) {
  const { t } = useI18n()
  const [mode, setMode] = useState(passwordOnly ? 'switch' : openAsSignup ? 'signup' : 'login')
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)
  const dismissRef = useRef(onDismiss)

  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { dismissRef.current = onDismiss }, [onDismiss])

  // Closing is refused while an auth call is in flight. A popup dismissed
  // mid-`signInWithPopup` resolves the caller's promise with null while Firebase
  // is still working, so the gated action reports "cancelled" and then the user
  // silently becomes signed in.
  //
  // Read through refs and pinned with an empty dep list so the identity never
  // changes: useModalDialog re-runs its whole effect when onClose changes, which
  // would re-lock scroll, re-capture the opener and restore focus mid-life.
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
        className={'ui-modal ui-login' + (interrupt ? ' ui-login--interrupt' : '')}
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

        <div className="ui-login-pane">
          <AuthForm
            mode={mode}
            onModeChange={setMode}
            initialEmail={initialEmail}
            lockEmail={lockEmail}
            onSuccess={onSuccess}
            // h1 only when this dialog IS the page (the /login route renders
            // nothing else); over any other page the title is an h2.
            headingLevel={isPageTitle ? 1 : 2}
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
