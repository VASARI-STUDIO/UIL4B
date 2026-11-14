import { Suspense, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useParams } from 'react-router-dom'
import ProjectLinkGone from '../components/userhome/ProjectLinkGone'
import Glyph from '../components/userhome/Glyph'
import { useWasSignedIn } from '../hooks/useWasSignedIn'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { DEFAULT_PRESET, exportLocation, presetFromGalleryPick, readLastPick, resolvePreset } from '../config/dialogExport'
import { clearPick, readPick } from '../utils/kitGalleryPick'
import { lazyRoute as lazy } from '../utils/lazyRoute'
import '../styles/pages/project-v3.css'

// `lazy` in this file is lazyRoute, not React's: if the file for the dialog failed
// to download, it waits for the recovery reload instead of crashing.
const ExportDialog = lazy(() => import('../components/export/ExportDialog'))

// /projects/:id/export: where the brand-kit walkthrough ends. The project is
// already saved when this opens, so leaving at any point loses nothing. The page
// holds the saved line, the rename and one row per kind of file; the export dialog
// opens on arrival, and from a row on that kind, and holds every choice, price and file.

const LOOKUP_WAIT_MS = 10000

// The rows, in the page's order. Which of them are Pro comes from the export config.
const ROWS = [
  { category: 'kit', title: 'UI kit', description: 'One HTML file with your palette, type and components. Opens offline.', preset: { type: 'kit', category: 'kit', file: 'kit' } },
  { category: 'guide', title: 'Style guide', description: 'A guide to your palette and type, as A4 pages, an A4 sheet image or Markdown.', preset: { type: 'brand', category: 'guide', file: 'html' } },
  { category: 'code', title: 'Code', description: 'Your palette, tints and type as CSS, JSON or a Tailwind theme, plus contrast pairs.', preset: { type: 'code', category: 'code', file: 'css' } },
  { category: 'book', title: 'Book', description: 'A book of your system, as an A4 PDF, 2K page images or one HTML file.', preset: { type: 'brand', category: 'book', file: 'book' } },
  { category: 'slides', title: 'Slides', description: 'Your logo, colour and type as 16:9 slides.', preset: { type: 'brand', category: 'slides', file: 'guidelines' } },
  { category: 'apps', title: 'App-ready', description: 'Your colours and tokens as files for Figma, Adobe, Affinity, Procreate and code, in one zip.', preset: { type: 'apps', category: 'apps', file: 'app-bundle' } },
].map((row) => ({ ...row, pro: Boolean(exportLocation(row.preset.file)?.category.pro) }))

const lastCategory = () => {
  const last = readLastPick()
  return last ? resolvePreset(last).category : null
}

export default function ProjectExportRoute() {
  const { id } = useParams()
  return <ProjectExport key={id} id={id} />
}

function ProjectExport({ id }) {
  const location = useLocation()
  const { loading: authLoading, user } = useAuth()
  const { projects, canSaveProjects, projectsLoading, loadProject, renameProject } = useProject()
  const project = projects.find((p) => p.id === id)
  const wasSignedIn = useWasSignedIn(canSaveProjects)

  // A pick made before a trip to checkout is applied when it is this project's and this account's. It
  // arrives from the checkout page's "Back to your export" link (router state), or from the stored copy.
  const [arrival] = useState(() => {
    const back = readPick()
    if (back && back.projectId === id && (!back.uid || !user?.uid || back.uid === user.uid)) return { preset: presetFromGalleryPick(back), picked: true }
    const carried = location.state?.kitPick
    return carried ? { preset: presetFromGalleryPick(carried), picked: true } : { preset: resolvePreset(DEFAULT_PRESET), picked: false }
  })
  const [preset, setPreset] = useState(arrival.preset)
  // The kind the row tag "Last picked" sits on: this session's last pick in the dialog, else the one the page arrived with.
  const [pickedCategory, setPickedCategory] = useState(() => lastCategory() || (arrival.picked ? arrival.preset.category : null))
  const [open, setOpen] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [renameError, setRenameError] = useState('')
  const renameBtn = useRef(null)
  const returnTo = useRef(null)
  const loaded = useRef(false)
  // The stored pick has been applied above; it is used once.
  useEffect(() => { if (readPick()?.projectId === id) clearPick() }, [id])

  useEffect(() => {
    if (project && !loaded.current) { loaded.current = true; loadProject(project.id) }
  }, [project, loadProject])

  const unknown = !project && (authLoading || (canSaveProjects && projectsLoading))
  const [gaveUp, setGaveUp] = useState(false)
  useEffect(() => {
    if (!unknown) return undefined
    const timer = setTimeout(() => setGaveUp(true), LOOKUP_WAIT_MS)
    return () => clearTimeout(timer)
  }, [unknown])

  if (unknown && !gaveUp) {
    return <div className="pjv"><div className="pjv-load" role="status"><p>Opening your project…</p></div></div>
  }
  if (!canSaveProjects || !project) return <ProjectLinkGone quiet={wasSignedIn && !canSaveProjects} />

  const name = project.name

  // The project's own rename (ProjectContext.renameProject), the same one the project page uses.
  const closeRename = () => {
    setRenaming(false)
    setRenameError('')
    requestAnimationFrame(() => renameBtn.current?.focus())
  }
  const saveRename = (e) => {
    e.preventDefault()
    if (!draftName.trim()) {
      setRenameError('Give the project a name.')
      return
    }
    renameProject(id, draftName.trim())
    closeRename()
  }
  // Reopening takes the last pick made in the dialog this session, else the one the page arrived with.
  const reopen = (e) => {
    returnTo.current = e.currentTarget
    setPreset(resolvePreset(readLastPick() || preset))
    setOpen(true)
  }
  // A row opens the dialog on that kind of file.
  const openRow = (e, row) => {
    returnTo.current = e.currentTarget
    setPreset(resolvePreset(row.preset))
    setOpen(true)
  }
  // Closing leaves the page where it is; focus goes to the control that opened it.
  const closeDialog = () => {
    setOpen(false)
    setPickedCategory(lastCategory() || pickedCategory)
    requestAnimationFrame(() => (returnTo.current || document.querySelector('.pjv-exact .pjv-go'))?.focus())
  }

  const openIcon = <span className="pjv-goico" aria-hidden="true"><Glyph name="download-simple" size={14} /></span>
  const firstPro = ROWS.findIndex((r) => r.pro)

  return (
    <div className="pjv">
      <div className="pjv-ex">
        {renaming ? (
          <form className="pjv-rename pjv-exrn" onSubmit={saveRename} noValidate>
            <input
              className="pjv-rn"
              value={draftName}
              onChange={(e) => { setDraftName(e.target.value); setRenameError('') }}
              onKeyDown={(e) => { if (e.key === 'Escape') closeRename() }}
              aria-label="Project name"
              aria-invalid={renameError ? 'true' : undefined}
              aria-describedby={renameError ? 'pjv-xrn-err' : undefined}
              autoFocus
            />
            {renameError && <p className="pjv-rnerr" id="pjv-xrn-err" role="alert">{renameError}</p>}
            <div className="pjv-btns">
              <button type="submit" className="pjv-ghost">Save</button>
              <button type="button" className="pjv-tb" onClick={closeRename}>Cancel</button>
            </div>
          </form>
        ) : (
          <p className="pjv-saved">
            <span>Saved to your projects as <b>{name}</b> ·</span>
            <button type="button" className="pjv-tb" ref={renameBtn} onClick={() => { setDraftName(name); setRenameError(''); setRenaming(true) }}>Rename</button>
          </p>
        )}
        <h1 className="pjv-h1">Export {name}</h1>
        <div className="pjv-exact">
          <button type="button" className="pjv-go" onClick={reopen}><span>Open export</span>{openIcon}</button>
          <Link className="pjv-tb" to={`/projects/${id}`}>Open project</Link>
        </div>

        <ul className="pjv-xl">
          {ROWS.map((row, i) => (
            <li key={row.category} className={i === firstPro && i > 0 ? 'gap' : undefined}>
              <button type="button" className="pjv-xr" onClick={(e) => openRow(e, row)}>
                <span className="pjv-xt">
                  <span className="pjv-xnm">
                    <span>{row.title}</span>
                    {row.pro && <span className="pjv-xtg">Pro</span>}
                    {pickedCategory === row.category && <span className="pjv-xtg">Last picked</span>}
                  </span>
                  <span className="pjv-xds">{row.description}</span>
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5l4.5 4.5L6 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </li>
          ))}
        </ul>
        <p className="pjv-coming">An asset bundle is on the way.</p>

        <div className="pjv-bar pjv-xbar">
          <button type="button" className="pjv-go" onClick={reopen}><span>Open export</span>{openIcon}</button>
        </div>
      </div>

      {open && user && createPortal(
        <Suspense fallback={null}>
          <ExportDialog onClose={closeDialog} preset={preset} projectId={id} />
        </Suspense>,
        document.querySelector('.app-shell') || document.body,
      )}
    </div>
  )
}
