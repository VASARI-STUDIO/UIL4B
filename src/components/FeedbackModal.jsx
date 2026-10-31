import Toast from './Toast'
import { useToast } from '../hooks/useToast'
import { useI18n } from '../contexts/I18nContext'
import MenuSelect from './tool/MenuSelect'
import { useState, useRef, useEffect, useSyncExternalStore, useCallback, useId } from 'react'
import { useLocation } from 'react-router-dom'
import { useSubscription } from '../contexts/SubscriptionContext'
import { buildReportContext, withReportContext, contextRows, omitContext } from '../utils/reportContext'
import { resolveTool } from '../data/toolTree'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAppearance } from '../contexts/AppearanceContext'
import { saveFeedback } from '../utils/analytics'
import { FEEDBACK_ROUTING } from '../utils/feedbackRouting'
import { CONTACT_EMAIL_MAX, isContactEmail } from '../utils/contactEmail'
import useModalDialog from '../hooks/useModalDialog'
import { useCloseOnBack, useInertBehind } from '../hooks/useCloseOnBack'
import {
  requestIdFor, recoverFeedbackDraft, guardSupportUnload, staleDelivery,
  modalFeedbackSend, SUPPORT_MESSAGE_MAX,
} from '../utils/supportRequest'

// Type selector — mirrors HelpCentre's CONTACT_TYPES. Each type reveals its own
// routing dropdown(s) so submissions land with the right team/triage label.
const TYPES = [
  {
    id: 'feedback',
    label: 'Feedback',
    icon: (<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />),
    selects: [
      { key: 'category', label: 'Topic', options: FEEDBACK_ROUTING.feedback.category },
    ],
    subjectLabel: 'Subject',
    subjectPlaceholder: 'Brief summary',
    messageLabel: 'Message',
    messagePlaceholder: 'Share your thoughts, impressions, or ideas...',
  },
  {
    id: 'bug',
    label: 'Bug',
    icon: (<><path d="M8 2l1.88 1.88" /><path d="M14.12 3.88L16 2" /><path d="M9 7.13v-1a3.003 3.003 0 116 0v1" /><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6" /><path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" /><path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" /><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" /><path d="M22 13h-4" /><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" /></>),
    selects: [
      { key: 'category', label: 'Area', options: FEEDBACK_ROUTING.bug.category },
      { key: 'severity', label: 'Severity', options: FEEDBACK_ROUTING.bug.severity },
    ],
    subjectLabel: 'What went wrong?',
    subjectPlaceholder: 'e.g. Export button not working',
    messageLabel: 'Steps to reproduce & details',
    messagePlaceholder: '1. Go to...\n2. Click on...\n3. Expected: ...\n4. Actual: ...',
  },
  {
    id: 'feature',
    label: 'Feature',
    icon: (<><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>),
    selects: [
      { key: 'category', label: 'Area', options: FEEDBACK_ROUTING.feature.category },
    ],
    subjectLabel: 'Feature name',
    subjectPlaceholder: 'e.g. Dark mode scheduling',
    messageLabel: 'Message',
    messagePlaceholder: "Describe what you'd like and why it would be useful...",
  },
  {
    id: 'help',
    label: 'Help',
    icon: (<><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>),
    selects: [
      { key: 'category', label: 'Topic', options: FEEDBACK_ROUTING.help.category },
    ],
    subjectLabel: 'Subject',
    subjectPlaceholder: 'Brief summary',
    messageLabel: 'Message',
    messagePlaceholder: 'What do you need help with?',
  },
]

export default function FeedbackModal({ open, onClose, seed = null }) {
  const { user, userProfile } = useAuth()
  // P-002: the report carries where the user was, so acting on it does not
  // start with a round trip asking which page they meant.
  const location = useLocation()
  const { isPro } = useSubscription()
  const { theme } = useTheme()
  const { reducedMotion } = useAppearance()
  const delivery = useSyncExternalStore(modalFeedbackSend.subscribe, modalFeedbackSend.getSnapshot)
  const sentHeadingRef = useRef(null)
  const retryRef = useRef(null)
  const visibleRef = useRef(false)
  useEffect(() => { visibleRef.current = open }, [open])
  const { t } = useI18n()
  // Own toast only for a failure that lands where the page has none (the
  // chromeless routes), and only while it shows: every other page keeps the
  // app's single toast.
  const notification = useToast({ listen: false })
  const [ownToast, setOwnToast] = useState(false)
  useEffect(() => {
    if (!ownToast || notification.visible) return undefined
    const id = setTimeout(() => setOwnToast(false), 400)
    return () => clearTimeout(id)
  }, [ownToast, notification.visible])
  const titleId = useId()
  const capId = useId()

  const [typeId, setTypeId] = useState(() => delivery.status === 'sent' ? 'feedback' : delivery.draft?.typeId ?? 'feedback')
  const [selections, setSelections] = useState(() => delivery.status === 'sent' ? {} : delivery.draft?.selections ?? {}) // { category, severity }
  const [subject, setSubject] = useState(() => delivery.status === 'sent' ? '' : delivery.draft?.subject ?? '')
  const [message, setMessage] = useState(() => delivery.status === 'sent' ? '' : delivery.draft?.message ?? '')
  // The return address of someone who is not signed in. Optional, and cleared
  // whenever the dialog opens afresh so it is never carried to the next person.
  const [contact, setContact] = useState(() => delivery.status === 'sent' ? '' : delivery.draft?.contact ?? '')
  const [contactError, setContactError] = useState('')
  const sending = delivery.status === 'sending'
  const sent = sending || delivery.status === 'sent'
  const error = delivery.status === 'failed' ? t(delivery.result.status === 429 ? 'feedback.rateLimit' : 'feedback.submitError') : ''
  // What we propose to attach, frozen at the moment the dialog opened, and the
  // keys the user has switched off. Frozen rather than recomputed at submit
  // time so the list they approved is byte-for-byte the list that is sent —
  // a disclosure that can drift between being read and being acted on is not
  // a disclosure.
  const [capture, setCapture] = useState(() => delivery.status === 'sent' ? {} : delivery.draft?.capture ?? {})
  const [removed, setRemoved] = useState(() => delivery.status === 'sent' ? [] : delivery.draft?.removed ?? [])

  const overlayRef = useRef(null)
  const firstControlRef = useRef(null)
  const messageRef = useRef(null)
  const contactRef = useRef(null)

  // Send bookkeeping, held in refs so a second submit in the same tick sees it
  // (state would still read the old value):
  //   sendingRef  an attempt is in flight
  //   attemptRef  the request id in use; bodyRef freezes the submitted payload
  const sendingRef = useRef(delivery.status === 'sending')
  const attemptRef = useRef(delivery.status === 'sent' ? null : delivery.draft?.attempt || null)
  const bodyRef = useRef(delivery.body)
  const overlayDownRef = useRef(false)
  const overlaySuppressedRef = useRef(false)
  const overlayTimerRef = useRef(null)
  useEffect(() => {
    return () => {
      visibleRef.current = false
      clearTimeout(overlayTimerRef.current)
    }
  }, [])
  useEffect(() => guardSupportUnload(sending || (open && !!error)), [sending, open, error])
  // An account change drops whatever a send still holds: see App.jsx.

  useEffect(() => modalFeedbackSend.subscribe(() => {
    const current = modalFeedbackSend.getSnapshot()
    const draft = current.draft
    bodyRef.current = current.body
    sendingRef.current = current.status === 'sending'
    attemptRef.current = current.status === 'sent' ? null : draft?.attempt || null
    if (draft && current.status !== 'sent') {
      setTypeId(draft.typeId)
      setSelections(draft.selections)
      setCapture(draft.capture)
      setRemoved(draft.removed)
      setSubject(draft.subject)
      setMessage(draft.message)
      setContact(draft.contact ?? '')
    } else if (current.status === 'sent') {
      setSubject('')
      setMessage('')
    }
  }), [])
  // Has this opening already been initialised? The open effect below depends on
  // every value it captures — which is correct, and what the linter wants — but
  // it must still run only ONCE per opening: re-running it because the user
  // flipped the theme mid-sentence would reset every field and wipe what they
  // had written. The flag turns a value-change re-run into a no-op.
  const initialisedRef = useRef(false)
  const seedRef = useRef(seed)

  const activeType = TYPES.find(t => t.id === typeId) || TYPES[0]
  // Label/value rows in the canonical order, straight from the same module
  // that decides what may be captured at all — so the panel cannot show one
  // set of facts while a different set is sent.
  const rows = contextRows(capture)

  // The control shows the first option when untouched, so the payload must
  // resolve to that same value rather than an empty string.
  const selectedValue = (key) => {
    const sel = activeType.selects.find(s => s.key === key)
    if (!sel) return ''
    return selections[key] ?? sel.options[0]
  }

  const resetFields = useCallback(() => {
    if (sendingRef.current) return
    bodyRef.current = null
    setSelections({})
    setSubject('')
    setMessage('')
    modalFeedbackSend.reset()
    sendingRef.current = false
    attemptRef.current = null
  }, [])

  // Back to a fresh form, with focus in the message field rather than lost to the page.
  const sendAnother = () => {
    resetFields()
    requestAnimationFrame(() => messageRef.current?.focus())
  }

  // Share scroll locking, focus trapping and focus restoration with other dialogs.
  const dialogRef = useModalDialog(onClose, { enabled: open })
  // Back closes the dialog (audit A3) and the page behind it is inert (A12).
  useCloseOnBack(!!open, onClose)
  useInertBehind(!!open)

  // Fully reset (including the chosen type) whenever the modal is freshly opened,
  // and focus the first control.
  useEffect(() => {
    if (!open) {
      initialisedRef.current = false
      // A landed message does not outlive its dialog, including one that lands
      // after the dialog was closed.
      modalFeedbackSend.settle()
      return undefined
    }
    if (initialisedRef.current && seedRef.current === seed) return undefined
    // Opening onto a landed message (or a seed over an old failure) starts
    // clean; the reset changes the status, which re-runs this effect.
    if (staleDelivery(delivery.status, seed)) {
      modalFeedbackSend.reset()
      return undefined
    }
    if (delivery.status !== 'idle') {
      initialisedRef.current = true
      return undefined
    }
    initialisedRef.current = true
    seedRef.current = seed
    // Closing must neither cancel delivery nor discard a failed message.
    if (recoverFeedbackDraft(bodyRef, attemptRef, seed)) {
      const raf = requestAnimationFrame(() => firstControlRef.current?.focus())
      return () => cancelAnimationFrame(raf)
    }
    // A right-click on something broken already told us this is a bug report;
    // making the user say so again is a step for nothing.
    setTypeId(seed?.typeId || 'feedback')
    resetFields()
    // A crash report arrives already written (RouteErrorBoundary → "Report
    // this"); the person adds what they were doing, or just sends it.
    if (seed?.subject) setSubject(seed.subject)
    if (seed?.message) setMessage(seed.message)
    setRemoved([])
    setContact('')
    setContactError('')
    setCapture(buildReportContext({
      pathname: location.pathname,
      tool: resolveTool(location.pathname)?.tool?.label || null,
      // Only the context menu supplies this — a report opened from the button
      // was not pointed at anything in particular, and inventing an element
      // for it would be a fact we made up.
      element: seed?.element || null,
      viewport: typeof window !== 'undefined'
        ? { width: window.innerWidth, height: window.innerHeight }
        : null,
      pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : null,
      theme,
      reducedMotion,
      plan: isPro ? 'pro' : 'free',
      signedIn: !!user,
      appVersion: import.meta.env.VITE_APP_VERSION || null,
    }))
    // Focus after paint so the element is actually in the DOM. This runs after
    // the hook has focused the dialog itself, which is the intended order: the
    // dialog is announced, then the first control takes focus.
    const raf = requestAnimationFrame(() => firstControlRef.current?.focus())
    return () => cancelAnimationFrame(raf)
  }, [open, seed, resetFields, location.pathname, theme, reducedMotion, isPro, user, delivery.status])

  useEffect(() => {
    if (!open) return
    if (delivery.status === 'failed') retryRef.current?.focus()
    else if (delivery.status === 'sending' || delivery.status === 'sent') sentHeadingRef.current?.focus()
  }, [delivery.status, open])

  const selectType = (id) => {
    setTypeId(id)
    setSelections({}) // routing dropdowns are type-specific
  }

  const send = (body, retry = true) => {
    const draft = { typeId, selections, subject, message, contact, capture, removed, attempt: attemptRef.current }
    overlaySuppressedRef.current = true
    clearTimeout(overlayTimerRef.current)
    overlayTimerRef.current = setTimeout(() => { overlaySuppressedRef.current = false }, 400)
    return modalFeedbackSend.send(body, draft, {
      retry,
      visible: () => visibleRef.current,
      notify: (status, onAction) => {
        const detail = {
          message: t(status === 429 ? 'feedback.rateLimit' : 'feedback.submitError'),
          type: 'error',
          action: { label: t('feedback.tryAgain'), onAction },
        }
        window.dispatchEvent(new CustomEvent('uil4b:toast', { detail }))
        if (detail.handled) return
        setOwnToast(true)
        notification.toast(detail.message, 'error', { action: detail.action })
      },
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!message.trim() || sendingRef.current) return

    // Checked here so a mistyped address is named as one, rather than arriving
    // as the generic "didn't send" the server's 400 would turn into.
    if (!user && !isContactEmail(contact)) {
      setContactError('That email address does not look right. Correct it, or clear the field to send without one.')
      contactRef.current?.focus()
      return
    }
    setContactError('')

    const email = user?.email || contact.trim()
    const payload = {
      type: typeId,
      category: selectedValue('category'),
      ...(typeId === 'bug' ? { severity: selectedValue('severity') } : {}),
      subject: subject.trim(),
      // Omitted context stays out of the request and the local copy.
      message: withReportContext(message.trim(), omitContext(capture, removed)),
      email,
      // 'inline' is a value api/support.js actually accepts. 'feedback-modal'
      // was not in VALID_SOURCES, so the server silently replaced it with
      // 'feedback-form' — every report from this modal has been mislabelled as
      // coming from the /feedback page.
      source: 'inline',
    }

    const requestId = requestIdFor(attemptRef, payload)

    // saveFeedback takes a single entry object (a positional call corrupts the
    // localStorage record). Keyed by the request id, so resending the same
    // message updates this record rather than adding another.
    saveFeedback({ ...payload, id: requestId })

    bodyRef.current = { ...payload, name: userProfile?.displayName || '', requestId }
    void send(bodyRef.current)
  }

  const onOverlayClick = (e) => {
    if (overlayDownRef.current && e.target === overlayRef.current && !overlaySuppressedRef.current) onClose()
    overlayDownRef.current = false
  }

  return (
    <>
      {ownToast && <Toast {...notification} onDismiss={notification.dismiss} onHold={notification.hold} onRelease={notification.release} />}
      {open && <div
      ref={overlayRef}
      className="fb-overlay"
      onMouseDown={e => { overlayDownRef.current = e.target === overlayRef.current }}
      onClick={onOverlayClick}
    >
      <div
        className="fb-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="fb-head">
          <h2 id={titleId} className="fb-title">{sent ? 'Thanks for reaching out' : 'Share feedback'}</h2>
          <button type="button" className="fb-close" onClick={onClose} aria-label="Close feedback dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error ? (
          <div className="fb-success">
            <p className="fb-error" role="alert">{error}</p>
            <textarea className="fb-textarea" aria-label={t('feedback.yourMessage')} value={message} readOnly />
            <div className="fb-success-actions fb-again">
              <button type="button" className="btn btn-accent" ref={retryRef} onClick={() => { void send(bodyRef.current, false) }}>{t('feedback.tryAgain')}</button>
              <button type="button" className="btn" onClick={() => {
                recoverFeedbackDraft(bodyRef, attemptRef)
                modalFeedbackSend.edit()
                requestAnimationFrame(() => messageRef.current?.focus())
              }}>{t('feedback.editMessage')}</button>
            </div>
          </div>
        ) : sent ? (
          <div className="fb-success" role="status">
            <div className="fb-success-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="fb-success-title" ref={sentHeadingRef} tabIndex={-1}>{t('feedback.sent')}</h3>
            <p className="fb-success-text">{sending ? t('feedback.sendingMessage') : t('feedback.sentMessage')}</p>
            {/* Whether a reply is possible, which is a fact about what was sent. */}
            <p className="fb-success-text fb-success-reply">
              {delivery.body?.email
                ? t('feedback.replyAddress', { email: delivery.body.email })
                : t('feedback.noReplyAddress')}
            </p>
            <div className="fb-success-actions">
              <button type="button" className="btn" onClick={sendAnother} disabled={sending}>Send another</button>
              <button type="button" className="btn btn-accent" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <form className="fb-body" onSubmit={handleSubmit} noValidate>
            <div className="fb-field">
              <div className="fb-label">Type</div>
              <div className="fb-types" role="group" aria-label="Submission type">
                {TYPES.map((t, i) => (
                  <button
                    key={t.id}
                    ref={i === 0 ? firstControlRef : undefined}
                    type="button"
                    className={`fb-type${typeId === t.id ? ' on' : ''}`}
                    aria-pressed={typeId === t.id}
                    onClick={() => selectType(t.id)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="fb-selects">
              {activeType.selects.map(sel => (
                <div className="fb-field" key={sel.key}>
                  <label className="fb-label" htmlFor={`fb-${sel.key}`}>{sel.label}</label>
                  <MenuSelect label={sel.label}
                    id={`fb-${sel.key}`}
                    className="fb-select"
                    value={selections[sel.key] ?? sel.options[0]}
                    onChange={nextValue => setSelections(prev => ({ ...prev, [sel.key]: nextValue }))}
                  >
                    {sel.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </MenuSelect>
                </div>
              ))}
            </div>

            <div className="fb-field">
              <label className="fb-label" htmlFor="fb-subject">
                {activeType.subjectLabel} <span className="fb-optional">(optional)</span>
              </label>
              <input
                id="fb-subject"
                type="text"
                className="fb-input"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder={activeType.subjectPlaceholder}
              />
            </div>

            <div className="fb-field">
              <label className="fb-label" htmlFor="fb-message">
                {activeType.messageLabel} <span className="fb-required" aria-hidden="true">*</span>
              </label>
              <textarea
                id="fb-message"
                ref={messageRef}
                className="fb-textarea"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={activeType.messagePlaceholder}
                rows={5}
                maxLength={SUPPORT_MESSAGE_MAX}
                required
              />
            </div>

            {/* What we are about to attach, in the open, itemised, before they
                send — not a "some system information may be included" sentence
                that tells the reader nothing they can act on. Every row is one
                tick, and unticking it genuinely drops the value. */}
            {rows.length > 0 && (
              <div className="fb-field fb-cap">
                <div className="fb-label" id={capId}>
                  Attached to this report
                  <span className="fb-optional"> ({rows.length - removed.length} of {rows.length})</span>
                </div>
                <p className="fb-cap-intro">
                  These help us reproduce what you saw. Untick anything you would rather not send.
                  We never attach what you have typed, the contents of any field, or the text on the page.
                </p>
                <ul className="fb-cap-list" aria-labelledby={capId}>
                  {rows.map(row => {
                    const on = !removed.includes(row.key)
                    return (
                      <li key={row.key} className="fb-cap-row">
                        <label className="fb-cap-label">
                          <input
                            type="checkbox"
                            className="fb-cap-check"
                            checked={on}
                            onChange={() => setRemoved(prev => (
                              prev.includes(row.key) ? prev.filter(k => k !== row.key) : [...prev, row.key]
                            ))}
                          />
                          <span className="fb-cap-name">{row.label}</span>
                          <span className={`fb-cap-value${on ? '' : ' off'}`}>{row.value}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
                {!seed?.element && (
                  // Discoverability without a hover affordance: the tip appears
                  // in the one place where its value is obvious, and only when
                  // they did not already arrive by the gesture it describes.
                  <p className="fb-cap-tip">
                    Tip: right-click anywhere in the app (or press the Menu key) to report a
                    specific element with its name filled in.
                  </p>
                )}
              </div>
            )}

            {user ? <div className="fb-sending-as">Sending as {user.email}</div> : (
              <div className="fb-field">
                <label className="fb-label" htmlFor="fb-contact">
                  Email <span className="fb-optional">(so we can reply)</span>
                </label>
                <input
                  id="fb-contact"
                  ref={contactRef}
                  type="email"
                  className="fb-input"
                  value={contact}
                  onChange={e => { setContact(e.target.value); if (contactError) setContactError('') }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  maxLength={CONTACT_EMAIL_MAX}
                  aria-invalid={!!contactError}
                  aria-describedby={contactError ? 'fb-contact-error' : 'fb-contact-hint'}
                />
                {contactError
                  ? <p className="fb-error" id="fb-contact-error" role="alert">{contactError}</p>
                  : <p className="fb-hint" id="fb-contact-hint">Optional. Without an email we can read your message but can&rsquo;t reply.</p>}
              </div>
            )}

            <div className="fb-actions">
              <button type="button" className="btn" onClick={onClose} disabled={sending}>Cancel</button>
              <button type="submit" className="btn btn-accent" disabled={sending || !message.trim()} aria-busy={sending}>
                {sending ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>}
    </>
  )
}
