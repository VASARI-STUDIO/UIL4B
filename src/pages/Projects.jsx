import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { useClipboard } from '../hooks/useClipboard'
import { isSvg } from '../utils/imageProcessing'
import { projectQuota } from '../utils/projectQuota'
import { nextToolSuggestion, homeStats } from '../utils/userHome'
import { readSessionHint } from '../utils/sessionHint'
import { buildCSSVars } from '../utils/exportBuilder'
import useModalDialog from '../hooks/useModalDialog'
import DailyBand from '../components/userhome/DailyBand'
import StarterRow from '../components/userhome/StarterRow'
import ProjectCard from '../components/userhome/ProjectCard'
import SaveRefusal from '../components/SaveRefusal'
// The `projects` page stylesheet. Imported here rather than from global.css so
// Vite emits it as this lazy route's own chunk stylesheet — only a visitor who
// opens this page downloads it, and it arrives with the chunk, before paint.
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/account.css'
import '../styles/deferred/tool-shell.css'
import '../styles/pages/projects.css'

// THE "COMMUNITY" TAB IS GONE, AND IT WAS THE SAME FABRICATION THIS REPOSITORY
// ALREADY DELETED ONCE.
//
// It rendered four hard-coded design systems — "Sunset Brand by Maya R.",
// "Fintech Blue by Devon K.", "Forest Co. by Sam T.", "Mono Minimal by
// Alex P." — under the sentence "Explore design systems shared by the
// community." Not one of those four people exists, not one of those systems was
// shared by anybody, and nothing on the card said so.
//
// "Maya R." is the SAME invented designer the 2026-08-11 site audit deleted from
// the real Community surface. Read the header of src/data/communityDesigns.js:
// twelve invented designs by invented people, "Aurora Analytics by Maya R., 342
// saves", rendered by the same card as real submissions with nothing marking
// them apart. That audit's conclusion — a save count is a claim about what other
// people did, and shipping fabricated ones to real users is not fixable later —
// is held by tests/unit/community-seed.test.js, which asserts no seeded item is
// credited to a person.
//
// That test reads COMMUNITY_DESIGNS. It never read this file, so the same four
// invented designers went on shipping here for another month, on the page where
// a person's OWN work lives, one tab away from it. The guard now covers both
// (see tests/unit/community-seed.test.js, "no surface invents a designer").
//
// Nothing replaces it. /community is a real route with real curated links
// credited to the platform they open; this page is for the projects you made.

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

function ProjectDetail({ project, isCurrent, onClose, onLoad, onDelete, onRename, onOverwrite, onArchive, icon, onIconChange, onIconRemove }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // The app's shared modal contract — focus moves in, Tab is trapped, Escape
  // closes, scroll is locked, and focus goes BACK to the card that opened it.
  // This dialog used to hand-roll only Escape and the scroll lock, so a
  // keyboard user who closed it was dropped on <body> and had to Tab down the
  // whole page to find the card they had just been looking at.
  const dialogRef = useModalDialog(onClose)

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
      <div
        className="il-detail proj-detail"
        role="dialog"
        aria-modal="true"
        aria-label={project.name}
        ref={dialogRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
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

// Modal for starting a new project: capture a name and a starting point.
//
// `error` is the refusal the page got back from saveProject() — the free cap,
// in ProjectContext's own words. It is shown HERE, under the form that was
// refused, rather than as a toast: rendered on 2026-09-09, the cap answered
// "Create project" with a green-tick toast that read "Free plan saves up to 3
// projects — go Pro for unlimited." for 1.8 seconds and then vanished, leaving
// the form open and the name still typed as though nothing had been decided.
function NewProjectModal({ onClose, onCreate, error }) {
  const [name, setName] = useState('')
  const [start, setStart] = useState('blank')

  // Shared modal contract (see ProjectDetail above). `initialFocus` keeps the
  // landing spot this form already had — the name field — without a second
  // autoFocus fighting the hook for it.
  const dialogRef = useModalDialog(onClose, { initialFocus: '#proj-new-name' })

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate({ name: trimmed, blank: start === 'blank' })
  }

  return (
    <div className="fg-detail-overlay" onClick={onClose}>
      <div
        className="il-detail proj-detail proj-new-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proj-new-title"
        ref={dialogRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        <button className="fg-detail-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="fg-detail-section" style={{ marginBottom: 20 }}>
          <h2 id="proj-new-title" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>New project</h2>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>
            Give it a name and choose where to begin.
          </p>
        </div>

        <div className="fg-detail-section">
          <label className="fg-detail-label" htmlFor="proj-new-name">Project name</label>
          <input
            id="proj-new-name"
            value={name}
            onChange={e => setName(e.target.value)}
            // preventDefault is load-bearing. submit() closes the dialog, and
            // useModalDialog hands focus back to the New Project button in the
            // same tick — so without it the SAME Enter's keypress reaches that
            // button, Chromium activates it, and the dialog reopens over the
            // project it just created. Seen in a keydown/keypress/click trace on
            // 2026-09-09: keydown@input → click@button[New Project].
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            placeholder="e.g. Brand v1, Marketing site, Mobile app"
            style={{ width: '100%', fontSize: 15, fontWeight: 600 }}
          />
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

        {error && <SaveRefusal message={error} testId="project-create-refusal" />}

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
  const { loading: authLoading } = useAuth()
  const copy = useClipboard(toast)
  const {
    projects, canSaveProjects, projectLimit,
    saveProject, loadProject, deleteProject, renameProject, overwriteProject,
    archiveProject, resetDesign, duplicateProject,
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
  // The cap's refusal, held until the person acts on it — see SaveRefusal.
  const [saveError, setSaveError] = useState('')
  const [createError, setCreateError] = useState('')
  const [loadedId, setLoadedId] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [detailProject, setDetailProject] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)
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
  const sortFn = (a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'created') return new Date(b.createdAt) - new Date(a.createdAt)
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
  }
  const matchesSearch = (p) => !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase())
  const activeProjects = projects.filter(p => !p.archived && matchesSearch(p)).sort(sortFn)
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

  // A refusal is not a success. Both of these used to answer the free cap with
  // `toast(e.message)`, which is the SUCCESS toast — green tick, 1.8 seconds,
  // no link — carrying "Free plan saves up to 3 projects — go Pro for
  // unlimited." Rendered on 2026-09-09 at 390 and 1280: the tick was drawn,
  // the sentence was gone before it could be read twice, and the form stayed
  // open with the name still in it, so the person was left to guess whether
  // the save had happened. The refusal now stays in the form it refused
  // (SaveRefusal), in ProjectContext's own words, with the way forward as a
  // link. Nothing about the rule changed; only where the answer lives.
  const handleSave = () => {
    if (!newName.trim()) { toast('Enter a project name'); return }
    try {
      const id = saveProject(newName.trim())
      toast(`Saved "${newName.trim()}"`)
      setLoadedId(id)
      setNewName('')
      setSaveError('')
      setShowSaveForm(false)
    } catch (e) {
      setSaveError(e.message || 'Failed to save')
    }
  }

  const handleCreateNew = ({ name, blank }) => {
    try {
      const id = saveProject(name, { blank })
      if (blank) resetDesign()
      setLoadedId(id)
      setCreateError('')
      setShowNewModal(false)
      toast(`Created "${name}"`)
    } catch (e) {
      setCreateError(e.message || 'Failed to create project')
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
      // refusal the account-lifecycle audit filed as B6. There is no form to
      // hold this one (it comes from a card's overflow menu), so it stays a
      // toast — but an ERROR toast: the default kind draws the success tick
      // over a refusal.
      toast(e.message || 'Could not duplicate that project', 'error')
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

  // THE BAND IS BELOW THE WORK NOW, IN EVERY STATE, AND #458 WAS RIGHT ABOUT
  // THE EMPTY ONE AND HALF-RIGHT ABOUT THE REST.
  //
  // #458 measured the empty account and moved the band under the empty state,
  // because 258px of stacked phone layout sat between a new signup and the only
  // control this page offers them. It left the band above the list for an
  // account that HAS projects, on the reasoning that orientation precedes
  // inventory. Measured, that reasoning cost the same thing one state over.
  //
  // Rendered 2026-09-13 on the built preview at 390x844, signed in, free plan:
  //
  //   1 project   h1 at y=72, first project card at y=781. 709px of page
  //               between the heading and the user's own work, and the card's
  //               top edge 63px from the fold.
  //   3 projects  first project card at y=882 — BELOW THE FOLD ENTIRELY. A
  //               person at the free cap, on a phone, opening the page that
  //               holds everything they have made, saw none of it without
  //               scrolling.
  //
  // The band is 258px of that at phone widths (it collapses to one column at
  // <=860px, so it is widest exactly where vertical space is scarcest). What it
  // spends those 258px on, above a person's own saved work, is a rotating
  // typography tip: "Letter-spacing is a function of size, not of taste."
  //
  // So the order is now the same one the empty account already uses, which is
  // also the order the note at the foot of this file gives for StarterRow —
  // what you have, then what to look at next. It is not width-gated and not
  // state-gated: one render site, the same at 320 and at 1440, empty or full,
  // and the reading order is finally invariant across both.

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
            <button className="btn" onClick={() => { setShowSaveForm(false); setNewName(''); setSaveError('') }}>Cancel</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 10 }}>
            Captures: palette, tints, state colours, gradient, fonts, type scale.
          </div>
          {saveError && <SaveRefusal message={saveError} testId="project-save-refusal" />}
        </div>
      )}

      {/* FOLDERS ARE GONE. Founder decision, 2026-09-13: drop folders as an
          entitlement entirely and remove the UI that implies one.

          #452 had already deleted the sentence "3 folders · Upgrade for 10"
          and its orphan `folderLimit`, on the finding that both numbers were
          false and that paying changed the string and nothing else. What it
          left behind was the mechanism the sentence had been sold on, and
          rendering that mechanism is what made the rest of the case:

          · THE FIVE CATEGORIES WERE NOT THE USER'S. `FOLDERS` was a fixed
            array — all, brand, app, marketing, personal — identical for every
            account that has ever existed, with no creation, rename or delete
            control anywhere in the repository. A filter bar offering someone
            four categories they did not choose, above a list that holds at most
            three items on the free plan, is a taxonomy the product invented for
            them.
          · IT CONTRADICTED THE PAGE'S OWN PROMISE. The filing lived in
            `vs-project-folders` in localStorage and nowhere else (see
            utils/dataExport.js, which marks it pii:'local'). This page's
            signed-out subtitle reads "saved together, and yours to open
            anywhere you sign in" — and the folder a project was filed in did
            not travel to the next device. A project sorted on a laptop was
            unsorted on the phone, silently, with nothing said.
          · IT COST A SEVEN-CONTROL ROW ITS MEANING TO ASSISTIVE TECHNOLOGY.
            Read off Chrome's own accessibility tree at 1440 on 2026-09-13, the
            five chips and the two tabs above them ALL reported
            selected=undefined pressed=undefined current=undefined — plain
            buttons whose only statement of which filter was active was the
            `.active` class. Deleting the feature deletes that defect rather
            than papering over it with aria-pressed on a control nobody asked
            for.

          Nothing replaces it. Search and Sort remain, they are enough for three
          projects, and the one quota this page states — "3 of 3 projects" in
          the header — is real and enforced by ProjectContext. */}
      {projects.length > 0 && (
        <>
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
            {/* THE SAME NUMBER TWICE, 364px APART, is what this was without
                the condition. Measured at 1440 on 2026-09-13 at the free cap:
                the masthead printed "3 of 3 projects" at y=203 and this printed
                "3 projects" at y=567. Two counters of one quantity, and the
                second one silent about the allowance the first one states.

                A count is only worth printing when it is NOT the count the
                masthead already gives, which is exactly when a search has
                narrowed the list. Then it says how many of your projects
                matched, which nothing else on the page says. */}
            {search.trim() && (
              <span className="proj-count">{activeProjects.length} project{activeProjects.length === 1 ? '' : 's'}</span>
            )}
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
        /* THIS PANEL IS NOW REACHABLE, AND UNTIL 2026-09-10 IT WAS NOT.
           ProjectContext seeded a "Default Project" into any account that had
           none, so signed in, `projects.length` was never 0 and nothing below
           had ever been on a real screen — while Onboarding's "Not now — take
           me to my projects" and first-run-destination.test.js's "the projects
           empty state still teaches" both described it as the landing. The
           founder dropped the seed (see the note where it used to be in
           src/contexts/ProjectContext.jsx), so it renders for every new
           account now and was read as new surface.

           TWO THINGS WERE WRONG WITH IT, both structural; not a word of the
           copy changed, because the sentence already names the two tools that
           make a project and the control already says what it does.

           · The heading was an <h3> directly under the page's <h1>, and BEFORE
             the "Starters, rotating daily" <h2> in the DOM. So the outline a
             screen-reader user heard went 1 → 3 → 2: a level-3 with nothing
             above it, and then a level-2 after it, which is not an outline at
             all (WCAG 1.3.1). Same defect and the same fix the legal pages'
             section headings got — the tag changed, the size deliberately did
             not, and the universal `*{margin:0}` reset means the two tags
             compute identically here.
           · The folder mark was an unlabelled <svg> exposed to the
             accessibility tree as a graphics object between the heading and
             the sentence. It is decoration for a panel whose heading already
             says what it means, so it is hidden rather than given a name it
             does not need. */
        /* THE PADDING WAS 48 AND IT WAS A NUMBER, not a rule. Written inline it
           applied unchanged at 320px, where 48 left and 48 right of a 272px-wide
           card leave 176px for a sentence that names two tools — it wrapped to
           five lines and the card grew from 319px tall at 390 to 340 at 320,
           pushing its own button further down the narrower the screen got. It
           is a class now so the value can answer the width; the 48 is unchanged
           from 641px up, which is every width it was ever looked at on. */
        <div className="card uh-empty">
          <div className="uh-empty-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </div>
          <h2 className="uh-empty-title">No projects yet</h2>
          <p className="uh-empty-text">
            Build a palette in <NavLink to="/create/color">Colour Studio</NavLink> and pair fonts in <NavLink to="/create/font-pair">Font Pair Finder</NavLink>, then save your design as a project.
          </p>
          <button className="btn btn-accent" onClick={() => setShowNewModal(true)}>Create your first project</button>
        </div>
      ) : activeProjects.length === 0 && archivedProjects.length === 0 ? (
        /* THE OTHER EMPTY STATE ON THIS PAGE, and it had the same shape of
           defect as the one above — found by sweeping the class rather than by
           reading the file.

           #458 found it printing `No projects match “”.` — an empty pair of
           curly quotes — when the FOLDER chips emptied the list, because the
           sentence named only the search. It fixed that by naming whichever of
           the two filters was responsible. With the folder chips gone there is
           one filter left that can empty this list, so the sentence has one
           thing left to say, and the branch that said the other thing is
           deleted rather than kept alive for a control that no longer exists.

           The rule it borrowed from LibraryEmpty still holds: carry the reset
           INSIDE the panel rather than leaving the reader to find the control
           they set. LibraryEmpty itself is not reused here — it belongs to
           styles/deferred/library.css, which #456 deliberately keeps out of
           this route's chunk — so the rule is borrowed and its label with it.

           role="status" for the same reason LibraryEmpty gives: the grid
           emptying is otherwise silent, and at 390 this panel opens at y=815
           in an 844px viewport, directly under the controls that caused it. */
        <div className="card uh-filtered" role="status">
          <p className="uh-filtered-text">
            No projects match “{search.trim()}”.
          </p>
          <button
            type="button"
            className="btn btn-s"
            onClick={() => setSearch('')}
          >
            Clear filters
          </button>
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

      {/* WHAT YOU HAVE, THEN WHAT TO DO NEXT — in that order, in every state.
          See the note above `suggestion` for the measurement that moved it. */}
      <DailyBand suggestion={suggestion} resolving={resolving} />

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
          onClose={() => { setShowNewModal(false); setCreateError('') }}
          onCreate={handleCreateNew}
          error={createError}
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
