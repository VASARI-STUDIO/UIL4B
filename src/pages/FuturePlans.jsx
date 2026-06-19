import { useMemo, useState } from 'react'

// Internal, admin-only roadmap board. Static for now — a lightweight place to
// track what's shipping next without leaving the app. Grouped by status.
const STATUSES = [
  { id: 'progress', label: 'In progress' },
  { id: 'planned', label: 'Planned' },
  { id: 'exploring', label: 'Exploring' },
  { id: 'shipped', label: 'Recently shipped' },
]

const PLANS = [
  {
    title: 'SEO Spider — multi-page crawler',
    tag: 'SEO',
    status: 'exploring',
    desc: 'Crawl an entire site and audit metadata, headings, internal links, broken links, and Core Web Vitals across every page — not just one URL at a time.',
  },
  {
    title: 'Community Hub',
    tag: 'Community',
    status: 'progress',
    desc: 'Browse, submit, and save community designs. Ranking is driven purely by save count; a heart toggle with a live counter appears on hover.',
  },
  {
    title: 'Homepage redesign',
    tag: 'Marketing',
    status: 'progress',
    desc: 'A Linear-inspired marketing homepage with sharper hierarchy, motion, and conversion flow, applied as the visual language across the app.',
  },
  {
    title: 'SEO Specialist workspace',
    tag: 'SEO',
    status: 'planned',
    desc: 'Group the Alt Text generator with on-page SEO tooling into a single dedicated workspace, with real keyword and metadata data feeding the views.',
  },
  {
    title: 'Information Centre',
    tag: 'Docs',
    status: 'planned',
    desc: 'A single, fully indexable documentation hub with interactive dropdowns, an in-page resize tool, live screen stats, and reusable intro popups.',
  },
  {
    title: 'File Converter — graduate from alpha',
    tag: 'Imagery',
    status: 'planned',
    desc: 'Polish the image + video converter (resize engine, format coverage, batch UX) and promote it out of alpha to all users.',
  },
  {
    title: 'Team collaboration & white-label',
    tag: 'Pro',
    status: 'exploring',
    desc: 'Shared projects, team workspaces, and custom branding / white-label exports for the top subscription tier.',
  },
  {
    title: 'Aspect Ratio Calculator',
    tag: 'Imagery',
    status: 'shipped',
    desc: 'Lock a ratio, enter one dimension, and get the matching size with a live shape preview. Plus reverse size → ratio with gcd reduction.',
  },
  {
    title: 'Dark-only interface',
    tag: 'Design',
    status: 'shipped',
    desc: 'Locked the app to a single, carefully tuned dark theme and removed appearance customisation for a consistent, curated surface.',
  },
]

export default function FuturePlans() {
  const [filter, setFilter] = useState('all')

  const tags = useMemo(() => ['all', ...Array.from(new Set(PLANS.map(p => p.tag)))], [])
  const visible = useMemo(
    () => (filter === 'all' ? PLANS : PLANS.filter(p => p.tag === filter)),
    [filter]
  )

  return (
    <div className="fp-wrap">
      <header className="fp-head">
        <div className="fp-head-eyebrow">Admin · Roadmap</div>
        <h1 className="fp-head-title">Future Plans</h1>
        <p className="fp-head-sub">
          What's shipping next for UIL4B. Internal board — visible to admins only.
        </p>
      </header>

      <div className="fp-filters" role="tablist" aria-label="Filter by area">
        {tags.map(tagName => (
          <button
            key={tagName}
            type="button"
            role="tab"
            aria-selected={filter === tagName}
            className={`fp-filter${filter === tagName ? ' is-active' : ''}`}
            onClick={() => setFilter(tagName)}
          >
            {tagName === 'all' ? 'All' : tagName}
          </button>
        ))}
      </div>

      {STATUSES.map(status => {
        const items = visible.filter(p => p.status === status.id)
        if (!items.length) return null
        return (
          <section key={status.id} className="fp-group">
            <div className="fp-group-head">
              <span className={`fp-dot fp-dot-${status.id}`} />
              <h2 className="fp-group-label">{status.label}</h2>
              <span className="fp-group-count">{items.length}</span>
            </div>
            <div className="fp-grid">
              {items.map(plan => (
                <article key={plan.title} className="fp-card">
                  <div className="fp-card-head">
                    <h3 className="fp-card-title">{plan.title}</h3>
                    <span className="fp-card-tag">{plan.tag}</span>
                  </div>
                  <p className="fp-card-desc">{plan.desc}</p>
                </article>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
