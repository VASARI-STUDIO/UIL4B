import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Glyph from './Glyph'
import { PROJECT_GLYPHS, projectIcon, projectStatus } from './workspace'

// One card under "Recent projects" (UIL4B App.dc.html, `projects` screen).
//
// The design's card, as drawn: a 132px strip of the project's palette under a .34 scrim,
// a 54px icon tile in the middle, a 2px progress bar along the strip's foot,
// and under it the name, a status tag and "Edited …, n of 4 parts". A pencil
// in the strip's corner opens a six-icon picker over the strip.
//
// Every value is the project's own: the strip is its saved palette, the bar and
// the "n of 4" are the four parts utils/userHome.js reads off the design, the
// tag is Ready / In progress / Archived from the same read and the archive flag.
//
// The info block is a LINK, not the design's button: it goes to /projects/:id, and a
// destination is a link (it opens in a new tab, it is announced as one).
// `.uh-card-name` stays on it because six specs measure the card's open control
// by that class.
export default function ProjectTile({ project, onPickIcon }) {
  const [picking, setPicking] = useState(false)
  const pickerRef = useRef(null)
  const editRef = useRef(null)
  const status = projectStatus(project)
  const icon = projectIcon(project.id, project.icon)
  const colors = status.digest.colors

  // The picker closes on Escape and hands focus back to the pencil, the
  // popover contract the rest of the app keeps.
  useEffect(() => {
    if (!picking) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') { setPicking(false); editRef.current?.focus() }
    }
    document.addEventListener('keydown', onKey)
    pickerRef.current?.querySelector('button[aria-pressed="true"]')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [picking])

  const editLabel = picking ? 'Close' : 'Change icon'

  return (
    <article className={`proj-card uh-card${project.archived ? ' is-archived' : ''}`}>
      <div className="uh-card-art">
        <span className="uh-card-strip" aria-hidden="true">
          {colors.map((c, i) => <span key={`${c}-${i}`} style={{ background: c }} />)}
        </span>
        <span className="uh-card-scrim" aria-hidden="true" />
        <span className="uh-card-tile-wrap" aria-hidden="true">
          <span className="uh-card-tile">
            {icon.image
              ? <img src={icon.image} alt="" className="uh-card-img" />
              : <Glyph name={icon.glyph} size={25} />}
          </span>
        </span>
        <span className="uh-card-edit">
          <button
            type="button"
            ref={editRef}
            className="uh-card-pencil"
            aria-label={`${editLabel} for ${project.name}`}
            title={editLabel}
            aria-expanded={picking}
            onClick={() => setPicking((v) => !v)}
          >
            <Glyph name="pencil-simple" size={14} />
          </button>
        </span>
        {picking && (
          <span className="uh-card-picker" ref={pickerRef} role="group" aria-label={`Icon for ${project.name}`}>
            {PROJECT_GLYPHS.map((g) => {
              const on = icon.glyph === g
              const name = g.replace(/-/g, ' ')
              return (
                <button
                  key={g}
                  type="button"
                  className="uh-card-pick"
                  aria-label={`Use the ${name} icon`}
                  aria-pressed={on}
                  title={name}
                  onClick={() => { onPickIcon?.(project.id, g); setPicking(false); editRef.current?.focus() }}
                >
                  <Glyph name={g} size={14} />
                </button>
              )
            })}
          </span>
        )}
        <span className="uh-card-bar" aria-hidden="true"><span style={{ width: status.pct }} /></span>
      </div>
      <Link className="uh-card-name" to={`/projects/${encodeURIComponent(project.id)}`}>
        <span className="uh-card-top">
          <span className="uh-card-title">{project.name}</span>
          <span className={`uh-card-tag${status.ready ? ' is-ready' : ''}`}>{status.tag}</span>
        </span>
        <span className="uh-card-line">
          {status.edited ? `Edited ${status.edited}, ` : ''}{status.has}
        </span>
      </Link>
    </article>
  )
}
