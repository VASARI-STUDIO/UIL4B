import { useState, useEffect, useRef, useId } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { processAvatarImage } from '../utils/imageProcessing'
import { useAppearance } from '../contexts/AppearanceContext'
import { useI18n } from '../contexts/I18nContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useProPrice, usePrices, usePriceRetry } from '../hooks/usePrices'
import useMediaQuery from '../hooks/useMediaQuery'
import useOnline from '../hooks/useOnline'
import { getLenis } from '../hooks/useSmoothScroll'
import { flushAccountSync } from '../hooks/useFirestoreSync'
import { getSyncState } from '../utils/syncStatus'
import { loadFirestore } from '../utils/firebaseAccess'
import { AI_TERMS_PATH } from '../config/aiImageConsent'
import { requestAccountReset } from '../utils/accountEvents'
import { verifyErrorText, verifiedLandingMessage } from '../utils/emailVerification'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import useVerificationRecheck from '../hooks/useVerificationRecheck'
// Settings → Plan and billing says exactly what /plans says: the same lines, the
// same cadences, the same per-month amounts and trial terms, from the one
// module /plans reads. See src/config/planFacts.js for why.
import {
  FREE_POINTS, FREE_EXCLUSION, PRO_POINTS, DEFAULT_BILLING, resolveOffers,
  canCheckout, priceState, priceStateCopy,
  subscriptionCadence, CADENCE_LABEL,
} from '../config/planFacts'
import { LOCATIONS } from '../data/locations'
import { FLAIRS, getFlair } from '../utils/constants'
import UserName from '../components/UserName'
import ThemeChoice from '../components/ThemeChoice'
import { clearCommunitySubmissions, COMMUNITY_SUBMISSIONS_KEY } from '../utils/communitySubmissions'
import { collectStorage, buildExport, keysToClear } from '../utils/dataExport'
import { initialOf } from '../utils/initials'
import { checkWebsite } from '../utils/websiteUrl'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../utils/firebase'
// The `settings` page stylesheet. Imported here rather than from global.css so
// Vite emits it as this lazy route's own chunk stylesheet — only a visitor who
// opens this page downloads it, and it arrives with the chunk, before paint.
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/account.css'
import '../styles/deferred/tool-shell.css'
import '../styles/pages/settings.css'

function Check() {
  return (
    <svg className="sub-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function Minus() {
  return (
    <svg className="sub-check sub-minus" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <line x1="6" y1="12" x2="18" y2="12" />
    </svg>
  )
}

function Chevron({ back = false }) {
  return (
    <svg className="stg-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points={back ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  )
}

// Stripe's portal answers with a URL or an error. An error used to vanish:
// A rejected openPortal() is shown, never dropped, so "Manage billing" and
// "Cancel plan" say why when the portal is not configured. The reference is
// what support needs.
function portalErrorText(e) {
  const detail = e?.message ? ` (${e.message})` : ''
  return `Billing could not be opened, so nothing about your plan has changed${detail}. Please try again in a moment.`
}

// How long a profile save waits for the server before it is treated as held
// back (see saveProfile in Settings), and what the person is then told.
const PROFILE_WRITE_WAIT_MS = 8000
const SIGN_OUT_FLUSH_WAIT_MS = 10000
const PROFILE_QUEUED_TEXT ='Saved on this device. It reaches your account once you’re back online.'

// Bio is a paragraph, so it gets a textarea where Enter adds a line and the
// modifier-Enter saves. The shortcut named in its count line follows the OS.
const MOD_KEY = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '') ? 'Cmd' : 'Ctrl'

function EditField({ label, value, onSave, type = 'text', placeholder, options, maxLength, inputMode, multiline = false }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const [error, setError] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [hi, setHi] = useState(-1)
  const errId = useId()
  const inputId = useId()
  const countId = useId()

  // Suggestions only exist while the user is typing: the list opens on input,
  // never on focus, and an exact match (i.e. a just-picked option) yields none.
  const q = val.trim().toLowerCase()
  const matches = (options && suggestOpen && q)
    ? options.filter(o => o.toLowerCase().includes(q) && o.toLowerCase() !== q).slice(0, 8)
    : []

  const pick = (o) => { setVal(o); setSuggestOpen(false); setHi(-1) }

  const onSuggestKey = (e) => {
    if (!matches.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => (h + 1) % matches.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => (h <= 0 ? matches.length - 1 : h - 1)) }
    else if (e.key === 'Enter' && hi >= 0 && matches[hi]) { e.preventDefault(); pick(matches[hi]) }
    else if (e.key === 'Escape') { setSuggestOpen(false); setHi(-1) }
  }

  // Bold the part of the suggestion the user has already typed.
  const markMatch = (text) => {
    const i = text.toLowerCase().indexOf(q)
    if (i < 0) return text
    return <>{text.slice(0, i)}<strong>{text.slice(i, i + q.length)}</strong>{text.slice(i + q.length)}</>
  }

  // onSave may be async (the display name awaits the profile write), so the
  // field stays open until it settles and a second Enter or click while it is
  // pending is ignored. The ref closes the gap before the state re-renders.
  const savingRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      await onSave(val)
      setEditing(false)
      setError('')
    } catch (e) {
      setError(e.message || 'Failed to save')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  // Enter saves and Escape cancels, the way every other inline rename in the
  // app already behaves (the project card, the Save Current form). Rendered on
  // 2026-09-09: typing a new display name and pressing Enter did nothing at
  // all — the field stayed open, no toast, no error — and the only way to
  // commit was to reach for the Save button. A single-field edit that ignores
  // Enter reads as broken, not as cautious.
  //
  // The suggestion list keeps first claim on the keys it uses: ArrowUp/Down
  // move the highlight, Enter with a highlighted row picks it, and Escape with
  // the list open closes the list rather than the edit. Only a key the list
  // did not consume reaches the save/cancel branch.
  const onFieldKey = (e) => {
    if (multiline) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSave() }
      else if (e.key === 'Escape' && !savingRef.current) { setEditing(false); setError('') }
      return
    }
    if (options) {
      const listOpen = suggestOpen && matches.length > 0
      onSuggestKey(e)
      if (e.defaultPrevented) return
      if (e.key === 'Escape' && listOpen) return
    }
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
    else if (e.key === 'Escape' && !savingRef.current) { setEditing(false); setError('') }
  }

  if (!editing) {
    return (
      <div className="settings-row settings-row--field">
        <div className="settings-row-main">
          <div className="settings-row-label">{label}</div>
          <div className="settings-row-value">{value || <span className="settings-row-empty">Not set</span>}</div>
        </div>
        {/* The hidden suffix gives each Edit button its own name. */}
        <button type="button" className="btn btn-s" onClick={() => { setVal(value || ''); setEditing(true) }}>Edit<span className="sr-only"> {label.toLowerCase()}</span></button>
      </div>
    )
  }

  if (multiline) {
    return (
      <div className="settings-row settings-row--open">
        <label htmlFor={inputId} className="settings-row-label">{label}</label>
        <textarea
          id={inputId}
          className="settings-bio-input"
          rows={4}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={onFieldKey}
          placeholder={placeholder}
          maxLength={maxLength}
          enterKeyHint="enter"
          autoFocus
          readOnly={saving}
          aria-invalid={error ? true : undefined}
          aria-describedby={[countId, error ? errId : ''].filter(Boolean).join(' ')}
        />
        <div id={countId} className="settings-count">
          <span>{val.length.toLocaleString('en-AU')} / {Number(maxLength).toLocaleString('en-AU')}</span>
          <span>{MOD_KEY}+Enter to save</span>
        </div>
        <div className="settings-edit-actions">
          <button type="button" className="btn btn-accent btn-s" onClick={handleSave} disabled={saving}>Save</button>
          <button type="button" className="btn btn-s" onClick={() => { setEditing(false); setError('') }} disabled={saving}>Cancel</button>
        </div>
        {error && <div id={errId} className="settings-field-err" role="alert">{error}</div>}
      </div>
    )
  }

  return (
    <div className="settings-row settings-row--open">
      <label htmlFor={inputId} className="settings-row-label">{label}</label>
      <div className="settings-edit-line">
        <div className="settings-suggest-wrap">
          <input
            id={inputId}
            type={type}
            inputMode={inputMode}
            enterKeyHint="done"
            value={val}
            onChange={e => { setVal(e.target.value); setSuggestOpen(true); setHi(-1) }}
            onKeyDown={onFieldKey}
            onBlur={options ? () => { setSuggestOpen(false); setHi(-1) } : undefined}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus
            readOnly={saving}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errId : undefined}
            role={options ? 'combobox' : undefined}
            aria-expanded={options ? matches.length > 0 : undefined}
            aria-autocomplete={options ? 'list' : undefined}
          />
          {matches.length > 0 && (
            <ul className="settings-suggest" role="listbox">
              {matches.map((o, i) => (
                <li key={o}>
                  {/* mousedown (not click) so picking wins over the input's blur */}
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === hi}
                    className={`settings-suggest-item${i === hi ? ' on' : ''}`}
                    onMouseDown={e => { e.preventDefault(); pick(o) }}
                    onMouseEnter={() => setHi(i)}
                    tabIndex={-1}
                  >
                    {markMatch(o)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" className="btn btn-accent btn-s" onClick={handleSave} disabled={saving}>Save</button>
        <button type="button" className="btn btn-s" onClick={() => { setEditing(false); setError('') }} disabled={saving}>Cancel</button>
      </div>
      {error && <div id={errId} className="settings-field-err" role="alert">{error}</div>}
    </div>
  )
}

// Picks the single flair shown next to the user's name. Only role + community
// flairs are selectable here; `earned` badges are awarded by the system and
// surfaced read-only so people know they exist.
function FlairPicker({ value, displayName, email, onSave }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const errId = useId()
  const current = getFlair(value)
  const roles = FLAIRS.filter((f) => f.group === 'role')
  const community = FLAIRS.filter((f) => f.group === 'community')
  const earned = FLAIRS.filter((f) => f.group === 'earned')

  // onSave is awaited: a refused write keeps the picker open and says why,
  // instead of the chip looking chosen. One write at a time.
  const save = async (id) => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await onSave(id)
    } catch (e) {
      setError(e.message || 'Your flair could not be saved. Nothing was changed. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  const choose = (id) => save(id === value ? '' : id)

  if (!open) {
    return (
      <div className="settings-row">
        <div className="settings-row-main">
          <div className="settings-row-label">Flair</div>
          <div className="settings-row-value">
            {current
              ? <span className={`flair flair--${current.tone}`}>{current.label}</span>
              : <span className="settings-row-empty">No flair set</span>}
          </div>
        </div>
        <button className="btn btn-s" onClick={() => setOpen(true)}>
          {current ? 'Change' : 'Add'}<span className="sr-only"> flair</span>
        </button>
      </div>
    )
  }

  return (
    <div className="settings-row settings-row--open">
      <div className="settings-row-label">Flair</div>
      <p className="flairpick-hint">A small tag shown next to your name across the community.</p>

      <div className="flairpick-preview">
        <span className="flairpick-preview-label">Preview</span>
        <UserName name={displayName} email={email} flair={value} bold />
      </div>

      <div className="flairpick-group-label">Role</div>
      <div className="flairpick-grid">
        {roles.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`flair flair--${f.tone} flairpick-chip${f.id === value ? ' is-on' : ''}`}
            aria-pressed={f.id === value}
            disabled={busy}
            onClick={() => choose(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flairpick-group-label">Community</div>
      <div className="flairpick-grid">
        {community.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`flair flair--${f.tone} flairpick-chip${f.id === value ? ' is-on' : ''}`}
            aria-pressed={f.id === value}
            disabled={busy}
            onClick={() => choose(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flairpick-group-label">Earned</div>
      <p className="flairpick-hint">Awarded automatically for how you show up here — not selectable.</p>
      <div className="flairpick-grid">
        {earned.map((f) => (
          <span key={f.id} className={`flair flair--${f.tone} flairpick-chip is-locked`} aria-disabled="true">
            {f.label}
          </span>
        ))}
      </div>

      <div className="settings-edit-actions">
        <button className="btn btn-accent btn-s" onClick={() => { setOpen(false); setError('') }} disabled={busy}>Done</button>
        {value && (
          <button className="btn btn-s" onClick={() => save('')} disabled={busy}>Clear flair</button>
        )}
      </div>
      {error && <div id={errId} className="settings-field-err" role="alert">{error}</div>}
    </div>
  )
}

function PasswordChange({ onSave, googleOnly, onReset }) {
  const [open, setOpen] = useState(false)
  const [resetState, setResetState] = useState('')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)
  // One call in flight at a time. The ref is what stops a second submit in the
  // same tick; `busy` only repaints the button and the fields.
  const busyRef = useRef(false)
  // The panel closes 1.5s after success. Its timer is cleared when a new
  // attempt starts and when the component goes, so a late tick never closes a
  // panel that is being used again or sets state on an unmounted one.
  const closeTimer = useRef(0)
  const aliveRef = useRef(true)
  const currentRef = useRef(null)
  const nextRef = useRef(null)
  const confirmRef = useRef(null)
  const errId = useId()
  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false; clearTimeout(closeTimer.current) }
  }, [])

  const handleSave = async () => {
    if (busyRef.current) return
    clearTimeout(closeTimer.current)
    setError('')
    setSuccess(false)
    if (next.length < 6) { setError('New password must be at least 6 characters'); nextRef.current?.focus(); return }
    if (next !== confirm) { setError('Passwords do not match'); confirmRef.current?.focus(); return }
    busyRef.current = true
    setBusy(true)
    try {
      await onSave(current, next)
      if (!aliveRef.current) return
      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
      closeTimer.current = setTimeout(() => { setSuccess(false); setOpen(false) }, 1500)
    } catch (e) {
      if (!aliveRef.current) return
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') setError('Current password is incorrect')
      else if (e.code === 'auth/weak-password') setError('Choose a longer password')
      else if (e.code === 'auth/too-many-requests') setError('Too many attempts. Wait a few minutes and try again.')
      else setError('Your password could not be changed. Nothing was changed. Please try again.')
      // The disabled submit held focus, which fell to <body>; the person's next
      // move is the first field, so that is where it goes.
      currentRef.current?.focus()
    } finally {
      busyRef.current = false
      if (aliveRef.current) setBusy(false)
    }
  }

  // Forgot the current one: Firebase emails a reset link. Said either way, so
  // nobody is left waiting for an email that was never sent.
  const sendReset = async () => {
    setResetState('sending')
    try { await onReset(); setResetState('sent') } catch { setResetState('failed') }
  }

  // A Google-only account has no password to change; the sign-in method row
  // already says how it signs in.
  if (googleOnly) return null

  if (!open) {
    return (
      <div className="settings-row">
        <div className="settings-row-main">
          <div className="settings-row-label">Password</div>
          <div className="settings-row-value">••••••••</div>
        </div>
        <button className="btn btn-s" onClick={() => setOpen(true)}>Change<span className="sr-only"> password</span></button>
      </div>
    )
  }

  return (
    <div className="settings-row settings-row--open">
      <div className="settings-row-label">Change password</div>
      <form noValidate onSubmit={(e) => { e.preventDefault(); handleSave() }}>
        <div className="settings-edit-stack">
          <input ref={currentRef} type="password" placeholder="Current password" aria-label="Current password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} readOnly={busy} aria-disabled={busy || undefined} aria-invalid={error ? true : undefined} aria-describedby={error ? errId : undefined} autoFocus />
          <input ref={nextRef} type="password" placeholder="New password (min. 6 characters)" aria-label="New password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} readOnly={busy} aria-disabled={busy || undefined} aria-invalid={error ? true : undefined} aria-describedby={error ? errId : undefined} />
          <input ref={confirmRef} type="password" placeholder="Confirm new password" aria-label="Confirm new password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} readOnly={busy} aria-disabled={busy || undefined} aria-invalid={error ? true : undefined} aria-describedby={error ? errId : undefined} />
        </div>
        <div className="settings-edit-actions">
          <button type="submit" className="btn btn-accent btn-s" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
          <button type="button" className="btn btn-s" onClick={() => { clearTimeout(closeTimer.current); setOpen(false); setError(''); setSuccess(false) }} disabled={busy}>Cancel</button>
        </div>
      </form>
      {error && <div id={errId} className="settings-field-err" role="alert">{error}</div>}
      {success && <div className="settings-field-ok" role="status">Password updated successfully</div>}
      <div className="settings-reset">
        <button type="button" className="settings-linkbtn" onClick={sendReset} disabled={resetState === 'sending'}>
          {resetState === 'sending' ? 'Sending…' : 'Email me a password reset link'}
        </button>
        {resetState === 'sent' && <div className="settings-field-ok" role="status">Reset link sent. Check your inbox and spam folder.</div>}
        {resetState === 'failed' && <div className="settings-field-err" role="alert">The reset link could not be sent. Please try again.</div>}
      </div>
    </div>
  )
}

// Firebase's refusals, in words. updateEmail() is awaited, so the confirmation
// note only shows once the link has really been sent, and every failure lands
// here.
const EMAIL_ERRORS = {
  'auth/wrong-password': 'That password is incorrect.',
  'auth/invalid-credential': 'That password is incorrect.',
  'auth/invalid-email': 'That is not a valid email address.',
  'auth/email-already-in-use': 'Another account already uses that email.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/requires-recent-login': 'For your security, sign out, sign back in, then try again.',
  'auth/operation-not-allowed': 'Your email could not be changed here yet. Nothing was changed.',
  'auth/network-request-failed': 'You appear to be offline. Nothing was changed.',
}
// Not a full address grammar: one "@", something either side, and a dot in the
// domain. Firebase has the last word; this only turns an obvious typo away
// before the password step.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/
function emailErrorText(e) {
  return EMAIL_ERRORS[e?.code] || 'Your email could not be changed. Nothing was changed. Please try again.'
}

// Shown only while the account's address is unproved. The link is opened in
// the inbox, usually in another tab, so returning to this one re-reads the
// account and the note clears without a reload.
function EmailVerificationNote({ address, onSend, onRefresh }) {
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')

  useVerificationRecheck(onRefresh)

  const send = async () => {
    setState('sending')
    try {
      await onSend()
      setState('sent')
    } catch (e) {
      setError(verifyErrorText(e))
      setState('failed')
    }
  }

  return (
    <>
      <div className="settings-row-meta">Not verified</div>
      <button type="button" className="settings-linkbtn" onClick={send} disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send verification link'}
      </button>
      {state === 'sent' && <div className="settings-field-ok" role="status">Link sent to {address}. Check your inbox and spam folder.</div>}
      {state === 'failed' && <div className="settings-field-err" role="alert">{error}</div>}
    </>
  )
}

function EmailEditField({ value, onSave, googleOnly, verification }) {
  const [editing, setEditing] = useState(false)
  const [email, setEmail] = useState(value || '')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState('email')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // The address a confirmation link went to. The account keeps its current
  // address until that link is opened, so the row says so instead of showing
  // the new one early.
  const [pendingEmail, setPendingEmail] = useState('')
  const errId = useId()
  // Closing the field (Escape, Cancel, or a saved change) unmounts the Edit
  // button's replacement, so focus goes back to Edit once it is drawn again.
  const editRef = useRef(null)
  const focusEditOwed = useRef(false)
  useEffect(() => {
    if (editing || !focusEditOwed.current) return
    focusEditOwed.current = false
    editRef.current?.focus()
  }, [editing])
  const closeField = () => { focusEditOwed.current = true; setEditing(false); setError('') }

  const handleNext = () => {
    const typed = email.trim()
    if (!typed || typed.toLowerCase() === (value || '').toLowerCase()) { setError('Enter a new email address'); return }
    if (!EMAIL_SHAPE.test(typed)) { setError('That is not a valid email address.'); return }
    setEmail(typed)
    setStep('confirm')
    setError('')
  }

  const handleSave = async () => {
    if (busy) return
    if (!password) { setError('Password is required'); return }
    setBusy(true)
    try {
      await onSave(email, password)
      setPendingEmail(email)
      focusEditOwed.current = true
      setEditing(false)
      setStep('email')
      setPassword('')
      setError('')
    } catch (e) {
      setError(emailErrorText(e))
    } finally {
      setBusy(false)
    }
  }

  if (googleOnly) {
    // A Google-only account has no password to confirm a change with, and its
    // email is its Google account's. The old field asked for a password that
    // does not exist.
    return (
      <div className="settings-row">
        <div className="settings-row-main">
          <div className="settings-row-label">Email address</div>
          <div className="settings-row-value">{value || <span className="settings-row-empty">Not set</span>}</div>
          <div className="settings-row-meta">Managed by your Google account</div>
        </div>
      </div>
    )
  }

  if (!editing) {
    return (
      <div className="settings-row settings-row--field">
        <div className="settings-row-main">
          <div className="settings-row-label">Email address</div>
          <div className="settings-row-value">{value || <span className="settings-row-empty">Not set</span>}</div>
          {verification?.owed && (
            <EmailVerificationNote address={value} onSend={verification.onSend} onRefresh={verification.onRefresh} />
          )}
          {pendingEmail && (
            <div className="settings-field-ok" role="status">
              Confirmation link sent to {pendingEmail}. Your email changes when you open it.
            </div>
          )}
        </div>
        <button ref={editRef} type="button" className="btn btn-s" onClick={() => { setEmail(value || ''); setEditing(true); setStep('email') }}>Edit<span className="sr-only"> email address</span></button>
      </div>
    )
  }

  return (
    <div className="settings-row settings-row--open">
      <div className="settings-row-label">
        {step === 'email' ? 'Email address' : 'Confirm password'}
      </div>
      {/* A real form per step, so Enter advances or submits. `key` remounts it
          between steps, which hands autofocus to the new field. `noValidate`
          keeps the browser's own bubble off: the message is ours, inline. */}
      {step === 'email' ? (
        <form key="email" className="settings-edit-line" noValidate onSubmit={(e) => { e.preventDefault(); handleNext() }} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); closeField() } }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter new email" aria-label="New email address" aria-invalid={!!error} aria-describedby={error ? errId : undefined} autoComplete="email" autoFocus />
          <button type="submit" className="btn btn-accent btn-s">Next</button>
          <button type="button" className="btn btn-s" onClick={closeField}>Cancel</button>
        </form>
      ) : (
        <form key="confirm" className="settings-edit-line" noValidate onSubmit={(e) => { e.preventDefault(); handleSave() }} onKeyDown={(e) => { if (e.key === 'Escape' && !busy) { e.preventDefault(); setPassword(''); closeField() } }}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password to confirm" aria-label="Your password" aria-invalid={!!error} aria-describedby={error ? errId : undefined} autoComplete="current-password" autoFocus />
          <button type="submit" className="btn btn-accent btn-s" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          <button type="button" className="btn btn-s" onClick={() => { setStep('email'); setPassword(''); setError('') }} disabled={busy}>Back</button>
        </form>
      )}
      {error && <div id={errId} className="settings-field-err" role="alert">{error}</div>}
    </div>
  )
}

// Firebase's raw codes reach users as strings like
// "Firebase: Error (auth/requires-recent-login)." Only auth/wrong-password was
// ever mapped, so every other failure — including the one Google accounts hit
// on every single attempt — surfaced as that.
const OFFLINE_DELETE = 'You appear to be offline. Nothing was deleted. Try again when you’re connected.'
const UNCONFIRMED_DELETE = 'We lost the connection, so we can’t confirm whether your account was deleted. Sign in again to check. If you can’t, contact support@uil4b.com.'
const DELETE_ERRORS = {
  'auth/wrong-password': 'That password is incorrect.',
  'auth/invalid-credential': 'That password is incorrect.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/requires-recent-login': 'For your security, sign in again and then retry.',
  'reauth-required': 'For your security, sign in again and then retry.',
  'auth/popup-closed-by-user': 'The Google window closed before you confirmed. Try again.',
  'auth/cancelled-popup-request': 'The Google window closed before you confirmed. Try again.',
  'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups for this site and try again.',
  'auth/user-mismatch': 'That is a different Google account. Confirm with the one you are signed in as.',
  'auth/network-request-failed': OFFLINE_DELETE,
}

function deleteErrorText(e) {
  const mapped = DELETE_ERRORS[e?.code]
  if (mapped) return mapped
  // The request to our own server has no Firebase code: a dropped connection
  // is a bare TypeError ("Failed to fetch"). That can happen after the server
  // has already deleted the account, online or offline, so nothing can be said
  // about whether it was deleted. Only auth/network-request-failed, raised
  // before the request is sent, is safe to answer with "Nothing was deleted".
  if (e instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(e?.message || '')) {
    return UNCONFIRMED_DELETE
  }
  // The server's own messages are already written for a user to read, and carry
  // a correlation id support can trace.
  if (e?.message) return e.message
  return 'We could not delete your account. Please try again.'
}

function DeleteAccount({ onDelete, onExportFirst, googleOnly, isPro, planPending }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  // The acknowledgement every account type must tick before the button arms.
  const [ack, setAck] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const panelRef = useRef(null)
  // On Cancel the panel that held focus unmounts, so focus returns to the
  // button that opened it rather than dropping to <body>.
  const openBtnRef = useRef(null)
  const returnFocus = useRef(false)
  useEffect(() => {
    if (open || !returnFocus.current) return
    returnFocus.current = false
    openBtnRef.current?.focus()
  }, [open])

  // Opening the confirmation unmounts the "Delete account" button that was
  // just pressed, and a keyboard user's focus went with it — measured on
  // 2026-09-09: document.activeElement was <body> the moment the panel
  // appeared, so the next Tab started from the top of the page and a screen
  // reader announced nothing about the list of what is destroyed. Focus lands
  // on the password field where there is one (it is the next thing to do),
  // and on the panel itself for a Google-only account, so the itemised list is
  // read before the destructive button is reached. Never on the button: Enter
  // on a freshly focused "Permanently delete" would be a one-keystroke
  // deletion.
  useEffect(() => {
    if (!open) return
    const input = panelRef.current?.querySelector('#del-confirm-pw')
    ;(input || panelRef.current)?.focus()
  }, [open])

  // A password account cannot delete with an empty password — Firebase refuses
  // the re-authentication — so the button waits for one. The label directly
  // above the field says what it is waiting for. It also waits for the
  // acknowledgement, which is the same for a Google-only account.
  const needsPassword = !googleOnly && !password
  const notReady = !ack || needsPassword

  const closePanel = () => { returnFocus.current = true; setOpen(false); setError(''); setPassword(''); setAck(false) }

  // Enter in the password field submits (the button is disabled until there is
  // a password, which blocks the implicit submit too); Escape closes the panel
  // from anywhere inside it, unless the delete is already running.
  const handleDelete = async (e) => {
    e?.preventDefault()
    if (busy || notReady) return
    setBusy(true)
    setError('')
    try {
      await onDelete(password)
      // On success the account is gone and AuthContext has signed out; the app
      // re-renders signed out from under this component.
    } catch (e) {
      setBusy(false)
      setError(deleteErrorText(e))
    }
  }

  if (!open) {
    return (
      // Waits for the plan to be known: the list below names Pro's cancellation
      // only for a Pro account.
      <button ref={openBtnRef} className="btn danger-zone-open" onClick={() => setOpen(true)} disabled={planPending}>
        Delete account
      </button>
    )
  }

  return (
    <form
      className="danger-confirm"
      ref={panelRef}
      tabIndex={-1}
      noValidate
      onSubmit={handleDelete}
      onKeyDown={(e) => { if (e.key === 'Escape' && !busy) { e.preventDefault(); closePanel() } }}
    >
      <ul className="danger-confirm-list">
        {isPro && <li>Pro is cancelled straight away, and you won&rsquo;t be billed again.</li>}
        <li>Your profile, saved projects, icons and synced designs are deleted.</li>
        <li>Prompts you submitted to the community, and any media with them, are removed.</li>
        <li>You can sign up again with the same email, but it starts as a new, empty account.</li>
      </ul>

      {/* A way out to the export, before anything is deleted. It only changes
          section; nothing is deleted by it. */}
      <p className="danger-confirm-note">
        Want a copy first?{' '}
        <button type="button" className="danger-confirm-link" onClick={onExportFirst} disabled={busy}>Download your data</button>
      </p>

      <div className="danger-confirm-ack">
        <input id="del-ack" type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} disabled={busy} />
        <label htmlFor="del-ack">I understand my account and everything in it will be deleted, and this can&rsquo;t be undone.</label>
      </div>

      {googleOnly ? (
        // A Google-only account HAS no password. The old dialog asked for one
        // unconditionally, which was unanswerable — and then deletion threw
        // requires-recent-login anyway.
        <p className="danger-confirm-note">
          Google will ask you to confirm it&rsquo;s you before anything is deleted.
        </p>
      ) : (
        <>
          <label className="seg-label" htmlFor="del-confirm-pw">Confirm your password</label>
          <input
            id="del-confirm-pw"
            type="password"
            className="danger-confirm-input"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? 'del-confirm-err' : undefined}
          />
        </>
      )}

      <div className="danger-confirm-actions">
        <button type="submit" className="btn danger-confirm-go" disabled={busy || notReady}>
          {busy ? 'Deleting…' : 'Permanently delete'}
        </button>
        <button type="button" className="btn btn-s" onClick={closePanel} disabled={busy}>
          Cancel
        </button>
      </div>
      {error && <div id="del-confirm-err" className="danger-confirm-err" role="alert">{error}</div>}
    </form>
  )
}

function NavIcon({ id }) {
  const sw = 1.6
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (id) {
    // 'support' is the Subscription section's ID (Plans.jsx deep-links to it);
    // matching the label here left that one tab without a glyph.
    case 'support': return <svg {...props}><path d="M20 12V8H6a2 2 0 1 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
    case 'accessibility': return <svg {...props}><circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg>
    case 'language': return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
    case 'account': return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    case 'data': return <svg {...props}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>
    case 'privacy': return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    default: return null
  }
}

// Which section /settings opens on. It opened on Subscription, so a free
// account's first sight of its own settings was the upgrade pitch (#436, flow
// 5). Account is the default for a signed-in person; the last section they
// chose is remembered in this browser so the page opens where they left it.
// A deep link (Plans → state.section) still wins — see the effect below.
const SECTION_KEY = 'vs-settings-section'
function rememberedSection() {
  try { return localStorage.getItem(SECTION_KEY) || '' } catch { return '' }
}
function rememberSection(id) {
  try { localStorage.setItem(SECTION_KEY, id) } catch { /* private mode: nothing to remember with */ }
}

export default function Settings({ toast }) {
  const { user, userProfile, logout, updateProfile, updateEmail, updatePassword, resetPassword, deleteAccount, isGoogleOnlyAccount, profileSyncError, dismissProfileSyncError, emailVerificationOwed, sendVerificationEmail, refreshEmailVerified, loading: authLoading } = useAuth()
  const { reducedMotion, setReducedMotion } = useAppearance()
  const { isPro, isAdmin, subscription, lifetimeEntitlement, openPortal, loading: subLoading, planKnown } = useSubscription()
  // True until both the account and its plan have answered. Neither plan is
  // shown before then: isPro is false for everyone while the plan is on its way.
  const planPending = authLoading || (!!user && (subLoading || !planKnown))
  const { t, lang, setLang, languages } = useI18n()
  // 'support' — the SECTION ID, not the label. This said 'subscription', which
  // matched no section: harmless while every panel rendered at once and `active`
  // only drove the nav highlight, so the page opened with nothing highlighted
  // and nobody noticed. Turning the sections into panels turned it into a blank
  // page. The id stays 'support' because Plans.jsx deep-links to it via
  // `state={{ section: 'support' }}`.
  const [chosen, setActive] = useState(() => rememberedSection() || 'account')
  // 'account' is the one section that only exists signed in. Signed out — and
  // for the instant before auth resolves — it falls back to Appearance (which
  // works without an account) rather than to a blank page, which is what an id
  // matching no panel gives.
  const active = chosen === 'account' && !user ? 'accessibility' : chosen
  const location = useLocation()
  // MOBILE FIRST, and a tab row never wraps. On a
  // phone the sections are a list you open one at a time, with a way back —
  // the shape of every phone settings screen (Blue Apron, Givingli, Lifesum on
  // Mobbin) — instead of six tabs wrapped into a grid above the content.
  const isPhone = useMediaQuery('(max-width: 720px)')
  // The tiers only stack at 640 (settings.css), so this is not `isPhone`:
  // between 641 and 720 they are still two columns and Free stays on the left.
  // The Language tiles turn into rows at the same line.
  const tiersStacked = useMediaQuery('(max-width: 640px)')
  const navigate = useNavigate()
  // Which view a phone shows lives in the history entry, not in component
  // state: opening a section is a push, so the browser's Back (and the phone's
  // back gesture) returns to the list instead of leaving /settings. A deep
  // link (Plans, the account menu) carries `state.section` and opens the same
  // view; it has no `fromList` flag because there is no list entry behind it.
  // The account menu, from inside Settings, replaces the current entry and passes
  // the flag on (PillNav), so it never stacks a second section entry.
  const phoneView = location.state?.section ? 'section' : 'list'
  // Read from callbacks that outlive the render that made them (the sign-in
  // toast action below), which would otherwise navigate to a stale URL.
  const locationRef = useRef(location)
  useEffect(() => { locationRef.current = location })
  // The toast outlives this page, so its callbacks also ask whether Settings is
  // still the page before touching the history.
  const mountedRef = useRef(false)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])
  const showSection = (id, { replace = false } = {}) => {
    const here = locationRef.current
    navigate({ pathname: here.pathname, search: here.search, hash: here.hash }, { replace, state: { section: id, fromList: !replace } })
  }
  const pickSection = (id) => {
    setActive(id)
    rememberSection(id)
    if (!isPhone) return
    showSection(id)
    // The list may be scrolled; a new view starts at its top. Lenis owns the
    // scroll when it is running, so the reset goes through it.
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(0, { immediate: true })
    else window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }
  // Back to the list. A section opened from the list has the list as the entry
  // behind it, so Back is a pop. A deep-linked one does not (behind it is Plans
  // or whichever page linked), so the bar replaces its entry with the list; the
  // browser's Back from the list then still leaves for that page, rather than
  // passing through the section again.
  const closeSection = () => {
    if (location.state?.fromList) { navigate(-1); return }
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: null })
  }
  const [confirmClear, setConfirmClear] = useState(false)
  // Pressing "Clear data" unmounts that button for the Confirm / Cancel pair,
  // and focus went with it (to <body>). The pair opens on Cancel, never on
  // "Confirm clear": Enter on a freshly focused destructive button would be a
  // one-keystroke wipe. When the pair closes, focus goes back to the trigger,
  // unless the person has already moved it elsewhere. Nothing moves until the
  // first press, so landing on the Data section does not take focus.
  const clearTriggerRef = useRef(null)
  const clearCancelRef = useRef(null)
  const clearFocusOwed = useRef(false)
  useEffect(() => {
    if (!clearFocusOwed.current) return
    if (confirmClear) { clearCancelRef.current?.focus(); return }
    const held = document.activeElement
    if (!held || held === document.body) clearTriggerRef.current?.focus()
  }, [confirmClear])
  const [exporting, setExporting] = useState(false)
  // Set when the file was built without some of the account's documents; shown
  // beside the Export row as well as in the toast.
  const [exportGap, setExportGap] = useState('')
  const online = useOnline()
  // Counted from storage, not from the length of a hand-written list. The old
  // page reported "15 items" whatever was actually there — including for a
  // browser holding 16 keys, 9 of which the export then omitted.
  const [localKeyCount, setLocalKeyCount] = useState(0)
  const [billing, setBilling] = useState(DEFAULT_BILLING)
  const billingTabs = useRef([])
  const proPrice = useProPrice()
  const { prices } = usePrices()
  const { offers } = resolveOffers({ prices, currency: proPrice.currency, loaded: proPrice.loaded })
  const offer = offers.find((o) => o.id === billing) || offers[0]
  // The same state and the same words /plans and /checkout use (planFacts.js).
  const { retrying, retry } = usePriceRetry()
  const priceStatus = priceState({ price: proPrice, offers, selectedId: billing, retrying })
  const otherOffer = offers.find((o) => o.id !== offer?.id)
  const priceCopy = priceStateCopy(priceStatus, { currencyLabel: proPrice.currencyLabel, selectedLabel: offer?.label, otherLabel: otherOffer?.label })
  const onBillingKey = (event, index) => {
    const moves = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: offers.length - 1 }
    if (!(event.key in moves)) return
    event.preventDefault()
    const next = (moves[event.key] + offers.length) % offers.length
    setBilling(offers[next].id)
    billingTabs.current[next]?.focus()
  }

  const [portalBusy, setPortalBusy] = useState('')
  const [portalError, setPortalError] = useState('')
  const openBilling = async (flow) => {
    setPortalBusy(flow || 'manage')
    setPortalError('')
    try {
      await openPortal(flow ? { flow } : {})
      // Success navigates away to Stripe; nothing more to do here.
    } catch (e) {
      setPortalBusy('')
      setPortalError(portalErrorText(e))
    }
  }

  // Sign out AFTER anything pending has reached the account: once signed out,
  // the rules refuse the write, and this browser's copy is released.
  // flushAccountSync never rejects: a failed send is reported through
  // syncStatus, and offline the write is held without settling. So the flush is
  // given a limited wait, and then the sync store is read for a failure. When
  // changes have not reached the account, signing out is the person's call:
  // their copy stays on this device (the cache is released only once nothing is
  // pending) and goes up the next time the same account signs in here; a
  // different account signing in first discards it.
  const [signingOut, setSigningOut] = useState(false)
  const [signOutIssue, setSignOutIssue] = useState('')
  const signOut = async ({ anyway = false } = {}) => {
    if (signingOut) return
    setSigningOut(true)
    setSignOutIssue('')
    try {
      if (!anyway) {
        let timer
        const held = new Promise((resolve) => { timer = setTimeout(resolve, SIGN_OUT_FLUSH_WAIT_MS, 'held') })
        const flushed = await Promise.race([flushAccountSync().then(() => 'done'), held])
        clearTimeout(timer)
        if (flushed === 'held' || getSyncState().errors.length) {
          setSigningOut(false)
          setSignOutIssue('unsynced')
          return
        }
      }
      await logout()
    } catch {
      setSigningOut(false)
      setSignOutIssue('failed')
    }
  }

  // Custom profile photo: any user can override their avatar. The picked file
  // is centre-cropped + downscaled client-side to a few-KB data URL and saved
  // through the existing updateProfile path (Firestore doc, cached, synced).
  const avatarInputRef = useRef(null)
  const tabRefs = useRef([])
  const providerPhoto = user?.providerData?.[0]?.photoURL || ''
  const hasCustomPhoto = !!userProfile?.photoURL && userProfile.photoURL !== providerPhoto
  const [photoBusy, setPhotoBusy] = useState(false)

  // THE ONE PLACE A PROFILE FIELD IS SAVED FROM THIS PAGE.
  // useAuth().updateProfile is synchronous: it applies the edit locally and
  // starts the Firestore write in the background, so awaiting it says nothing
  // about whether the write worked (a refusal only raises the sync banner
  // later). To know the outcome before announcing anything, the write is made
  // here first, with the same merge-set the context uses, and the local copy
  // is updated only once it was accepted. A refusal throws, so the field stays
  // open and the old value stays on screen.
  //
  // Offline, the Firestore SDK holds a write back without settling it. Waiting
  // on that would leave the field on "Saving…", so offline (or after the wait
  // below) the edit is kept on this device and the answer says that it has not
  // reached the account yet. It resolves 'queued' then, 'saved' otherwise.
  //
  // The write can wait several seconds, and the account can change in that
  // time (a switch, a sign-out). The uid is read again from a ref that tracks
  // the latest auth state, and the edit is dropped if it is no longer the
  // account the edit was made for.
  const uidRef = useRef(user?.uid)
  uidRef.current = user?.uid
  const saveProfile = async (fields, what) => {
    const refused = () => new Error(`Your ${what} could not be saved. Nothing was changed. Please try again.`)
    const uid = user?.uid
    if (!uid) throw refused()
    let outcome = 'queued'
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      let timer
      try {
        const fs = await loadFirestore()
        const write = fs.setDoc(fs.doc(fs.db, 'users', uid), fields, { merge: true })
        const wait = new Promise((resolve) => { timer = setTimeout(resolve, PROFILE_WRITE_WAIT_MS, 'queued') })
        outcome = await Promise.race([write.then(() => 'saved'), wait])
      } catch {
        throw refused()
      } finally {
        clearTimeout(timer)
      }
    }
    if (uidRef.current !== uid) throw refused()
    updateProfile(fields)
    return outcome
  }
  const saidSaved = (outcome, text) => toast(outcome === 'queued' ? PROFILE_QUEUED_TEXT : text)

  const onAvatarFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be re-picked later
    if (!file) return
    let dataUrl
    try {
      dataUrl = await processAvatarImage(file)
    } catch (err) {
      toast(err?.message || 'Could not use that image')
      return
    }
    setPhotoBusy(true)
    try {
      saidSaved(await saveProfile({ photoURL: dataUrl }, 'photo'), 'Profile photo updated')
    } catch {
      toast('Your photo could not be saved. Nothing was changed.')
    } finally {
      setPhotoBusy(false)
    }
  }
  // A blank name is not refused: the account's name then shows as the part of
  // the email before the "@" (see AuthContext's userProfile), and the toast
  // says so.
  const saveDisplayName = async (raw) => {
    const name = String(raw ?? '').trim()
    const outcome = await saveProfile({ displayName: name }, 'display name')
    saidSaved(outcome, name ? 'Display name updated' : 'Display name cleared. The start of your email shows instead.')
  }
  // Only http(s) addresses are kept (src/utils/websiteUrl.js); a refusal is the
  // EditField's inline message, and nothing is written.
  const saveWebsite = async (raw) => {
    const checked = checkWebsite(raw)
    if (!checked.ok) throw new Error(checked.error)
    saidSaved(await saveProfile({ website: checked.value }, 'website'), checked.value ? 'Website updated' : 'Website cleared')
  }
  const saveLocation = async (v) => saidSaved(await saveProfile({ location: v }, 'location'), 'Location updated')
  const saveCompany = async (v) => saidSaved(await saveProfile({ company: v }, 'company or studio'), 'Company updated')
  const saveBio = async (v) => saidSaved(await saveProfile({ bio: v }, 'bio'), 'Bio updated')
  const saveFlair = async (id) => saidSaved(await saveProfile({ flair: id }, 'flair'), id ? 'Flair updated' : 'Flair cleared')
  // "Remove" restores the sign-in provider's photo (Google etc.), or the
  // initial-letter avatar for email accounts.
  const removeAvatar = async () => {
    setPhotoBusy(true)
    try {
      saidSaved(await saveProfile({ photoURL: providerPhoto }, 'photo'), providerPhoto ? 'Photo reset to your account image' : 'Profile photo removed')
    } catch {
      toast('Your photo could not be saved. Nothing was changed.')
    } finally {
      setPhotoBusy(false)
    }
  }

  // Open on a section when navigated from the profile quick-menu. It no longer
  // scrolls: sections are panels now, so selecting one IS showing it, and a
  // smooth-scroll to an element that was already at the top of the content
  // column just moved the page for no reason.
  useEffect(() => {
    const section = location.state?.section
    if (section) setActive(section)
  }, [location.state])

  // Back from the verification link. Both link sends point it at
  // /settings?verified=1 (see verifyLinkSettings), so the person lands where the
  // address is shown. The account is re-read rather than assumed: the flag is
  // only true here if the link really verified this account. Signed out (the
  // link was opened in another browser or on another device) there is nothing to
  // read and the parameter is anyone's to type, so nothing is claimed: the
  // toast says the link was opened and offers Sign in. A different, unverified
  // account is told so plainly. Waits for auth to settle, then removes the
  // parameter so a reload or a back-step does not repeat it.
  const { requireLogin } = useLoginPrompt()
  const verifiedReturn = useRef(false)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('verified') !== '1' || authLoading || verifiedReturn.current) return
    verifiedReturn.current = true
    params.delete('verified')
    const search = params.toString()
    // Signed in, the replace carries the section too: on a phone the section
    // view is the history state, so a replace that dropped it would land on the
    // list instead of the Account section.
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash }, { replace: true, state: user ? { section: 'account', ...(location.state?.fromList ? { fromList: true } : null) } : location.state })
    const say = (landing) => {
      if (!landing) return
      const action = landing.signIn
        ? {
            label: 'Sign in',
            onAction: () => {
              requireLogin('finish verifying your email').then((signedIn) => {
                // Signed in: land on the account and re-read it (the effect
                // below), so "Sign in to finish" ends with an answer.
                // Only while this page is still the one on screen: the toast
                // outlives it, and a replace from here would overwrite whatever
                // the person went on to.
                const here = locationRef.current
                if (signedIn && mountedRef.current && window.location.pathname === here.pathname) {
                  setActive('account')
                  navigate({ pathname: here.pathname, search: here.search, hash: here.hash }, { replace: true, state: { section: 'account', ...(here.state?.fromList ? { fromList: true } : null) } })
                  setFinishAfterSignIn(true)
                }
                // The toast that held the button is gone; keep focus on the page.
                requestAnimationFrame(() => requestAnimationFrame(() => {
                  if (!document.activeElement || document.activeElement === document.body) document.getElementById('main')?.focus()
                }))
              })
            },
          }
        : null
      toast?.(landing.text, landing.kind, action ? { action } : null)
    }
    if (!user) {
      say(verifiedLandingMessage({ signedIn: false }))
      return
    }
    setActive('account')
    refreshEmailVerified().then((verified) => {
      say(verifiedLandingMessage({ signedIn: true, verified }))
    }).catch(() => {})
  }, [location, authLoading, user, navigate, toast, refreshEmailVerified, requireLogin])

  // After signing in from the signed-out landing: the account is read again and
  // the answer is said, the same words the signed-in landing uses. It waits for
  // the account to be in (refreshEmailVerified belongs to the signed-in user),
  // and a null answer (the account changed mid-read) stays silent.
  const [finishAfterSignIn, setFinishAfterSignIn] = useState(false)
  useEffect(() => {
    if (!finishAfterSignIn || !user) return
    setFinishAfterSignIn(false)
    refreshEmailVerified().then((verified) => {
      const landing = verifiedLandingMessage({ signedIn: true, verified })
      if (landing) toast?.(landing.text, landing.kind, null)
    }).catch(() => {})
  }, [finishAfterSignIn, user, toast, refreshEmailVerified])

  // Recount whenever the Data panel is opened, and after a clear, so the figure
  // shown is the figure on disk.
  useEffect(() => {
    if (active !== 'data') return
    setLocalKeyCount(Object.keys(collectStorage(window.localStorage)).length)
  }, [active, confirmClear])

  // Enumerates storage rather than walking a hand-written list. The old version
  // iterated 15 named keys while the app writes about forty — measured on a
  // real browser, 9 of the 16 keys present were silently missing from a file
  // the user was told was their data. It also never read the server, so for a
  // signed-in user it omitted the profile and users/{uid}/sync/data, which is
  // where their projects and prompts actually live.
  const exportData = async () => {
    setExporting(true)
    setExportGap('')
    try {
      let firestore = null
      let account = null
      if (user?.uid) {
        account = {
          uid: user.uid,
          email: user.email || null,
          displayName: user.displayName || null,
          photoURL: user.photoURL || null,
          providers: (user.providerData || []).map((p) => p?.providerId).filter(Boolean),
          createdAt: user.metadata?.creationTime || null,
          lastSignInAt: user.metadata?.lastSignInTime || null,
        }
        // Both server documents. A read failure is RECORDED in the file rather
        // than silently dropped — an export missing a section without saying so
        // is worse than one that admits the gap.
        // Every document the account holds: the profile, the settings and
        // saved items (sync/data), custom icons (sync/library) and projects
        // (sync/projects). The export read only the first two, so a person's
        // projects were missing from the file that said it was their data.
        const read = (snap) => (snap.status === 'fulfilled'
          ? (snap.value.exists() ? snap.value.data() : null)
          : { error: 'Could not be read — please try again or contact support.' })
        const [profileSnap, syncSnap, librarySnap, projectsSnap] = await Promise.allSettled([
          getDoc(doc(db, 'users', user.uid)),
          getDoc(doc(db, 'users', user.uid, 'sync', 'data')),
          getDoc(doc(db, 'users', user.uid, 'sync', 'library')),
          getDoc(doc(db, 'users', user.uid, 'sync', 'projects')),
        ])
        firestore = {
          profile: read(profileSnap),
          sync: read(syncSnap),
          library: read(librarySnap),
          projects: read(projectsSnap),
        }
      }

      const payload = buildExport({
        local: collectStorage(window.localStorage),
        session: collectStorage(window.sessionStorage),
        firestore,
        account,
      })
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `uil4b-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      // A document that could not be read is recorded in the file as { error },
      // so the file is not the whole account. Say which parts are missing
      // rather than announcing a complete export.
      const missing = [['projects', 'projects'], ['library', 'library'], ['sync', 'settings'], ['profile', 'profile']]
        .filter(([key]) => firestore?.[key]?.error)
        .map(([, name]) => name)
      if (missing.length) {
        const list = missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}` : missing[0]
        const gap = `Exported, but your ${list} could not be read, so ${missing.length > 1 ? 'they’re' : 'it’s'} not in the file. Try again.`
        setExportGap(gap)
        toast(gap)
      } else {
        toast(t('settings.dataExported') || 'Data exported')
      }
    } catch {
      toast('Could not build your export. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const deleteAllData = async () => {
    // Send anything pending first: once this browser's copy is gone it cannot
    // be sent, and the account copy is what "untouched" promises to keep.
    if (user) await flushAccountSync()
    clearCommunitySubmissions()
    // Enumerated, so a key added tomorrow is cleared too. keysToClear keeps
    // back only the ones whose removal would sign you out or drop an
    // entitlement — clearing preferences should not log you out.
    keysToClear(window.localStorage)
      .filter((key) => key !== COMMUNITY_SUBMISSIONS_KEY)
      .forEach((key) => localStorage.removeItem(key))
    setConfirmClear(false)
    // Signed in, the account's copy comes straight back — this cleared the
    // browser, not the account. The sync bookkeeping went with the other keys,
    // so the next read is a fresh first sign-in and nothing here is pushed up
    // as a deletion.
    if (user) requestAccountReset()
    toast(t('settings.dataCleared') || 'Local data cleared')
  }

  // The ids are stable (links and the remembered section use them); the labels
  // are what the person reads. The order follows how often each is used.
  const sections = [
    ...(user ? [{ id: 'account', label: t('settings.account') || 'Account' }] : []),
    { id: 'support', label: 'Plan and billing' },
    { id: 'accessibility', label: t('settings.appearance') || 'Appearance' },
    { id: 'language', label: t('settings.language') || 'Language' },
    { id: 'data', label: t('settings.dataManagement') || 'Your data' },
    { id: 'privacy', label: t('settings.privacyLegal') || 'Privacy' },
  ]

  // Roving tabindex: Arrow/Home/End move the active tab, matching the ARIA
  // authoring pattern for a vertical tablist.
  const selectTab = (index) => {
    const next = sections[(index + sections.length) % sections.length]
    pickSection(next.id)
    tabRefs.current[(index + sections.length) % sections.length]?.focus()
  }
  const onTabKeyDown = (event, index) => {
    const keys = { ArrowDown: index + 1, ArrowRight: index + 1, ArrowUp: index - 1, ArrowLeft: index - 1, Home: 0, End: sections.length - 1 }
    if (!(event.key in keys)) return
    event.preventDefault()
    selectTab(keys[event.key])
  }

  // Focus follows the view on a phone. Opening a section hides the list, so
  // focus would fall to the page; it goes to the section's heading instead
  // (which names the new view), and on the way back to the row that was opened.
  // Only a change of view moves it: first render (a deep link, a reload) and a
  // resize across the 720 line leave focus alone. A deep link changes the view
  // one render before `chosen` catches up to it, and the section that was
  // showing before is the one on screen until then, so the move waits for it.
  const shownView = useRef(phoneView)
  const focusOwed = useRef('')
  const sectionInState = location.state?.section
  useEffect(() => {
    if (shownView.current !== phoneView) {
      shownView.current = phoneView
      focusOwed.current = isPhone ? phoneView : ''
    }
    if (!focusOwed.current) return
    if (focusOwed.current === 'section') {
      if (sectionInState && sectionInState !== chosen) return
      document.querySelector(`#set-${active} h2`)?.focus({ preventScroll: true })
    } else {
      document.getElementById(`settab-${active}`)?.focus()
    }
    focusOwed.current = ''
  }, [phoneView, isPhone, chosen, active, sectionInState])

  // How this account signs in, as one read-only fact.
  const signInMethod = !user ? ''
    : isGoogleOnlyAccount() ? 'Google'
      : (user.providerData || []).some((p) => p?.providerId === 'google.com') ? 'Google and email'
        : 'Email and password'

  // Pro, as labelled facts: one fact a line. Admin and one-off access have no
  // subscription to describe, so they keep a single note instead.
  const noBillingNote = isAdmin && !subscription && !lifetimeEntitlement ? 'Admin account — Pro included, no billing'
    : lifetimeEntitlement?.active && !subscription ? 'One-off Pro access — no subscription or renewal'
      : ''
  const longDate = (ms) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
  const trialing = subscription?.status === 'trialing' && Number.isFinite(subscription?.trialEndsAt)
  const cancelling = !!subscription?.cancelAtPeriodEnd
  const endsOn = cancelling && subscription?.currentPeriodEnd ? longDate(subscription.currentPeriodEnd) : ''
  // The cadence comes from the plan-facts module. A `month` subscription whose
  // count is not stored could be monthly OR quarterly, so the row is left out
  // and nothing is guessed.
  const cadenceLabel = CADENCE_LABEL[subscriptionCadence(subscription)]
  const proFacts = [
    ['Status', cancelling ? (endsOn ? `Ends on ${endsOn}` : 'Ends at the end of this billing period')
      : trialing ? `Free trial until ${longDate(subscription.trialEndsAt)}`
        : 'Active'],
    cadenceLabel && ['Billing cycle', cadenceLabel.replace(/^Billed /, '').replace(/^./, (c) => c.toUpperCase())],
    !cancelling && !trialing && subscription?.currentPeriodEnd && ['Next payment', longDate(subscription.currentPeriodEnd)],
  ].filter(Boolean)

  // The two plan blocks, held apart so a narrow screen can put Pro first.
  const tierFree = (
    <div className="sub-tier sub-tier-free">
      <div className="sub-tier-head">
        <div className="sub-tier-name">Free</div>
        <div className="sub-tier-price"><span className="sub-tier-amount">$0</span><span className="sub-tier-per">forever</span></div>
      </div>
      <ul className="sub-tier-list">
        {FREE_POINTS.map((point) => <li key={point}><Check /> {point}</li>)}
        <li className="sub-tier-minus"><Minus /> {FREE_EXCLUSION}</li>
      </ul>
      <p className="sub-tier-current">Your current plan</p>
    </div>
  )
  const tierPro = (
    <div className="sub-tier sub-tier-pro">
      <div className="sub-tier-head">
        <div className="sub-tier-name">Pro</div>
        <div className="sub-tier-price">
          <span className={`sub-tier-amount${priceStatus === 'live' || priceStatus === 'loading' || priceStatus === 'retrying' ? '' : ' is-word'}`}>
            {canCheckout(priceStatus) ? offer.amountLabel : priceCopy.word}
          </span>
          {canCheckout(priceStatus) && <span className="sub-tier-per">per month</span>}
        </div>
        <div className="sub-tier-sub">
          {canCheckout(priceStatus) ? offer.billedNote : [priceCopy.line1, priceCopy.line2].filter(Boolean).join(' ')}
        </div>
      </div>
      <ul className="sub-tier-list">
        {PRO_POINTS.map((point) => <li key={point}><Check /> {point}</li>)}
      </ul>
      {/* One slot, one button. Only a live price links to checkout. */}
      {priceStatus === 'live' && !subLoading ? (
        // Every upgrade starts at /plans, which reads ?billing= for the period
        // picked here and carries on to checkout from there.
        <Link className="btn btn-accent sub-tier-btn" to={`/plans?billing=${encodeURIComponent(offer.id)}`}>Upgrade to Pro</Link>
      ) : priceStatus === 'cadence-missing' ? (
        <button type="button" className="btn btn-accent sub-tier-btn" onClick={() => setBilling(otherOffer.id)}>{priceCopy.button}</button>
      ) : (
        <button
          type="button"
          className="btn btn-accent sub-tier-btn"
          aria-disabled={priceStatus === 'live' || priceStatus === 'loading' || priceStatus === 'retrying' ? 'true' : undefined}
          aria-busy={priceStatus === 'retrying' ? 'true' : undefined}
          onClick={() => { if (priceStatus === 'unreachable' || priceStatus === 'no-currency') retry() }}
        >
          {priceCopy.button || 'Upgrade to Pro'}
        </button>
      )}
    </div>
  )

  return (
    <div className="sec stg" data-phone-view={isPhone ? phoneView : undefined}>
      {/* THE APP'S PAGE HEAD, NOT A DISPLAY TITLE. The design's App file has no big page
          title: a surface is named by a 15px / 560 label in its bar, and this page follows the same pattern. The 40px "Make it
          yours." and its lede went with it. On a phone, inside a section, the
          bar carries the way back to the list. */}
      <div className="stg-bar">
        {isPhone && phoneView === 'section' && (
          <button type="button" className="stg-back" onClick={closeSection}>
            <Chevron back />
            <span>All settings</span>
          </button>
        )}
        <h1 className="stg-title">Settings</h1>
      </div>

      <div className="settings-grid">
        {/* A real tablist, not a scroll-jump list. Every section used to render
            at once and the nav scrolled you to one — so "Settings" was a single
            long page where changing your language meant scrolling past billing,
            and the highlighted nav item could disagree with what was on screen.
            Now one panel shows at a time and the nav says which.

            Arrow keys move between tabs and only the active one is tabbable,
            which is the ARIA pattern a tablist owes a keyboard user. */}
        {/* On a phone the tabs become a list of rows that each open their
            section — a list, not a tab row, so there is nothing to wrap. */}
        <nav
          className="settings-nav"
          role={isPhone ? undefined : 'tablist'}
          aria-label="Settings sections"
          aria-orientation={isPhone ? undefined : 'vertical'}
          hidden={isPhone && phoneView === 'section'}
        >
          {sections.map((s, i) => (
            <button
              key={s.id}
              id={`settab-${s.id}`}
              role={isPhone ? undefined : 'tab'}
              aria-selected={isPhone ? undefined : active === s.id}
              aria-controls={isPhone ? undefined : `set-${s.id}`}
              tabIndex={isPhone || active === s.id ? 0 : -1}
              ref={(node) => { tabRefs.current[i] = node }}
              className={`settings-nav-item${active === s.id ? ' active' : ''}`}
              onClick={() => pickSection(s.id)}
              onKeyDown={isPhone ? undefined : (event) => onTabKeyDown(event, i)}
            >
              <NavIcon id={s.id} />
              <span>{s.label}</span>
              {isPhone && <Chevron />}
            </button>
          ))}
        </nav>

        <div className="settings-content" hidden={isPhone && phoneView === 'list'}>

          {/* Plan and billing */}
          <section id="set-support" className="settings-section" role="tabpanel" aria-labelledby="settab-support" hidden={active !== 'support'}>
            <div className="settings-section-h">
              <h2 tabIndex={-1}>Plan and billing</h2>
              <p>{planPending ? 'Your plan and billing.' : isPro ? 'You’re on UIL4B Pro. Thanks for supporting the project.' : 'Free covers the essentials. Upgrade to Pro when you need more AI.'}</p>
            </div>

            {planPending ? (
              // Neither plan is shown until the account and its subscription
              // have both answered: before that, isPro is false for everyone,
              // so a Pro subscriber would see Free marked as their plan. One row
              // at the Pro Plan row's height, so nothing jumps when it resolves.
              <div className="settings-card sub-active sub-checking" aria-busy="true">
                <div className="settings-card-body">
                  <div className="settings-row settings-row--fact">
                    <div className="settings-row-label">Plan</div>
                    <div className="settings-row-value" role="status">Checking your plan…</div>
                  </div>
                </div>
              </div>
            ) : isPro ? (
              <div className="settings-card sub-active">
                <div className="settings-card-body">
                  <div className="settings-row settings-row--fact">
                    <div className="settings-row-label">Plan</div>
                    <div className="settings-fact-body">
                      <div className="settings-row-value sub-active-title">UIL4B Pro</div>
                      {noBillingNote && <div className="settings-row-meta sub-active-meta">{noBillingNote}</div>}
                    </div>
                  </div>
                  {!noBillingNote && proFacts.map(([label, value]) => (
                    <div className="settings-row settings-row--fact" key={label}>
                      <div className="settings-row-label">{label}</div>
                      <div className="settings-row-value">{value}</div>
                    </div>
                  ))}
                  {!noBillingNote && endsOn && (
                    <p className="settings-row-meta sub-ends-note">Your plan ends on {endsOn}. Open billing to keep Pro.</p>
                  )}
                  {/* Admins without a real Stripe subscription have no billing
                      portal to open — no buttons rather than a 500. */}
                  {!!subscription && (
                    <div className="settings-row sub-active-actions">
                      <div className="settings-row-main">
                        <div className="settings-row-label">Billing</div>
                      </div>
                      <div className="sub-active-btns">
                        <button className="btn btn-s" onClick={() => openBilling()} disabled={!!portalBusy} aria-busy={portalBusy === 'manage'}>
                          {portalBusy === 'manage' ? 'Opening…' : 'Manage billing'}
                        </button>
                        {!subscription?.cancelAtPeriodEnd && (
                          <button className="btn btn-s sub-active-cancel" onClick={() => openBilling('cancel')} disabled={!!portalBusy} aria-busy={portalBusy === 'cancel'}>
                            {portalBusy === 'cancel' ? 'Opening…' : 'Cancel plan'}
                          </button>
                        )}
                      </div>
                      {portalError && <div className="settings-field-err sub-portal-err" role="alert">{portalError}</div>}
                    </div>
                  )}
                  <div className="settings-row settings-row--open">
                    <div className="settings-row-label">Included</div>
                    <ul className="sub-tier-list">
                      {PRO_POINTS.map((point) => <li key={point}><Check /> {point}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ) : !user ? (
              // Signed out, this page used to render the ENTIRE pricing
              // comparison — both tiers, a billing toggle and a "Start 7-day
              // free trial" button — under a small "Sign in to upgrade" note.
              // Plans owns pricing; this owns your account.
              <div className="sub-signin-note">
                <p><NavLink to="/login">Sign in</NavLink> to see your plan and billing.</p>
                <p>Comparing plans first? <NavLink to="/plans">See Free and Pro</NavLink>.</p>
              </div>
            ) : (
              // ONE SURFACE: the cadence row, then Free and Pro side by side
              // with a hairline between them — not two cards inside a section
              //. Every line is /plans' line (planFacts.js).
              <div className="settings-card sub-plans">
                <div className="sub-billing-toggle" role="tablist" aria-label="Billing interval">
                  {offers.map((o, i) => (
                    <button
                      key={o.id}
                      ref={(el) => { billingTabs.current[i] = el }}
                      type="button"
                      role="tab"
                      aria-selected={billing === o.id}
                      tabIndex={billing === o.id ? 0 : -1}
                      className={billing === o.id ? 'active' : ''}
                      onClick={() => setBilling(o.id)}
                      onKeyDown={(event) => onBillingKey(event, i)}
                    >
                      <span className="sub-tab-label">{o.label}</span>
                      {o.saving > 0 && <span className="sub-save"> · Save {o.saving}%</span>}
                    </button>
                  ))}
                </div>

                {/* Where the tiers stack (640 and below) Pro comes first: the
                    cadence toggle then sits over the price it changes, and
                    "Upgrade to Pro" is on the first screen instead of two down.
                    DOM order, not CSS order, so keyboard and screen-reader
                    order follow what is on screen. */}
                <div className="sub-tiers">
                  {tiersStacked ? <>{tierPro}{tierFree}</> : <>{tierFree}{tierPro}</>}
                </div>
              </div>
            )}
          </section>

          {/* Accessibility */}
          <section id="set-accessibility" className="settings-section" role="tabpanel" aria-labelledby="settab-accessibility" hidden={active !== 'accessibility'}>
            <div className="settings-section-h">
              <h2 tabIndex={-1}>Appearance</h2>
              <p>Theme and motion. Both are also in the menu at the top of every page.</p>
            </div>
            <div className="settings-card">
              <div className="settings-card-body">
                {/* Theme sits beside reduced motion because it resolves the same
                    way: an explicit Light or Dark beats the device, and System
                    hands the decision back to it — the same contract, so the two
                    rows are honestly neighbours rather than merely adjacent.
                    This blurb used to send people to "the top-nav settings menu"
                    for a control that was display:none on a phone. */}
                <div className="toggle-row">
                  <div className="toggle-row-info">
                    <div className="toggle-row-label">Theme</div>
                    <div className="toggle-row-meta">Light, dark, or follow your device</div>
                  </div>
                  <ThemeChoice />
                </div>
                {/* A switch, not a pressed button: it announces "on" / "off", and
                    the words beside it are its label, so a tap on them flips it
                    (the way a phone settings row with a switch behaves). */}
                <div className="toggle-row">
                  <label className="toggle-row-info" htmlFor="set-reduced-motion">
                    <span className="toggle-row-label" id="set-rm-label">Reduced motion</span>
                    <span className="toggle-row-meta" id="set-rm-meta">Minimise animations and transitions</span>
                  </label>
                  <button
                    id="set-reduced-motion"
                    type="button"
                    role="switch"
                    aria-checked={reducedMotion}
                    aria-labelledby="set-rm-label"
                    aria-describedby="set-rm-meta"
                    className={`toggle-switch${reducedMotion ? ' on' : ''}`}
                    onClick={() => setReducedMotion(!reducedMotion)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Language */}
          <section id="set-language" className="settings-section" role="tabpanel" aria-labelledby="settab-language" hidden={active !== 'language'}>
            <div className="settings-section-h">
              <h2 tabIndex={-1}>Language</h2>
              <p>UIL4B is in English for now. Choosing a language here changes only a few labels; menus, tools and pages stay in English.</p>
            </div>
            <div className="settings-card">
              <div className="settings-card-body settings-card-body--grid">
                <div className="lang-grid">
                  {languages.map(l => (
                    <button
                      key={l.code}
                      className={`lang-tile${lang === l.code ? ' active' : ''}`}
                      aria-pressed={lang === l.code}
                      onClick={() => { setLang(l.code); toast(`Language: ${l.native}`) }}
                    >
                      <span className="lang-flag">
                        <img src={`https://flagcdn.com/w40/${l.region.toLowerCase()}.png`} alt="" width="28" height="21" onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }} />
                      </span>
                      <div className="lang-tile-info">
                        <span className="lang-tile-label">{l.native}</span>
                        {/* "English (AU)" over "English (AU)": where the tiles are
                            rows (640 and below, with `tiersStacked`) the repeat
                            is dropped. The wider tiles keep both lines. */}
                        {(!tiersStacked || l.native !== l.label) && <span className="lang-tile-code">{l.label}</span>}
                      </div>
                      {lang === l.code && (
                        <svg className="lang-tile-check" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Account */}
          {user && (
            <section id="set-account" className="settings-section" role="tabpanel" aria-labelledby="settab-account" hidden={active !== 'account'}>
              <div className="settings-section-h">
                <h2 tabIndex={-1}>Account</h2>
                <p>Your profile, how you sign in, and deleting your account.</p>
              </div>
              {/* Three cards, one job each. The first is what other people see. */}
              <div className="settings-cards">
              <div className="settings-card" role="group" aria-labelledby="acct-h-profile">
                <div className="settings-card-h">
                  <div>
                    <h3 id="acct-h-profile">Public profile</h3>
                    <p>Shown with your name in Discover and the community.</p>
                  </div>
                </div>
                <div className="settings-profile">
                  <button
                    type="button"
                    className="settings-profile-avatar settings-avatar-btn"
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label="Change profile photo"
                    title="Change profile photo"
                    aria-busy={photoBusy ? 'true' : undefined}
                    disabled={photoBusy}
                    data-busy={photoBusy ? 'true' : undefined}
                  >
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{initialOf(userProfile?.displayName, user.email)}</span>
                    )}
                    <span className="settings-avatar-edit" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                    </span>
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" onChange={onAvatarFile} hidden />
                  <div className="settings-profile-info">
                    <div className="settings-profile-name">{userProfile?.displayName || 'Welcome'}</div>
                    <div className="settings-profile-email">{user.email}</div>
                    {hasCustomPhoto && (
                      <button type="button" className="settings-avatar-remove" onClick={removeAvatar} disabled={photoBusy}>Remove photo</button>
                    )}
                  </div>
                </div>
                <div className="settings-card-body">
                  {profileSyncError && (
                    <div className="settings-sync-alert" role="alert">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
                      </svg>
                      <span>{profileSyncError}</span>
                      <button type="button" onClick={dismissProfileSyncError}>Dismiss</button>
                    </div>
                  )}
                  <EditField label="Display name" value={userProfile?.displayName} onSave={saveDisplayName} placeholder="Enter your display name" maxLength={200} />
                  {/* Every profile field is AWAITED (saveProfile): a refused
                      write keeps the field open with the reason, and no toast
                      says "updated" for a save that did not happen. */}
                  <EditField label="Location" value={userProfile?.location} onSave={saveLocation} placeholder="e.g. Melbourne, Australia" options={LOCATIONS} maxLength={200} />
                  <EditField label="Company or studio" value={userProfile?.company} onSave={saveCompany} placeholder="e.g. Paper Lane Studio" maxLength={200} />
                  <EditField label="Website" value={userProfile?.website} type="url" inputMode="url" onSave={saveWebsite} placeholder="https://yoursite.com" maxLength={2048} />
                  <EditField label="Bio" value={userProfile?.bio} onSave={saveBio} placeholder="A short bio about yourself" maxLength={5000} multiline />
                  <FlairPicker value={userProfile?.flair} displayName={userProfile?.displayName} email={user.email} onSave={saveFlair} />
                </div>
              </div>

              <div className="settings-card" role="group" aria-labelledby="acct-h-signin">
                <div className="settings-card-h">
                  <div>
                    <h3 id="acct-h-signin">Sign-in and security</h3>
                    <p>How you sign in to UIL4B.</p>
                  </div>
                </div>
                <div className="settings-card-body">
                  <div className="settings-row">
                    <div className="settings-row-main">
                      <div className="settings-row-label">Signed in with</div>
                      <div className="settings-row-value">{signInMethod}</div>
                      {isGoogleOnlyAccount() && <div className="settings-row-meta">{user.email}</div>}
                    </div>
                  </div>
                  {/* AWAITED, so a failure stays in the field, in words, and the
                      toast means the confirmation link really went out. */}
                  <EmailEditField
                    value={user.email}
                    googleOnly={isGoogleOnlyAccount()}
                    onSave={async (email, pw) => { await updateEmail(email, pw); toast('Confirmation link sent') }}
                    verification={{ owed: emailVerificationOwed, onSend: sendVerificationEmail, onRefresh: refreshEmailVerified }}
                  />
                  <PasswordChange
                    onSave={(current, next) => updatePassword(current, next)}
                    googleOnly={isGoogleOnlyAccount()}
                    onReset={() => resetPassword(user.email)}
                  />
                  <div className="settings-row">
                    <div className="settings-row-main">
                      <div className="settings-row-label">Sign out</div>
                      <div className="settings-row-meta">Signs out of UIL4B in this browser.</div>
                    </div>
                    <button type="button" className="btn btn-s" onClick={() => signOut()} disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
                  </div>
                  {signOutIssue && (
                    <div className="settings-sync-alert" role="alert">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
                      </svg>
                      <span>
                        {signOutIssue === 'unsynced'
                          ? 'Some recent changes haven’t reached your account yet. If you sign out now, they stay on this device and are sent the next time you sign in here with this account. Signing in with a different account first discards them.'
                          : 'Signing out didn’t finish, so you’re still signed in. Check your connection and try again.'}
                      </span>
                      <span className="settings-sync-alert-actions">
                        <button type="button" onClick={() => signOut()} disabled={signingOut}>Try again</button>
                        {signOutIssue === 'unsynced' && (
                          <button type="button" onClick={() => signOut({ anyway: true })} disabled={signingOut}>Sign out anyway</button>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="settings-card" role="group" aria-labelledby="acct-h-delete">
                <div className="settings-card-h">
                  <div>
                    <h3 id="acct-h-delete">Delete account</h3>
                    <p>Permanently remove your account and everything in it.</p>
                  </div>
                </div>
                <div className="settings-card-body">
                  <div className="danger-zone">
                    <p>
                      Deletes your profile, projects and everything synced to your account{isPro ? ', and cancels Pro' : ''}.
                      {' '}This can&rsquo;t be undone.
                    </p>
                    <DeleteAccount
                      onDelete={(pw) => deleteAccount(pw)}
                      onExportFirst={() => pickSection('data')}
                      planPending={planPending}
                      googleOnly={isGoogleOnlyAccount()}
                      isPro={isPro}
                    />
                  </div>
                </div>
              </div>
              </div>
            </section>
          )}

          {/* Data */}
          <section id="set-data" className="settings-section" role="tabpanel" aria-labelledby="settab-data" hidden={active !== 'data'}>
            <div className="settings-section-h">
              <h2 tabIndex={-1}>Your data</h2>
              {/* This used to read "Everything UIL4B stores lives in your
                  browser", which is simply false for a signed-in account —
                  the profile and the synced design live in Firestore. */}
              <p>
                {user
                  ? 'Some of it lives in this browser, and some on our server so it follows you between devices. Either way it is yours.'
                  : 'Signed out, everything UIL4B keeps is in this browser, and only here.'}
              </p>
            </div>
            <div className="settings-card">
              <div className="settings-card-h">
                <div>
                  <h3>What we hold</h3>
                  <p>
                    {localKeyCount} item{localKeyCount === 1 ? '' : 's'} in this browser
                    {user ? ', plus your account’s copy on the server' : ''}
                  </p>
                </div>
                <NavLink to="/privacy" className="btn btn-s">Read the privacy policy</NavLink>
              </div>
              <div className="settings-card-body">
                <p className="settings-data-note">
                  We don&rsquo;t sell your data or use third-party trackers.
                </p>
                <div className="settings-row settings-row--pad">
                  <div className="settings-row-main">
                    <div className="settings-row-label">Export</div>
                    <div className="settings-row-meta">
                      {user && !online && 'You’re offline, so this file has this browser’s copy only. '}
                      A JSON copy of everything — every key in this browser
                      {user ? ', plus your account’s copy from the server' : ''}
                    </div>
                    {exportGap && <div className="settings-field-err settings-export-gap" role="status">{exportGap}</div>}
                  </div>
                  <button className="btn btn-accent btn-s" onClick={exportData} disabled={exporting}>
                    {exporting ? 'Preparing…' : 'Export JSON'}
                  </button>
                </div>
                <div className="settings-row">
                  <div className="settings-row-main">
                    <div className="settings-row-label">Clear local data</div>
                    <div className="settings-row-meta">
                      {user
                        ? 'Clears this browser’s copy. Your account keeps everything, and it comes back next time this page loads.'
                        : 'Deletes your saved projects, palettes and preferences from this browser. This browser holds the only copy, so export first if you want to keep them.'}
                    </div>
                    {confirmClear && (
                      <div className="settings-row-meta settings-clear-warn" role="status">
                        {user ? 'Your account copy is not affected.' : 'This deletes them for good.'}
                      </div>
                    )}
                  </div>
                  {confirmClear ? (
                    <div
                      className="settings-edit-actions settings-edit-actions--tight"
                      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setConfirmClear(false) } }}
                    >
                      <button type="button" className="btn btn-s settings-danger-go" onClick={deleteAllData}>Confirm clear</button>
                      <button type="button" ref={clearCancelRef} className="btn btn-s" onClick={() => setConfirmClear(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button type="button" ref={clearTriggerRef} className="btn btn-s settings-danger" onClick={() => { clearFocusOwed.current = true; setConfirmClear(true) }}>Clear data</button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section id="set-privacy" className="settings-section" role="tabpanel" aria-labelledby="settab-privacy" hidden={active !== 'privacy'}>
            <div className="settings-section-h">
              <h2 tabIndex={-1}>Privacy</h2>
              <p>What we keep, where it lives, and who else sees it.</p>
            </div>
            <div className="settings-card">
              <div className="settings-card-body">
                <ul className="settings-facts">
                  {[
                    // Vercel Web Analytics runs on every page and /privacy
                    // discloses it, so there is no "no analytics" line here.
                    // Where each AI request goes follows api/ai.js: images
                    // (alt text, photo scan) go to Gemini; text-only requests go
                    // to OpenRouter, restricted to hosts that do not keep or
                    // train on them, and fall back to Gemini.
                    'No ad networks and no third-party cookies.',
                    'Sign-in is handled by Firebase Authentication (Google).',
                    'Signed in, your settings and projects sync to your account so they follow you to other devices. Signed out, they stay in this browser only.',
                    <>Images you give our AI tools are sent to Google Gemini. Text-only AI requests go first to a model reached through OpenRouter, set to hosts that do not keep or train on them, and fall back to Gemini if that route is unavailable. <NavLink to={AI_TERMS_PATH}>Read the Terms</NavLink>.</>,
                    'You can export or delete your data yourself, any time, from Your data.',
                  ].map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
                <div className="settings-legal-links">
                  <NavLink to="/privacy" className="btn">Privacy policy</NavLink>
                  <NavLink to="/terms" className="btn">Terms of service</NavLink>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>

      <div className="stg-credit">
        UIL4B · <a href="https://dylan-coleman.com/" target="_blank" rel="noopener noreferrer">Dylan Coleman</a>
      </div>
    </div>
  )
}
