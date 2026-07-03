import { Link } from 'react-router-dom'

// Shown when someone reaches an alpha / not-yet-public tool by URL (logged out or
// non-admin) instead of bouncing them away — the "oops, you found something"
// page. Friendly, human, a little playful; the compass badge + copy match the
// rebuilt UI (same tinted-tile icon language as the nav).
export default function ComingSoon() {
  return (
    <div className="coming-wrap">
      <div className="coming-badge" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="24" cy="24" r="18" />
          <path d="M32.5 15.5 28.2 28.2 15.5 32.5 19.8 19.8z" />
        </svg>
      </div>
      <div className="coming-eyebrow">Oops</div>
      <h1 className="coming-title">You found something we&rsquo;re still building.</h1>
      <p className="coming-sub">
        This one&rsquo;s in the workshop — not quite ready for the world yet. It&rsquo;ll open up to
        everyone soon. Thanks for being curious (we won&rsquo;t tell anyone you peeked).
      </p>
      <div className="coming-actions">
        <Link to="/color" className="ui-pill ui-pill-ink ui-pill-md">Explore the tools</Link>
        <Link to="/home" className="ui-pill ui-pill-out ui-pill-md">See what&rsquo;s ready now</Link>
      </div>
    </div>
  )
}
