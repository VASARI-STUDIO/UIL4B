import { useState } from 'react'
import { Link } from 'react-router-dom'
import { projectStatus } from './workspace'

// The other projects, under the lead: one ruled row each, no surface. The row is one link to the
// project's page. Archived projects sit last and say so before the parts.
//
// Up to six show at once; past that, five do and "Show all N projects" opens the rest in place
// (aria-expanded; focus stays on the button). `total` is the account's whole count, the lead included.

const SHOWN = 5
const ALL_UNDER = 6

export default function ProjectRows({ projects, total }) {
  const [open, setOpen] = useState(false)
  if (!projects.length) return null
  const collapsible = projects.length > ALL_UNDER
  const list = collapsible && !open ? projects.slice(0, SHOWN) : projects
  return (
    <div className="uh-rows-wrap">
      <ul className="uh-rows" aria-label="Other projects">
        {list.map((p) => {
          const status = projectStatus(p)
          return (
            <li key={p.id} className={`proj-card uh-row${p.archived ? ' is-archived' : ''}`}>
              <Link
                className="uh-card-name uh-row-link"
                to={`/projects/${encodeURIComponent(p.id)}`}
                data-project={status.digest.name}
              >
                <span className="uh-mini" aria-hidden="true">
                  {status.digest.colors.map((c, i) => <span key={`${c}-${i}`} style={{ background: c }} />)}
                </span>
                <span className="uh-row-name uh-card-title">{status.digest.name}</span>
                <span className="uh-row-meta uh-card-line">
                  {p.archived ? 'Archived · ' : ''}{status.has}{status.edited ? ` · Edited ${status.edited}` : ''}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      {collapsible && (
        <button type="button" className="uh-more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'Show fewer' : `Show all ${total} projects`}
        </button>
      )}
    </div>
  )
}
