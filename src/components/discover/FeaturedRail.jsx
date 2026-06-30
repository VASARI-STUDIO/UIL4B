import { useNavigate } from 'react-router-dom'
import { categoryLabel } from '../../data/discoverCategories'
import CategoryGlyph from './CategoryGlyph'

// Horizontal scroll-snap rail of larger "STAFF PICK" cards. Stacks to a single
// column at ≤480 (handled in CSS). Each card body opens the detail modal; the
// foot button is the primary hand-off. External link stays a real nofollow <a>.
function monogram(title) {
  const words = title.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return title.slice(0, 2).toUpperCase()
}

export default function FeaturedRail({ resources, onOpen, offline }) {
  const navigate = useNavigate()
  if (!resources.length) return null

  const handoff = (tool) => {
    const params = new URLSearchParams()
    if (tool.preset) params.set('preset', tool.preset)
    if (tool.tab) params.set('tab', tool.tab)
    if (!tool.preset) params.set('from', 'discover')
    const qs = params.toString()
    navigate(qs ? `${tool.route}?${qs}` : tool.route)
  }

  return (
    <section className="dsc-featured" aria-label="Featured this week">
      <div className="section-h dsc-featured-h">
        <h2>Featured this week</h2>
        <span className="meta">Staff picks</span>
      </div>
      <div className="dsc-rail-track">
        {resources.map(r => {
          const tool = r.relatedTools?.[0]
          return (
            <article key={r.id} className="dsc-feat-card" data-cat={r.category}>
              <span className="dsc-feat-badge">Staff pick</span>
              <div
                className="dsc-feat-top"
                role="button"
                tabIndex={0}
                onClick={(e) => { if (!e.target.closest('a,button')) onOpen(r) }}
                onKeyDown={(e) => { if (e.key === 'Enter') onOpen(r) }}
                aria-label={`View details for ${r.title}`}
              >
                <div className="dsc-feat-face" data-cat={r.category}>
                  <span className="dsc-face-mono">{monogram(r.title)}</span>
                </div>
                <div className="dsc-feat-meta">
                  <span className="dsc-pill" data-cat={r.category}>
                    <CategoryGlyph category={r.category} size={12} /> {categoryLabel(r.category)}
                  </span>
                  <h3 className="dsc-feat-title">{r.title}</h3>
                  <p className="dsc-feat-desc">{r.shortDescription}</p>
                </div>
              </div>
              <div className="dsc-feat-foot">
                {tool ? (
                  <button
                    className="dsc-foot-cta"
                    data-cat={r.category}
                    onClick={() => handoff(tool)}
                    aria-label={`Use ${r.host} in ${tool.label}`}
                  >
                    <span aria-hidden="true">→</span> Use in {tool.label}
                  </button>
                ) : (
                  <a
                    className={`dsc-foot-visit-primary${offline ? ' is-disabled' : ''}`}
                    href={offline ? undefined : r.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-disabled={offline || undefined}
                    onClick={(e) => { if (offline) e.preventDefault() }}
                  >
                    <span aria-hidden="true">↗</span> Visit site
                  </a>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
