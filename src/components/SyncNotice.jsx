import { useSyncExternalStore } from 'react'
import { getSyncState, subscribeSync, clearSyncEntry } from '../utils/syncStatus'
import useOnline from '../hooks/useOnline'

// THE ONE PLACE A FAILED SYNC IS ALLOWED TO BE SEEN FROM.
//
// Mounted in App.jsx beside <Toast>, so it is on every route rather than only
// on /projects. That matters: the person whose sync has stopped is, by
// definition, someone who is busy editing, and the surface they are editing on
// is a tool page — not the page that lists what they have saved.
//
// It is NOT a toast. A toast is right for "saved" and wrong for this: a toast
// disappears, and a sync failure is a condition that is still true after the
// animation ends. This stays until the condition clears (reportSyncOk) or the
// person dismisses it.
//
// role="alert" for the error, role="status" for the conflict notice. The
// distinction is the same one the two levels make in utils/syncStatus.js —
// "your work is not reaching your account" interrupts; "another device's copy
// is what you're looking at now" does not.

function CloudOff() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M17.5 19H9a7 7 0 01-1.2-13.9" />
      <path d="M11 5.05A5 5 0 0119 9h1a4 4 0 012.4 7.2" />
    </svg>
  )
}

function Devices() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="14" height="10" rx="2" />
      <path d="M2 18h10" />
      <rect x="16" y="10" width="6" height="10" rx="1.5" />
    </svg>
  )
}

export default function SyncNotice() {
  // useSyncExternalStore rather than useState + useEffect: a failure reported
  // during the same commit that mounted this — ProjectContext's pull runs
  // there — is read by the very next render instead of a frame later, and the
  // subscription cannot tear on a concurrent one.
  const state = useSyncExternalStore(subscribeSync, getSyncState, getSyncState)
  const online = useOnline()

  const entry = state.first
  if (!entry) return null

  // WHILE OFFLINE, THE OFFLINE BANNER SPEAKS AND THIS ONE WAITS. A lost
  // connection is precisely when a sync fails, so the two always arrived
  // together: measured 2026-09-08 at 320, 390 and 1280, this notice (z-index
  // 130) sat on top of .offline-banner (119) and hid it.
  //
  // Both are rows in .notice-stack now, so the second one would stack rather
  // than cover — but this branch stays, because the reason was never only the
  // geometry. The offline banner already says the work is safe and that things
  // resume on their own; a second row saying "your projects aren't syncing —
  // this device looks offline" underneath it adds nothing a person can act on,
  // and it would push every toolbar on the page down to say it. The entry is
  // NOT cleared — it is still true — so the moment the connection returns this
  // renders again, with Try again.
  if (!online) return null

  const isError = entry.level === 'error'

  return (
    <div
      className={`sync-notice sync-notice--${isError ? 'error' : 'info'}`}
      data-testid="sync-notice"
      data-sync-level={entry.level}
      data-sync-channel={entry.channel}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <span className="sync-notice-ico">{isError ? <CloudOff /> : <Devices />}</span>
      <p className="sync-notice-msg">{entry.message}</p>
      <div className="sync-notice-actions">
        {isError && entry.retry && (
          <button type="button" className="btn btn-s" onClick={() => entry.retry()}>
            Try again
          </button>
        )}
        <button
          type="button"
          className="sync-notice-dismiss"
          aria-label="Dismiss sync message"
          onClick={() => clearSyncEntry(entry.channel)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
