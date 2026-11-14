import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadFont } from '../../utils/googleFonts'
import { projectDigest, relativeTime } from '../../utils/userHome'
import { numberWord } from '../userhome/workspace'

// "Other projects": every project except the one the kit sheet draws, as mini sheets (a palette strip, the
// name, a line of facts and the next step). Four show at first; past four, Find and "Show all N" appear, so
// an account with many projects reaches every one of them from this page.
//
//   Free    the other projects, then a "New project" row while there is room under the cap
//   Pro     the first four, Find (a name search over all of them), Show all / Show fewer
//
// A mini links to the project's own page. The name is set in the project's heading face once its fonts are
// paired (the first dozen only, so Show all does not request a font per project).

const FIRST = 4
const FACES = 12

const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1)
const stack = (family) => `'${family}', system-ui, sans-serif`
const isHex = (c) => typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c)

/** The facts a mini draws, read off the project. */
export function miniOf(project) {
  const digest = projectDigest(project)
  const fonts = digest.parts.find((p) => p.id === 'fonts')
  const when = relativeTime(digest.updatedAt)
  return {
    id: project.id,
    name: digest.name,
    colours: digest.parts.find((p) => p.id === 'palette')?.done ? digest.colors.filter(isHex) : [],
    archived: digest.archived,
    face: fonts?.done ? { family: digest.heading, weight: project.design?.fonts?.heading?.weight ?? 700 } : null,
    meta: `${digest.done} of ${digest.total} parts set.${when ? ` Edited ${when}.` : ''}`,
    next: digest.archived ? 'Archived' : digest.next ? `Next: ${lower(digest.next.action)}` : 'Ready',
  }
}

function Mini({ m, withFace }) {
  const face = withFace ? m.face : null
  return (
    <Link className="db-mini" to={`/projects/${encodeURIComponent(m.id)}`}>
      <span className={`db-strip${m.colours.length ? '' : ' none'}${m.archived ? ' arch' : ''}`} aria-hidden="true">
        {m.colours.length ? m.colours.map((c, i) => <span key={`${c}-${i}`} style={{ background: c }} />) : 'No palette yet'}
      </span>
      <span className="nm" style={face ? { fontFamily: stack(face.family), fontWeight: face.weight, letterSpacing: '0' } : { fontWeight: 600, letterSpacing: '-.01em' }}>{m.name}</span>
      <span className="mt">{m.meta}</span>
      <span className="nx">{m.next}</span>
    </Link>
  )
}

/** The grid of minis, with the heading row (and Find) above it. `others` are already ordered. */
export function OtherProjects({ others, room, onNew, busy = false }) {
  const [showAll, setShowAll] = useState(false)
  const [q, setQ] = useState('')
  const minis = useMemo(() => others.map(miniOf), [others])
  const many = minis.length > FIRST
  const query = q.trim().toLowerCase()

  let shown = minis
  if (many && query) shown = minis.filter((m) => m.name.toLowerCase().includes(query))
  else if (many && !showAll) shown = minis.slice(0, FIRST)

  // Fonts for the names that draw in them.
  useEffect(() => {
    for (const m of shown.slice(0, FACES)) if (m.face) loadFont(m.face.family, [m.face.weight])
  }, [shown])

  if (!minis.length) return null
  const noMatch = many && !!query && shown.length === 0
  const clear = () => { setQ(''); document.getElementById('db-find')?.focus() }
  const countText = many && query ? `${shown.length} ${shown.length === 1 ? 'project' : 'projects'}` : ''
  const showAllText = `Show all ${minis.length}`

  return (
    <section className="db-group" aria-labelledby="db-oh">
      <div className={`db-gh${many ? ' find' : ''}`}>
        <h2 id="db-oh">Other projects</h2>
        {many && (
          <div className="db-find">
            <label htmlFor="db-find">Find</label>
            <div className="db-fwrap">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input
                id="db-find"
                className="db-input"
                type="search"
                aria-label="Find a project"
                autoComplete="off"
                spellCheck="false"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                data-testid="project-find"
              />
            </div>
          </div>
        )}
      </div>
      <ul className="db-minis" style={{ '--cols': 4, '--gap': '24px' }} data-testid="other-projects">
        {shown.map((m, i) => <li key={m.id}><Mini m={m} withFace={i < FACES} /></li>)}
        {room > 0 && (
          <li>
            <button type="button" className="db-gt" onClick={onNew} disabled={busy} aria-busy={busy || undefined}>
              <span className="r">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                <span className="gn">New project</span>
              </span>
              <span className="gd">{`Room for ${room === 1 ? 'one more project' : `${numberWord(room)} more projects`} on Free.`}</span>
            </button>
          </li>
        )}
      </ul>
      {noMatch && (
        <div className="db-nomatch"><p>{`No project called “${q.trim()}”.`}</p><button type="button" className="db-textbtn" onClick={clear}>Clear</button></div>
      )}
      {many && !query && !showAll && <div className="db-more"><button type="button" className="db-textbtn" onClick={() => setShowAll(true)}>{showAllText}</button></div>}
      {many && !query && showAll && <div className="db-more"><button type="button" className="db-textbtn" onClick={() => setShowAll(false)}>Show fewer</button></div>}
      {many && !!query && <div className="db-more"><button type="button" className="db-textbtn" disabled>{showAllText}</button></div>}
      <p className="db-sr" role="status" aria-live="polite">{countText}</p>
    </section>
  )
}

/** The skeleton the section shows while the account's list is still coming. */
export function OtherProjectsSkeleton() {
  return (
    <section className="db-group" aria-hidden="true">
      <div className="db-gh"><span className="db-sk" style={{ width: 160, height: 20, borderRadius: 4 }} /></div>
      <div className="db-minis" style={{ '--cols': 4, '--gap': '24px' }}>
        <span className="db-sk" style={{ height: 200, borderRadius: 12 }} />
        <span className="db-sk" style={{ height: 44, borderRadius: 12, gridColumn: 'span 2', alignSelf: 'start' }} />
      </div>
    </section>
  )
}
