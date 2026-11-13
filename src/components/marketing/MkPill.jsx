import { Link } from 'react-router-dom'

// The two pills on /tools and /mobile: one filled with ink (the page's single
// main action) and the outline pill. Each is a real <Link>, so it stays
// middle-clickable. The arrow bubble turns 45 degrees on hover and focus; the
// turn itself lives in v3-marketing.css.
function Arrow({ size }) {
  return (
    <svg className="mk-arrow" aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7 17L17 7M8 7h9v9" />
    </svg>
  )
}

export function InkPill({ to, children, className = '', ...rest }) {
  return (
    <Link className={`mk-pill ${className}`.trim()} to={to} {...rest}>
      {children}
      <span className="mk-go mk-go--ink" aria-hidden="true"><Arrow size={15} /></span>
    </Link>
  )
}

export function OutPill({ to, children, className = '', ...rest }) {
  return (
    <Link className={`mk-out ui-pill-out ${className}`.trim()} to={to} {...rest}>
      {children}
      <span className="mk-go mk-go--out" aria-hidden="true"><Arrow size={14} /></span>
    </Link>
  )
}
