import { useEffect, useRef, useState } from 'react'
import AuthForm from '../auth/AuthForm'

// The sign-in step of the Export dialog, shown in the dock in place of the status
// line and buttons. It is the shared AuthForm, not a second dialog: `onDone(true)`
// when an account is signed in, `onDone(false)` on Cancel. Escape is handled by
// the dialog, which asks for the same `onDone(false)`.
//
// Focus lands on the first field when the panel opens. The form itself moves
// focus only when its mode changes, so this does not fight it.
export default function ExportSignIn({ onDone }) {
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const root = useRef(null)

  useEffect(() => {
    root.current?.querySelector('#ui-login-email')?.focus({ preventScroll: true })
  }, [])

  return (
    <section className="xd-signin" ref={root} aria-label="Sign in to export">
      <div className="xd-signin-head">
        <p className="xd-signin-lead"><strong>Free with an account.</strong> Sign in to export.</p>
        <button type="button" className="btn xd-signin-x" onClick={() => onDone(false)} disabled={busy}>Cancel</button>
      </div>
      <AuthForm
        mode={mode}
        onModeChange={setMode}
        onSuccess={() => onDone(true)}
        headingLevel={2}
        headingId="ui-login-title"
        onBusyChange={setBusy}
      />
    </section>
  )
}
