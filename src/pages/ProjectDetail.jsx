import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useClipboard } from '../hooks/useClipboard'
import { buildCSSVars } from '../utils/exportBuilder'
import { activeColour, deriveTints } from '../utils/projectTints'
import { savedColoursOf } from '../utils/savedColours'
import { loadFont } from '../utils/googleFonts'
import Glyph from '../components/userhome/Glyph'
import ProjectActions from '../components/userhome/ProjectActions'
import IconPicker from '../components/userhome/IconPicker'
import ConfirmDialog from '../components/overlay/ConfirmDialog'
import ProjectLinkGone from '../components/userhome/ProjectLinkGone'
import { useWasSignedIn } from '../hooks/useWasSignedIn'
import { UPGRADE_LINE, byRecent, projectSlots4, projectStatus, scaleSteps } from '../components/userhome/workspace'
import '../styles/pages/projects.css'
import '../styles/pages/project-v3.css'
import { readLastPick, resolvePreset } from '../config/dialogExport'
// `lazy` in this file is lazyRoute, not React's: if the file for the export dialog
// failed to download, it waits for the recovery reload instead of crashing.
import { lazyRoute as lazy } from '../utils/lazyRoute'

const ExportDialog = lazy(() => import('../components/export/ExportDialog'))

// /projects/:id: one project. A rail (name, progress, the four parts as an index, the
// next action, Save, the icon) beside four bands, one per part, then the export line,
// the saved colours and the other projects.
//
// Every action works on THIS project: "Open in", the next action and the empty parts'
// buttons load it into the tools first, then open the tool that builds that part.
// Opening a tool without loading would quietly edit whatever design was open before.
//
// Rename, duplicate, archive or restore and delete sit behind the menu beside Save.

// The longest a project link waits for the account's projects before it gives up
// and sends the visitor to the workspace.
const LOOKUP_WAIT_MS = 10000

// The page's order and names for the four parts (projectSlots4 has its own order).
const BANDS = [
  { id: 'palette', label: 'Palette', openIn: 'Palette Builder' },
  { id: 'type-scale', label: 'Type scale', openIn: 'Type Scale' },
  { id: 'fonts', label: 'Font pair', openIn: 'Font Pair' },
  { id: 'tints', label: 'Tints', openIn: 'Tint' },
]

const isHex = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)

// Ink or paper, whichever reads better over the colour.
function readableOn(hex) {
  const f = hex.replace('#', '').slice(0, 6)
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(f.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return (lum + 0.05) / (0.0037 + 0.05) >= (0.86 + 0.05) / (lum + 0.05) ? '#0B0C0E' : '#EFEEEA'
}

const reducedMotion = () => {
  const attr = document.documentElement.getAttribute('data-reduced-motion')
  if (attr === 'true') return true
  if (attr === 'false') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

const familyCss = (name) => `'${name}', system-ui, sans-serif`

function CheckIcon() {
  return (
    <svg className="pjv-ck" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowUpRight({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M3.5 8.5l5-5M4.5 3.5h4v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// A different project is a different page: keyed on the id, so nothing — a
// half-typed rename, an armed delete, "Saved" — carries from one to the next.
export default function ProjectDetailRoute(props) {
  const { id } = useParams()
  return <ProjectDetail key={id} id={id} {...props} />
}

function ProjectDetail({ id, toast }) {
  const navigate = useNavigate()
  const { loading: authLoading } = useAuth()
  const { isPro, loading: planLoading } = useSubscription()
  const {
    projects, canSaveProjects, projectsLoading, projectLimit,
    loadProject, overwriteProject, renameProject, duplicateProject, archiveProject, deleteProject,
  } = useProject()
  const copy = useClipboard()

  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  const [renameError, setRenameError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exporting, setExporting] = useState(false)
  // The pick the export dialog opens on, fixed when it opens.
  const [exportPreset, setExportPreset] = useState(null)
  const [activeBand, setActiveBand] = useState('palette')
  const copyTimer = useRef(null)
  const nameRef = useRef(null)

  const project = projects.find((p) => p.id === id)
  const wasSignedIn = useWasSignedIn(canSaveProjects)
  const [leaving, setLeaving] = useState(false)

  // A project missing from the list is "not found" only once the list is known.
  // On a fresh load the account has not answered yet (sign-in is still settling,
  // or this device has not read the account's projects), so the list is
  // unknown, not empty. Waiting is capped: a read that never lands ends in the
  // redirect below rather than a loader that never leaves.
  const unknown = !project && (authLoading || (canSaveProjects && projectsLoading))
  const [gaveUp, setGaveUp] = useState(false)
  useEffect(() => {
    if (!unknown) return undefined
    const timer = setTimeout(() => setGaveUp(true), LOOKUP_WAIT_MS)
    return () => clearTimeout(timer)
  }, [unknown])

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  // The type bands show the project's own fonts.
  const headingFont = project?.design?.fonts?.heading
  const bodyFont = project?.design?.fonts?.body
  useEffect(() => {
    if (headingFont?.family) loadFont(headingFont.family, [headingFont.weight || 400])
    if (bodyFont?.family) loadFont(bodyFont.family, [bodyFont.weight || 400])
  }, [headingFont?.family, headingFont?.weight, bodyFont?.family, bodyFont?.weight])

  // The index marks the band nearest the top of the screen.
  const hasProject = Boolean(project)
  useEffect(() => {
    if (!hasProject || typeof IntersectionObserver === 'undefined') return undefined
    const seen = new Map()
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target.id, e.isIntersecting))
      const first = BANDS.find((b) => seen.get(`pjv-${b.id}`))
      if (first) setActiveBand(first.id)
    }, { rootMargin: '-20% 0px -60% 0px' })
    BANDS.forEach((b) => { const el = document.getElementById(`pjv-${b.id}`); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [hasProject])

  const goToBand = useCallback((e, bandId) => {
    e.preventDefault()
    const el = document.getElementById(`pjv-${bandId}`)
    if (!el) return
    setActiveBand(bandId)
    el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
    el.querySelector('h2')?.focus({ preventScroll: true })
  }, [])

  if (unknown && !gaveUp) {
    return (
      <div className="pjv">
        <div className="pjv-load" role="status"><p>Opening your project…</p></div>
      </div>
    )
  }
  // No account, or no such project on it (deleted here or on another device).
  if (!canSaveProjects || !project) return <ProjectLinkGone quiet={leaving || (wasSignedIn && !canSaveProjects)} />

  const status = projectStatus(project)
  const { digest } = status
  const design = project.design || {}
  const slotById = Object.fromEntries(projectSlots4(project).map((s) => [s.id, s]))
  const savedColours = savedColoursOf(project)
  const complete = digest.done === digest.total
  const open = digest.total - digest.done
  const others = projects.filter((p) => p.id !== id).sort(byRecent)
  const freeSlots = Number.isFinite(projectLimit) ? projectLimit : null
  const nextSlot = digest.next ? slotById[digest.next.id] : null

  const openIn = (route) => { loadProject(project.id); navigate(route) }
  const startExport = () => {
    loadProject(project.id)
    setExportPreset(resolvePreset(readLastPick()))
    setExporting(true)
  }

  const statusLine = project.archived
    ? `Archived, ${digest.done} of ${digest.total} parts set.`
    : complete
      ? 'Complete and ready to export'
      : `${digest.done} of ${digest.total} parts set.${status.edited ? ` Edited ${status.edited}.` : ''}`

  const onSave = () => {
    overwriteProject(project.id)
    setSaved(true)
    toast(`Saved over "${project.name}"`)
  }

  const onCopy = (bandId) => {
    const text = bandId === 'palette'
      ? buildCSSVars({ palette: design.palette })
      : bandId === 'fonts'
        ? buildCSSVars({ fonts: design.fonts })
        : bandId === 'type-scale'
          ? buildCSSVars({ typeScale: design.typeScale })
          : buildCSSVars({ tints: design.tints })
    copy(text).then((ok) => {
      if (!ok) return
      setCopied(bandId)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(''), 1100)
    })
  }

  const onDuplicate = () => {
    try {
      duplicateProject(project.id)
      toast(`Duplicated "${project.name}"`)
    } catch (e) {
      // The cap, in ProjectContext's words, as an ERROR toast: there is no form
      // to hold it, and the success tick must not be drawn over a refusal.
      toast(e.message || 'Could not duplicate that project', 'error')
    }
  }

  const onArchive = () => {
    archiveProject(project.id)
    toast(project.archived ? `"${project.name}" restored` : `"${project.name}" archived`)
  }

  const onDelete = () => {
    setLeaving(true)
    deleteProject(project.id)
    toast('Project deleted')
    navigate('/projects', { replace: true })
  }

  const closeRename = () => {
    setRenaming(false)
    setRenameError('')
    requestAnimationFrame(() => nameRef.current?.focus())
  }
  const saveRename = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setRenameError('Give the project a name.')
      return
    }
    renameProject(project.id, name.trim())
    toast('Renamed')
    closeRename()
  }

  // The primary action: finish what is missing, or export what is finished. An
  // archived project's is to bring it back.
  let primary
  if (project.archived) {
    primary = { label: 'Restore', run: () => { archiveProject(project.id); toast(`"${project.name}" restored`) } }
  } else if (complete) {
    primary = { label: 'Export project', run: startExport, icon: 'download' }
  } else if (digest.next) {
    primary = {
      label: `Continue: ${(nextSlot?.emptyCta || 'build the next part').toLowerCase()}`,
      to: digest.next.tool,
    }
  }
  const primaryIcon = primary?.icon === 'download'
    ? <Glyph name="download-simple" size={14} />
    : <ArrowUpRight size={14} />
  const primaryNode = primary && (primary.to ? (
    <Link className="pjv-go" to={primary.to} onClick={() => loadProject(project.id)}>
      <span>{primary.label}</span>
      <span className="pjv-goico" aria-hidden="true">{primaryIcon}</span>
    </Link>
  ) : (
    <button type="button" className="pjv-go" onClick={primary.run}>
      <span>{primary.label}</span>
      <span className="pjv-goico" aria-hidden="true">{primaryIcon}</span>
    </button>
  ))

  // What the index and the band heads say about each part.
  const indexValue = (b) => {
    const slot = slotById[b.id]
    if (!slot.done) return 'Not set'
    if (b.id === 'palette') return String(digest.colourCount)
    if (b.id === 'type-scale') return digest.scaleRatio.toFixed(3)
    if (b.id === 'fonts') return digest.heading
    return String(digest.tintCount)
  }
  const bandMeta = (b) => {
    const slot = slotById[b.id]
    if (!slot.done) return 'Not set'
    if (b.id === 'type-scale') return digest.scaleRatio.toFixed(3)
    if (b.id === 'fonts') return `${digest.heading} over ${digest.body}`
    return slot.detail
  }

  const headFamily = headingFont?.family
  const emptyBody = (b, note) => {
    const slot = slotById[b.id]
    return (
      <div className="pjv-empty">
        {note && <p>{note}</p>}
        <Link className="pjv-ghost" to={slot.tool} onClick={() => loadProject(project.id)} style={{ width: 'fit-content' }}>
          <Glyph name="plus" size={13} />
          <span>{slot.emptyCta}</span>
        </Link>
      </div>
    )
  }

  const renderBand = (b) => {
    const slot = slotById[b.id]
    if (b.id === 'palette') {
      if (!slot.done) return emptyBody(b, slot.emptyNote)
      const colours = slot.ramp
      return (
        <div className="pjv-pal" role="img" aria-label={`Palette: ${colours.join(', ')}`}>
          {colours.map((c, i) => <span key={`${c}-${i}`} className="pjv-stop" style={{ background: c, color: readableOn(c) }}>{c.toUpperCase()}</span>)}
        </div>
      )
    }
    if (b.id === 'type-scale') {
      if (!slot.done) return emptyBody(b, slot.emptyNote)
      const steps = scaleSteps(digest.scaleBase, digest.scaleRatio)
      return (
        <div className="pjv-pn">
          <div className="pjv-tsg">
            {steps.map((px) => (
              <div key={px} className="pjv-ts">
                <span className="pjv-ts-aa" aria-hidden="true" style={{ fontSize: px, lineHeight: `${px}px`, fontFamily: headFamily ? familyCss(headFamily) : undefined, fontWeight: headingFont?.weight || 800 }}>Aa</span>
                <span className="pjv-ts-px">{px} px</span>
              </div>
            ))}
          </div>
          <p className="pjv-note">{slot.detail}</p>
        </div>
      )
    }
    if (b.id === 'fonts') {
      if (!slot.done) return emptyBody(b, slot.emptyNote)
      return (
        <div className="pjv-pn">
          <div className="pjv-fp">
            <div>
              <div className="pjv-fp-name" style={{ fontFamily: familyCss(digest.heading), fontWeight: headingFont?.weight || 800 }}>{digest.heading}</div>
              <p className="pjv-fp-meta">Heading, {headingFont?.weight || 800}</p>
            </div>
            <div>
              <p className="pjv-fp-sample" style={{ fontFamily: familyCss(digest.body) }}>Book a pickup by ten and your parcel is there by twelve. Mai collects from 88 Brunswick Street, rides the lanes you would not drive, and signs it in at 240 Adelaide Street.</p>
              <p className="pjv-fp-meta">{slot.typeBody}</p>
            </div>
          </div>
        </div>
      )
    }
    // Tints
    if (slot.done) {
      const scale = slot.ramp
      const from = activeColour(design)
      const at = from ? scale.findIndex((c) => c.toLowerCase() === from.toLowerCase()) : -1
      return (
        <>
          <div className="pjv-tn" role="img" aria-label={`${scale.length} tint steps`}>
            {scale.map((c, i) => <span key={`${c}-${i}`} style={{ background: c }} />)}
          </div>
          <div className="pjv-tm">
            {at >= 0 && (
              <span className="pjv-tmk" style={{ left: `${((at + 0.5) / scale.length) * 100}%` }}>
                <span>{from.toUpperCase()}</span>
              </span>
            )}
          </div>
        </>
      )
    }
    const preview = deriveTints(design)
    const previewFrom = activeColour(design)
    if (!preview || !previewFrom) return emptyBody(b, 'Needs a palette first.')
    return (
      <>
        <p className="pjv-pvl">Preview: {preview.scale.length} steps from <span className="pjv-mono">{previewFrom.toUpperCase()}</span>.</p>
        <div className="pjv-tn" aria-hidden="true">
          {preview.scale.map((c, i) => <span key={`${c}-${i}`} style={{ background: c }} />)}
        </div>
        <div className="pjv-pv">
          <Link className="pjv-ghost" to={slot.tool} onClick={() => loadProject(project.id)} style={{ width: 'fit-content' }}>
            <Glyph name="plus" size={13} />
            <span>{slot.emptyCta}</span>
          </Link>
        </div>
      </>
    )
  }

  return (
    <div className="pjv">
      <div className="pjv-grid">
        <aside className="pjv-rail">
          <Link to="/projects" className="pjv-back">
            <Glyph name="arrow-left" size={14} />
            <span>All projects</span>
          </Link>

          {renaming ? (
            <form className="pjv-rename" onSubmit={saveRename} noValidate>
              <input
                className="pjv-rn"
                value={name}
                onChange={(e) => { setName(e.target.value); setRenameError('') }}
                onKeyDown={(e) => { if (e.key === 'Escape') closeRename() }}
                aria-label="Project name"
                aria-invalid={renameError ? 'true' : undefined}
                aria-describedby={renameError ? 'pjv-rn-err' : undefined}
                autoFocus
              />
              {renameError && <p className="pjv-rnerr" id="pjv-rn-err" role="alert">{renameError}</p>}
              <div className="pjv-btns">
                <button type="submit" className="pjv-ghost">Save</button>
                <button type="button" className="pjv-tb" onClick={closeRename}>Cancel</button>
              </div>
            </form>
          ) : (
            <h1 className="pjv-name" tabIndex={-1} ref={nameRef}>{project.name}</h1>
          )}
          <p className="pjv-status">{statusLine}</p>

          <nav className="pjv-nav" aria-label="Parts of this project">
            <ol className="pjv-ix">
              {BANDS.map((b) => {
                const slot = slotById[b.id]
                return (
                  <li key={b.id}>
                    <a
                      className={`pjv-ixa${activeBand === b.id ? ' on' : ''}`}
                      href={`#pjv-${b.id}`}
                      onClick={(e) => goToBand(e, b.id)}
                      aria-current={activeBand === b.id ? 'location' : undefined}
                    >
                      {slot.done ? <CheckIcon /> : <i className="pjv-ring" aria-hidden="true" />}
                      <span className="pjv-ixn">{b.label}</span>
                      <span className={`pjv-ixm${slot.done && b.id !== 'fonts' ? ' pjv-mono' : ''}`}>{indexValue(b)}</span>
                    </a>
                  </li>
                )
              })}
            </ol>
          </nav>

          <div className="pjv-act">
            <div className="pjv-bar">{primaryNode}</div>
            <div className="pjv-act2">
              <button type="button" className="pjv-ghost" onClick={onSave}>
                <Glyph name="floppy-disk" size={14} />
                <span>{saved ? 'Saved' : 'Save current'}</span>
              </button>
              <ProjectActions
                project={project}
                digest={digest}
                onOpenIn={(pid, route) => openIn(route)}
                onDuplicate={onDuplicate}
                onRename={() => { setName(project.name); setRenameError(''); setRenaming(true) }}
                onExportCss={() => copy(buildCSSVars({ palette: design.palette, tints: design.tints, fonts: design.fonts, typeScale: design.typeScale })).then((ok) => ok && toast('Copied'))}
                onOverwrite={onSave}
                onArchive={onArchive}
                onDelete={() => setConfirmDelete(true)}
              />
            </div>
          </div>

          <IconPicker project={project} />
        </aside>

        <div className="pjv-col">
          {BANDS.map((b) => {
            const slot = slotById[b.id]
            const meta = bandMeta(b)
            return (
              <section key={b.id} className="pjv-band" id={`pjv-${b.id}`} aria-labelledby={`pjv-${b.id}-h`}>
                <div className="pjv-bh">
                  <div className="pjv-bt">
                    <h2 id={`pjv-${b.id}-h`} tabIndex={-1}>{b.label}</h2>
                    <span className={`pjv-bm${b.id === 'type-scale' && slot.done ? ' pjv-mono' : ''}`}>{meta}</span>
                  </div>
                  <div className="pjv-ba">
                    <Link className="pjv-tb pjv-open" to={slot.tool} onClick={() => loadProject(project.id)}>
                      Open in {b.openIn} <ArrowUpRight />
                    </Link>
                    {slot.done && (
                      <button
                        type="button"
                        className={`pjv-tb pjv-copy${copied === b.id ? ' on' : ''}`}
                        onClick={() => onCopy(b.id)}
                        aria-label={`Copy ${b.label.toLowerCase()} as CSS`}
                      >
                        <span className="pjv-copy-idle" aria-hidden="true">Copy</span>
                        <span className="pjv-copied" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          Copied
                        </span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="pjv-bb">{renderBand(b)}</div>
              </section>
            )
          })}
          <span className="pjv-sr" role="status">{copied ? `Copied ${BANDS.find((b) => b.id === copied)?.label.toLowerCase()} as CSS` : ''}</span>

          <div className="pjv-exb">
            <p>
              {complete
                ? `Every part is filled, so the project exports as ${isPro ? 'a styled page, a PDF book or images' : 'a styled page or images'}.`
                : `${open} part${open === 1 ? '' : 's'} still open.`}
            </p>
            {complete ? (
              <button type="button" className="pjv-ghost" onClick={startExport}>
                <Glyph name="download-simple" size={14} />
                <span>Export project</span>
              </button>
            ) : digest.next && (
              <Link className="pjv-tb" to={digest.next.tool} onClick={() => loadProject(project.id)}>Fill the gaps</Link>
            )}
          </div>

          {savedColours.length > 0 && (
            <section className="pjv-sv" aria-labelledby="pjv-sv-h">
              <h2 id="pjv-sv-h">Saved colours</h2>
              <ul>
                {savedColours.map((c) => (
                  <li key={c.hex}>
                    <button
                      type="button"
                      className="pjv-chip"
                      onClick={() => copy(c.hex).then((ok) => ok && toast(`Copied ${c.hex}`))}
                      aria-label={`Copy ${c.hex}${c.name ? `, ${c.name}` : ''}`}
                      title="Copy hex"
                    >
                      <i style={{ background: c.hex }} aria-hidden="true" />
                      <span className="pjv-mono">{c.hex.toUpperCase()}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {others.length > 0 && (
            <>
              <div className="pjv-oh">
                <h2>Other projects</h2>
                {freeSlots !== null && <span>{projects.length} of {freeSlots} free slots used</span>}
              </div>
              <ul className="pjv-rows">
                {others.map((o) => {
                  const st = projectStatus(o)
                  return (
                    <li key={o.id}>
                      <Link to={`/projects/${encodeURIComponent(o.id)}`} className="pjv-row">
                        <span className="pjv-sw" aria-hidden="true">
                          {st.digest.colors.filter(isHex).slice(0, 5).map((c, i) => <i key={`${c}-${i}`} style={{ background: c }} />)}
                        </span>
                        <span className="pjv-rnm">{o.name}</span>
                        <span className="pjv-rmeta">{st.has}</span>
                        <span className="pjv-rwhen">{st.edited || ''}</span>
                        <svg className="pjv-rgo" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span className="pjv-rphone">{st.has}{st.edited ? `, edited ${st.edited}` : ''}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          {!isPro && !planLoading && (
            <p className="pjv-plan">
              <span>{UPGRADE_LINE}</span>
              <Link to="/plans">See Pro</Link>
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDelete}
        name={project.name}
        title={`Delete ${project.name}?`}
        action="Permanently delete"
        fieldLabel={`Type the project name to confirm deleting ${project.name}`}
        strip={savedColours.slice(0, 4).map((c) => c.hex)}
      />

      {exporting && createPortal(
        <Suspense fallback={null}>
          <ExportDialog onClose={() => setExporting(false)} preset={exportPreset} projectId={project.id} />
        </Suspense>,
        document.querySelector('.app-shell'),
      )}
    </div>
  )
}
