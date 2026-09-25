import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { processAvatarImage } from '../utils/imageProcessing'
import { useAppearance } from '../contexts/AppearanceContext'
import { useI18n } from '../contexts/I18nContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useProPrice, usePrices, refreshPrices } from '../hooks/usePrices'
import useMediaQuery from '../hooks/useMediaQuery'
import { flushAccountSync } from '../hooks/useFirestoreSync'
import { requestAccountReset } from '../utils/accountEvents'
// Settings → Subscription says exactly what /plans says: the same lines, the
// same cadences, the same per-month amounts and trial terms, from the one
// module /plans reads. See src/config/planFacts.js for why.
import {
  FREE_POINTS, FREE_EXCLUSION, PRO_POINTS, DEFAULT_BILLING, resolveOffers,
  subscriptionCadence, CADENCE_LABEL,
} from '../config/planFacts'
import { LOCATIONS } from '../data/locations'
import { FLAIRS, getFlair } from '../utils/constants'
import UserName from '../components/UserName'
import ThemeChoice from '../components/ThemeChoice'
import { clearCommunitySubmissions, COMMUNITY_SUBMISSIONS_KEY } from '../utils/communitySubmissions'
import { collectStorage, buildExport, keysToClear } from '../utils/dataExport'
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

function EditField({ label, value, onSave, type = 'text', placeholder, options }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const [error, setError] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [hi, setHi] = useState(-1)

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

  const handleSave = () => {
    try {
      onSave(val)
      setEditing(false)
      setError('')
    } catch (e) {
      setError(e.message || 'Failed to save')
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
    if (options) {
      const listOpen = suggestOpen && matches.length > 0
      onSuggestKey(e)
      if (e.defaultPrevented) return
      if (e.key === 'Escape' && listOpen) return
    }
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
    else if (e.key === 'Escape') { setEditing(false); setError('') }
  }

  if (!editing) {
    return (
      <div className="settings-row">
        <div className="settings-row-main">
          <div className="settings-row-label">{label}</div>
          <div className="settings-row-value">{value || <span className="settings-row-empty">—</span>}</div>
        </div>
        <button className="btn btn-s" onClick={() => { setVal(value || ''); setEditing(true) }}>Edit</button>
      </div>
    )
  }

  return (
    <div className="settings-row settings-row--open">
      <div className="settings-row-label">{label}</div>
      <div className="settings-edit-line">
        <div className="settings-suggest-wrap">
          <input
            type={type}
            value={val}
            onChange={e => { setVal(e.target.value); setSuggestOpen(true); setHi(-1) }}
            onKeyDown={onFieldKey}
            onBlur={options ? () => { setSuggestOpen(false); setHi(-1) } : undefined}
            placeholder={placeholder}
            autoFocus
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
        <button className="btn btn-accent btn-s" onClick={handleSave}>Save</button>
        <button className="btn btn-s" onClick={() => { setEditing(false); setError('') }}>Cancel</button>
      </div>
      {error && <div className="settings-field-err" role="alert">{error}</div>}
    </div>
  )
}

// Picks the single flair shown next to the user's name. Only role + community
// flairs are selectable here; `earned` badges are awarded by the system and
// surfaced read-only so people know they exist.
function FlairPicker({ value, displayName, email, onSave }) {
  const [open, setOpen] = useState(false)
  const current = getFlair(value)
  const roles = FLAIRS.filter((f) => f.group === 'role')
  const community = FLAIRS.filter((f) => f.group === 'community')
  const earned = FLAIRS.filter((f) => f.group === 'earned')

  const choose = (id) => onSave(id === value ? '' : id)

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
          {current ? 'Change' : 'Add'}
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
        <button className="btn btn-accent btn-s" onClick={() => setOpen(false)}>Done</button>
        {value && (
          <button className="btn btn-s" onClick={() => onSave('')}>Clear flair</button>
        )}
      </div>
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

  const handleSave = async () => {
    setError('')
    if (next.length < 6) { setError('New password must be at least 6 characters'); return }
    if (next !== confirm) { setError('Passwords do not match'); return }
    try {
      await onSave(current, next)
      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => { setSuccess(false); setOpen(false) }, 1500)
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') setError('Current password is incorrect')
      else if (e.code === 'auth/weak-password') setError('Choose a longer password')
      else if (e.code === 'auth/too-many-requests') setError('Too many attempts. Wait a few minutes and try again.')
      else setError('Your password could not be changed. Nothing was changed. Please try again.')
    }
  }

  // Forgot the current one: Firebase emails a reset link. Said either way, so
  // nobody is left waiting for an email that was never sent.
  const sendReset = async () => {
    setResetState('sending')
    try { await onReset(); setResetState('sent') } catch { setResetState('failed') }
  }

  if (googleOnly) {
    return (
      <div className="settings-row">
        <div className="settings-row-main">
          <div className="settings-row-label">Password</div>
          <div className="settings-row-value">Signed in with Google</div>
        </div>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="settings-row">
        <div className="settings-row-main">
          <div className="settings-row-label">Password</div>
          <div className="settings-row-value">••••••••</div>
        </div>
        <button className="btn btn-s" onClick={() => setOpen(true)}>Change</button>
      </div>
    )
  }

  return (
    <div className="settings-row settings-row--open">
      <div className="settings-row-label">Change password</div>
      <div className="settings-edit-stack">
        <input type="password" placeholder="Current password" aria-label="Current password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} autoFocus />
        <input type="password" placeholder="New password (min. 6 characters)" aria-label="New password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} />
        <input type="password" placeholder="Confirm new password" aria-label="Confirm new password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
      </div>
      <div className="settings-edit-actions">
        <button className="btn btn-accent btn-s" onClick={handleSave}>Update password</button>
        <button className="btn btn-s" onClick={() => { setOpen(false); setError('') }}>Cancel</button>
      </div>
      {error && <div className="settings-field-err" role="alert">{error}</div>}
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

// Firebase's refusals, in words. updateEmail() is awaited, so "Email updated"
// only shows when it is true and every failure lands here.
const EMAIL_ERRORS = {
  'auth/wrong-password': 'That password is incorrect.',
  'auth/invalid-credential': 'That password is incorrect.',
  'auth/invalid-email': 'That is not a valid email address.',
  'auth/email-already-in-use': 'Another account already uses that email.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/requires-recent-login': 'For your security, sign out, sign back in, then try again.',
  // Projects with email-enumeration protection refuse a direct email change;
  // it has to go through a verification link, which this form does not send.
  'auth/operation-not-allowed': 'Your email could not be changed here yet. Nothing was changed.',
  'auth/network-request-failed': 'You appear to be offline. Nothing was changed.',
}
function emailErrorText(e) {
  return EMAIL_ERRORS[e?.code] || 'Your email could not be changed. Nothing was changed. Please try again.'
}

function EmailEditField({ value, onSave, googleOnly }) {
  const [editing, setEditing] = useState(false)
  const [email, setEmail] = useState(value || '')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState('email')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleNext = () => {
    if (!email || email === value) { setError('Enter a new email address'); return }
    setStep('confirm')
    setError('')
  }

  const handleSave = async () => {
    if (!password) { setError('Password is required'); return }
    setBusy(true)
    try {
      await onSave(email, password)
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
          <div className="settings-row-value">{value || '—'}</div>
          <div className="settings-row-meta">Signed in with Google</div>
        </div>
      </div>
    )
  }

  if (!editing) {
    return (
      <div className="settings-row">
        <div className="settings-row-main">
          <div className="settings-row-label">Email address</div>
          <div className="settings-row-value">{value || '—'}</div>
        </div>
        <button className="btn btn-s" onClick={() => { setEmail(value || ''); setEditing(true); setStep('email') }}>Edit</button>
      </div>
    )
  }

  return (
    <div className="settings-row settings-row--open">
      <div className="settings-row-label">
        {step === 'email' ? 'Email address' : 'Confirm password'}
      </div>
      {step === 'email' ? (
        <div className="settings-edit-line">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter new email" aria-label="New email address" autoFocus />
          <button className="btn btn-accent btn-s" onClick={handleNext}>Next</button>
          <button className="btn btn-s" onClick={() => { setEditing(false); setError('') }}>Cancel</button>
        </div>
      ) : (
        <div className="settings-edit-line">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password to confirm" aria-label="Your password" autoComplete="current-password" autoFocus />
          <button className="btn btn-accent btn-s" onClick={handleSave} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          <button className="btn btn-s" onClick={() => { setStep('email'); setPassword(''); setError('') }}>Back</button>
        </div>
      )}
      {error && <div className="settings-field-err" role="alert">{error}</div>}
    </div>
  )
}

// Firebase's raw codes reach users as strings like
// "Firebase: Error (auth/requires-recent-login)." Only auth/wrong-password was
// ever mapped, so every other failure — including the one Google accounts hit
// on every single attempt — surfaced as that.
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
}

function deleteErrorText(e) {
  const mapped = DELETE_ERRORS[e?.code]
  if (mapped) return mapped
  // The server's own messages are already written for a user to read, and carry
  // a correlation id support can trace.
  if (e?.message) return e.message
  return 'We could not delete your account. Please try again.'
}

function DeleteAccount({ onDelete, googleOnly, isPro }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
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
  // above the field says what it is waiting for.
  const needsPassword = !googleOnly && !password

  const handleDelete = async () => {
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
      <button ref={openBtnRef} className="btn danger-zone-open" onClick={() => setOpen(true)}>
        Delete account
      </button>
    )
  }

  return (
    <div className="danger-confirm" ref={panelRef} tabIndex={-1}>
      <ul className="danger-confirm-list">
        {isPro && <li>Your subscription is cancelled immediately — you will not be billed again.</li>}
        <li>Your profile, saved projects, icons and synced designs are deleted.</li>
        <li>Prompts you submitted to the community, and any media with them, are removed.</li>
        <li>This cannot be undone, and the same email can sign up again as a new account.</li>
      </ul>

      {googleOnly ? (
        // A Google-only account HAS no password. The old dialog asked for one
        // unconditionally, which was unanswerable — and then deletion threw
        // requires-recent-login anyway.
        <p className="danger-confirm-note">
          You&rsquo;ll be asked to confirm with Google before anything is deleted.
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
          />
        </>
      )}

      <div className="danger-confirm-actions">
        <button className="btn danger-confirm-go" onClick={handleDelete} disabled={busy || needsPassword}>
          {busy ? 'Deleting…' : 'Permanently delete'}
        </button>
        <button className="btn btn-s" onClick={() => { returnFocus.current = true; setOpen(false); setError(''); setPassword('') }} disabled={busy}>
          Cancel
        </button>
      </div>
      {error && <div className="danger-confirm-err" role="alert">{error}</div>}
    </div>
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
  const { user, userProfile, logout, updateProfile, updateEmail, updatePassword, resetPassword, deleteAccount, isGoogleOnlyAccount, profileSyncError, dismissProfileSyncError } = useAuth()
  const { reducedMotion, setReducedMotion } = useAppearance()
  const { isPro, isAdmin, subscription, lifetimeEntitlement, openPortal, loading: subLoading } = useSubscription()
  const { t, lang, setLang, languages } = useI18n()
  // 'support' — the SECTION ID, not the label. This said 'subscription', which
  // matched no section: harmless while every panel rendered at once and `active`
  // only drove the nav highlight, so the page opened with nothing highlighted
  // and nobody noticed. Turning the sections into panels turned it into a blank
  // page. The id stays 'support' because Plans.jsx deep-links to it via
  // `state={{ section: 'support' }}`.
  const [chosen, setActive] = useState(() => rememberedSection() || 'account')
  // 'account' is the one section that only exists signed in. Signed out — and
  // for the instant before auth resolves — it falls back to the first section
  // rather than to a blank page, which is what an id matching no panel gives.
  const active = chosen === 'account' && !user ? 'support' : chosen
  const location = useLocation()
  // MOBILE FIRST, and a tab row never wraps. On a
  // phone the sections are a list you open one at a time, with a way back —
  // the shape of every phone settings screen (Blue Apron, Givingli, Lifesum on
  // Mobbin) — instead of six tabs wrapped into a grid above the content.
  const isPhone = useMediaQuery('(max-width: 720px)')
  const [phoneView, setPhoneView] = useState(() => (location.state?.section ? 'section' : 'list'))
  const pickSection = (id) => { setActive(id); rememberSection(id); setPhoneView('section') }
  const [confirmClear, setConfirmClear] = useState(false)
  const [exporting, setExporting] = useState(false)
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
  const [signingOut, setSigningOut] = useState(false)
  const signOut = async () => {
    setSigningOut(true)
    await flushAccountSync()
    try { await logout() } catch {
      setSigningOut(false)
      toast?.('Sign-out did not complete. Please try again.')
    }
  }

  // Custom profile photo: any user can override their avatar. The picked file
  // is centre-cropped + downscaled client-side to a few-KB data URL and saved
  // through the existing updateProfile path (Firestore doc, cached, synced).
  const avatarInputRef = useRef(null)
  const tabRefs = useRef([])
  const providerPhoto = user?.providerData?.[0]?.photoURL || ''
  const hasCustomPhoto = !!userProfile?.photoURL && userProfile.photoURL !== providerPhoto
  const onAvatarFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be re-picked later
    if (!file) return
    try {
      const dataUrl = await processAvatarImage(file)
      updateProfile({ photoURL: dataUrl })
      toast('Profile photo updated')
    } catch (err) {
      toast(err?.message || 'Could not use that image')
    }
  }
  // "Remove" restores the sign-in provider's photo (Google etc.), or the
  // initial-letter avatar for email accounts.
  const removeAvatar = () => {
    updateProfile({ photoURL: providerPhoto })
    toast(providerPhoto ? 'Photo reset to your account image' : 'Profile photo removed')
  }

  // Open on a section when navigated from the profile quick-menu. It no longer
  // scrolls: sections are panels now, so selecting one IS showing it, and a
  // smooth-scroll to an element that was already at the top of the content
  // column just moved the page for no reason.
  useEffect(() => {
    const section = location.state?.section
    if (section) { setActive(section); setPhoneView('section') }
  }, [location.state])

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
      toast(t('settings.dataExported') || 'Data exported')
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

  const sections = [
    { id: 'support', label: 'Subscription' },
    { id: 'accessibility', label: t('settings.accessibility') || 'Accessibility' },
    { id: 'language', label: t('settings.language') || 'Language' },
    ...(user ? [{ id: 'account', label: t('settings.account') || 'Account' }] : []),
    { id: 'data', label: t('settings.dataManagement') || 'Data' },
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

  return (
    <div className="sec stg" data-phone-view={isPhone ? phoneView : undefined}>
      {/* THE APP'S PAGE HEAD, NOT A DISPLAY TITLE. The design's App file has no big page
          title: a surface is named by a 15px / 560 label in its bar, and this page follows the same pattern. The 40px "Make it
          yours." and its lede went with it. On a phone, inside a section, the
          bar carries the way back to the list. */}
      <div className="stg-bar">
        {isPhone && phoneView === 'section' && (
          <button type="button" className="stg-back" onClick={() => setPhoneView('list')}>
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

          {/* Subscription */}
          <section id="set-support" className="settings-section" role="tabpanel" aria-labelledby="settab-support" hidden={active !== 'support'}>
            <div className="settings-section-h">
              <h2>Subscription</h2>
              <p>{isPro ? 'You\'re on UIL4B Pro — thank you for supporting the project.' : 'Free covers the essentials. Upgrade to Pro when you need more AI.'}</p>
            </div>

            {isPro ? (
              <div className="settings-card sub-active">
                <div className="settings-card-body">
                  <div className="settings-row">
                    <div className="settings-row-main">
                      <div className="settings-row-label">Plan</div>
                      <div className="settings-row-value sub-active-title">UIL4B Pro</div>
                      <div className="settings-row-meta sub-active-meta">
                        {isAdmin && !subscription && !lifetimeEntitlement ? 'Admin account — Pro included, no billing'
                          : lifetimeEntitlement?.active && !subscription ? 'One-off Pro access — no subscription or renewal'
                            : (
                          <>
                            {/* The cadence comes from the plan-facts module. A
                                `month` subscription whose count is not stored
                                could be monthly OR quarterly, so it says when it
                                renews and not how often — "Billed monthly" on a
                                quarterly plan was the wrong fact this fixes. */}
                            {[
                              subscription?.status === 'trialing' && Number.isFinite(subscription?.trialEndsAt)
                                ? `Free trial until ${new Date(subscription.trialEndsAt).toLocaleDateString()}` : null,
                              CADENCE_LABEL[subscriptionCadence(subscription)] || null,
                              subscription?.currentPeriodEnd
                                ? `${subscription.cancelAtPeriodEnd ? 'Access until' : 'Renews'} ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                                : null,
                              subscription?.cancelAtPeriodEnd ? 'Cancels at period end' : null,
                            ].filter(Boolean).join(' · ')}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
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
                <p>Settings are for your account — <NavLink to="/login">sign in</NavLink> to manage a subscription.</p>
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
                      {o.savingLabel && <span className="sub-save">{o.savingLabel}</span>}
                    </button>
                  ))}
                </div>

                <div className="sub-tiers">
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

                  <div className="sub-tier sub-tier-pro">
                    <span className="sub-tier-flag">{offer?.savingLabel ? offer.savingLabel.toUpperCase() : 'RECOMMENDED'}</span>
                    <div className="sub-tier-head">
                      <div className="sub-tier-name">Pro</div>
                      <div className="sub-tier-price">
                        {/* `loaded` means the fetch SETTLED, not that a price is
                            known — so every state is checked, and a missing
                            amount says so rather than printing a blank. */}
                        <span className={`sub-tier-amount${proPrice.loaded && !offer?.amountLabel ? ' is-word' : ''}`}>
                          {!proPrice.loaded ? '—' : offer?.amountLabel || 'Unavailable'}
                        </span>
                        {offer?.amountLabel && <span className="sub-tier-per">per month</span>}
                      </div>
                      <div className="sub-tier-sub">
                        {!proPrice.loaded ? 'Checking live price…'
                          : !proPrice.serviceAvailable ? 'Live pricing is unreachable · no price can be shown right now'
                            : !offer?.amountLabel ? `No ${proPrice.currencyLabel} price for this billing period right now`
                              : offer.billedNote}
                      </div>
                      {proPrice.loaded && !proPrice.serviceAvailable && (
                        <button type="button" className="btn btn-s sub-price-retry" onClick={() => refreshPrices()}>Retry live pricing</button>
                      )}
                    </div>
                    <ul className="sub-tier-list">
                      {PRO_POINTS.map((point) => <li key={point}><Check /> {point}</li>)}
                    </ul>
                    {offer?.amountLabel && !subLoading ? (
                      <Link className="btn btn-accent sub-tier-btn" to={`/checkout?plan=${offer.checkoutPlan}`}>Upgrade to Pro</Link>
                    ) : (
                      <button type="button" className="btn btn-accent sub-tier-btn" disabled>
                        {proPrice.loaded && !offer?.amountLabel ? 'Pricing unavailable right now' : 'Upgrade to Pro'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Accessibility */}
          <section id="set-accessibility" className="settings-section" role="tabpanel" aria-labelledby="settab-accessibility" hidden={active !== 'accessibility'}>
            <div className="settings-section-h">
              <h2>Accessibility</h2>
              <p>Choose a theme and reduce motion for a calmer, distraction-free interface. Both are also in the menu at the top of every page.</p>
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
                <div className="toggle-row">
                  <div className="toggle-row-info">
                    <div className="toggle-row-label">Reduced motion</div>
                    <div className="toggle-row-meta">Minimise animations and transitions</div>
                  </div>
                  <button className={`toggle-switch${reducedMotion ? ' on' : ''}`} onClick={() => setReducedMotion(!reducedMotion)} aria-label="Toggle reduced motion" aria-pressed={reducedMotion} />
                </div>
              </div>
            </div>
          </section>

          {/* Language */}
          <section id="set-language" className="settings-section" role="tabpanel" aria-labelledby="settab-language" hidden={active !== 'language'}>
            <div className="settings-section-h">
              <h2>Language</h2>
              <p>Choose the interface language. Affects all menus, labels, and copy.</p>
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
                        <img src={`https://flagcdn.com/w40/${l.region.toLowerCase()}.png`} alt={l.region} width="28" height="21" />
                      </span>
                      <div className="lang-tile-info">
                        <span className="lang-tile-label">{l.native}</span>
                        <span className="lang-tile-code">{l.label}</span>
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
                <h2>Account</h2>
                <p>Manage your profile, email, and password.</p>
              </div>
              <div className="settings-card">
                <div className="settings-profile">
                  <button
                    type="button"
                    className="settings-profile-avatar settings-avatar-btn"
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label="Change profile photo"
                    title="Change profile photo"
                  >
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{(userProfile?.displayName || user.email || 'U')[0].toUpperCase()}</span>
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
                      <button type="button" className="settings-avatar-remove" onClick={removeAvatar}>Remove photo</button>
                    )}
                  </div>
                  <button className="btn btn-s" onClick={signOut} disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
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
                  <EditField label="Display name" value={userProfile?.displayName} onSave={(v) => { updateProfile({ displayName: v }); toast('Display name updated') }} placeholder="Enter your display name" />
                  {/* AWAITED. It was `updateEmail(email, pw); toast('Email updated')`
                      — no await, so the toast fired before Firebase answered and
                      the field never saw a refusal. Now a failure stays in the
                      field, in words, and the toast means it happened. */}
                  <EmailEditField
                    value={user.email}
                    googleOnly={isGoogleOnlyAccount()}
                    onSave={async (email, pw) => { await updateEmail(email, pw); toast('Email updated') }}
                  />
                  <EditField label="Location" value={userProfile?.location} onSave={(v) => { updateProfile({ location: v }); toast('Location updated') }} placeholder="e.g. Melbourne, Australia" options={LOCATIONS} />
                  <EditField label="Company / studio" value={userProfile?.company} onSave={(v) => { updateProfile({ company: v }); toast('Company updated') }} placeholder="e.g. Acme Design" />
                  <EditField label="Website" value={userProfile?.website} type="url" onSave={(v) => { updateProfile({ website: v }); toast('Website updated') }} placeholder="https://yoursite.com" />
                  <EditField label="Bio" value={userProfile?.bio} onSave={(v) => { updateProfile({ bio: v }); toast('Bio updated') }} placeholder="A short bio about yourself" />
                  <FlairPicker value={userProfile?.flair} displayName={userProfile?.displayName} email={user.email} onSave={(id) => { updateProfile({ flair: id }); toast(id ? 'Flair updated' : 'Flair cleared') }} />
                  <PasswordChange
                    onSave={(current, next) => updatePassword(current, next)}
                    googleOnly={isGoogleOnlyAccount()}
                    onReset={() => resetPassword(user.email)}
                  />

                  <div className="danger-zone">
                    <div className="danger-zone-h">Danger zone</div>
                    <p>
                      Delete your account, everything in it, and{isPro ? ' your subscription' : ' any billing you have with us'}.
                      This cannot be undone.
                    </p>
                    <DeleteAccount
                      onDelete={(pw) => deleteAccount(pw)}
                      googleOnly={isGoogleOnlyAccount()}
                      isPro={isPro}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Data */}
          <section id="set-data" className="settings-section" role="tabpanel" aria-labelledby="settab-data" hidden={active !== 'data'}>
            <div className="settings-section-h">
              <h2>Your data</h2>
              {/* This used to read "Everything UIL4B stores lives in your
                  browser", which is simply false for a signed-in account —
                  the profile and the synced design live in Firestore. */}
              <p>
                {user
                  ? 'Some of it lives in this browser, and some on our server so it follows you between devices. Either way it is yours.'
                  : 'Signed out, everything UIL4B stores lives in this browser. You own it.'}
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
                <NavLink to="/privacy" className="btn btn-s">Full disclosure</NavLink>
              </div>
              <div className="settings-card-body">
                <p className="settings-data-note">
                  We don&rsquo;t sell your data or use third-party trackers.
                </p>
                <div className="settings-row settings-row--pad">
                  <div>
                    <div className="settings-row-label">Export</div>
                    <div className="settings-row-meta">
                      A JSON copy of everything — every key in this browser
                      {user ? ', plus your account’s copy from the server' : ''}
                    </div>
                  </div>
                  <button className="btn btn-accent btn-s" onClick={exportData} disabled={exporting}>
                    {exporting ? 'Preparing…' : 'Export JSON'}
                  </button>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Clear local data</div>
                    <div className="settings-row-meta">
                      Removes everything stored in this browser except your sign-in.
                      {user ? ' Your account and synced data on the server are untouched.' : ''}
                    </div>
                  </div>
                  {confirmClear ? (
                    <div className="settings-edit-actions settings-edit-actions--tight">
                      <button className="btn btn-s settings-danger-go" onClick={deleteAllData}>Confirm clear</button>
                      <button className="btn btn-s" onClick={() => setConfirmClear(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button className="btn btn-s settings-danger" onClick={() => setConfirmClear(true)}>Clear data</button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section id="set-privacy" className="settings-section" role="tabpanel" aria-labelledby="settab-privacy" hidden={active !== 'privacy'}>
            <div className="settings-section-h">
              <h2>Privacy &amp; legal</h2>
              <p>How we handle (and don't handle) your information.</p>
            </div>
            <div className="settings-card">
              <div className="settings-card-body">
                <ul className="settings-facts">
                  {[
                    // "No analytics trackers" was deleted: Vercel
                    // Web Analytics runs on every page and /privacy discloses it.
                    'No third-party cookies, no ad networks.',
                    'Authentication is handled securely by Firebase Auth (Google).',
                    'Your data is stored locally and optionally synced via Firestore when signed in.',
                    'You can export or delete your data at any time, with no requests.',
                  ].map((line, i) => (
                    <li key={i}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {line}
                    </li>
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
