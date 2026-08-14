import { useState, useRef, useEffect, useCallback, useId } from 'react'
import { useLocation } from 'react-router-dom'
import { useSubscription } from '../contexts/SubscriptionContext'
import { buildReportContext, withReportContext } from '../utils/reportContext'
import { resolveTool } from '../data/toolTree'
import { useAuth } from '../contexts/AuthContext'
import { saveFeedback } from '../utils/analytics'

// Type selector — mirrors HelpCentre's CONTACT_TYPES. Each type reveals its own
// routing dropdown(s) so submissions land with the right team/triage label.
const TYPES = [
  {
    id: 'feedback',
    label: 'Feedback',
    icon: (<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />),
    selects: [
      { key: 'category', label: 'Topic', options: ['General', 'UI / Design', 'Performance', 'Pricing', 'Something else'] },
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
      { key: 'category', label: 'Area', options: ['Colour Studio', 'Typography / Fonts', 'Icons', 'File Converter', 'AI Tools', 'Account / Login', 'Billing', 'Other'] },
      { key: 'severity', label: 'Severity', options: ['Minor — cosmetic', 'Major — feature broken', "Blocking — can't use the app"] },
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
      { key: 'category', label: 'Area', options: ['A brand-new tool', 'Improve an existing tool', 'Export / integration', 'Other'] },
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
      { key: 'category', label: 'Topic', options: ['Getting started', 'Using a specific tool', 'Account', 'Billing', 'Other'] },
    ],
    subjectLabel: 'Subject',
    subjectPlaceholder: 'Brief summary',
    messageLabel: 'Message',
    messagePlaceholder: 'What do you need help with?',
  },
]

export default function FeedbackModal({ open, onClose }) {
  const { user, userProfile } = useAuth()
  // P-002: the report carries where the user was, so acting on it does not
  // start with a round trip asking which page they meant.
  const location = useLocation()
  const { isPro } = useSubscription()
  const titleId = useId()

  const [typeId, setTypeId] = useState('feedback')
  const [selections, setSelections] = useState({}) // { category, severity }
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(false)

  const overlayRef = useRef(null)
  const firstControlRef = useRef(null)

  const activeType = TYPES.find(t => t.id === typeId) || TYPES[0]

  // The <select> shows the first option when untouched, so the payload must
  // resolve to that same value rather than an empty string.
  const selectedValue = (key) => {
    const sel = activeType.selects.find(s => s.key === key)
    if (!sel) return ''
    return selections[key] ?? sel.options[0]
  }

  const resetFields = useCallback(() => {
    setSelections({})
    setSubject('')
    setMessage('')
    setSent(false)
    setError(false)
    setSending(false)
  }, [])

  // Fully reset (including the chosen type) whenever the modal is freshly opened,
  // and focus the first control. Body scroll is locked while open.
  useEffect(() => {
    if (!open) return
    setTypeId('feedback')
    resetFields()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Focus after paint so the element is actually in the DOM.
    const raf = requestAnimationFrame(() => firstControlRef.current?.focus())
    return () => {
      document.body.style.overflow = prevOverflow
      cancelAnimationFrame(raf)
    }
  }, [open, resetFields])

  // Escape closes the modal.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const selectType = (id) => {
    setTypeId(id)
    setSelections({}) // routing dropdowns are type-specific
    setError(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim() || sending) return

    setSending(true)
    setError(false)

    const email = user?.email || ''
    const payload = {
      type: typeId,
      category: selectedValue('category'),
      ...(typeId === 'bug' ? { severity: selectedValue('severity') } : {}),
      subject: subject.trim(),
      // P-002: every report now carries WHERE the user was. Without it a report
      // arrives as free text with no route, no tool and no state, so acting on
      // one means asking "which page were you on?" — and most people never
      // reply to that. It is also the proposal's own mitigation for low-quality
      // volume: capture the context so the user need not describe it.
      message: withReportContext(message.trim(), buildReportContext({
        pathname: location.pathname,
        tool: resolveTool(location.pathname)?.tool?.label || null,
        viewport: typeof window !== 'undefined'
          ? { width: window.innerWidth, height: window.innerHeight }
          : null,
        plan: isPro ? 'pro' : 'free',
        signedIn: !!user,
      })),
      email,
      // 'inline' is a value api/support.js actually accepts. 'feedback-modal'
      // was not in VALID_SOURCES, so the server silently replaced it with
      // 'feedback-form' — every report from this modal has been mislabelled as
      // coming from the /feedback page.
      source: 'inline',
    }

    // saveFeedback takes a single entry object (a positional call corrupts the
    // localStorage record — see HelpCentre fix).
    saveFeedback(payload)

    let ok = false
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, name: userProfile?.displayName || '' }),
      })
      ok = res.ok
    } catch {
      ok = false
    }

    setSending(false)
    // Fail loud: a silently-lost support request is the worst outcome for a
    // feedback channel — only surface success when the request actually landed.
    if (ok) setSent(true)
    else setError(true)
  }

  const onOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      className="fb-overlay"
      onMouseDown={onOverlayClick}
    >
      <div
        className="fb-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="fb-head">
          <h2 id={titleId} className="fb-title">{sent ? 'Thanks for reaching out' : 'Share feedback'}</h2>
          <button type="button" className="fb-close" onClick={onClose} aria-label="Close feedback dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="fb-success">
            <div className="fb-success-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="fb-success-title">Thanks — we&apos;ve got it</h3>
            <p className="fb-success-text">Your {activeType.label.toLowerCase()} submission has been received and will be reviewed.</p>
            <div className="fb-success-actions">
              <button type="button" className="btn" onClick={resetFields}>Send another</button>
              <button type="button" className="btn btn-accent" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <form className="fb-body" onSubmit={handleSubmit}>
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
                  <select
                    id={`fb-${sel.key}`}
                    className="fb-select"
                    value={selections[sel.key] ?? sel.options[0]}
                    onChange={e => setSelections(prev => ({ ...prev, [sel.key]: e.target.value }))}
                  >
                    {sel.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
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
                className="fb-textarea"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={activeType.messagePlaceholder}
                rows={5}
                required
              />
            </div>

            {user && <div className="fb-sending-as">Sending as {user.email}</div>}

            {error && (
              <div role="alert" className="fb-error">
                Something went wrong sending that. Please check your connection and try again.
              </div>
            )}

            <div className="fb-actions">
              <button type="button" className="btn" onClick={onClose} disabled={sending}>Cancel</button>
              <button type="submit" className="btn btn-accent" disabled={sending || !message.trim()}>
                {sending ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
