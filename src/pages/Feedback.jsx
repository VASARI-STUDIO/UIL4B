import { useState, useRef, useEffect, useLayoutEffect, useSyncExternalStore } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { saveFeedback } from '../utils/analytics'
import { CONTACT_EMAIL_MAX, isContactEmail } from '../utils/contactEmail'
import { requestIdFor, recoverFeedbackDraft, guardSupportUnload, pageFeedbackSend, SUPPORT_MESSAGE_MAX } from '../utils/supportRequest'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/account.css'
import '../styles/deferred/tool-shell.css'
// The page's own sheet, every selector under .fb-page. Last here, but it wins
// by its scoping, not its position.
import '../styles/pages/feedback.css'

// Delivery acknowledges submission immediately and preserves failed drafts for retry.

// Links from outside the app land here through /support (see legacyRoutes.js):
// `?from=support` marks an arrival that wants help rather than to suggest
// something, and `?reason=` or `?ref=` says why. Any reason or ref at all means
// the same, so a link can name one without also naming `from`. A failed-payment
// link may carry the marker in either parameter.
const PAYMENT_FAILED = 'payment_failed'
const PAYMENT_TITLE = 'Get help'
const PAYMENT_CARD_LINK = 'Update your card'
const PAYMENT_SUBTITLE = "Payment didn't go through? Tell us what happened and we'll sort it."
const PAYMENT_PLACEHOLDER = 'What happened when you tried to pay?'
const PAYMENT_SUBJECT = 'Payment failed'

const TYPES = [
  { id: 'feature', labelKey: 'feedback.featureRequest' },
  { id: 'bug', labelKey: 'feedback.bugReport' },
  { id: 'general', labelKey: 'feedback.general' },
  { id: 'help', label: 'Help Request' },
]

// The 404's "Report a broken link" opens `?type=bug&page=<path>`, with
// `&referrer=<path>` when the browser named the page that linked there. Only
// same-site paths are taken: anything else is ignored, so a crafted link can
// not put an address of its own into the form.
const sitePath = (value) => (/^\/(?!\/)\S{0,199}$/.test(value || '') ? value : '')

export default function Feedback({ toast }) {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const reason = params.get('reason') || params.get('ref') || ''
  const typeParam = TYPES.some((x) => x.id === params.get('type')) ? params.get('type') : ''
  // A payment reason keeps priority over a broken-link report.
  const brokenPage = reason ? '' : sitePath(params.get('page'))
  const brokenFrom = brokenPage ? sitePath(params.get('referrer')) : ''
  const paymentFailed = params.get('reason') === PAYMENT_FAILED || params.get('ref') === PAYMENT_FAILED
  const delivery = useSyncExternalStore(pageFeedbackSend.subscribe, pageFeedbackSend.getSnapshot)
  const sentHeadingRef = useRef(null)
  const retryRef = useRef(null)
  const visibleRef = useRef(false)
  // A landed message is not kept for the next visit: drop it on arriving (it may
  // have landed while the page was away) and on leaving.
  useLayoutEffect(() => {
    visibleRef.current = true
    pageFeedbackSend.settle()
    return () => { pageFeedbackSend.settle() }
  }, [])
  // A draft kept from a failed send comes back as it was; otherwise the form
  // starts from the link: read once, for the first render, since the form is the
  // user's after that.
  const restored = delivery.status === 'sent' ? null : delivery.draft
  const [type, setType] = useState(
    () => restored?.type ?? (params.get('from') === 'support' || reason ? 'help' : typeParam || 'feature'),
  )
  const [message, setMessage] = useState(() => restored?.message ?? (brokenPage
    ? `The link to ${brokenPage}${brokenFrom ? ` on ${brokenFrom}` : ''} doesn't work.`
    : ''))
  const [subject, setSubject] = useState(() => restored?.subject
    ?? (paymentFailed ? PAYMENT_SUBJECT : brokenPage ? `Broken link: ${brokenPage}` : ''))
  const [contact, setContact] = useState(() => restored?.contact ?? '')
  const [contactError, setContactError] = useState('')
  const submitted = delivery.status === 'sending' || delivery.status === 'sent'
  // The address carried by the submitted message.
  const [sentTo, setSentTo] = useState(() => delivery.body?.email || '')
  const busy = delivery.status === 'sending'
  const [error, setError] = useState('')
  const sendError = delivery.status === 'failed' ? t(delivery.result.status === 429 ? 'feedback.rateLimit' : 'feedback.submitError') : ''
  const messageRef = useRef(null)
  const contactRef = useRef(null)
  const typeRefs = useRef({})
  // Send bookkeeping, in refs so a second submit in the same task sees it:
  //   sendingRef  an attempt is in flight
  //   attemptRef  the request id in use and the exact content it was made for
  const sendingRef = useRef(delivery.status === 'sending')
  const attemptRef = useRef(delivery.status === 'sent' ? null : delivery.draft?.attempt || null)
  const bodyRef = useRef(delivery.body)
  // Moves when the account changes under a mounted page (see App.jsx).
  const accountEpochRef = useRef(pageFeedbackSend.epoch())
  useEffect(() => {
    return () => { visibleRef.current = false }
  }, [])
  useEffect(() => guardSupportUnload(busy || !!sendError), [busy, sendError])
  useEffect(() => pageFeedbackSend.subscribe(() => {
    const current = pageFeedbackSend.getSnapshot()
    const draft = current.draft
    bodyRef.current = current.body
    sendingRef.current = current.status === 'sending'
    attemptRef.current = current.status === 'sent' ? null : draft?.attempt || null
    if (accountEpochRef.current !== pageFeedbackSend.epoch()) {
      // A different account owns the page now: nothing typed or sent before carries over.
      accountEpochRef.current = pageFeedbackSend.epoch()
      setType('feature')
      setSubject('')
      setMessage('')
      setContact('')
      setSentTo('')
      setError('')
      setContactError('')
      return
    }
    if (draft && current.status !== 'sent') {
      setType(draft.type)
      setContact(draft.contact)
      setSubject(draft.subject)
      setMessage(draft.message)
    } else if (current.status === 'sent') {
      setSubject('')
      setMessage('')
      setContact('')
    }
    if (current.body) setSentTo(current.body.email)
  }), [])
  useEffect(() => {
    if (!visibleRef.current) return
    if (delivery.status === 'failed') retryRef.current?.focus()
    else if (delivery.status === 'sending' || delivery.status === 'sent') sentHeadingRef.current?.focus()
  }, [delivery.status])

  const { user } = useAuth()

  // Signed in, the account's address goes up and always has. Signed out, the
  // field below is the only way one can.
  const accountEmail = user?.email || ''

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

  const send = (body, retry = true) => {
    const draft = { type, subject, message, contact, attempt: attemptRef.current }
    return pageFeedbackSend.send(body, draft, {
      retry,
      visible: () => visibleRef.current,
      notify: (status, onAction) => toast(
        t(status === 429 ? 'feedback.rateLimit' : 'feedback.submitError'), 'error',
        { action: { label: t('feedback.tryAgain'), onAction } },
      ),
    })
  }

  const submit = (e) => {
    e.preventDefault()
    // A ref, not `busy`: two submit events in the same task both see the state
    // from before the first one re-rendered.
    if (sendingRef.current) return

    if (!message.trim()) {
      // Inline, attached to the field, AND focus moved to it — so the reason is
      // discoverable rather than announced once and lost.
      setError(t('feedback.enterFeedback') || 'Please enter your feedback.')
      messageRef.current?.focus()
      return
    }

    // Checked HERE rather than left to the server, because the server's 400 for
    // a bad address arrives through the same branch as a dropped connection and
    // would be reported as one. Same shape, same cap — see utils/contactEmail.js
    // and the unit test that holds the two together.
    if (!accountEmail && !isContactEmail(contact)) {
      setContactError(paymentFailed
        ? 'That email address does not look right. Correct it so we can reply.'
        : 'That email address does not look right. Correct it, or clear the field to send without one.')
      contactRef.current?.focus()
      return
    }
    // A payment problem can only be sorted out with an answer, so here the
    // address is not optional for someone who is not signed in.
    if (paymentFailed && !accountEmail && !contact.trim()) {
      setContactError('Add your email so we can reply about your payment.')
      contactRef.current?.focus()
      return
    }

    setError('')
    setContactError('')

    const email = accountEmail || contact.trim()
    const payload = {
      type,
      subject: subject.trim() || `[${type}] Submission`,
      message: message.trim(),
      email,
      source: 'feedback-form',
    }

    // One id per message content: a retry of the same content reuses it (the
    // server stores it once), an edit gets a new one.
    const requestId = requestIdFor(attemptRef, payload)

    // Saved locally first, so a failed request still leaves a record the user's
    // own data export can return to them. Keyed by the request id, so resending
    // the same message updates this record rather than adding another.
    saveFeedback({ ...payload, id: requestId })

    bodyRef.current = { ...payload, requestId }
    void send(bodyRef.current)
  }

  return (
    <div className="sec fb-page">
      <div className="sec-h">
        <h1>{paymentFailed ? PAYMENT_TITLE : t('feedback.title')}</h1>
        <p>{paymentFailed ? PAYMENT_SUBTITLE : t('feedback.subtitle')}</p>
        {/* Billing lives in Settings, which needs an account, so only a
            signed-in visitor is sent there. */}
        {paymentFailed && accountEmail && (
          <p className="fb-fix">
            {/* The Subscription section holds billing; without the state
                Settings opens on whichever section was used last. */}
            <Link className="btn btn-s" to="/settings" state={{ section: 'support' }}>{PAYMENT_CARD_LINK}</Link>
          </p>
        )}
      </div>
      <div className="card fb-card">
        {sendError ? (
          <div className="fb-done">
            <p className="fb-error" role="alert" style={{ marginBottom: 'var(--s-3)' }}>{sendError}</p>
            <textarea className="fb-textarea" aria-label={t('feedback.yourMessage')} value={message} readOnly />
            <div className="fb-success-actions fb-again">
              <button type="button" className="btn btn-accent" ref={retryRef} onClick={() => { void send(bodyRef.current, false) }}>{t('feedback.tryAgain')}</button>
              <button type="button" className="btn" onClick={() => {
                recoverFeedbackDraft(bodyRef, attemptRef)
                pageFeedbackSend.edit()
                requestAnimationFrame(() => messageRef.current?.focus())
              }}>{t('feedback.editMessage')}</button>
            </div>
          </div>
        ) : submitted ? (
          <div className="fb-done" role="status">
            <div className="fb-done-mark" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="fb-done-title" ref={sentHeadingRef} tabIndex={-1}>{t('feedback.sent')}</h2>
            <p className="fb-done-sub">{busy ? t('feedback.sendingMessage') : t('feedback.sentMessage')}</p>
            {/* Which of the two things just happened. Neither line promises a
                reply — whether one is written is a person's decision, not the
                code's — they state whether one is POSSIBLE, which is a fact
                about the five fields that were sent. */}
            <p className="fb-done-reply">
              {sentTo
                ? t('feedback.replyAddress', { email: sentTo })
                : t('feedback.noReplyAddress')}
            </p>
            <button className="btn btn-s fb-again" disabled={busy} onClick={() => {
              pageFeedbackSend.reset()
              requestAnimationFrame(() => messageRef.current?.focus())
            }}>{t('feedback.submitAnother')}</button>
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

            {/* The return address. Rendered only when there is not already one
                — signed in, the account's address is what goes up, and offering
                a second box to type a different one is a different feature.
                `(optional)` sits in the placeholder because that is where the
                Subject field above already puts it. */}
            {accountEmail ? (
              <p className="fb-sending-as">Sending as {accountEmail}</p>
            ) : (
              <div>
                <label className="seg-label" htmlFor="fb-email">Email</label>
                <input
                  id="fb-email"
                  ref={contactRef}
                  type="email"
                  className="fb-input"
                  value={contact}
                  onChange={e => { setContact(e.target.value); if (contactError) setContactError('') }}
                  placeholder={paymentFailed ? 'you@example.com' : 'you@example.com (optional)'}
                  autoComplete="email"
                  maxLength={CONTACT_EMAIL_MAX}
                  required={paymentFailed}
                  aria-required={paymentFailed}
                  aria-invalid={!!contactError}
                  aria-describedby={contactError ? 'fb-email-error' : 'fb-email-hint'}
                />
                {contactError
                  ? <p className="fb-error" id="fb-email-error" role="alert">{contactError}</p>
                  : <p className="fb-hint" id="fb-email-hint">
                      {paymentFailed
                        ? 'Required — we need your email to reply.'
                        : 'Optional — but without it there is no way to reply to you.'}
                    </p>}
              </div>
            )}

            <div>
              <label className="seg-label" htmlFor="fb-message">{t('common.message')}</label>
              <textarea
                id="fb-message"
                ref={messageRef}
                className="fb-textarea"
                value={message}
                onChange={e => { setMessage(e.target.value); if (error) setError('') }}
                placeholder={paymentFailed ? PAYMENT_PLACEHOLDER : t('feedback.messagePlaceholder')}
                maxLength={SUPPORT_MESSAGE_MAX}
                aria-invalid={!!error}
                aria-describedby={error ? 'fb-error' : undefined}
              />
            </div>

            {error && <p className="fb-error" id="fb-error" role="alert">{error}</p>}

            <button className="btn btn-accent fb-submit" type="submit" disabled={busy} aria-busy={busy}>
              {busy ? 'Sending…' : t('common.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
