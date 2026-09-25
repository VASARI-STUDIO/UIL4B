import { Link } from 'react-router-dom'
import PhIcon from './PhIcon'

// The design's small ink pill — "Open Palette Builder ↗" and its kin: 13px/540
// on the ink ground, a 24px bubble whose arrow turns 45° on hover. A real
// <Link>, so it stays middle-clickable.
export default function OpenPill({ to, children }) {
  return (
    <Link className="sp-pill" to={to}>
      <span>{children}</span>
      <span className="sp-pill-icon" aria-hidden="true"><PhIcon name="arrow-up-right" /></span>
    </Link>
  )
}
