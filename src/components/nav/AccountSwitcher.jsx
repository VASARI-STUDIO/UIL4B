import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLoginPrompt } from '../../contexts/LoginPromptContext'
import { useSubscription } from '../../contexts/SubscriptionContext'
import { flushAccountSync } from '../../hooks/useFirestoreSync'
import useOfflineGate from './useOfflineGate'
import { flushBeforeSignOut, UNSENT_CHANGES_NOTE } from '../../utils/signOutFlush'
import { accountInitials, accountLabel, accountMethod, switcherAccounts, uidsToForget } from '../../utils/accountSwitcher'

// THE ACCOUNT SWITCHER, modelled on Google's account switcher.
// The signed-in account, then every other account remembered on this device
// (name, email, avatar; a tap switches to it), then "Add account". The sign-out
// rows are a separate export so the menu can put them last.
//
// Switching goes through AuthContext.switchAccount and nothing else: a Google
// account signs in with a login_hint; an email account opens the sign-in form
// locked to its address and asks for the password. The current session stays
// until the new one succeeds. See src/utils/accountSwitcher.js.
//
// Where an outcome is told: one that keeps the menu open is a status line in
// it; one that closes the menu goes to the app toast, because the line would
// unmount with the menu before anyone read it.

// Offline, signing in and switching cannot start. One sentence heads every menu
// that holds such a row, and those rows point at it with aria-describedby.
const OFFLINE_SIGN_IN_NOTE = 'You’re offline. Signing in and switching accounts wait until you reconnect.'

export function OfflineNote({ id }) {
  return <p className="pnav-switch-status" id={id} role="status">{OFFLINE_SIGN_IN_NOTE}</p>
}

const toast = (message, type) => {
  window.dispatchEvent(new CustomEvent('uil4b:toast', { detail: { message, type } }))
}

function Avatar({ acct, className }) {
  return acct?.photoURL
    ? <img className={className} src={acct.photoURL} alt="" referrerPolicy="no-referrer" />
    : <span className={className} aria-hidden="true">{accountInitials(acct)}</span>
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}

export function AccountSwitcher({ onDone }) {
  const { user, userProfile, knownAccounts, switchAccount } = useAuth()
  const { openLogin } = useLoginPrompt()
  const { isPro } = useSubscription()
  const { online, noteId, gate } = useOfflineGate()
  const [switchingUid, setSwitchingUid] = useState(null)
  const [status, setStatus] = useState('')
  const switchLockRef = useRef(false)

  const self = {
    uid: user?.uid,
    email: userProfile?.email || user?.email || '',
    displayName: userProfile?.displayName || user?.displayName || '',
    photoURL: userProfile?.photoURL || '',
  }
  const { others } = switcherAccounts(knownAccounts, user?.uid)

  const onSwitch = async (acct) => {
    if (!online || switchLockRef.current) return
    switchLockRef.current = true
    // Once the menu has closed, its status line is gone: later outcomes are toasts.
    let menuClosed = false
    const close = () => { menuClosed = true; onDone?.() }
    setSwitchingUid(acct.uid)
    setStatus(`Opening sign-in for ${acct.email || 'the selected account'}…`)
    try {
      // Pending account changes are written while this account can still
      // write them; after the switch the rules refuse them.
      await flushAccountSync()
      const res = await switchAccount(acct)
      if (res.outcome === 'requiresPassword') {
        // The dialog says it all, so the menu closes rather than sit open behind it.
        close()
        const switched = await openLogin({ force: true, free: false, email: res.email, lockEmail: true, mode: 'switch', reason: `switch to ${res.email}` })
        if (switched) toast(`Signed in as ${switched.email || acct.email || 'the selected account'}.`, 'success')
        else toast(self.email ? `Account switch cancelled. You’re still signed in as ${self.email}.` : 'Account switch cancelled. Your current session is still active.', 'info')
      } else if (res.outcome === 'switched') {
        close()
        toast(`Switched to ${acct.email || 'the selected account'}.`, 'success')
      } else if (res.outcome === 'selectedDifferentAccount') {
        close()
        toast(`Signed in as ${res.actualUser?.email || 'the account you selected'}.`, 'success')
      } else if (res.outcome === 'cancelled') {
        setStatus('Account switch cancelled. Your current session is still active.')
      } else if (res.outcome === 'popupBlocked') {
        setStatus('Your browser blocked the sign-in popup. Allow popups, then choose the account again.')
      } else {
        setStatus(res.message || 'Could not switch accounts. Your current session is still active.')
      }
    } catch {
      const failed = 'Could not switch accounts. Check your connection and try again.'
      if (menuClosed) toast(failed, 'error')
      else setStatus(failed)
    } finally {
      switchLockRef.current = false
      setSwitchingUid(null)
    }
  }

  // "Add account" signs a second account in without signing this one out first;
  // AuthContext keeps this one in the remembered list, so it stays one tap away.
  const addAccount = () => {
    if (!online) return
    onDone?.()
    openLogin({ force: true, free: false, reason: 'add another account' })
  }

  return (
    <div className="pnav-acct">
      {!online && <OfflineNote id={noteId} />}
      <div className="pnav-pop-id">
        <Avatar acct={self} className="pnav-pop-avatar" />
        <span className="pnav-pop-id-text">
          <span className="pnav-pop-id-name">
            {accountLabel(self)}
            {isPro && <em className="pnav-pop-tag">Pro</em>}
          </span>
          {self.email && <span className="pnav-pop-id-email">{self.email}</span>}
        </span>
      </div>
      {others.length > 0 && (
        <ul className="pnav-acct-list" aria-label="Other accounts on this device">
          {others.map((acct) => (
            <li key={acct.uid}>
              <button
                type="button"
                className="pnav-pop-item pnav-pop-acct"
                onClick={() => onSwitch(acct)}
                disabled={!!switchingUid}
                aria-busy={switchingUid === acct.uid}
                aria-label={`Switch to ${accountLabel(acct)}, ${acct.email || ''} (${accountMethod(acct)})`}
                {...gate}
              >
                <Avatar acct={acct} className="pnav-pop-acct-avatar" />
                <span className="pnav-pop-acct-text">
                  <span className="pnav-pop-acct-name">{switchingUid === acct.uid ? 'Switching…' : accountLabel(acct)}</span>
                  {acct.email && <span className="pnav-pop-acct-email">{acct.email}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="pnav-pop-item pnav-acct-add" aria-haspopup="dialog" onClick={addAccount} {...gate}>
        <PlusIcon />
        <span>Add account</span>
      </button>
      {status && <p className="pnav-switch-status" role="status" aria-live="polite">{status}</p>}
    </div>
  )
}

// Sign out of this account; and, when other accounts are remembered here,
// sign out and forget them all, the way Google's "Sign out of all accounts"
// leaves nothing behind on a shared device.
//
// The menu stays open while this runs, because a failure has to be told where
// the person is looking. Pending changes are sent first (a limited wait, then
// the sync store is read for a failure; see utils/signOutFlush.js). If they
// cannot be sent, the rows give way to an alert offering a retry or signing
// out regardless; if the sign-out call itself fails, the alert says so and
// offers a retry only.
export function SignOutRows({ onDone }) {
  const { user, logout, knownAccounts, removeKnownAccount } = useAuth()
  const { others } = switcherAccounts(knownAccounts, user?.uid)
  const [busy, setBusy] = useState(null) // 'one' | 'all' | null
  const [issue, setIssue] = useState(null) // { kind: 'unsent' | 'failed', scope }
  const lockRef = useRef(false)
  const alertRef = useRef(null)
  const rowRefs = useRef({})
  // A retry removes the alert, which held focus; the pressed row takes it back.
  const refocusRef = useRef(null)

  useEffect(() => {
    if (issue) alertRef.current?.querySelector('button')?.focus()
    else if (refocusRef.current) {
      rowRefs.current[refocusRef.current]?.focus()
      refocusRef.current = null
    }
  }, [issue])

  const run = async (scope, { anyway = false } = {}) => {
    if (lockRef.current) return
    lockRef.current = true
    if (issue) refocusRef.current = scope
    setIssue(null)
    setBusy(scope)
    try {
      if (!anyway && await flushBeforeSignOut() !== 'sent') {
        setIssue({ kind: 'unsent', scope })
        return
      }
      const uids = scope === 'all' ? uidsToForget(knownAccounts) : []
      await logout()
      uids.forEach((uid) => removeKnownAccount(uid))
      onDone?.()
    } catch {
      setIssue({ kind: 'failed', scope })
    } finally {
      lockRef.current = false
      setBusy(null)
    }
  }

  const row = (scope, label) => (
    <button
      type="button"
      ref={(el) => { rowRefs.current[scope] = el }}
      className="pnav-pop-item pnav-pop-item--danger"
      aria-disabled={busy ? 'true' : undefined}
      onClick={() => run(scope)}
    >
      {busy === scope ? 'Signing out…' : label}
    </button>
  )

  if (issue) {
    return (
      <div className="pnav-signout-alert" role="alert" ref={alertRef}>
        <p>
          {issue.kind === 'unsent'
            ? UNSENT_CHANGES_NOTE
            : 'Signing out didn’t finish, so you’re still signed in. Check your connection and try again.'}
        </p>
        <span className="pnav-signout-alert-actions">
          <button type="button" onClick={() => run(issue.scope)}>Try again</button>
          {issue.kind === 'unsent' && (
            <button type="button" onClick={() => run(issue.scope, { anyway: true })}>Sign out anyway</button>
          )}
        </span>
      </div>
    )
  }

  return (
    <>
      {row('one', 'Sign out')}
      {others.length > 0 && row('all', 'Sign out of all accounts')}
    </>
  )
}
