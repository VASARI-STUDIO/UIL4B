import { Link } from 'react-router-dom'
import { crawlBlock } from '../data/crawlLinks'
import '../styles/pages/crawl-links.css'

// The visible twin of the link blocks the served shells carry
// (scripts/crawl-html.mjs). Both draw crawlBlock(route), so the HTML a crawler
// gets and the page a person sees list the same links. Renders nothing for a
// route with no block.
export default function CrawlLinks({ route }) {
  const block = crawlBlock(route)
  if (!block) return null
  return (
    <nav className={block.className} aria-label={block.label}>
      {block.sections.map((s) => (
        <div className="crawl-group" key={s.heading}>
          <h2 className="crawl-h">{s.heading}</h2>
          <ul className="crawl-list">
            {s.links.map((l) => (
              <li key={l.href}><Link className="crawl-link" to={l.href}>{l.text}</Link></li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
