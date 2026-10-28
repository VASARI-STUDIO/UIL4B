import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import useVerifyResend from '../hooks/useVerifyResend'
import { verifyResendBlocked } from '../utils/emailVerification'
import {
  VERIFY_PROMPT_TITLE,
  verifyPromptSent,
  verifyPromptNote,
  verifiedWhileOpen,
  focusAfterVerified,
  checkVerified,
  resendLabel,
} from '../utils/aiEmailGate'
import '../styles/pages/verify-ai-prompt.css'

// Shown in place of an error when /api/ai answers 403 `email-unverified`.
//
// It stays on the page until the person acts, so it is a block in the tool and
// not a toast. "I've verified" re-reads the account and mints a fresh ID token
// (refreshEmailVerified does both), because the token in hand still says the
// address is unverified even after the link has been opened in another tab.
// Only when the re-read shows it verified does `onVerified` run, and the tool
// uses it to repeat the request it had to give up on. The link is usually
// opened in another tab, so the reminder bar's recheck (useVerificationRecheck,
// on focus) can be what notices; this block then runs `onVerified` by itself,
// once. Resend shares its state and cooldown with that bar (useVerifyResend).
//
// `focusAfter` may return the element to focus when this block leaves; the
// page's <main> is the default, so focus never drops to <body>.
export default function VerifyEmailPrompt({ onVerified, focusAfter, className = '' }) {
  const auth = useAuth() || {}
  const { user, emailVerificationOwed: owed, sendVerificationEmail, refreshEmailVerified } = auth
  const uid = user?.uid
  const email = user?.email || ''

  const { state: sendState, error: sendError, left, resend: sendLink } = useVerifyResend(uid, sendVerificationEmail)
  const [checking, setChecking] = useState(false)
  const [checkNote, setCheckNote] = useState('')
  const alive = useRef(true)
  const rootRef = useRef(null)
  const done = useRef(false)
  const opened = useRef({ owed, uid })

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  // The refusal came from a button elsewhere on the page, so the block takes
  // focus (and scrolls into view) rather than appearing unannounced above it.
  useEffect(() => { rootRef.current?.focus() }, [])

  // Verified, by either route: focus moves off this block (it is about to be
  // removed), then the tool repeats its request. Once only.
  const finish = () => {
    if (done.current) return
    done.current = true
    focusAfterVerified(document, focusAfter, rootRef.current)
    onVerified?.()
  }

  useEffect(() => {
    const { owed: wasOwed, uid: openedFor } = opened.current
    if (verifiedWhileOpen({ wasOwed, owed, openedFor, uid })) finish()
    // finish reads refs and the latest props; it is not a dependency on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owed, uid])

  const resendBlocked = verifyResendBlocked(sendState, left)

  const resend = () => {
    if (resendBlocked || !sendVerificationEmail) return
    setCheckNote('')
    sendLink()
  }

  const check = async () => {
    if (checking || !refreshEmailVerified) return
    setChecking(true)
    setCheckNote('')
    const outcome = await checkVerified(refreshEmailVerified)
    if (!alive.current) return
    setChecking(false)
    if (outcome.retry) finish()
    else setCheckNote(outcome.message)
  }

  return (
    <section
      ref={rootRef}
      tabIndex={-1}
      className={`verify-ai ${className}`.trim()}
      aria-labelledby="verify-ai-title"
      data-testid="verify-ai-prompt"
    >
      <h2 className="verify-ai-title" id="verify-ai-title">{VERIFY_PROMPT_TITLE}</h2>
      <p className="verify-ai-text">
        {verifyPromptSent(email)} Check your inbox and spam folder.
      </p>
      <div className="verify-ai-actions">
        <button
          type="button"
          className="verify-ai-btn"
          onClick={resend}
          aria-disabled={resendBlocked || undefined}
          data-testid="verify-ai-resend"
        >
          {resendLabel(sendState, left)}
        </button>
        <button
          type="button"
          className="verify-ai-btn verify-ai-btn--primary"
          onClick={check}
          aria-disabled={checking || undefined}
          data-testid="verify-ai-check"
        >
          {checking ? 'Checking…' : "I've verified"}
        </button>
      </div>
      {/* Two regions that stay in the page and only change their text, so each
          message is announced once. */}
      <p className="verify-ai-note" role="status">
        {verifyPromptNote({ checkNote, sendState })}
      </p>
      <p className="verify-ai-note verify-ai-note--error" role="alert">
        {sendState === 'failed' ? sendError : ''}
      </p>
    </section>
  )
}
