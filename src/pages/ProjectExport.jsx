import { Suspense, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { DEFAULT_PRESET, presetFromGalleryPick, readLastPick, resolvePreset } from '../config/dialogExport'
import { clearPick, readPick } from '../utils/kitGalleryPick'
import { lazyRoute as lazy } from '../utils/lazyRoute'
import '../styles/pages/project-export.css'

// `lazy` in this file is lazyRoute, not React's: if the file for the dialog failed
// to download, it waits for the recovery reload instead of crashing.
const ExportDialog = lazy(() => import('../components/export/ExportDialog'))

// /projects/:id/export: where the brand-kit walkthrough ends. The project is
// already saved when this opens, so leaving at any point loses nothing. The page
// holds the saved line and the rename; the export dialog opens on arrival and
// holds every choice, price and file.

const LOOKUP_WAIT_MS = 10000

export default function ProjectExportRoute() {
  const { id } = useParams()
  return <ProjectExport key={id} id={id} />
}

function ProjectExport({ id }) {
  const location = useLocation()
  const { loading: authLoading, user } = useAuth()
  const { projects, canSaveProjects, projectsLoading, loadProject, renameProject } = useProject()
  const project = projects.find((p) => p.id === id)

  // A pick made before a trip to checkout is applied when it is this project's and this account's. It
  // arrives from the checkout page's "Back to your export" link (router state), or from the stored copy.
  const [preset, setPreset] = useState(() => {
    const back = readPick()
    if (back && back.projectId === id && (!back.uid || !user?.uid || back.uid === user.uid)) return presetFromGalleryPick(back)
    const carried = location.state?.kitPick
    return carried ? presetFromGalleryPick(carried) : resolvePreset(DEFAULT_PRESET)
  })
  const [open, setOpen] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState('')
  const renameBtn = useRef(null)
  const openBtn = useRef(null)
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
    return <div className="pxg" role="status"><p className="pxg-lede">Opening your project…</p></div>
  }
  if (!canSaveProjects || !project) return <Navigate to="/projects" replace />

  const name = project.name

  // The project's own rename (ProjectContext.renameProject), the same one the project page uses.
  const closeRename = () => {
    setRenaming(false)
    requestAnimationFrame(() => renameBtn.current?.focus())
  }
  const saveRename = (e) => {
    e.preventDefault()
    if (draftName.trim()) renameProject(id, draftName.trim())
    closeRename()
  }
  // Reopening takes the last pick made in the dialog this session, else the one the page arrived with.
  const reopen = () => {
    setPreset(resolvePreset(readLastPick() || preset))
    setOpen(true)
  }
  // Closing leaves the page where it is; focus goes to the button that reopens it.
  const closeDialog = () => {
    setOpen(false)
    requestAnimationFrame(() => openBtn.current?.focus())
  }

  return (
    <div className="pxg">
      {renaming ? (
        <form className="pxg-rename" onSubmit={saveRename}>
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') closeRename() }}
            aria-label={`Rename ${name}`}
            autoFocus
          />
          <button type="submit" className="pxg-rename-btn is-primary">Save</button>
          <button type="button" className="pxg-rename-btn" onClick={closeRename}>Cancel</button>
        </form>
      ) : (
        <p className="pxg-saved">Saved to your projects as <strong>{name}</strong> · <button type="button" className="pxg-link" ref={renameBtn} onClick={() => { setDraftName(name); setRenaming(true) }}>Rename</button></p>
      )}
      <h1 className="pxg-h1">Export {name}</h1>
      <div className="pxg-actions">
        <button type="button" className="pxg-cta" ref={openBtn} onClick={reopen}>Open export</button>
        <Link className="pxg-not" to={`/projects/${id}`}>Open project</Link>
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
