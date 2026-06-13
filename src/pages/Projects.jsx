import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { useSubscription } from '../contexts/SubscriptionContext'

function ColorRow({ colors }) {
  if (!colors?.length) return null
  return (
    <div style={{ display: 'flex', height: 24, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {colors.slice(0, 6).map((c, i) => (
        <div key={i} style={{ flex: 1, background: c }} title={c} />
      ))}
    </div>
  )
}

function ProjectCard({ project, isCurrent, onLoad, onDelete, onRename, onOverwrite, onArchive, folder, onFolderChange, folders, onOpenDetail }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const headingFamily = project.design?.fonts?.heading?.family || 'Inter'
  const bodyFamily = project.design?.fonts?.body?.family || 'Inter'
  const updated = new Date(project.updatedAt || project.createdAt)

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: project.archived ? 0.6 : 1 }}>
      <div
        onClick={() => onOpenDetail?.(project)}
        title="View project details"
        style={{ padding: '20px 18px', background: project.design?.palette?.colors?.[0] || 'var(--bg-2)', position: 'relative', cursor: 'pointer' }}
      >
        <div style={{ fontFamily: `'${headingFamily}', sans-serif`, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', textShadow: '0 1px 8px rgba(0,0,0,.2)' }}>
          {project.design?.palette?.colors?.[0]?.toUpperCase() || '#'}
        </div>
        <div style={{ fontFamily: `'${bodyFamily}', sans-serif`, fontSize: 11, color: 'rgba(255,255,255,.85)', marginTop: 2, textShadow: '0 1px 6px rgba(0,0,0,.2)' }}>
          {headingFamily} / {bodyFamily}
        </div>
        {project.archived && (
          <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', background: 'rgba(0,0,0,.5)', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>
            Archived
          </span>
        )}
      </div>

      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {editing ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              style={{ flex: 1, fontSize: 14, fontWeight: 600 }}
            />
            <button className="btn btn-s" onClick={() => { onRename(project.id, name); setEditing(false) }}>Save</button>
            <button className="btn btn-s" onClick={() => { setName(project.name); setEditing(false) }}>Cancel</button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <h3
                onClick={() => onOpenDetail?.(project)}
                title="View project details"
                style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', flex: 1, cursor: 'pointer' }}
              >{project.name}</h3>
              {isCurrent && (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ok)', background: 'rgba(16,185,129,.1)', padding: '2px 6px', borderRadius: 4 }}>
                  Loaded
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>
              Updated {updated.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        )}

        <ColorRow colors={project.design?.palette?.colors} />

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, fontSize: 10, color: 'var(--t2)' }}>
          <span>{project.design?.palette?.colors?.length || 0} colours</span>
          <span>·</span>
          <span>{project.design?.tints?.scale?.length || 0} tints</span>
          <span>·</span>
          <span>{project.design?.typeScale?.base || 16}px / {(project.design?.typeScale?.ratio || 1.25).toFixed(2)}×</span>
          <select
            value={folder || ''}
            onChange={e => onFolderChange(project.id, e.target.value)}
            style={{ marginLeft: 'auto', fontSize: 9, padding: '1px 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--t1)', cursor: 'pointer' }}
            title="Assign folder"
          >
            <option value="">No folder</option>
            {(folders || []).filter(f => f !== 'all').map(f => (
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
            ))}
          </select>
        </div>

        {confirmDelete ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--err)', lineHeight: 1.5 }}>
              Type <strong>{project.name}</strong> to confirm deletion:
            </div>
            <input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={project.name}
              autoFocus
              style={{ fontSize: 12 }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-s"
                onClick={() => { onDelete(project.id); setConfirmDelete(false); setDeleteConfirmText('') }}
                disabled={deleteConfirmText !== project.name}
                style={{ color: '#fff', background: deleteConfirmText === project.name ? 'var(--err)' : 'var(--bg-2)', borderColor: 'var(--err)', fontSize: 10, opacity: deleteConfirmText === project.name ? 1 : 0.5 }}
              >
                Permanently delete
              </button>
              <button className="btn btn-s" onClick={() => { setConfirmDelete(false); setDeleteConfirmText('') }} style={{ fontSize: 10 }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
            {!project.archived && (
              <>
                <button className="btn btn-s btn-accent" onClick={() => onLoad(project.id)} style={{ fontSize: 11, flex: 1 }}>
                  {isCurrent ? 'Reload' : 'Load'}
                </button>
                <button className="btn btn-s" onClick={() => onOverwrite(project.id)} style={{ fontSize: 11 }} title="Save current design over this project">
                  Overwrite
                </button>
              </>
            )}
            <button className="btn btn-s" onClick={() => setEditing(true)} style={{ fontSize: 11 }}>
              Rename
            </button>
            <button className="btn btn-s" onClick={() => onArchive(project.id)} style={{ fontSize: 11 }}>
              {project.archived ? 'Restore' : 'Archive'}
            </button>
            <button className="btn btn-s" onClick={() => setConfirmDelete(true)} style={{ fontSize: 11, color: 'var(--err)' }}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectDetail({ project, isCurrent, onClose, onLoad, onDelete, onRename, onOverwrite, onArchive }) {
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

export default function Projects({ toast }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useI18n()
  const { isPro } = useSubscription()
  const {
    design, projects, canSaveProjects,
    saveProject, loadProject, deleteProject, renameProject, overwriteProject,
    archiveProject, resetDesign,
  } = useProject()
  const [newName, setNewName] = useState('')
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [loadedId, setLoadedId] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [activeFolder, setActiveFolder] = useState('all')
  const [detailProject, setDetailProject] = useState(null)
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

  const sortFn = (a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'created') return new Date(b.createdAt) - new Date(a.createdAt)
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
  }
  const matchesSearch = (p) => !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase())
  const matchesFolder = (p) => activeFolder === 'all' || (folderMap[p.id] || '').toLowerCase() === activeFolder
  const activeProjects = projects.filter(p => !p.archived && matchesSearch(p) && matchesFolder(p)).sort(sortFn)
  const archivedProjects = projects.filter(p => p.archived && matchesSearch(p)).sort(sortFn)

  if (!canSaveProjects) {
    return (
      <div className="sec">
        <div className="sec-h">
          <h1>Projects</h1>
          <p>Sign in to save your designs and come back to them anytime.</p>
        </div>
        <div className="card" style={{ maxWidth: 480, padding: 32, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Save your designs</h3>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20 }}>
            Sign in to save palettes, type scales, and font pairings as named projects you can load anytime.
          </p>
          <button className="btn btn-accent" onClick={() => navigate('/login')}>Sign in</button>
        </div>
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

  const handleLoad = (id) => {
    loadProject(id)
    setLoadedId(id)
    const project = projects.find(p => p.id === id)
    toast(`Loaded "${project?.name}"`)
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

  return (
    <div className="sec">
      <div className="sec-h" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1>Projects</h1>
          <p>Your saved design systems — palette, fonts, type scale, and tokens.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!showSaveForm && (
            <button className="btn btn-accent" onClick={() => setShowSaveForm(true)}>
              Save Current Design
            </button>
          )}
          <button className="btn" onClick={() => { resetDesign(); setLoadedId(null); toast('Reset to defaults') }} title="Start fresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Project
          </button>
        </div>
      </div>

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
                <>{folderLimit} folders · <NavLink to="/pricing">Upgrade for 10</NavLink></>
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

      {projects.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>📁</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No projects yet</h3>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>
            Build a palette in <NavLink to="/color">Colour Studio</NavLink> and pair fonts in <NavLink to="/fontpairs">Font Pair Finder</NavLink>, then add your design to a project.
          </p>
        </div>
      ) : activeProjects.length === 0 && archivedProjects.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--t2)' }}>No projects match “{search}”.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap: 14 }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap: 14 }}>
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
                    />
                  ))}
                </div>
              )}
            </div>
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
        />
      )}
    </div>
  )
}
