import { Link } from 'react-router-dom'
import Glyph from './Glyph'
import OpenPill from '../spectrum/OpenPill'
import ProjectPlate from './ProjectPlate'
import { projectIcon, projectStatus, ratioName } from './workspace'
import { projectDigest } from '../../utils/userHome'

// The workspace's lead: the newest project that is still in play, with its saved
// palette, the four parts and the next step.
//
// Two things are named here and they are different links: "Continue: set the type
// scale" goes to the tool that builds the first missing part (digest.next); "Open
// <project>" goes to the project's own page. `.uh-card-name` rides on the second, as
// it did on the old card's info block, because several specs find "the control that
// opens a project" by that class.
//
// Signed out, the same card is built from the working design ("Your current palette"):
// there is no project to open, and Sign in takes the place of Open project.

function Tick({ done }) {
  return done ? (
    <svg className="uh-part-mark is-done" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg className="uh-part-mark" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/** The four parts in the order a person thinks of them, each with what it holds. */
export function partRows(digest) {
  const done = Object.fromEntries(digest.parts.map((p) => [p.id, p.done]))
  const n = digest.colourCount
  return [
    { id: 'palette', label: 'Colour', done: done.palette, detail: done.palette ? `${n} colour${n === 1 ? '' : 's'}` : 'not set' },
    { id: 'fonts', label: 'Type', done: done.fonts, detail: done.fonts ? `${digest.heading} over ${digest.body}` : 'not set' },
    { id: 'type-scale', label: 'Type scale', done: done['type-scale'], detail: done['type-scale'] ? `${digest.scaleBase}px, ${ratioName(digest.scaleRatio)}` : 'not set' },
    { id: 'tints', label: 'Tints', done: done.tints, detail: done.tints ? `${digest.tintCount} step${digest.tintCount === 1 ? '' : 's'}` : 'not set' },
  ]
}

/** The next step's words and destination: "Continue: set the type scale", or the contrast check. */
export function nextStepOf(digest) {
  if (digest.next) return { label: `Continue: ${digest.next.action.charAt(0).toLowerCase()}${digest.next.action.slice(1)}`, to: digest.next.tool }
  return { label: 'Check the contrast', to: '/create/contrast' }
}

export default function ContinueCard({ project, design, onSignIn }) {
  const working = !project
  const source = working ? { id: null, name: 'Your current palette', design } : project
  const digest = projectDigest(source)
  const status = working ? null : projectStatus(project)
  const icon = working ? null : projectIcon(project.id, project.icon)
  const paletteSet = digest.parts.find((p) => p.id === 'palette')?.done
  const colors = digest.colors
  const colourShown = !!paletteSet && colors.length > 0
  const step = nextStepOf(digest)
  const name = digest.name

  return (
    <section className="proj-card uh-continue" aria-labelledby="uh-continue-h">
      <h2 id="uh-continue-h" className="uh-sr">Pick up where you left off</h2>
      {/* The plate is aria-hidden, so the words for an unset colour sit beside it, not inside it. */}
      <div className="uh-plate-slot">
        <ProjectPlate colors={colourShown ? colors : []} size="card" />
        {!colourShown && (
          <div className="uh-plate-empty">
            <p>Colour not set.</p>
            <Link to="/create/palette">Build the palette</Link>
          </div>
        )}
      </div>
      <div className="uh-continue-body">
        <div className="uh-continue-top">
          <p className="uh-continue-name uh-card-title" title={name}>{name}</p>
          {icon && (
            <span className="uh-badge" aria-hidden="true">
              {icon.image ? <img src={icon.image} alt="" className="uh-badge-img" /> : <Glyph name={icon.glyph} size={18} />}
            </span>
          )}
        </div>
        <p className="uh-meta uh-card-line">
          {working
            ? 'Saved in this browser. Sign in to keep it as a project.'
            : <>{status.tag}{status.edited ? ` · Edited ${status.edited}` : ''}</>}
        </p>
        <ul className="uh-parts" aria-label="Parts of this project">
          {partRows(digest).map((p) => (
            <li key={p.id} className={p.done ? 'is-done' : ''}>
              <Tick done={p.done} />
              <span>
                {p.label}<span className="uh-sr">{p.done ? ', done' : ''}</span>, {p.detail}
              </span>
            </li>
          ))}
        </ul>
        <div className="uh-continue-actions">
          <OpenPill
            className="uh-cta"
            to={step.to}
            aria-label={working ? undefined : `${step.label}, ${name}`}
          >
            {step.label}
          </OpenPill>
          {working ? (
            <button type="button" className="uh-ghost" onClick={onSignIn}>Sign in</button>
          ) : (
            <Link
              className="uh-card-name uh-open"
              to={`/projects/${encodeURIComponent(project.id)}`}
              aria-label={`Open project, ${name}`}
              data-project={name}
            >
              Open project
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
