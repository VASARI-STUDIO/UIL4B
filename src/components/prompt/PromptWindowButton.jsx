import { Link, useLocation } from 'react-router-dom'
import { fullViewHref, normalViewHref } from '../../utils/libraryView'

// The toolbar's window control, one 44px icon button at the end of the search row.
//
// On the normal page it is "Open in new window": a real button that opens the
// full-screen view (no nav, no footer) with `window.open(..., 'noopener')`, so the
// new window has no handle back on this one. The address carries the list the
// visitor is reading (the hash) and any other query.
//
// In the full-screen view it is a link back to the normal page instead. The
// window was opened without an opener, so it cannot close itself, and it has no
// nav to leave by; the link keeps this window and brings the nav back.
const ICON = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

export default function PromptWindowButton({ full }) {
  const { pathname, search, hash } = useLocation()

  if (full) {
    return (
      <Link className="btn pl-win-btn pl-win-btn--back" to={normalViewHref(pathname, search, hash)} aria-label="Back to the normal page" title="Back to the normal page">
        <svg {...ICON}><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /></svg>
      </Link>
    )
  }
  return (
    <button
      type="button"
      className="btn pl-win-btn"
      aria-label="Open in new window"
      title="Open in new window"
      onClick={() => { window.open(fullViewHref(pathname, search, hash), '_blank', 'noopener') }}
    >
      <svg {...ICON}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" /></svg>
    </button>
  )
}
