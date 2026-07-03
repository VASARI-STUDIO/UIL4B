import { Link } from 'react-router-dom'

// Shown when someone reaches an alpha / not-yet-public tool by URL (logged out
// or non-admin) instead of bouncing them away. Friendly, human, a little playful.
export default function ComingSoon() {
  return (
    <div className="coming-wrap">
      <div className="coming-emoji" aria-hidden="true">🤫</div>
      <div className="coming-eyebrow">Shhh…</div>
      <h1 className="coming-title">You found something we&rsquo;re still building.</h1>
      <p className="coming-sub">
        This one&rsquo;s in the workshop — not quite ready for the world yet. It&rsquo;ll open up
        to everyone soon. Thanks for being curious (we won&rsquo;t tell anyone you peeked).
      </p>
      <div className="coming-actions">
        <Link to="/color" className="ui-pill ui-pill-ink ui-pill-md">Explore the tools</Link>
        <Link to="/home" className="ui-pill ui-pill-out ui-pill-md">See what&rsquo;s ready now</Link>
      </div>
    </div>
  )
}
