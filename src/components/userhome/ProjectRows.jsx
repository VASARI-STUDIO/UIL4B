import { useState } from 'react'
import { Link } from 'react-router-dom'
import PhIcon from '../spectrum/PhIcon'
import ProjectPlate from './ProjectPlate'
import { projectStatus } from './workspace'

// The other projects, under the lead: one ruled row each, no surface. The row is one link to the
// project's page. Archived projects sit last and say so before the parts.
//
// Up to six projects show all their rows; past that, five rows show and "Show all N projects" opens
// the rest in place (aria-expanded; focus stays on the button). `total` is the account's whole count,
// the lead included.
//
// A project whose Colour part is not set does not draw its colours: the default palette would read as
// its own. It gets an empty plate and says "Colour not set" in its line, as the lead card does.
// The row is the /tools row (.spt-row): a drawn thumb, name and line, and the arrow.

const SHOWN = 5
const ALL_UNDER = 6

export default function ProjectRows({ projects, total, label = 'Other projects' }) {
  const [open, setOpen] = useState(false)
  if (!projects.length) return null
  const collapsible = total > ALL_UNDER && projects.length > SHOWN
  const list = collapsible && !open ? projects.slice(0, SHOWN) : projects
  return (
    <div className="uh-rows-wrap">
      <ul className="uh-rows spt-rows" aria-label={label}>
        {list.map((p) => {
          const status = projectStatus(p)
          const colourSet = status.digest.parts.find((part) => part.id === 'palette')?.done
          return (
            <li key={p.id} className={`proj-card uh-row${p.archived ? ' is-archived' : ''}`}>
              <Link
                className="uh-card-name uh-row-link spt-row"
                to={`/projects/${encodeURIComponent(p.id)}`}
                data-project={status.digest.name}
              >
                <span className="spt-thumb"><ProjectPlate size="thumb" colors={colourSet ? status.digest.colors : []} /></span>
                <span className="spt-row-text">
                  <b className="uh-row-name uh-card-title" title={status.digest.name}>{status.digest.name}</b>
                  <span className="uh-row-meta uh-card-line">
                    {p.archived ? 'Archived · ' : ''}{colourSet ? '' : 'Colour not set · '}{status.has}{status.edited ? ` · Edited ${status.edited}` : ''}
                  </span>
                </span>
                <span className="spt-row-go" aria-hidden="true"><PhIcon name="arrow-up-right" /></span>
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
