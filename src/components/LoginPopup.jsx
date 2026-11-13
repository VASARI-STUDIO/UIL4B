import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../contexts/I18nContext'
import useModalDialog from '../hooks/useModalDialog'
import AuthForm from './auth/AuthForm'
import ProWall from './auth/ProWall'
import { Art } from './auth/AuthWall'
import { AUTH_WALL } from '../data/authWall'
import '../styles/v3-pro-auth.css'

// Two real kit renders from the sign-up wall's own data, for the export and
// switch pictures. Looked up by id so a reordered wall cannot change them.
const KIT_ROWS = ['g-ocean-deep-guide', 'f-playfair-roboto'].map((id) => AUTH_WALL.find((r) => r.id === id)).filter(Boolean)
// The five swatches of the save picture: one sample palette, not the user's.
const SAVE_SWATCHES = ['#FF5A1F', '#1A1A1A', '#E6E4DE', '#FFFFFF', '#3A3936']

// Which picture sits beside the form. A caller can name it; otherwise it is
// read from the reason the dialog was opened for.
function inferGate(reason, passwordOnly) {
  if (passwordOnly || /^(switch to|add another account)/i.test(reason || '')) return 'switch'
  if (/export|download/i.test(reason || '')) return 'export'
  if (/\bsave\b/i.test(reason || '')) return 'save'
  return reason ? 'default' : 'modal-login'
}

function Picture({ gate }) {
  const { t } = useI18n()
  if (gate === 'export') {
    return (
      <div className="pp-pic">
        <div className="pp-kits">
          {KIT_ROWS.map((row, i) => <div className={'pp-kit pp-kit--' + (i ? 'b' : 'a')} key={row.id}><Art row={row} /></div>)}
        </div>
        <span className="pp-chip">{t('auth.proAuth.kitChip')}</span>
      </div>
    )
  }
  if (gate === 'save') {
    return (
      <div className="pp-pic">
        <div className="pp-strip">{SAVE_SWATCHES.map((hex) => <span key={hex} style={{ background: hex }} />)}</div>
      </div>
    )
  }
  if (gate === 'switch') {
    return (
      <div className="pp-pic">
        <div className="pp-dash">
          {KIT_ROWS.map((row) => <div className="pp-kit" key={row.id}><Art row={row} /></div>)}
        </div>
      </div>
    )
  }
  return <ProWall label={false} />
}

// Single-click log-in. Opened over the current page (never navigates to
// /login) so the user resumes exactly where they were on success. This file is
// the shell: overlay, Close, the pane and "Not now". The form itself (copy,
// fields, errors, the AuthContext calls) lives in ./auth/AuthForm.
//
// On 768 and wider a picture sits beside the form: the wall for a plain log-in,
// two kit renders for an export, five swatches for a save, a pair of kits for a
// switch. `gate` names it; without it the reason decides. A phone gets the form
// alone.
//
// `reasons` is an optional short list of plain answers to "why do I need an
// account for this?" (the community submission gate uses it). `unlocks` is the
// caller's own list of what an account gives, shown only on an interruption.
// `signup` decides which form this OPENS on, so a "Start for free" control
// never presents a log-in form. Defaults to false.
// `reset` opens on the password-reset form (the one "Forgot password" reaches).
// Defaults to false.
export default function LoginPopup({ reason, reasons, unlocks, free = true, initialEmail = '', lockEmail = false, passwordOnly = false, signup: openAsSignup = false, reset: openAsReset = false, gate: gateProp, onSuccess, onDismiss }) {
  const { t } = useI18n()
  const [mode, setMode] = useState(passwordOnly ? 'switch' : openAsReset ? 'reset' : openAsSignup ? 'signup' : 'login')
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)
  const dismissRef = useRef(onDismiss)
  // Decided once, when the dialog opens, so the picture stays put as the form
  // moves on to the password step, reset or sent.
  const [gate] = useState(() => gateProp || inferGate(reason, passwordOnly))
  const [step, setStep] = useState(1)

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
  // and in switch mode the email is already filled, so it is the password. The
  // reset form has no Google button, so it starts at the email.
  const dialogRef = useModalDialog(requestDismiss, {
    initialFocus: passwordOnly ? '#ui-login-password' : openAsReset ? '#ui-login-email' : '.auth-google-btn',
  })

  const isEntry = mode === 'login' || mode === 'signup'
  const interrupt = !!reason && isEntry

  return (
    <div className="ui-modal-overlay" onMouseDown={() => { if (!loading) onDismiss() }}>
      <div
        ref={dialogRef}
        className={'ui-modal ui-login pp' + (interrupt ? ' ui-login--interrupt' : '')}
        data-gate={gate}
        data-step={step}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-login-title"
        aria-describedby={interrupt ? 'ui-login-promise' : undefined}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="pp-left" aria-hidden="true"><Picture gate={gate} /></div>

        <div className="pp-offer">
          {/* First in DOM order, so Shift+Tab off it wraps to the last control. */}
          <button type="button" className="ui-modal-x ui-login-x" onClick={onDismiss} aria-label="Close" disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <AuthForm
            mode={mode}
            onModeChange={setMode}
            step={step}
            onStepChange={setStep}
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
