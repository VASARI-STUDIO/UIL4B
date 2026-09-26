import { useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLoginPrompt } from '../../contexts/LoginPromptContext'
import { useSubscription } from '../../contexts/SubscriptionContext'
import { flushAccountSync } from '../../hooks/useFirestoreSync'
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
    if (switchLockRef.current) return
    switchLockRef.current = true
    setSwitchingUid(acct.uid)
    setStatus(`Opening sign-in for ${acct.email || 'the selected account'}…`)
    try {
      // Pending account changes are written while this account can still
      // write them; after the switch the rules refuse them.
      await flushAccountSync()
      const res = await switchAccount(acct)
      if (res.outcome === 'requiresPassword') {
        setStatus(`Enter the password for ${res.email}. Your current session stays active until sign-in succeeds.`)
        const switched = await openLogin({ force: true, free: false, email: res.email, lockEmail: true, mode: 'switch', reason: `switch to ${res.email}` })
        if (switched) { setStatus(`Signed in as ${switched.email || acct.email}.`); onDone?.() }
        else setStatus('Account switch cancelled. Your current session is still active.')
      } else if (res.outcome === 'switched') {
        setStatus(`Switched to ${acct.email || 'the selected account'}.`)
        onDone?.()
      } else if (res.outcome === 'selectedDifferentAccount') {
        setStatus(`Signed in as ${res.actualUser?.email || 'the account you selected'}.`)
        onDone?.()
      } else if (res.outcome === 'cancelled') {
        setStatus('Account switch cancelled. Your current session is still active.')
      } else if (res.outcome === 'popupBlocked') {
        setStatus('Your browser blocked the sign-in popup. Allow popups, then choose the account again.')
      } else {
        setStatus(res.message || 'Could not switch accounts. Your current session is still active.')
      }
    } catch {
      setStatus('Could not switch accounts. Check your connection and try again.')
    } finally {
      switchLockRef.current = false
      setSwitchingUid(null)
    }
  }

  // "Add account" signs a second account in without signing this one out first;
  // AuthContext keeps this one in the remembered list, so it stays one tap away.
  const addAccount = () => {
    onDone?.()
    openLogin({ force: true, free: false, reason: 'add another account' })
  }

  return (
    <div className="pnav-acct">
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
      <button type="button" className="pnav-pop-item pnav-acct-add" aria-haspopup="dialog" onClick={addAccount}>
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
export function SignOutRows({ onDone }) {
  const { user, logout, knownAccounts, removeKnownAccount } = useAuth()
  const { others } = switcherAccounts(knownAccounts, user?.uid)
  // Pending account changes are sent before signing out, while the rules
  // still accept them.
  const signOut = async () => { onDone?.(); await flushAccountSync(); logout() }
  const signOutAll = async () => {
    const uids = uidsToForget(knownAccounts)
    onDone?.()
    await flushAccountSync()
    await logout()
    uids.forEach((uid) => removeKnownAccount(uid))
  }
  return (
    <>
      <button type="button" className="pnav-pop-item pnav-pop-item--danger" onClick={signOut}>
        Sign out
      </button>
      {others.length > 0 && (
        <button type="button" className="pnav-pop-item pnav-pop-item--danger" onClick={signOutAll}>
          Sign out of all accounts
        </button>
      )}
    </>
  )
}
