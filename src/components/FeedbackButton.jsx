import { useCallback, useState } from 'react'
import { useLocation } from 'react-router-dom'
import FeedbackModal from './FeedbackModal'
import FeedbackContextMenu from './FeedbackContextMenu'

// Persistent, low-profile way to reach the feedback form from anywhere in the app.
// Clicking it opens a modal (rather than navigating) so the user keeps their place.
// Hidden on the feedback page itself to avoid redundancy.
//
// This component owns the ONE FeedbackModal instance, and both ways in go
// through it: the button, and the right-click menu. That is deliberate. Two
// entry points that built their own payloads would be two feedback pipelines
// wearing one name, and an admin triaging a queue would have to know which of
// them a given report came from to know what it does and does not contain.
// Here the gesture only decides two things — which type is preselected and
// whether an element name is offered — and everything after that is one path,
// one payload shape, one `source: 'inline'`, one store.
export default function FeedbackButton() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  // What the gesture knew, if anything. Held in state (not rebuilt per render)
  // so its identity is stable — FeedbackModal's open-effect keys off it, and a
  // fresh object every render would reset the form under the user's hands.
  const [seed, setSeed] = useState(null)

  const openFromButton = useCallback(() => { setSeed(null); setOpen(true) }, [])
  const openFromMenu = useCallback((next) => { setSeed(next); setOpen(true) }, [])
  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      {location.pathname !== '/feedback' && (
        <button
          type="button"
          className="global-feedback-btn"
          onClick={openFromButton}
          title="Share feedback — or right-click anywhere to report what is under your pointer"
          aria-label="Share feedback"
          aria-haspopup="dialog"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Feedback</span>
        </button>
      )}
      {/* The menu stays live on /feedback even though the button does not: the
          button would be redundant next to the form, but "right-click the thing
          that is wrong" is still the fastest way to file about that page. It is
          suppressed while the dialog is open so a right-click inside the form
          reaches the browser's own menu, where Paste lives. */}
      <FeedbackContextMenu onReport={openFromMenu} suppressed={open} />
      <FeedbackModal open={open} onClose={close} seed={seed} />
    </>
  )
}
