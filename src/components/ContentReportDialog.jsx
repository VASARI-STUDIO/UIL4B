import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import useModalDialog from '../hooks/useModalDialog'
import { useCloseOnBack, useInertBehind } from '../hooks/useCloseOnBack'
import { saveFeedback } from '../utils/analytics'
import { CONTACT_EMAIL_MAX } from '../utils/contactEmail'
import { loadAuthSdk } from '../utils/firebaseAccess'
import { postSupportWithRetry, requestIdFor } from '../utils/supportRequest'
import {
  REPORT_CONTENT_EVENT, REPORT_DETAILS_MAX, REPORT_REASONS,
  buildReportPayload, reasonById, reportMailto, validateReport, REPORT_EMAIL,
} from '../utils/contentReport'

// The content-report form: which item, why, a few words, and (signed out) an
// address to answer. It posts to /api/support like every other report, as type
// `report`; see utils/contentReport.js for the payload and the rules.
//
// ContentReportDialog is the host. It waits for a Report control to ask, and
// mounts a fresh ReportForm for each ask, so a second report never starts from
// the first one's words.
// The signed-in user's Firebase ID token, which the server checks to decide
// whether the report came from an account. Null when signed out or when the
// token cannot be read; the report is then sent as signed out.
async function currentIdToken() {
  try {
    return (await loadAuthSdk()).auth.currentUser?.getIdToken() || null
  } catch {
    return null
  }
}

export default function ContentReportDialog() {
  const [target, setTarget] = useState(null)
  useEffect(() => {
    const onAsk = (event) => {
      if (!event.detail?.target) return
      event.preventDefault()
      setTarget(event.detail.target)
    }
    window.addEventListener(REPORT_CONTENT_EVENT, onAsk)
    return () => window.removeEventListener(REPORT_CONTENT_EVENT, onAsk)
  }, [])
  const close = useCallback(() => setTarget(null), [])
  if (!target) return null
  return <ReportForm key={`${target.kind}:${target.id}`} target={target} onClose={close} />
}

function ReportForm({ target, onClose }) {
  const { user } = useAuth()
  const accountEmail = user?.email || ''
  const titleId = useId()
  const [reasonId, setReasonId] = useState('')
  const [details, setDetails] = useState('')
  const [contact, setContact] = useState('')
  const [goodFaith, setGoodFaith] = useState(false)
  const [errors, setErrors] = useState({})
  // idle | sending | sent | failed
  const [status, setStatus] = useState('idle')
  const [failure, setFailure] = useState('')
  const [sentTo, setSentTo] = useState('')
  const attemptRef = useRef(null)
  const sendingRef = useRef(false)
  const aliveRef = useRef(true)
  const firstRadioRef = useRef(null)
  const doneRef = useRef(null)
  const detailsRef = useRef(null)
  const emailRef = useRef(null)
  const faithRef = useRef(null)

  const dialogRef = useModalDialog(onClose)
  useCloseOnBack(true, onClose)
  useInertBehind(true)

  useEffect(() => {
    aliveRef.current = true
    const raf = requestAnimationFrame(() => firstRadioRef.current?.focus())
    return () => { aliveRef.current = false; cancelAnimationFrame(raf) }
  }, [])
  useEffect(() => {
    if (status === 'sent') doneRef.current?.focus()
  }, [status])

  const reason = reasonById(reasonId)
  const emailRequired = !accountEmail && !!reason && reason.id !== 'illegal'

  const submit = async (e) => {
    e.preventDefault()
    if (sendingRef.current) return
    const check = validateReport({ target, reasonId, details, email: contact, signedIn: !!accountEmail, goodFaith })
    setErrors(check.errors)
    if (!check.ok) {
      // Focus the first field in the order it is read.
      const first = ['reason', 'details', 'email', 'goodFaith'].find(k => check.errors[k])
      ;({ reason: firstRadioRef, details: detailsRef, email: emailRef, goodFaith: faithRef })[first]?.current?.focus()
      return
    }
    const payload = buildReportPayload({ target, reasonId, details, email: contact, accountEmail, goodFaith })
    // One request id per content: a retry of the same report is stored once.
    const requestId = requestIdFor(attemptRef, payload)
    saveFeedback({ ...payload, id: requestId })
    sendingRef.current = true
    setStatus('sending')
    setFailure('')
    const idToken = accountEmail ? await currentIdToken() : null
    const result = await postSupportWithRetry({ ...payload, requestId }, { idToken })
    sendingRef.current = false
    if (!aliveRef.current) return
    if (result.ok) {
      setSentTo(payload.email)
      setStatus('sent')
    } else {
      setStatus('idle')
      setFailure(result.status === 429
        ? 'Too many messages just now. Wait a minute, then send it again.'
        : `The report did not send. Try again, or email ${REPORT_EMAIL} with a link to the content.`)
    }
  }

  const sending = status === 'sending'

  return (
    <div className="fb-overlay rp-overlay" onMouseDown={e => { if (e.target === e.currentTarget && !sending) onClose() }}>
      <div className="fb-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
        <div className="fb-head">
          <h2 id={titleId} className="fb-title">{status === 'sent' ? 'Report sent' : 'Report content'}</h2>
          <button type="button" className="fb-close" onClick={onClose} aria-label="Close report dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {status === 'sent' ? (
          <div className="fb-success" role="status">
            <h3 className="fb-success-title" ref={doneRef} tabIndex={-1}>Thank you</h3>
            <p className="fb-success-text">
              Thanks. We&rsquo;ll review your report of &ldquo;{target.name}&rdquo;.
              {sentTo ? ` If we need more, we may write to ${sentTo}.` : ''}
            </p>
            <div className="fb-success-actions">
              <button type="button" className="btn btn-accent" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <form className="fb-body" onSubmit={submit} noValidate>
            <p className="rp-target">
              You are reporting <strong>{target.name}</strong> <span className="rp-kind">({target.kind})</span>.
            </p>

            <fieldset className="rp-reasons" aria-describedby={errors.reason ? 'rp-reason-error' : undefined}>
              <legend className="fb-label">Why are you reporting it? <span className="fb-required" aria-hidden="true">*</span></legend>
              {REPORT_REASONS.map((r, i) => (
                <label key={r.id} className={`rp-opt${reasonId === r.id ? ' on' : ''}`}>
                  <input
                    type="radio"
                    name="rp-reason"
                    value={r.id}
                    ref={i === 0 ? firstRadioRef : undefined}
                    checked={reasonId === r.id}
                    onChange={() => { setReasonId(r.id); if (errors.reason) setErrors(p => ({ ...p, reason: '' })) }}
                    aria-invalid={!!errors.reason}
                  />
                  <span className="rp-opt-text">
                    <span className="rp-opt-label">{r.label}</span>
                    <span className="rp-opt-hint">{r.hint}</span>
                  </span>
                </label>
              ))}
              {errors.reason && <p className="fb-error" id="rp-reason-error" role="alert">{errors.reason}</p>}
            </fieldset>

            <div className="fb-field">
              <label className="fb-label" htmlFor="rp-details">
                Details{' '}
                {reason?.needsDetails
                  ? <span className="fb-required" aria-hidden="true">*</span>
                  : <span className="fb-optional">(optional)</span>}
              </label>
              <textarea
                id="rp-details"
                ref={detailsRef}
                className="fb-textarea"
                rows={4}
                value={details}
                maxLength={REPORT_DETAILS_MAX}
                onChange={e => { setDetails(e.target.value); if (errors.details) setErrors(p => ({ ...p, details: '' })) }}
                aria-required={!!reason?.needsDetails}
                aria-invalid={!!errors.details}
                aria-describedby={errors.details ? 'rp-details-error' : undefined}
              />
              {errors.details && <p className="fb-error" id="rp-details-error" role="alert">{errors.details}</p>}
            </div>

            {accountEmail ? (
              <p className="fb-sending-as">If we need more, we may write to {accountEmail}.</p>
            ) : (
              <div className="fb-field">
                <label className="fb-label" htmlFor="rp-email">
                  Your email{' '}
                  {emailRequired
                    ? <span className="fb-required" aria-hidden="true">*</span>
                    : <span className="fb-optional">(optional)</span>}
                </label>
                <input
                  id="rp-email"
                  ref={emailRef}
                  type="email"
                  className="fb-input"
                  value={contact}
                  maxLength={CONTACT_EMAIL_MAX}
                  autoComplete="email"
                  onChange={e => { setContact(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: '' })) }}
                  aria-required={emailRequired}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'rp-email-error' : 'rp-email-hint'}
                />
                {errors.email
                  ? <p className="fb-error" id="rp-email-error" role="alert">{errors.email}</p>
                  : <p className="rp-hint" id="rp-email-hint">
                      {reason?.id === 'illegal'
                        ? 'You can leave this out if you are reporting child sexual abuse material. Otherwise we ask for it so we can write to you if we need more.'
                        : 'We may use it to write to you about this report. You do not need an account to report.'}
                    </p>}
              </div>
            )}

            <div className="fb-field">
              <label className="rp-opt rp-opt--check">
                <input
                  type="checkbox"
                  ref={faithRef}
                  checked={goodFaith}
                  onChange={e => { setGoodFaith(e.target.checked); if (errors.goodFaith) setErrors(p => ({ ...p, goodFaith: '' })) }}
                  aria-invalid={!!errors.goodFaith}
                  aria-describedby={errors.goodFaith ? 'rp-faith-error' : undefined}
                />
                <span className="rp-opt-text">
                  <span className="rp-opt-label">I believe this report is accurate and complete.</span>
                </span>
              </label>
              {errors.goodFaith && <p className="fb-error" id="rp-faith-error" role="alert">{errors.goodFaith}</p>}
            </div>

            {failure && <p className="fb-error" role="alert">{failure}</p>}

            <p className="rp-hint">
              Prefer email? Write to{' '}
              <a className="rp-link" href={reportMailto(target)}>{REPORT_EMAIL}</a>{' '}
              with a link to the content and why you are reporting it.
            </p>

            <div className="fb-actions">
              <button type="button" className="btn" onClick={onClose} disabled={sending}>Cancel</button>
              <button type="submit" className="btn btn-accent" disabled={sending} aria-busy={sending}>
                {sending ? 'Sending...' : 'Send report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
