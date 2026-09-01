import { useState, useRef } from 'react'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { saveFeedback } from '../utils/analytics'

// The feedback form. Four surfaces across the app point here as THE way to
// report a problem — including, now, the 404 page — so this is the last place
// that should quietly fail or be hard to use.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT WAS WRONG (2026-08-11 site audit, P2 — see CHANGELOG.md)
// ─────────────────────────────────────────────────────────────────────────────
// Measured on the rendered page: ZERO <label> elements. The three `.seg-label`
// divs look like labels and are not — so neither the subject nor the message
// had an accessible name, and a screen-reader user met two unnamed fields with
// only a placeholder, which is not a name and disappears the moment you type.
//
// The four type buttons carried no role, no aria-pressed and no aria-checked.
// Which one was selected was conveyed by a CSS class and nothing else, so it
// was invisible to assistive tech and to anyone who cannot distinguish the
// active style (WCAG 1.4.1).
//
// An empty submit produced a toast — transient, unattached to the field, gone
// before a slow reader reaches it — with no aria-invalid, no inline message and
// no focus move.
//
// The audit also reported the submit itself failing. That was an artefact of
// testing against `vite preview`, which does not run the Vercel functions, so
// /api/support was a 404 there. The server path validates correctly; the client
// already refuses to claim success on a failed request, which is the important
// half and is kept.

const TYPES = [
  { id: 'feature', labelKey: 'feedback.featureRequest' },
  { id: 'bug', labelKey: 'feedback.bugReport' },
  { id: 'general', labelKey: 'feedback.general' },
  { id: 'help', label: 'Help Request' },
]

export default function Feedback({ toast }) {
  const [type, setType] = useState('feature')
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const messageRef = useRef(null)
  const typeRefs = useRef({})
  const { t } = useI18n()
  const { user } = useAuth()

  // Arrow-key navigation across the type choices, as a radiogroup requires:
  // one tab stop for the group, arrows to move within it.
  const onTypeKeyDown = (e) => {
    const i = TYPES.findIndex(x => x.id === type)
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % TYPES.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + TYPES.length) % TYPES.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TYPES.length - 1
    if (next === null) return
    e.preventDefault()
    const id = TYPES[next].id
    setType(id)
    typeRefs.current[id]?.focus()
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return

    if (!message.trim()) {
      // Inline, attached to the field, AND focus moved to it — so the reason is
      // discoverable rather than announced once and lost.
      setError(t('feedback.enterFeedback') || 'Please enter your feedback.')
      messageRef.current?.focus()
      return
    }

    setError('')
    setBusy(true)

    const payload = {
      type,
      subject: subject.trim() || `[${type}] Submission`,
      message: message.trim(),
      email: user?.email || '',
      source: 'feedback-form',
    }

    // Saved locally first, so a failed request still leaves a record the user's
    // own data export can return to them.
    saveFeedback(payload)

    let ok = false
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      ok = res.ok
    } catch {
      ok = false
    }

    setBusy(false)

    // Never show success if the request didn't land — a silently-lost support
    // request is the worst failure mode for a feedback channel.
    if (!ok) {
      const msg = t('feedback.submitError') || 'Something went wrong sending that. Please check your connection and try again.'
      setError(msg)
      toast(msg)
      return
    }

    toast(t('feedback.thankYou'))
    setMessage('')
    setSubject('')
    setSubmitted(true)
  }

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>{t('feedback.title')}</h1>
        <p>{t('feedback.subtitle')}</p>
      </div>
      <div className="card fb-card">
        {submitted ? (
          <div className="fb-done" role="status">
            <div className="fb-done-mark" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="fb-done-title">{t('feedback.thankYou')}</h2>
            <p className="fb-done-sub">Your submission has been received and will be reviewed.</p>
            {/* Was on a 4s timer that swapped the form back underneath you.
                Leaving it up until dismissed means the confirmation is still
                there when you look back at the screen. */}
            <button className="btn btn-s fb-again" onClick={() => setSubmitted(false)}>Submit another</button>
          </div>
        ) : (
          <form onSubmit={submit} className="fb-form" noValidate>
            <div>
              <span className="seg-label" id="fb-type-label">{t('common.type')}</span>
              <div
                className="row fb-types"
                role="radiogroup"
                aria-labelledby="fb-type-label"
                onKeyDown={onTypeKeyDown}
              >
                {TYPES.map(({ id, labelKey, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={type === id}
                    // Roving tabindex: the group is one tab stop, arrows move
                    // inside it.
                    tabIndex={type === id ? 0 : -1}
                    ref={(el) => { if (el) typeRefs.current[id] = el }}
                    className={`pt-t${type === id ? ' on' : ''}`}
                    onClick={() => setType(id)}
                  >
                    {labelKey ? t(labelKey) : label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="seg-label" htmlFor="fb-subject">Subject</label>
              <input
                id="fb-subject"
                type="text"
                className="fb-input"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Brief summary (optional)"
              />
            </div>

            <div>
              <label className="seg-label" htmlFor="fb-message">{t('common.message')}</label>
              <textarea
                id="fb-message"
                ref={messageRef}
                className="fb-textarea"
                value={message}
                onChange={e => { setMessage(e.target.value); if (error) setError('') }}
                placeholder={t('feedback.messagePlaceholder')}
                aria-invalid={!!error}
                aria-describedby={error ? 'fb-error' : undefined}
              />
            </div>

            {error && <p className="fb-error" id="fb-error" role="alert">{error}</p>}

            <button className="btn btn-accent fb-submit" type="submit" disabled={busy}>
              {busy ? 'Sending…' : t('common.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
