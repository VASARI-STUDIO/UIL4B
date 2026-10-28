import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  VERIFY_RESEND_COOLDOWN_S,
  verifyResendBlocked,
  verifyErrorText,
} from '../utils/emailVerification'
import {
  VERIFY_PROMPT_TITLE,
  VERIFY_CHECK_FAILED,
  verifyPromptSent,
  verifyCheckOutcome,
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
// uses it to repeat the request it had to give up on.
export default function VerifyEmailPrompt({ onVerified, className = '' }) {
  const auth = useAuth() || {}
  const { user, sendVerificationEmail, refreshEmailVerified } = auth
  const email = user?.email || ''

  const [sendState, setSendState] = useState('idle') // idle | sending | sent | failed
  const [sendError, setSendError] = useState('')
  const [until, setUntil] = useState(0)
  const [left, setLeft] = useState(0)
  const [checking, setChecking] = useState(false)
  const [checkNote, setCheckNote] = useState('')
  const alive = useRef(true)
  const rootRef = useRef(null)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  // The refusal came from a button elsewhere on the page, so the block takes
  // focus (and scrolls into view) rather than appearing unannounced above it.
  useEffect(() => { rootRef.current?.focus() }, [])

  useEffect(() => {
    if (!until) return undefined
    const tick = () => {
      const seconds = Math.ceil((until - Date.now()) / 1000)
      setLeft(Math.max(0, seconds))
      if (seconds <= 0) setUntil(0)
    }
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [until])

  const resendBlocked = verifyResendBlocked(sendState, left)

  const resend = async () => {
    if (resendBlocked || !sendVerificationEmail) return
    setSendState('sending')
    setSendError('')
    try {
      await sendVerificationEmail()
      if (!alive.current) return
      setSendState('sent')
      setLeft(VERIFY_RESEND_COOLDOWN_S)
      setUntil(Date.now() + VERIFY_RESEND_COOLDOWN_S * 1000)
    } catch (e) {
      if (!alive.current) return
      setSendError(verifyErrorText(e))
      setSendState('failed')
    }
  }

  const check = async () => {
    if (checking || !refreshEmailVerified) return
    setChecking(true)
    setCheckNote('')
    try {
      const outcome = verifyCheckOutcome(await refreshEmailVerified())
      if (!alive.current) return
      if (outcome.retry) {
        onVerified?.()
        return
      }
      setCheckNote(outcome.message)
    } catch {
      if (alive.current) setCheckNote(VERIFY_CHECK_FAILED)
    } finally {
      if (alive.current) setChecking(false)
    }
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
        {checkNote || (sendState === 'sent' ? `Link sent to ${email || 'your email'}.` : '')}
      </p>
      <p className="verify-ai-note verify-ai-note--error" role="alert">
        {sendState === 'failed' ? sendError : ''}
      </p>
    </section>
  )
}
