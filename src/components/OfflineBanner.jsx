import useOnline from '../hooks/useOnline'

// The app-level "your connection is the problem" signal.
//
// Before this, offline was handled only per-surface: the font catalogue fell
// back to its bundled list, the emoji index refused to load, the Discover cards
// showed their own notice. Each was correct and none of them said the thing
// that actually helps — that the network is down, that nothing the user did
// caused it, and which parts of the product still work without it.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY IT LISTS WHAT STILL WORKS
// ─────────────────────────────────────────────────────────────────────────────
// Most of UIL4B is local. The palette maths, the tint scales, the type scale,
// the contrast checker and every export run in the browser with no network at
// all. A bare "You are offline" would send someone away from a product that is
// still almost entirely usable; naming the three things that genuinely need a
// connection is both shorter and more useful than a generic apology.
//
// Deliberately NOT dismissible. It disappears the moment the connection comes
// back, so a dismiss control would only ever hide a true statement about the
// present — and the surfaces underneath it will keep failing while it is true.
//
// `role="status"` with `aria-live="polite"`, not `alert`: losing a connection
// is worth announcing, but not worth interrupting whatever a screen-reader user
// is in the middle of.
function CloudOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18.5 19H9a7 7 0 0 1-1.2-13.9" />
      <path d="M10.6 4.3A7 7 0 0 1 20 9.5a4.5 4.5 0 0 1 1.4 8.2" />
      <path d="m2 2 20 20" />
    </svg>
  )
}

export default function OfflineBanner() {
  const online = useOnline()
  if (online) return null

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <CloudOffIcon />
      <p className="offline-banner-text">
        <strong>You’re offline.</strong>{' '}
        Colour, typography and export tools keep working — they run in your browser.
        The AI tools, the font catalogue and Discover need a connection and will
        pick up on their own once it’s back.
      </p>
    </div>
  )
}
