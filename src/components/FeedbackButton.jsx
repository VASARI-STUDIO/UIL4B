import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import FeedbackModal from './FeedbackModal'
import FeedbackContextMenu from './FeedbackContextMenu'
import { chromelessRoutes } from '../data/toolTree'

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

// WHERE THE FLOATING BUTTON DOES NOT GO.
//
// This component is mounted app-wide (App.jsx, beside the billing and offline
// banners) so the RIGHT-CLICK MENU reaches every route. The button is a
// different question: it is fixed in the bottom-right corner, and that corner
// is contended — global.css documents it colliding with the footer attribution
// on short pages and with the /seo device toggle, and the Create tools own
// their own full-screen layout.
//
// So the button keeps exactly the reach it had when it was mounted inside
// AppInner's shell, and this list is that shell's complement: every route that
// returns BEFORE it. Chromeless routes come from the same exported list App.jsx
// matches on, so adding a Create tool cannot put a button somewhere nobody
// designed for one; the rest are App.jsx's named early returns, plus /feedback
// where the page already IS the form.
const NO_BUTTON = new Set([
  ...chromelessRoutes(),
  // '/spectrum' is the new sales page's preview route while it and the old Home
  // are both reachable. It is the same KIND of surface as '/home' — a chromeless
  // marketing page that mounts its own nav and its own footer — so it takes the
  // same answer: no fixed bottom-right button. It leaves this list on the commit
  // that makes Spectrum '/', which is already here.
  //
  // Not optional, and not tidiness: tests/unit/feedback-reach.test.js requires
  // every path App.jsx early-returns on BY NAME to appear here, because hoisting
  // the feedback mount out of the app shell would otherwise give a new
  // early-return route a button it never had, in a corner global.css already
  // records as colliding with the footer attribution.
  '/', '/home', '/welcome', '/onboarding', '/feedback', '/spectrum',
])

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

  // Normalised the same way App.jsx normalises before its chromeless check, so
  // a trailing slash or a capital cannot leak a chromeless route past this and
  // paint a button on a Create tool.
  const showButton = useMemo(
    () => !NO_BUTTON.has(location.pathname.toLowerCase().replace(/\/+$/, '') || '/'),
    [location.pathname],
  )

  return (
    <>
      {showButton && (
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
      {/* The menu stays live everywhere the button does not — on /feedback,
          where the button would be redundant next to the form, and on every
          chromeless Create tool, where there is no button by design. "Right-click
          the thing that is wrong" is the fastest way to file about a page, and
          the tools are where there is most to file about. It is
          suppressed while the dialog is open so a right-click inside the form
          reaches the browser's own menu, where Paste lives. */}
      <FeedbackContextMenu onReport={openFromMenu} suppressed={open} />
      <FeedbackModal open={open} onClose={close} seed={seed} />
    </>
  )
}
