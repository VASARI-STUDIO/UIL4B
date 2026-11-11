import { Link } from 'react-router-dom'
import { LEARN_ARTICLES } from '../data/learnIndex'
import '../styles/pages/reading-end.css'

// The "read on" list at the bottom of a reading page: guide rows from the
// index, then one row to all of them. `lead` sets the first row large.
export default function ReadingNext({ label, slugs, lead = false }) {
  const rows = slugs.map((s) => LEARN_ARTICLES.find((a) => a.slug === s)).filter(Boolean)
  return (
    <nav className="rd-next" aria-labelledby="rd-next-h">
      <h2 className="rd-next-label" id="rd-next-h">{label}</h2>
      <ul>
        {rows.map((a, i) => (
          <li key={a.slug}>
            <Link className="rd-next-row" data-lead={lead && i === 0 ? 'true' : undefined} to={`/learn/${a.slug}`}>
              <span className="rd-next-text">
                <span className="rd-next-title">{a.title}</span>
                <span className="rd-next-dek">{a.dek}</span>
              </span>
              <span className="rd-next-go" aria-hidden="true">&rarr;</span>
            </Link>
          </li>
        ))}
        <li>
          <Link className="rd-next-row" to="/learn">
            <span className="rd-next-text">
              <span className="rd-next-title">All {LEARN_ARTICLES.length} guides</span>
            </span>
            <span className="rd-next-go" aria-hidden="true">&rarr;</span>
          </Link>
        </li>
      </ul>
    </nav>
  )
}
