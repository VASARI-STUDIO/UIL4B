import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'

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

function ProjectCard({ project, isCurrent, onLoad, onDelete, onRename, onOverwrite }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const headingFamily = project.design?.fonts?.heading?.family || 'Inter'
  const bodyFamily = project.design?.fonts?.body?.family || 'Inter'
  const updated = new Date(project.updatedAt || project.createdAt)

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Preview header — uses project's own palette as background */}
      <div style={{ padding: '20px 18px', background: project.design?.palette?.colors?.[0] || 'var(--bg-2)', position: 'relative' }}>
        <div style={{ fontFamily: `'${headingFamily}', sans-serif`, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', textShadow: '0 1px 8px rgba(0,0,0,.2)' }}>
          {project.design?.palette?.colors?.[0]?.toUpperCase() || '#'}
        </div>
        <div style={{ fontFamily: `'${bodyFamily}', sans-serif`, fontSize: 11, color: 'rgba(255,255,255,.85)', marginTop: 2, textShadow: '0 1px 6px rgba(0,0,0,.2)' }}>
          {headingFamily} / {bodyFamily}
        </div>
      </div>

      {/* Body */}
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
              <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', flex: 1 }}>{project.name}</h3>
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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 10, color: 'var(--t2)' }}>
          <span>{project.design?.palette?.colors?.length || 0} colours</span>
          <span>·</span>
          <span>{project.design?.tints?.scale?.length || 0} tints</span>
          <span>·</span>
          <span>{project.design?.typeScale?.base || 16}px / {(project.design?.typeScale?.ratio || 1.25).toFixed(2)}×</span>
        </div>

        {confirmDelete ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--err)', flex: 1 }}>Delete this project?</span>
            <button className="btn btn-s" onClick={() => onDelete(project.id)} style={{ color: 'var(--err)', fontSize: 10 }}>Delete</button>
            <button className="btn btn-s" onClick={() => setConfirmDelete(false)} style={{ fontSize: 10 }}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
            <button className="btn btn-s btn-accent" onClick={() => onLoad(project.id)} style={{ fontSize: 11, flex: 1 }}>
              {isCurrent ? 'Reload' : 'Load'}
            </button>
            <button className="btn btn-s" onClick={() => onOverwrite(project.id)} style={{ fontSize: 11 }} title="Save current design over this project">
              Overwrite
            </button>
            <button className="btn btn-s" onClick={() => setEditing(true)} style={{ fontSize: 11 }}>
              Rename
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

export default function Projects({ toast }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useI18n()
  const {
    design, projects, canSaveProjects,
    saveProject, loadProject, deleteProject, renameProject, overwriteProject,
    resetDesign,
  } = useProject()
  const [newName, setNewName] = useState('')
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [loadedId, setLoadedId] = useState(null)

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
              + Save current
            </button>
          )}
          <button className="btn" onClick={() => { resetDesign(); setLoadedId(null); toast('Reset to defaults') }} title="Start fresh">
            New
          </button>
        </div>
      </div>

      {/* Save form */}
      {showSaveForm && (
        <div className="card" style={{ padding: 20, marginBottom: 24, maxWidth: 560 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 10 }}>
            Save current design as
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

      {/* Empty state */}
      {projects.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>📁</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No projects yet</h3>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>
            Build a palette in <NavLink to="/color">Colour Studio</NavLink> and pair fonts in <NavLink to="/fontpairs">Font Pair Finder</NavLink>, then save your design here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap: 14 }}>
          {[...projects].reverse().map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              isCurrent={loadedId === p.id}
              onLoad={handleLoad}
              onDelete={handleDelete}
              onRename={handleRename}
              onOverwrite={handleOverwrite}
            />
          ))}
        </div>
      )}
    </div>
  )
}
