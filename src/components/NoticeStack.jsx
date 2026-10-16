import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useOnline from '../hooks/useOnline'
import useVerificationRecheck from '../hooks/useVerificationRecheck'
import { verifyBarVisible, verifyErrorText, readVerifyDismissed, writeVerifyDismissed } from '../utils/emailVerification'
import OfflineBanner from './OfflineBanner'
import SyncNotice from './SyncNotice'

// THE ONE SLOT THE APP-WIDE CONDITION NOTICES LIVE IN, AND THE THING THAT
// RESERVES ROOM FOR IT.
//
// Both notices used to be their own fixed card at the same coordinate under
// the nav. That coordinate is where every sticky toolbar on the site parks
// itself — .plb-toolbar, .uis-command, .lbry-toolbar, .pgl-section-head all
// derive from the nav height — so a notice covered the toolbar of whatever
// tool was open. The founder reported it on the Palette Builder on 2026-09-14
// and decided the notices move into the page flow.
//
// A notice cannot be a plain flow element here: the nav is position:fixed and
// every page starts its own content below it with --nav-clear, so an element
// at the top of the document would render behind the nav. What it can do is
// take up room. This strip is fixed directly under the nav, and its measured
// height is published as --notice-h, which --chrome-h folds into every "just
// below the nav" offset in global.css. The toolbar parks under the strip; the
// hero pads past it; nothing is covered.
//
// WHY A ResizeObserver RATHER THAN A CONSTANT. The height is not knowable from
// here: the offline sentence wraps to three lines at 320px and one at 1440,
// the sync message is server text of unknown length, and at ≤520 the actions
// wrap onto a second row. A hard-coded height was how the FIRST attempt at
// stacking these was done — see the :has() note in global.css — and it is the
// reason that attempt was abandoned.
//
// The strip is display:none while empty (`.notice-stack:empty`), so with no
// notice showing this writes 0px and every folded offset resolves to exactly
// the value it had before this file existed.
// How long "Email verified." stays up once the account comes back verified.
const VERIFIED_HOLD_MS = 4000

function Envelope() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}

// THE THIRD ROW: A PASSWORD ACCOUNT WHOSE ADDRESS IS STILL UNPROVED.
//
// Until now the only sign of it was a row in Settings, which someone who never
// opens Settings never meets. A condition that stays true belongs in this strip
// rather than in a toast, for the same reason as the sync notice; the strip
// reserves its own height, so no toolbar is covered.
//
// Out of the way on /onboarding (which carries its own line) and /settings
// (whose Email row offers the same link), and while offline, when a send could
// not leave the device anyway: see verifyBarVisible. Dismissing lasts for the
// visit, like the billing banner: it returns next time, because the address is
// still unproved.
function VerifyNotice() {
  const { user, emailVerificationOwed: owed, sendVerificationEmail, refreshEmailVerified } = useAuth()
  const { pathname } = useLocation()
  const online = useOnline()
  const uid = user?.uid
  const email = user?.email

  const [state, setState] = useState('idle') // idle | sending | sent | failed
  const [error, setError] = useState('')
  const [dismissedUid, setDismissedUid] = useState(null)
  // The uid whose address was just verified here, so the bar can say so for a
  // moment instead of vanishing. Signing out also ends the debt, which is not
  // a verification, so it only counts while the same account is still in.
  const [verifiedUid, setVerifiedUid] = useState(null)
  const [seen, setSeen] = useState({ uid, owed })
  if (seen.uid !== uid || seen.owed !== owed) {
    setSeen({ uid, owed })
    if (uid && seen.uid === uid && seen.owed && !owed) setVerifiedUid(uid)
    if (seen.uid !== uid) { setState('idle'); setError('') }
  }

  useEffect(() => {
    if (!verifiedUid) return undefined
    const timer = setTimeout(() => setVerifiedUid(null), VERIFIED_HOLD_MS)
    return () => clearTimeout(timer)
  }, [verifiedUid])

  const confirmed = !!uid && verifiedUid === uid
  const shown = verifyBarVisible({ owed: owed || confirmed, pathname, online })
  useVerificationRecheck(refreshEmailVerified, owed && shown)

  if (!shown || !email) return null
  if (!confirmed && (dismissedUid === uid || readVerifyDismissed(uid))) return null

  const resend = async () => {
    setState('sending')
    try {
      await sendVerificationEmail()
      setState('sent')
    } catch (e) {
      setError(verifyErrorText(e))
      setState('failed')
    }
  }

  const dismiss = () => {
    writeVerifyDismissed(uid)
    setDismissedUid(uid)
    // The bar held focus; hand it to the page rather than to the document.
    document.getElementById('main')?.focus()
  }

  let message
  if (confirmed) {
    message = <p className="sync-notice-msg">Email verified.</p>
  } else if (state === 'sent') {
    message = <p className="sync-notice-msg">Link sent to {email}. Check your inbox and spam folder.</p>
  } else if (state === 'failed') {
    message = <p className="sync-notice-msg" role="alert">{error}</p>
  } else {
    message = (
      <p className="sync-notice-msg">
        <strong>Verify your email.</strong>{' '}
        <span className="sync-notice-detail">Check {email} for the link, or send a new one.</span>
      </p>
    )
  }

  return (
    <div
      className="sync-notice sync-notice--info verify-notice"
      data-testid="verify-notice"
      data-verify-state={confirmed ? 'verified' : state}
      role="status"
      aria-live="polite"
    >
      <span className="sync-notice-ico"><Envelope /></span>
      {message}
      <div className="sync-notice-actions">
        {!confirmed && state !== 'sent' && (
          <button type="button" className="btn btn-s" onClick={resend} disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Resend link'}
          </button>
        )}
        <button
          type="button"
          className="sync-notice-dismiss"
          aria-label="Dismiss verification reminder"
          onClick={dismiss}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function NoticeStack() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    const root = document.documentElement
    // Written on the root element, not on a parent: --chrome-h is declared on
    // :root and a custom property is resolved where it is USED, so a value set
    // anywhere lower would never reach .plb-toolbar in another subtree.
    const clear = () => root.style.removeProperty('--notice-h')
    if (!el) return clear

    const publish = () => {
      const h = el.offsetHeight
      if (h > 0) root.style.setProperty('--notice-h', `${h}px`)
      else clear()
    }
    publish()

    // No ResizeObserver (an old browser, a test harness): the height is still
    // published on every mount and on resize, which covers the two changes
    // that matter — a notice appearing, and the sentence rewrapping.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', publish)
      return () => { window.removeEventListener('resize', publish); clear() }
    }
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => { ro.disconnect(); clear() }
  }, [])

  return (
    <div className="notice-stack" ref={ref}>
      <OfflineBanner />
      <SyncNotice />
      <VerifyNotice />
    </div>
  )
}
