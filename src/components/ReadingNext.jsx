import { Link } from 'react-router-dom'
import { LEARN_ARTICLES } from '../data/learnIndex'
import '../styles/pages/reading-end.css'

// The "read on" list at the bottom of a reading page: guide rows from the
// index, then one row to all of them. `lead` sets the first row large.
// `variant="help"` is Help's foot: the guide rows alone, with a circled arrow.
export default function ReadingNext({ label, slugs, lead = false, variant }) {
  const rows = slugs.map((s) => LEARN_ARTICLES.find((a) => a.slug === s)).filter(Boolean)
  const help = variant === 'help'
  return (
    <nav className="rd-next" data-variant={help ? 'help' : undefined} aria-labelledby="rd-next-h">
      <h2 className="rd-next-label" id="rd-next-h">{label}</h2>
      <ul>
        {rows.map((a, i) => (
          <li key={a.slug}>
            <Link className="rd-next-row" data-lead={lead && i === 0 ? 'true' : undefined} to={`/learn/${a.slug}`}>
              <span className="rd-next-text">
                <span className="rd-next-title">{a.title}</span>
                <span className="rd-next-dek">{a.dek}</span>
              </span>
              {help ? (
                <span className="rd-next-circle" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </span>
              ) : (
                <span className="rd-next-go" aria-hidden="true">&rarr;</span>
              )}
            </Link>
          </li>
        ))}
        {!help && (
          <li>
            <Link className="rd-next-row" to="/learn">
              <span className="rd-next-text">
                <span className="rd-next-title">All {LEARN_ARTICLES.length} guides</span>
              </span>
              <span className="rd-next-go" aria-hidden="true">&rarr;</span>
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
