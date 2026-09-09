import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { processAvatarImage } from '../utils/imageProcessing'
import { useAppearance } from '../contexts/AppearanceContext'
import { useI18n } from '../contexts/I18nContext'
import { AI_LIMITS, useSubscription } from '../contexts/SubscriptionContext'
import { useProPrice } from '../hooks/usePrices'
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
import '../styles/pages/settings.css'

function Check() {
  return (
    <svg className="sub-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="settings-row-label">{label}</div>
          <div className="settings-row-value">{value || <span style={{ color: 'var(--t3)' }}>—</span>}</div>
        </div>
        <button className="btn btn-s" onClick={() => { setVal(value || ''); setEditing(true) }}>Edit</button>
      </div>
    )
  }

  return (
    <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="settings-row-label" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
      {error && <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 6 }}>{error}</div>}
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="settings-row-label">Flair</div>
          <div className="settings-row-value">
            {current
              ? <span className={`flair flair--${current.tone}`}>{current.label}</span>
              : <span style={{ color: 'var(--t3)' }}>No flair set</span>}
          </div>
        </div>
        <button className="btn btn-s" onClick={() => setOpen(true)}>
          {current ? 'Change' : 'Add'}
        </button>
      </div>
    )
  }

  return (
    <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="settings-row-label" style={{ marginBottom: 8 }}>Flair</div>
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

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="btn btn-accent btn-s" onClick={() => setOpen(false)}>Done</button>
        {value && (
          <button className="btn btn-s" onClick={() => onSave('')}>Clear flair</button>
        )}
      </div>
    </div>
  )
}

function PasswordChange({ onSave }) {
  const [open, setOpen] = useState(false)
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
      if (e.code === 'auth/wrong-password') setError('Current password is incorrect')
      else setError(e.message || 'Failed to update password')
    }
  }

  if (!open) {
    return (
      <div className="settings-row">
        <div style={{ flex: 1 }}>
          <div className="settings-row-label">Password</div>
          <div className="settings-row-value">••••••••</div>
        </div>
        <button className="btn btn-s" onClick={() => setOpen(true)}>Change</button>
      </div>
    )
  }

  return (
    <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="settings-row-label" style={{ marginBottom: 10 }}>Change password</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input type="password" placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)} autoFocus />
        <input type="password" placeholder="New password (min. 6 characters)" value={next} onChange={e => setNext(e.target.value)} />
        <input type="password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn btn-accent btn-s" onClick={handleSave}>Update password</button>
        <button className="btn btn-s" onClick={() => { setOpen(false); setError('') }}>Cancel</button>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 8 }}>{error}</div>}
      {success && <div style={{ fontSize: 12, color: 'var(--ok)', marginTop: 8 }}>Password updated successfully</div>}
    </div>
  )
}

function EmailEditField({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [email, setEmail] = useState(value || '')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState('email')
  const [error, setError] = useState('')

  const handleNext = () => {
    if (!email || email === value) { setError('Enter a new email address'); return }
    setStep('confirm')
    setError('')
  }

  const handleSave = async () => {
    if (!password) { setError('Password is required'); return }
    try {
      await onSave(email, password)
      setEditing(false)
      setStep('email')
      setPassword('')
      setError('')
    } catch (e) {
      if (e.code === 'auth/wrong-password') setError('Password is incorrect')
      else setError(e.message || 'Failed to update email')
    }
  }

  if (!editing) {
    return (
      <div className="settings-row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="settings-row-label">Email address</div>
          <div className="settings-row-value">{value || '—'}</div>
        </div>
        <button className="btn btn-s" onClick={() => { setEmail(value || ''); setEditing(true); setStep('email') }}>Edit</button>
      </div>
    )
  }

  return (
    <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="settings-row-label" style={{ marginBottom: 8 }}>
        {step === 'email' ? 'Email address' : 'Confirm password'}
      </div>
      {step === 'email' ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter new email" style={{ flex: 1 }} autoFocus />
          <button className="btn btn-accent btn-s" onClick={handleNext}>Next</button>
          <button className="btn btn-s" onClick={() => { setEditing(false); setError('') }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password to confirm" style={{ flex: 1 }} autoFocus />
          <button className="btn btn-accent btn-s" onClick={handleSave}>Save</button>
          <button className="btn btn-s" onClick={() => { setStep('email'); setPassword(''); setError('') }}>Back</button>
        </div>
      )}
      {error && <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 6 }}>{error}</div>}
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
      <button className="btn danger-zone-open" onClick={() => setOpen(true)}>
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
        <button className="btn btn-s" onClick={() => { setOpen(false); setError(''); setPassword('') }} disabled={busy}>
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
    case 'subscription': return <svg {...props}><path d="M20 12V8H6a2 2 0 1 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
    case 'accessibility': return <svg {...props}><circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg>
    case 'language': return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
    case 'account': return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    case 'data': return <svg {...props}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>
    case 'privacy': return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    default: return null
  }
}

export default function Settings({ toast }) {
  const { user, userProfile, logout, updateProfile, updateEmail, updatePassword, deleteAccount, isGoogleOnlyAccount, profileSyncError, dismissProfileSyncError } = useAuth()
  const { reducedMotion, setReducedMotion } = useAppearance()
  const { isPro, isAdmin, subscription, lifetimeEntitlement, checkout, openPortal, loading: subLoading } = useSubscription()
  const { t, lang, setLang, languages } = useI18n()
  // 'support' — the SECTION ID, not the label. This said 'subscription', which
  // matched no section: harmless while every panel rendered at once and `active`
  // only drove the nav highlight, so the page opened with nothing highlighted
  // and nobody noticed. Turning the sections into panels turned it into a blank
  // page. The id stays 'support' because Plans.jsx deep-links to it via
  // `state={{ section: 'support' }}`.
  const [active, setActive] = useState('support')
  const [confirmClear, setConfirmClear] = useState(false)
  const [exporting, setExporting] = useState(false)
  // Counted from storage, not from the length of a hand-written list. The old
  // page reported "15 items" whatever was actually there — including for a
  // browser holding 16 keys, 9 of which the export then omitted.
  const [localKeyCount, setLocalKeyCount] = useState(0)
  const [billing, setBilling] = useState('yearly')
  const [checkingOut, setCheckingOut] = useState(false)
  const proPrice = useProPrice()
  const location = useLocation()

  const startCheckout = async (interval) => {
    if (!user || checkingOut) return
    setCheckingOut(true)
    try {
      await checkout(interval)
    } catch (error) {
      toast?.(error?.message || 'Could not start checkout')
      setCheckingOut(false)
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
    if (section) setActive(section)
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
        const [profileSnap, syncSnap] = await Promise.allSettled([
          getDoc(doc(db, 'users', user.uid)),
          getDoc(doc(db, 'users', user.uid, 'sync', 'data')),
        ])
        firestore = {
          profile: profileSnap.status === 'fulfilled'
            ? (profileSnap.value.exists() ? profileSnap.value.data() : null)
            : { error: 'Could not be read — please try again or contact support.' },
          sync: syncSnap.status === 'fulfilled'
            ? (syncSnap.value.exists() ? syncSnap.value.data() : null)
            : { error: 'Could not be read — please try again or contact support.' },
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

  const deleteAllData = () => {
    clearCommunitySubmissions()
    // Enumerated, so a key added tomorrow is cleared too. keysToClear keeps
    // back only the ones whose removal would sign you out or drop an
    // entitlement — clearing preferences should not log you out.
    keysToClear(window.localStorage)
      .filter((key) => key !== COMMUNITY_SUBMISSIONS_KEY)
      .forEach((key) => localStorage.removeItem(key))
    setConfirmClear(false)
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
    setActive(next.id)
    tabRefs.current[(index + sections.length) % sections.length]?.focus()
  }
  const onTabKeyDown = (event, index) => {
    const keys = { ArrowDown: index + 1, ArrowRight: index + 1, ArrowUp: index - 1, ArrowLeft: index - 1, Home: 0, End: sections.length - 1 }
    if (!(event.key in keys)) return
    event.preventDefault()
    selectTab(keys[event.key])
  }

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Settings</div>
        <h1>Make it <em>yours</em>.</h1>
        <p>Manage your account, set your preferences, and control how your data is stored.</p>
      </div>

      <div className="settings-grid">
        {/* A real tablist, not a scroll-jump list. Every section used to render
            at once and the nav scrolled you to one — so "Settings" was a single
            long page where changing your language meant scrolling past billing,
            and the highlighted nav item could disagree with what was on screen.
            Now one panel shows at a time and the nav says which.

            Arrow keys move between tabs and only the active one is tabbable,
            which is the ARIA pattern a tablist owes a keyboard user. */}
        <nav className="settings-nav" role="tablist" aria-label="Settings sections" aria-orientation="vertical">
          {sections.map((s, i) => (
            <button
              key={s.id}
              id={`settab-${s.id}`}
              role="tab"
              aria-selected={active === s.id}
              aria-controls={`set-${s.id}`}
              tabIndex={active === s.id ? 0 : -1}
              ref={(node) => { tabRefs.current[i] = node }}
              className={`settings-nav-item${active === s.id ? ' active' : ''}`}
              onClick={() => setActive(s.id)}
              onKeyDown={(event) => onTabKeyDown(event, i)}
            >
              <NavIcon id={s.id} />
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        <div className="settings-content">

          {/* Subscription */}
          <section id="set-support" className="settings-section" role="tabpanel" aria-labelledby="settab-support" hidden={active !== 'support'}>
            <div className="settings-section-h">
              <h2>Subscription</h2>
              <p>{isPro ? 'You\'re on UIL4B Pro — thank you for supporting the project.' : 'Free covers the essentials. Upgrade to Pro when you need more AI.'}</p>
            </div>

            {isPro ? (
              <>
              <div className="sub-active">
                <div className="sub-active-top">
                  <div className="sub-active-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    Pro
                  </div>
                  <div className="sub-active-info">
                    <div className="sub-active-title">UIL4B Pro is active</div>
                    <div className="sub-active-meta">
                      {isAdmin && !subscription && !lifetimeEntitlement ? 'Founder account — Pro included, no billing'
                        : lifetimeEntitlement?.active && !subscription ? 'One-off Pro access — no subscription or renewal'
                          : (
                        <>
                          {subscription?.interval === 'year' ? 'Billed yearly' : 'Billed monthly'}
                          {subscription?.cancelAtPeriodEnd && ' · cancels at period end'}
                          {subscription?.currentPeriodEnd && (
                            <> · {subscription.cancelAtPeriodEnd ? 'access until' : 'renews'} {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {/* Admins without a real Stripe subscription have no billing
                    portal to open — hide the buttons instead of 500ing. */}
                {!!subscription && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" onClick={() => openPortal()}>Manage billing</button>
                    {!subscription?.cancelAtPeriodEnd && (
                      <button className="btn btn-ghost" style={{ fontSize: 12, color: 'var(--t2)' }} onClick={() => openPortal({ flow: 'cancel' })}>Cancel plan</button>
                    )}
                  </div>
                )}
              </div>
              </>
            ) : !user ? (
              // Signed out, this page used to render the ENTIRE pricing
              // comparison — both tiers, a billing toggle and a "Start 7-day
              // free trial" button — under a small "Sign in to upgrade" note.
              // A trial CTA you cannot use, beneath a line telling you that, on
              // a page about an account you do not have. It also meant the plan
              // copy lived in two places, which is how it came to be wrong in
              // seven files. Plans owns pricing; this owns your account.
              <div className="sub-signin-note">
                <p>Settings are for your account — <NavLink to="/login">sign in</NavLink> to manage a subscription.</p>
                <p>Comparing plans first? <NavLink to="/plans">See Free and Pro</NavLink>.</p>
              </div>
            ) : (
              <>
                <div className="sub-billing-toggle" role="tablist" aria-label="Billing interval">
                  <button role="tab" aria-selected={billing === 'monthly'} className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}>Monthly</button>
                  <button role="tab" aria-selected={billing === 'yearly'} className={billing === 'yearly' ? 'active' : ''} onClick={() => setBilling('yearly')}>
                    Yearly {proPrice.savingsPct > 0 && <span className="sub-save">Save {proPrice.savingsPct}%</span>}
                  </button>
                </div>

                <div className="sub-tiers">
                  {/* Free */}
                  <div className="sub-tier">
                    <div className="sub-tier-head">
                      <div className="sub-tier-name">Free</div>
                      <div className="sub-tier-price"><span className="sub-tier-amount">$0</span><span className="sub-tier-per">forever</span></div>
                    </div>
                    <ul className="sub-tier-list">
                      <li><Check /> All core design tools</li>
                      <li><Check /> Unlimited palettes, scales &amp; exports</li>
                      <li><Check /> {AI_LIMITS.free.daily} AI generations a day · {AI_LIMITS.free.monthly} a month</li>
                      <li><Check /> Local browser saves</li>
                    </ul>
                    <button className="btn sub-tier-btn" disabled>Your current plan</button>
                  </div>

                  {/* Pro */}
                  <div className="sub-tier sub-tier-pro">
                    <span className="sub-tier-flag">Recommended</span>
                    <div className="sub-tier-head">
                      <div className="sub-tier-name">Pro</div>
                      <div className="sub-tier-price">
                        <span className="sub-tier-amount">{proPrice.loaded ? (billing === 'yearly' ? proPrice.yearlyTotal : proPrice.monthly) : '—'}</span>
                        <span className="sub-tier-per">{billing === 'yearly' ? 'per year' : 'per month'}</span>
                      </div>
                      <div className="sub-tier-sub">{!proPrice.loaded ? 'Checking live price…' : billing === 'yearly' ? `${proPrice.currencyLabel} · ${proPrice.yearlyPerMonth}/mo${proPrice.savingsPct > 0 ? `, save ${proPrice.savingsPct}%` : ''} · 7-day free trial` : `${proPrice.currencyLabel} · billed monthly`}</div>
                    </div>
                    <ul className="sub-tier-list">
                      <li><Check /> <strong>Everything in Free, plus:</strong></li>
                      {billing === 'yearly' && <li><Check /> <strong>7-day free trial</strong> — cancel anytime</li>}
                      <li><Check /> {AI_LIMITS.pro.daily} AI generations a day · {AI_LIMITS.pro.monthly} a month</li>
                      <li><Check /> Unlimited project and custom-icon saves</li>
                      <li><Check /> Advanced colour controls</li>
                      {/* "Full design JSON" removed 2026-09-05 — not built. See src/pages/Checkout.jsx. */}
                      <li><Check /> The design system book (PDF), and watermark-free style guides</li>
                    </ul>
                    <button
                      className="btn btn-accent sub-tier-btn"
                      onClick={() => startCheckout(billing)}
                      disabled={!user || subLoading || checkingOut || !proPrice.loaded}
                    >
                      {checkingOut ? 'Opening checkout…' : billing === 'yearly' ? 'Start 7-day free trial' : 'Choose monthly Pro'}
                    </button>
                    <div className="sub-tier-foot">Secure checkout via Stripe · cancel anytime</div>
                  </div>

                </div>
              </>
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
              <div className="settings-card-body" style={{ padding: '16px' }}>
                <div className="lang-grid">
                  {languages.map(l => (
                    <button
                      key={l.code}
                      className={`lang-tile${lang === l.code ? ' active' : ''}`}
                      onClick={() => { setLang(l.code); toast(`Language: ${l.native}`) }}
                    >
                      <span className="lang-flag">
                        <img src={`https://flagcdn.com/w40/${l.region.toLowerCase()}.png`} alt={l.region} width="28" height="21" style={{ objectFit: 'cover', borderRadius: 2 }} />
                      </span>
                      <div className="lang-tile-info">
                        <span className="lang-tile-label">{l.native}</span>
                        <span className="lang-tile-code">{l.label}</span>
                      </div>
                      {lang === l.code && (
                        <svg className="lang-tile-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                  <button className="btn btn-s" onClick={logout}>Sign out</button>
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
                  <EmailEditField value={user.email} onSave={(email, pw) => { updateEmail(email, pw); toast('Email updated') }} />
                  <EditField label="Location" value={userProfile?.location} onSave={(v) => { updateProfile({ location: v }); toast('Location updated') }} placeholder="e.g. Melbourne, Australia" options={LOCATIONS} />
                  <EditField label="Company / studio" value={userProfile?.company} onSave={(v) => { updateProfile({ company: v }); toast('Company updated') }} placeholder="e.g. Acme Design" />
                  <EditField label="Website" value={userProfile?.website} type="url" onSave={(v) => { updateProfile({ website: v }); toast('Website updated') }} placeholder="https://yoursite.com" />
                  <EditField label="Bio" value={userProfile?.bio} onSave={(v) => { updateProfile({ bio: v }); toast('Bio updated') }} placeholder="A short bio about yourself" />
                  <FlairPicker value={userProfile?.flair} displayName={userProfile?.displayName} email={user.email} onSave={(id) => { updateProfile({ flair: id }); toast(id ? 'Flair updated' : 'Flair cleared') }} />
                  <PasswordChange onSave={(current, next) => updatePassword(current, next)} />

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
                    {user ? ', plus your profile and synced design on the server' : ''}
                  </p>
                </div>
                <NavLink to="/privacy" className="btn btn-s">Full disclosure</NavLink>
              </div>
              <div className="settings-card-body">
                <p className="settings-data-note">
                  We don&rsquo;t sell your data or use third-party trackers. Preferences and projects are stored in this browser. When signed in, your profile and current design also sync via Firebase so they follow you between devices.
                </p>
                <div className="settings-row settings-row--pad">
                  <div>
                    <div className="settings-row-label">Export</div>
                    <div className="settings-row-meta">
                      A JSON copy of everything — every key in this browser
                      {user ? ', plus your profile and synced design from the server' : ''}
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
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-s" onClick={deleteAllData} style={{ color: '#fff', background: 'var(--err)', borderColor: 'var(--err)' }}>Confirm clear</button>
                      <button className="btn btn-s" onClick={() => setConfirmClear(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button className="btn btn-s" onClick={() => setConfirmClear(true)} style={{ color: 'var(--err)', borderColor: 'var(--err)' }}>Clear data</button>
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
                <ul style={{ listStyle: 'none', padding: '14px 0', margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    'No analytics trackers, no third-party cookies, no ad networks.',
                    'Authentication is handled securely by Firebase Auth (Google).',
                    'Your data is stored locally and optionally synced via Firestore when signed in.',
                    'You can export or delete your data at any time, with no requests.',
                  ].map((line, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.55 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
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

      <div style={{ textAlign: 'center', padding: '24px 0 12px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', letterSpacing: '.03em' }}>
        UIL4B · <a href="https://dylan-coleman.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-strong)', textDecoration: 'none' }}>Dylan Coleman</a>
      </div>
    </div>
  )
}
