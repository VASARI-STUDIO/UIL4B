import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useClipboard } from '../hooks/useClipboard'
import { readSessionHint } from '../utils/sessionHint'
import { buildCSSVars } from '../utils/exportBuilder'
import Glyph from '../components/userhome/Glyph'
import ProjectActions from '../components/userhome/ProjectActions'
import { UPGRADE, UPGRADE_LINE, byRecent, projectSlots4, projectStatus } from '../components/userhome/workspace'
import '../styles/deferred/account.css'
import '../styles/deferred/tool-shell.css'
import '../styles/pages/projects.css'
import '../styles/pages/project.css'

const ExportPanel = lazy(() => import('../components/ExportPanel'))

// ── ONE PROJECT ─────────────────────────────────────────────────────────────
//
// /projects/:id is the design's project screen (UIL4B App.dc.html, `project`):
// "All projects" back, the name, a Save and a next action, the project's progress,
// four slot cards, an export bar, and the other projects under it.
//
// Every slot is read off the saved design (workspace.js projectSlots4), and
// every action works on THIS project: "Edit", "Continue building" and the empty
// slots' buttons load it into the tools first, then open the tool that builds
// that part — opening a tool without loading would quietly edit whatever design
// was open before.
//
// FACTS CHANGED, LAYOUT NOT:
//   · The design's export bar said it "exports as CSS, Tailwind, JSON or a styled
//     page". CSS, JSON and Tailwind export are not built (config/exportFormats.js
//     marks all three Soon). What exports is a styled page, images, and on Pro a
//     PDF book, so that is what it says.
//   · "Export needs colour and type at minimum" is not a rule the export panel
//     has, so that clause is gone; the count of open parts stays.
//   · The design's fourth slot was Icons. A project saves no icons; it saves tints.
//
// The management a project needs and the design's screen does not draw — rename,
// duplicate, archive or restore, delete — sits behind the ⋯ beside Save, the
// same menu (ProjectActions) the old list carried on every row.

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
    projects, canSaveProjects, projectLimit,
    loadProject, overwriteProject, renameProject, duplicateProject, archiveProject, deleteProject,
  } = useProject()
  const copy = useClipboard()

  const [hintedSession] = useState(readSessionHint)
  const resolving = authLoading && hintedSession

  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [exporting, setExporting] = useState(false)
  const copyTimer = useRef(null)

  const project = projects.find((p) => p.id === id)

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  if (resolving) {
    return (
      <div className="uh pjd">
        <div className="uh-main">
          <div className="uh-resolving" role="status">
            <div className="fg-loader" />
            <p>Opening your projects…</p>
          </div>
        </div>
      </div>
    )
  }
  // No account, or no such project on it (deleted here or on another device):
  // the workspace is the page that can say what there is.
  if (!canSaveProjects || !project) return <Navigate to="/projects" replace />

  const status = projectStatus(project)
  const { digest } = status
  const slots = projectSlots4(project)
  const complete = digest.done === digest.total
  const open = digest.total - digest.done
  const others = projects.filter((p) => p.id !== id).sort(byRecent)
  const freeSlots = Number.isFinite(projectLimit) ? projectLimit : null

  const openIn = (route) => { loadProject(project.id); navigate(route) }
  const startExport = () => { loadProject(project.id); setExporting(true) }

  const statusLine = project.archived
    ? `Archived, ${status.has}`
    : complete
      ? 'Complete and ready to export'
      : `${digest.done} of ${digest.total} parts filled${status.edited ? `, edited ${status.edited}` : ''}`

  const onSave = () => {
    overwriteProject(project.id)
    setSaved(true)
    toast(`Saved over "${project.name}"`)
  }

  // The next action: finish what is missing, or export what is finished. An
  // archived project's next action is to bring it back.
  const next = project.archived
    ? { label: 'Restore', run: () => { archiveProject(project.id); toast(`"${project.name}" restored`) } }
    : complete
      ? { label: 'Export the project', run: startExport }
      : { label: 'Continue building', run: () => openIn(digest.next.tool) }

  const onCopy = (slot) => {
    const d = project.design || {}
    const text = slot.id === 'palette'
      ? buildCSSVars({ palette: d.palette })
      : slot.id === 'fonts'
        ? buildCSSVars({ fonts: d.fonts })
        : slot.id === 'type-scale'
          ? buildCSSVars({ typeScale: d.typeScale })
          : buildCSSVars({ tints: d.tints })
    copy(text).then((ok) => {
      if (!ok) return
      setCopied(slot.id)
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
    deleteProject(project.id)
    toast('Project deleted')
    navigate('/projects', { replace: true })
  }

  const saveRename = () => {
    if (name.trim()) { renameProject(project.id, name.trim()); toast('Renamed') }
    setRenaming(false)
  }

  return (
    <div className="uh pjd">
      <div className="uh-main">
        <div className="pjd-back-row">
          <Link to="/projects" className="pjd-back">
            <Glyph name="arrow-left" size={14} />
            <span>All projects</span>
          </Link>
        </div>

        <div className="pjd-head">
          <div className="pjd-head-text">
            {renaming ? (
              <div className="pjd-rename">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveRename() } if (e.key === 'Escape') setRenaming(false) }}
                  aria-label={`Rename ${project.name}`}
                  autoFocus
                />
                <button type="button" className="pjd-btn is-accent" onClick={saveRename}>Save</button>
                <button type="button" className="pjd-btn" onClick={() => setRenaming(false)}>Cancel</button>
              </div>
            ) : (
              <h1 className="pjd-h1">{project.name}</h1>
            )}
            <p className="pjd-status">{statusLine}</p>
          </div>
          <div className="pjd-head-actions">
            <ProjectActions
              project={project}
              digest={digest}
              onOpenIn={(pid, route) => openIn(route)}
              onDuplicate={onDuplicate}
              onRename={() => { setName(project.name); setRenaming(true) }}
              onExportCss={() => copy(buildCSSVars({ palette: project.design?.palette, tints: project.design?.tints, fonts: project.design?.fonts, typeScale: project.design?.typeScale })).then((ok) => ok && toast('Copied'))}
              onOverwrite={onSave}
              onArchive={onArchive}
              onDelete={() => setConfirmDelete(true)}
            />
            <button type="button" className="pjd-save" onClick={onSave}>
              <Glyph name="floppy-disk" size={15} />
              <span>{saved ? 'Saved' : 'Save current'}</span>
            </button>
            <button type="button" className="pjd-next" onClick={next.run}>
              <span>{next.label}</span>
              <Glyph name="arrow-right" size={14} />
            </button>
          </div>
        </div>

        {confirmDelete && (
          <div className="pjd-confirm">
            <p>Type <strong>{project.name}</strong> to delete it. This cannot be undone.</p>
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder={project.name}
              aria-label={`Type the project name to confirm deleting ${project.name}`}
              autoFocus
            />
            <div className="pjd-confirm-actions">
              <button type="button" className="pjd-btn is-danger" disabled={deleteText !== project.name} onClick={onDelete}>
                Permanently delete
              </button>
              <button type="button" className="pjd-btn" onClick={() => { setConfirmDelete(false); setDeleteText('') }}>Cancel</button>
            </div>
          </div>
        )}

        <div className="pjd-progress">
          <div className="pjd-progress-track" aria-hidden="true"><span style={{ width: status.pct }} /></div>
          <span className="pjd-progress-label">{status.has}</span>
        </div>

        <div className="pjd-slots">
          {slots.map((s) => (
            <section key={s.id} className={`pjd-slot${s.done ? ' is-done' : ''}`} aria-labelledby={`pjd-slot-${s.id}`}>
              <div className="pjd-slot-head">
                <span className="pjd-slot-ico" aria-hidden="true"><Glyph name={s.icon} size={15} /></span>
                <span className="pjd-slot-text">
                  <span className="pjd-slot-label" id={`pjd-slot-${s.id}`}>{s.label}</span>
                  <span className="pjd-slot-detail">{s.done ? s.detail : 'Nothing here yet'}</span>
                </span>
                <span className="pjd-slot-tag">{s.done ? 'Done' : 'Empty'}</span>
              </div>

              {s.done && (
                <div className="pjd-slot-body">
                  {s.ramp && (
                    <div className="pjd-slot-ramp" aria-hidden="true">
                      {s.ramp.map((c, i) => <span key={`${c}-${i}`} style={{ background: c }} />)}
                    </div>
                  )}
                  {s.typeHead && (
                    <div className="pjd-slot-type">
                      <span className="pjd-slot-type-head">{s.typeHead}</span>
                      <span className="pjd-slot-type-body">{s.typeBody}</span>
                    </div>
                  )}
                </div>
              )}

              {!s.done && (
                <div className="pjd-slot-empty">
                  {s.emptyNote && <p>{s.emptyNote}</p>}
                  <button type="button" className="pjd-slot-cta" onClick={() => openIn(s.tool)}>
                    <Glyph name="plus" size={13} />
                    <span>{s.emptyCta}</span>
                  </button>
                </div>
              )}

              {s.done && (
                <div className="pjd-slot-foot">
                  <button type="button" onClick={() => openIn(s.tool)} aria-label={`Edit ${s.label.toLowerCase()}`}>Edit</button>
                  <span aria-hidden="true" />
                  <button
                    type="button"
                    className={copied === s.id ? 'is-copied' : ''}
                    onClick={() => onCopy(s)}
                    aria-label={copied === s.id ? `Copied ${s.label.toLowerCase()}` : `Copy ${s.label.toLowerCase()} as CSS`}
                  >
                    {copied === s.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </section>
          ))}
        </div>

        <div className="pjd-export">
          <span className="pjd-export-line">
            {complete
              ? `Every part is filled, so the project exports as ${isPro ? 'a styled page, a PDF book or images' : 'a styled page or images'}.`
              : `${open} part${open === 1 ? '' : 's'} still open.`}
          </span>
          <button
            type="button"
            className={`pjd-export-cta${complete ? ' is-accent' : ''}`}
            onClick={complete ? startExport : () => openIn(digest.next.tool)}
          >
            <Glyph name="download-simple" size={14} />
            <span>{complete ? 'Export project' : 'Fill the gaps'}</span>
          </button>
        </div>

        <div className="pjd-others">
          <div className="pjd-others-head">
            <h2 className="pjd-others-h">Other projects</h2>
            {freeSlots !== null && (
              <span className="pjd-others-slots">{projects.length} of {freeSlots} free slots used</span>
            )}
          </div>
          <div role="list" className="pjd-list">
            {others.map((o) => {
              const st = projectStatus(o)
              const to = `/projects/${encodeURIComponent(o.id)}`
              return (
                <div role="listitem" key={o.id} className="pjd-row">
                  <span className="pjd-row-chip" aria-hidden="true">
                    {st.digest.colors.map((c, i) => <span key={`${c}-${i}`} style={{ background: c }} />)}
                  </span>
                  <Link to={to} className="pjd-row-name">{o.name}</Link>
                  <span className="pjd-row-meta">{st.has}</span>
                  <span className="pjd-row-meta pjd-row-when">{st.edited || ''}</span>
                  <Link to={to} className="pjd-row-go" aria-hidden="true" tabIndex={-1}>
                    <Glyph name="arrow-right" size={15} />
                  </Link>
                </div>
              )
            })}
          </div>
          {!isPro && !planLoading && (
            <div className="pjd-upgrade">
              <span className="pjd-upgrade-line">{UPGRADE_LINE}</span>
              <Link to="/plans" className="pjd-upgrade-link">{UPGRADE.label}</Link>
            </div>
          )}
        </div>
      </div>

      {exporting && (
        <Suspense fallback={null}>
          <ExportPanel onClose={() => setExporting(false)} />
        </Suspense>
      )}
    </div>
  )
}
