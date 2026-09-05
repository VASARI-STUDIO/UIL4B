import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useAuth } from '../contexts/AuthContext'
import { useClipboard } from '../hooks/useClipboard'
import { isSvg } from '../utils/imageProcessing'
import { projectQuota } from '../utils/projectQuota'
import { projectDigest, nextToolSuggestion, homeStats, relativeTime } from '../utils/userHome'
import { readSessionHint } from '../utils/sessionHint'
import { buildCSSVars } from '../utils/exportBuilder'
import DailyBand from '../components/userhome/DailyBand'
import StarterRow from '../components/userhome/StarterRow'
import ProjectActions from '../components/userhome/ProjectActions'

// Read-only sample design systems shown under the "Community" tab.
const COMMUNITY_PROJECTS = [
  { id: 'c-sunset', name: 'Sunset Brand', author: 'Maya R.', colors: ['#FF6B35', '#F7931E', '#FFD23F', '#C1121F', '#6A040F'] },
  { id: 'c-fintech', name: 'Fintech Blue', author: 'Devon K.', colors: ['#0051FF', '#0A2540', '#3B82F6', '#60A5FA', '#1E3A8A'] },
  { id: 'c-forest', name: 'Forest Co.', author: 'Sam T.', colors: ['#2D6A4F', '#40916C', '#74C69D', '#1B4332', '#95D5B2'] },
  { id: 'c-mono', name: 'Mono Minimal', author: 'Alex P.', colors: ['#111111', '#3D3D3D', '#7A7A7A', '#B5B5B5', '#EDEDED'] },
]

// Validate + read a project icon file (SVG or small PNG) as a data URL.
function readIconFile(file) {
  return new Promise((resolve, reject) => {
    const okType = file.type === 'image/svg+xml' || file.type === 'image/png' || isSvg(file)
    if (!okType) { reject(new Error('Icon must be an SVG or PNG')); return }
    if (file.size > 50 * 1024) { reject(new Error('Icon must be under 50KB')); return }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = () => {
      const dataUrl = reader.result
      if (isSvg(file)) { resolve(dataUrl); return }
      // Raster (PNG): reject if larger than 128px in either dimension.
      const img = new Image()
      img.onerror = () => reject(new Error('Could not decode image'))
      img.onload = () => {
        if (img.width > 128 || img.height > 128) {
          reject(new Error('Icon must be 128px or smaller'))
        } else {
          resolve(dataUrl)
        }
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}

/**
 * The palette, drawn as the palette.
 *
 * Hard stops rather than a blend: these are discrete colours somebody chose,
 * and interpolating between them draws four colours that are not in the
 * project. The card art used to be `linear-gradient(135deg, colour1, colour2)`
 * — a decorative two-stop blend of the first two swatches, standing in for a
 * palette rather than being one. Same correction the homepage strip got in
 * `homepage-community-points-outward`: the art should BE the artefact.
 */
function paletteBands(colors) {
  if (!colors?.length) return 'var(--bg-3)'
  const step = 100 / colors.length
  const bands = colors
    .map((c, i) => `${c} ${(i * step).toFixed(2)}% ${((i + 1) * step).toFixed(2)}%`)
    .join(', ')
  return `linear-gradient(90deg, ${bands})`
}

function ColorRow({ colors, height = 24 }) {
  if (!colors?.length) return null
  return (
    <div style={{ display: 'flex', height, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {colors.slice(0, 6).map((c, i) => (
        <div key={i} style={{ flex: 1, background: c, transition: 'flex .2s' }} title={c} />
      ))}
    </div>
  )
}

/**
 * “A project with colours but no type scale should say so” — the founder's own
 * example, said in words rather than left to a percentage.
 *
 * A number would have been easier and worse. Airtable's project gallery
 * (mobbin.com/screens/0e9a986f-01cd-4332-ac89-ba5c36853ae3) prints “Progress
 * Percentage 75” beside a status chip, and 75 tells you how far along you are
 * without telling you what is missing — which is the only part that is
 * actionable. Four named parts, and the ones that are absent named.
 */
function partsLabel(digest) {
  if (!digest.missing.length) return 'All four parts'
  if (digest.missing.length === digest.total) return 'Nothing built yet'
  const names = digest.missing.map((m) => m.label.toLowerCase())
  const last = names.pop()
  return names.length ? `No ${names.join(', ')} or ${last}` : `No ${last}`
}

function ProjectCard({
  project, isCurrent, onLoad, onDelete, onRename, onOverwrite, onArchive,
  folder, onFolderChange, folders, onOpenDetail, icon,
  onDuplicate, onExportCss, onOpenIn,
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const digest = projectDigest(project)
  const when = relativeTime(digest.updatedAt)

  return (
    <article className={`card proj-card uh-card${isCurrent ? ' proj-card-active' : ''}${project.archived ? ' is-archived' : ''}`}>
      {/* The palette itself, full-bleed across the top. No text sits on it, which
          is deliberate: the old header set the project name in white over a
          two-colour blend, so its contrast depended entirely on which colours the
          user had picked. Any palette could make the name unreadable. */}
      <div className="uh-card-art" style={{ background: paletteBands(digest.colors) }} aria-hidden="true" />

      <div className="uh-card-body">
        <div className="uh-card-top">
          {icon && <img src={icon} alt="" className="uh-card-icon" />}
          {/* The name, set in the project's OWN heading face — the fastest
              honest answer to “what is in this project” that costs no space at
              all. Falls back through the same stack the tools use. */}
          <button
            type="button"
            className="uh-card-name"
            style={{ fontFamily: `'${digest.heading}', var(--font)` }}
            onClick={() => onOpenDetail?.(project)}
            title="View project details"
          >
            {project.name}
          </button>
          {project.archived && <span className="uh-tag">Archived</span>}
          {isCurrent && !project.archived && <span className="uh-tag uh-tag--live">Loaded</span>}
          <ProjectActions
            project={project}
            digest={digest}
            onOpenIn={onOpenIn}
            onDuplicate={onDuplicate}
            onRename={() => setEditing(true)}
            onExportCss={onExportCss}
            onOverwrite={onOverwrite}
            onArchive={onArchive}
            onDelete={() => setConfirmDelete(true)}
          />
        </div>

        {editing ? (
          <div className="uh-card-rename">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { onRename(project.id, name); setEditing(false) } }}
              aria-label={`Rename ${project.name}`}
              autoFocus
            />
            <button className="btn btn-s btn-accent" onClick={() => { onRename(project.id, name); setEditing(false) }}>Save</button>
            <button className="btn btn-s" onClick={() => { setName(project.name); setEditing(false) }}>Cancel</button>
          </div>
        ) : (
          /* What is actually in it, in one mono line: the two faces, the scale,
             the colour count. Every value read off the project. */
          <p className="uh-card-meta">
            {digest.heading} / {digest.body}
            <span className="uh-dot">·</span>
            {digest.scaleBase}px / {digest.scaleRatio.toFixed(2)}×
            <span className="uh-dot">·</span>
            {digest.colourCount} colour{digest.colourCount === 1 ? '' : 's'}
            {digest.tintCount > 0 && (<><span className="uh-dot">·</span>{digest.tintCount} tints</>)}
          </p>
        )}

        <div className="uh-parts">
          <span
            className="uh-parts-dots"
            role="img"
            aria-label={`${digest.done} of ${digest.total} parts built: ${digest.parts.map(p => `${p.label} ${p.done ? 'built' : 'empty'}`).join(', ')}`}
          >
            {digest.parts.map((part) => (
              <span key={part.id} className={`uh-part${part.done ? ' is-done' : ''}`} />
            ))}
          </span>
          <span className={`uh-parts-label${digest.missing.length ? '' : ' is-complete'}`}>{partsLabel(digest)}</span>
          {when && <span className="uh-card-when">{when}</span>}
        </div>

        {confirmDelete ? (
          <div className="uh-card-confirm">
            <p>Type <strong>{project.name}</strong> to delete it. This cannot be undone.</p>
            <input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={project.name}
              aria-label={`Type the project name to confirm deleting ${project.name}`}
              autoFocus
            />
            <div className="uh-card-confirm-actions">
              <button
                className="btn btn-s uh-danger"
                onClick={() => { onDelete(project.id); setConfirmDelete(false); setDeleteConfirmText('') }}
                disabled={deleteConfirmText !== project.name}
              >
                Permanently delete
              </button>
              <button className="btn btn-s" onClick={() => { setConfirmDelete(false); setDeleteConfirmText('') }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="uh-card-foot">
            {!project.archived ? (
              <button className="btn btn-s btn-accent" onClick={() => onLoad(project.id)}>
                {isCurrent ? 'Reload' : 'Load'}
              </button>
            ) : (
              <button className="btn btn-s" onClick={() => onArchive(project.id)}>Restore</button>
            )}
            <label className="uh-card-folder">
              <span className="sr-only">Folder for {project.name}</span>
              <select value={folder || ''} onChange={e => onFolderChange(project.id, e.target.value)}>
                <option value="">No folder</option>
                {(folders || []).filter(f => f !== 'all').map(f => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
    </article>
  )
}

function ProjectDetail({ project, isCurrent, onClose, onLoad, onDelete, onRename, onOverwrite, onArchive, icon, onIconChange, onIconRemove }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const d = project.design || {}
  const colors = d.palette?.colors || []
  const headingFamily = d.fonts?.heading?.family || 'Inter'
  const bodyFamily = d.fonts?.body?.family || 'Inter'
  const base = d.typeScale?.base || 16
  const ratio = d.typeScale?.ratio || 1.25
  const created = new Date(project.createdAt)
  const updated = new Date(project.updatedAt || project.createdAt)
  const fmtDate = (dt) => dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="fg-detail-overlay" onClick={onClose}>
      <div className="il-detail proj-detail" onClick={e => e.stopPropagation()}>
        <button className="fg-detail-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="fg-detail-section" style={{ marginBottom: 24 }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={name} onChange={e => setName(e.target.value)} autoFocus style={{ flex: 1, fontSize: 16, fontWeight: 700 }} />
              <button className="btn btn-s" onClick={() => { onRename(project.id, name); setEditing(false) }}>Save</button>
              <button className="btn btn-s" onClick={() => { setName(project.name); setEditing(false) }}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {icon && <img src={icon} alt="" className="proj-detail-icon" />}
              <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', flex: 1 }}>{project.name}</h2>
              {isCurrent && (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ok)', background: 'rgba(16,185,129,.1)', padding: '3px 8px', borderRadius: 4 }}>Loaded</span>
              )}
              {project.archived && (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', background: 'var(--bg-2)', color: 'var(--t2)', padding: '3px 8px', borderRadius: 4 }}>Archived</span>
              )}
            </div>
          )}
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">Palette · {colors.length} colour{colors.length === 1 ? '' : 's'}</div>
          {colors.length ? (
            <div className="proj-detail-swatches">
              {colors.map((c, i) => (
                <div key={i} className="proj-detail-swatch">
                  <div className="proj-detail-swatch-chip" style={{ background: c }} />
                  <span className="proj-detail-swatch-hex">{(c || '').toUpperCase()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--t2)' }}>No colours saved.</p>
          )}
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">Typography</div>
          <div className="proj-detail-meta">
            <div className="proj-detail-meta-row"><span>Heading</span><strong style={{ fontFamily: `'${headingFamily}', sans-serif` }}>{headingFamily}</strong></div>
            <div className="proj-detail-meta-row"><span>Body</span><strong style={{ fontFamily: `'${bodyFamily}', sans-serif` }}>{bodyFamily}</strong></div>
            <div className="proj-detail-meta-row"><span>Type scale</span><strong>{base}px / {Number(ratio).toFixed(2)}×</strong></div>
          </div>
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">Icon</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {icon ? (
              <img src={icon} alt="Project icon" className="proj-detail-icon-lg" />
            ) : (
              <div className="proj-detail-icon-lg proj-detail-icon-empty">—</div>
            )}
            <label className="btn btn-s" style={{ cursor: 'pointer' }}>
              {icon ? 'Replace' : 'Upload icon'}
              <input
                type="file"
                accept="image/svg+xml,image/png"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) onIconChange?.(f); e.target.value = '' }}
              />
            </label>
            {icon && (
              <button className="btn btn-s" onClick={() => onIconRemove?.()} style={{ color: 'var(--err)' }}>
                Remove icon
              </button>
            )}
            <span style={{ fontSize: 11, color: 'var(--t2)' }}>SVG or PNG, max 128px / 50KB.</span>
          </div>
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">Details</div>
          <div className="proj-detail-meta">
            <div className="proj-detail-meta-row"><span>Created</span><strong>{fmtDate(created)}</strong></div>
            <div className="proj-detail-meta-row"><span>Updated</span><strong>{fmtDate(updated)}</strong></div>
            <div className="proj-detail-meta-row"><span>Tints</span><strong>{d.tints?.scale?.length || 0}</strong></div>
          </div>
        </div>

        {confirmDelete ? (
          <div className="fg-detail-actions" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--err)', lineHeight: 1.5 }}>
              Type <strong>{project.name}</strong> to confirm deletion:
            </div>
            <input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder={project.name} autoFocus style={{ fontSize: 13 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-s"
                onClick={() => { onDelete(project.id); setConfirmDelete(false); setDeleteConfirmText(''); onClose() }}
                disabled={deleteConfirmText !== project.name}
                style={{ color: '#fff', background: deleteConfirmText === project.name ? 'var(--err)' : 'var(--bg-2)', borderColor: 'var(--err)', opacity: deleteConfirmText === project.name ? 1 : 0.5 }}
              >
                Permanently delete
              </button>
              <button className="btn btn-s" onClick={() => { setConfirmDelete(false); setDeleteConfirmText('') }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="fg-detail-actions">
            {!project.archived && (
              <>
                <button className="btn btn-accent" onClick={() => { onLoad(project.id); onClose() }}>
                  {isCurrent ? 'Reload' : 'Load'}
                </button>
                <button className="btn" onClick={() => onOverwrite(project.id)} title="Save current design over this project">Overwrite</button>
              </>
            )}
            <button className="btn" onClick={() => setEditing(true)}>Rename</button>
            <button className="btn" onClick={() => { onArchive(project.id); onClose() }}>{project.archived ? 'Restore' : 'Archive'}</button>
            <button className="btn" onClick={() => setConfirmDelete(true)} style={{ color: 'var(--err)' }}>Delete</button>
          </div>
        )}
      </div>
    </div>
  )
}

// Modal for starting a new project: capture name, folder, and starting point.
function NewProjectModal({ folders, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [folder, setFolder] = useState('')
  const [start, setStart] = useState('blank')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate({ name: trimmed, folder, blank: start === 'blank' })
  }

  const pickFolders = folders.filter(f => f !== 'all')

  return (
    <div className="fg-detail-overlay" onClick={onClose}>
      <div className="il-detail proj-detail proj-new-modal" onClick={e => e.stopPropagation()}>
        <button className="fg-detail-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="fg-detail-section" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>New project</h2>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>
            Give it a name and choose where to begin.
          </p>
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">Project name</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="e.g. Brand v1, Marketing site, Mobile app"
            autoFocus
            style={{ width: '100%', fontSize: 15, fontWeight: 600 }}
          />
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">Folder</div>
          <div className="proj-new-folders">
            <button
              type="button"
              className={`pl-chip${folder === '' ? ' active' : ''}`}
              onClick={() => setFolder('')}
            >
              None
            </button>
            {pickFolders.map(f => (
              <button
                key={f}
                type="button"
                className={`pl-chip${folder === f ? ' active' : ''}`}
                onClick={() => setFolder(f)}
                style={{ textTransform: 'capitalize' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">Start from</div>
          <div className="proj-new-start">
            <button
              type="button"
              className={`proj-new-start-opt${start === 'blank' ? ' active' : ''}`}
              onClick={() => setStart('blank')}
            >
              <strong>Blank canvas</strong>
              <span>Fresh defaults — palette, fonts, and scale reset.</span>
            </button>
            <button
              type="button"
              className={`proj-new-start-opt${start === 'current' ? ' active' : ''}`}
              onClick={() => setStart('current')}
            >
              <strong>Current design</strong>
              <span>Snapshot what you have open right now.</span>
            </button>
          </div>
        </div>

        <div className="fg-detail-actions">
          <button className="btn btn-accent" onClick={submit} disabled={!name.trim()}>Create project</button>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function Projects({ toast }) {
  const navigate = useNavigate()
  const { isPro } = useSubscription()
  const { loading: authLoading } = useAuth()
  const copy = useClipboard(toast)
  const {
    projects, canSaveProjects, projectLimit,
    saveProject, loadProject, deleteProject, renameProject, overwriteProject,
    archiveProject, resetDesign, setPalette, duplicateProject,
  } = useProject()

  // ── THREE STATES, NOT TWO ────────────────────────────────────────
  //
  // This page is the front door for signed-in visitors now, so “we do not know
  // yet” has to be its own state. Treating it as signed-out (which is what
  // `canSaveProjects` alone says while Firebase resolves) would show a returning
  // user the “Sign in to save your designs” panel for the ~1s the auth round trip
  // takes, and then swap it for their projects. That flash is the exact defect
  // the routing change exists to avoid, reproduced one level down.
  //
  // `resolving` is read from the same synchronous hint the router used, so the
  // two agree by construction: if the router believed there was a session and
  // sent them here, this page believes it too and holds the space.
  const [hintedSession] = useState(readSessionHint)
  const resolving = authLoading && hintedSession
  const signedOut = !canSaveProjects && !resolving
  const [newName, setNewName] = useState('')
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [loadedId, setLoadedId] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [activeFolder, setActiveFolder] = useState('all')
  const [detailProject, setDetailProject] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [view, setView] = useState('mine')
  const FOLDERS = ['all', 'brand', 'app', 'marketing', 'personal']
  const folderLimit = isPro ? 10 : 3
  const [folderMap, setFolderMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vs-project-folders') || '{}') } catch { return {} }
  })
  const setProjectFolder = (projectId, folder) => {
    const next = { ...folderMap, [projectId]: folder }
    setFolderMap(next)
    try { localStorage.setItem('vs-project-folders', JSON.stringify(next)) } catch {}
  }
  const [iconMap, setIconMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vs-project-icons') || '{}') } catch { return {} }
  })
  const setProjectIcon = (projectId, dataUrl) => {
    const next = { ...iconMap, [projectId]: dataUrl }
    setIconMap(next)
    try { localStorage.setItem('vs-project-icons', JSON.stringify(next)) } catch {}
  }
  const removeProjectIcon = (projectId) => {
    const next = { ...iconMap }
    delete next[projectId]
    setIconMap(next)
    try { localStorage.setItem('vs-project-icons', JSON.stringify(next)) } catch {}
  }
  const handleIconUpload = async (projectId, file) => {
    try {
      const dataUrl = await readIconFile(file)
      setProjectIcon(projectId, dataUrl)
      toast('Icon updated')
    } catch (e) {
      toast(e.message || 'Could not set icon')
    }
  }
  const handleUseCommunityPalette = (cp) => {
    setPalette({ colors: cp.colors, activeIdx: 0, base: cp.colors[0] })
    toast(`Loaded palette from "${cp.name}"`)
  }

  const sortFn = (a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'created') return new Date(b.createdAt) - new Date(a.createdAt)
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
  }
  const matchesSearch = (p) => !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase())
  const matchesFolder = (p) => activeFolder === 'all' || (folderMap[p.id] || '').toLowerCase() === activeFolder
  const activeProjects = projects.filter(p => !p.archived && matchesSearch(p) && matchesFolder(p)).sort(sortFn)
  const archivedProjects = projects.filter(p => p.archived && matchesSearch(p)).sort(sortFn)

  // A signed-out visitor gets a real page rather than a bounce to /login.
  //
  // This panel has existed in this file the whole time and has never once been
  // seen: /projects was behind RequireAuth, which redirected before it could
  // render. Making it reachable is what removes the redirect loop the new front
  // door would otherwise have (see the route note in App.jsx).
  //
  // The tip and the starters render here too. They are public, static and useful,
  // and a page that says only “sign in” to somebody who arrived by accident is a
  // worse advertisement for the product than one that shows them four real
  // artefacts they can open without an account.
  //
  // WHAT IS NOT HERE: any mention of the free-plan allowance. The quota block sits
  // below this return, and it must stay below it —
  // tests/user-sim/20-billing-banner.spec.js asserts that a person who has never
  // signed in is never told what their plan allows.
  if (signedOut) {
    return (
      <div className="sec uh">
        <header className="sec-h uh-head">
          <div>
            <h1>Projects</h1>
            <p className="uh-sub">Palette, fonts, type scale and tints — saved together, and yours to open anywhere you sign in.</p>
          </div>
        </header>

        <div className="uh-signin">
          <h2>Sign in to keep what you build</h2>
          <p>
            Every tool works without an account. Signing in is what makes a palette,
            a pairing and a scale survive the tab — saved together as a project you can
            reopen on any device.
          </p>
          <button className="btn btn-accent" onClick={() => navigate('/login')}>Sign in</button>
        </div>

        <DailyBand suggestion={nextToolSuggestion([])} />
        <StarterRow />
      </div>
    )
  }

  const handleSave = () => {
    if (!newName.trim()) { toast('Enter a project name'); return }
    try {
      const id = saveProject(newName.trim())
      toast(`Saved "${newName.trim()}"`)
      setLoadedId(id)
      setNewName('')
      setShowSaveForm(false)
    } catch (e) {
      toast(e.message || 'Failed to save')
    }
  }

  const handleCreateNew = ({ name, folder, blank }) => {
    try {
      const id = saveProject(name, { blank })
      if (folder) setProjectFolder(id, folder)
      if (blank) resetDesign()
      setLoadedId(id)
      setShowNewModal(false)
      toast(`Created "${name}"`)
    } catch (e) {
      toast(e.message || 'Failed to create project')
    }
  }

  const handleLoad = (id) => {
    loadProject(id)
    setLoadedId(id)
    const project = projects.find(p => p.id === id)
    toast(`Loaded "${project?.name}"`)
  }

  // “Open straight into a specific tool”, and the LOAD is the important half.
  // Navigating to /create/type-scale without loading first opens the tool on
  // whatever design was already in the working kit — which looks like it worked
  // and quietly edits the wrong thing.
  const handleOpenIn = (id, route) => {
    loadProject(id)
    setLoadedId(id)
    navigate(route)
  }

  const handleDuplicate = (id) => {
    try {
      const newIdValue = duplicateProject(id)
      setLoadedId(null)
      const project = projects.find(p => p.id === id)
      toast(`Duplicated "${project?.name}"`)
      return newIdValue
    } catch (e) {
      // The cap message from ProjectContext, shown rather than swallowed — a
      // duplicate button that silently does nothing at the cap is the silent
      // refusal the account-lifecycle audit filed as B6.
      toast(e.message || 'Could not duplicate that project')
      return null
    }
  }

  // The export is the CSS custom properties this project resolves to, built by
  // the same utils/exportBuilder.js the style-guide export uses — not a second
  // export format invented for this page. Export is free on every plan, which
  // is what the Plans page already promises.
  const handleExportCss = (id) => {
    const project = projects.find(p => p.id === id)
    if (!project) return
    const d = project.design || {}
    copy(buildCSSVars({
      palette: d.palette,
      tints: d.tints,
      fonts: d.fonts,
      typeScale: d.typeScale,
    }))
  }

  const handleDelete = (id) => {
    deleteProject(id)
    if (loadedId === id) setLoadedId(null)
    toast('Project deleted')
  }

  const handleRename = (id, name) => {
    if (!name.trim()) return
    renameProject(id, name.trim())
    toast('Renamed')
  }

  const handleOverwrite = (id) => {
    overwriteProject(id)
    setLoadedId(id)
    const project = projects.find(p => p.id === id)
    toast(`Saved over "${project?.name}"`)
  }

  const handleArchive = (id) => {
    archiveProject(id)
    const project = projects.find(p => p.id === id)
    toast(project?.archived ? `"${project?.name}" restored` : `"${project?.name}" archived`)
    if (loadedId === id) setLoadedId(null)
  }

  const totalProjects = projects.length
  // Counted off the same array as everything else on the page. See
  // utils/userHome.js: any figure that comes out zero is not printed at all.
  const stats = homeStats(projects)
  const suggestion = resolving ? null : nextToolSuggestion(projects)

  // B6 (2026-08-12 account lifecycle audit): the cap was enforced and never
  // announced. `projects` is the SAME array saveProject() counts — archived
  // records included — so this counter cannot drift from the rule that actually
  // refuses the save. projectLimit is already Infinity on Pro, which resolves to
  // the 'unlimited' state and shows nothing.
  const quota = projectQuota(totalProjects, projectLimit)
  // Archiving toggles a flag; it does NOT remove the record, so it does not free
  // a slot. Saying "archive one" would be false, and a user who has archived
  // something is the most likely person to believe it. Only mention it to
  // someone who has actually archived — otherwise it is noise.
  const hasArchived = projects.some(p => p.archived)

  return (
    <div className="sec uh">
      <header className="sec-h uh-head">
        <div className="uh-head-main">
          <h1>Projects</h1>
          <p className="uh-sub">Your saved design systems — palette, fonts, type scale, and tints.</p>
          {/* QUICK DATA TRACKING, and every figure countable.

              The rule is in utils/userHome.js and it is the lesson from
              `homepage-community-points-outward`, which shipped “0 saves” on
              every card: a figure with nothing behind it is not printed. So
              somebody with one untouched project sees “1 project” and nothing
              else, rather than “1 project · 0 colours · 0 parts”.

              The allowance joins the project count ONLY once it is worth
              knowing (projectQuota decides when). A permanent “1 of 3” from the
              first project turns the free tier into a countdown, which is the
              read P-003 is trying to avoid. */}
          {stats.length > 0 && (
            <ul className="uh-stats">
              {stats.map((s) => (
                <li key={s.id}>
                  <strong>{s.value}</strong>
                  {s.id === 'projects' && quota.shouldTell
                    ? ` of ${quota.limit} projects`
                    : s.of ? <> of {s.of} {s.label}</> : ` ${s.label}`}
                </li>
              ))}
            </ul>
          )}
          {/* The sentence the audit found missing. At the cap it has to do two
              jobs the old silent refusal did neither of: say that nothing was
              taken away (true — ProjectContext only blocks NEW saves), and name
              a way forward that does not require paying. */}
          {quota.shouldTell && (
            <p data-testid="project-quota-note" className="uh-quota">
              {quota.atLimit ? (
                <>
                  You’ve used all {quota.limit} projects on the free plan. Nothing has been
                  removed — everything here is still yours to open and edit. To start
                  another, delete one you’re finished with
                  {hasArchived ? ', including any you archived (archived projects still take a slot)' : ''}
                  , or{' '}
                  <NavLink to="/plans" className="uh-quota-link">go Pro for unlimited projects</NavLink>.
                </>
              ) : (
                <>
                  {quota.remaining} more project{quota.remaining === 1 ? '' : 's'} on the free plan.{' '}
                  <NavLink to="/plans" className="uh-quota-link">Pro lifts the cap</NavLink>.
                </>
              )}
            </p>
          )}
        </div>
        <div className="uh-head-actions">
          {!showSaveForm && (
            <button className="btn btn-accent" onClick={() => setShowSaveForm(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              Save Current
            </button>
          )}
          <button className="btn" onClick={() => setShowNewModal(true)} title="Start a new project">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Project
          </button>
        </div>
      </header>

      {/* Orientation before inventory: what to do next, and one thing worth
          knowing, above the list of things you already have. */}
      <DailyBand suggestion={suggestion} resolving={resolving} />

      {showSaveForm && (
        <div className="card" style={{ padding: 20, marginBottom: 24, maxWidth: 560 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 10 }}>
            Add current design to project
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="e.g. Brand v1, Marketing site, Mobile app"
              autoFocus
              style={{ flex: 1 }}
            />
            <button className="btn btn-accent" onClick={handleSave}>Save</button>
            <button className="btn" onClick={() => { setShowSaveForm(false); setNewName('') }}>Cancel</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 10 }}>
            Captures: palette, tints, state colours, gradient, fonts, type scale.
          </div>
        </div>
      )}

      <div className="proj-tabs">
        <button className={`proj-tab${view === 'mine' ? ' active' : ''}`} onClick={() => setView('mine')}>My Projects</button>
        <button className={`proj-tab${view === 'community' ? ' active' : ''}`} onClick={() => setView('community')}>Community</button>
      </div>

      {view === 'community' ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>
            Explore design systems shared by the community. Load a palette to start from it.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap: 14 }}>
            {COMMUNITY_PROJECTS.map(cp => (
              <div key={cp.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 16px 12px', background: `linear-gradient(135deg, ${cp.colors[0]}, ${cp.colors[1] || cp.colors[0]})`, position: 'relative' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', textShadow: '0 1px 6px rgba(0,0,0,.25)' }}>
                    {cp.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', marginTop: 2, fontWeight: 500 }}>
                    by {cp.author}
                  </div>
                </div>
                <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ColorRow colors={cp.colors} />
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {cp.colors.map((c, i) => (
                      <span key={i} style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--t2)', background: 'var(--bg-1)', padding: '2px 6px', borderRadius: 4 }}>{c}</span>
                    ))}
                  </div>
                  <button className="btn btn-s btn-accent" onClick={() => handleUseCommunityPalette(cp)} style={{ fontSize: 11, marginTop: 'auto' }}>
                    Use this palette
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
      <>
      {projects.length > 0 && (
        <>
          <div className="proj-folders">
            {FOLDERS.map(f => (
              <button key={f} className={`proj-folder-chip${activeFolder === f ? ' active' : ''}`} onClick={() => setActiveFolder(f)}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <span className="proj-folder-note">
              {isPro ? (
                <>{folderLimit} folders</>
              ) : (
                <>{folderLimit} folders · <NavLink to="/plans">Upgrade for 10</NavLink></>
              )}
            </span>
          </div>
          <div className="proj-toolbar">
            <div className="proj-search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…" />
              {search && <button onClick={() => setSearch('')} aria-label="Clear">&times;</button>}
            </div>
            <label className="proj-sort">
              <span>Sort</span>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="recent">Recently updated</option>
                <option value="created">Newest</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </label>
            <span className="proj-count">{activeProjects.length} project{activeProjects.length === 1 ? '' : 's'}</span>
          </div>
        </>
      )}

      {/* WE DO NOT KNOW YET. Firebase is still resolving and the session hint
          says there is an account, so the project list is genuinely unknown —
          not empty. Rendering “No projects yet” here would tell a returning user
          their work was gone for the second it takes auth to land, which is a
          far worse thing to say than nothing.

          Everything above this point — the masthead, the tip, the whole frame —
          is already on screen, and the starters below it are too. This is the
          only region that has to wait, because it is the only region that
          depends on knowing who you are. */}
      {resolving ? (
        <div className="uh-resolving" role="status">
          <div className="fg-loader" />
          <p>Opening your projects…</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No projects yet</h3>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16, maxWidth: 360, margin: '0 auto 16px' }}>
            Build a palette in <NavLink to="/create/color">Colour Studio</NavLink> and pair fonts in <NavLink to="/create/font-pair">Font Pair Finder</NavLink>, then save your design as a project.
          </p>
          <button className="btn btn-accent" onClick={() => setShowNewModal(true)}>Create your first project</button>
        </div>
      ) : activeProjects.length === 0 && archivedProjects.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--t2)' }}>No projects match “{search}”.</p>
        </div>
      ) : (
        <>
          <div className="uh-grid">
            {activeProjects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                isCurrent={loadedId === p.id}
                onLoad={handleLoad}
                onDelete={handleDelete}
                onRename={handleRename}
                onOverwrite={handleOverwrite}
                onArchive={handleArchive}
                folder={folderMap[p.id]}
                onFolderChange={setProjectFolder}
                folders={FOLDERS}
                onOpenDetail={setDetailProject}
                icon={iconMap[p.id]}
                onDuplicate={handleDuplicate}
                onExportCss={handleExportCss}
                onOpenIn={handleOpenIn}
              />
            ))}
          </div>

          {archivedProjects.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <button className="btn btn-s" onClick={() => setShowArchived(!showArchived)} style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 12 }}>
                {showArchived ? 'Hide' : 'Show'} archived ({archivedProjects.length})
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: 4, transition: 'transform .2s', transform: showArchived ? 'rotate(180deg)' : 'none' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showArchived && (
                <div className="uh-grid">
                  {archivedProjects.map(p => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      isCurrent={false}
                      onLoad={handleLoad}
                      onDelete={handleDelete}
                      onRename={handleRename}
                      onOverwrite={handleOverwrite}
                      onArchive={handleArchive}
                      folder={folderMap[p.id]}
                      onFolderChange={setProjectFolder}
                      folders={FOLDERS}
                      onOpenDetail={setDetailProject}
                      icon={iconMap[p.id]}
                      onDuplicate={handleDuplicate}
                      onExportCss={handleExportCss}
                      onOpenIn={handleOpenIn}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
      </>
      )}

      {detailProject && (
        <ProjectDetail
          project={detailProject}
          isCurrent={loadedId === detailProject.id}
          onClose={() => setDetailProject(null)}
          onLoad={handleLoad}
          onDelete={handleDelete}
          onRename={(id, name) => { handleRename(id, name); setDetailProject(prev => prev ? { ...prev, name: name.trim() } : prev) }}
          onOverwrite={handleOverwrite}
          onArchive={handleArchive}
          icon={iconMap[detailProject.id]}
          onIconChange={(file) => handleIconUpload(detailProject.id, file)}
          onIconRemove={() => { removeProjectIcon(detailProject.id); toast('Icon removed') }}
        />
      )}

      {showNewModal && (
        <NewProjectModal
          folders={FOLDERS}
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreateNew}
        />
      )}

      {/* Suggested artefacts, at the FOOT rather than the top. They are the
          least important thing on this page for somebody who came here to open
          their own work, and putting a “recommended for you” row above a user's
          own projects is the Fiverr home
          (mobbin.com/screens/531e6df5-43b8-4458-835c-6ad26d298910), where
          “Based on your browsing history” outranks everything the visitor
          actually came for. Below the fold is where a browse row belongs on a
          working surface. */}
      <StarterRow />
    </div>
  )
}
