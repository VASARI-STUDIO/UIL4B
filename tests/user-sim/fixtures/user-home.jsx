import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import ProjectCard from '../../../src/components/userhome/ProjectCard'
import DailyBand from '../../../src/components/userhome/DailyBand'
import StarterRow from '../../../src/components/userhome/StarterRow'
import { DEFAULT_DESIGN } from '../../../src/data/designDefaults'
import { nextToolSuggestion } from '../../../src/utils/userHome'
import '../../../src/styles/global.css'
// This fixture mounts ProjectCard / DailyBand / StarterRow DIRECTLY rather than
// through src/pages/Projects.jsx, so it does not get that page's stylesheet the
// way the real route does — the `uh` and `proj` families live in
// src/styles/pages/projects.css since the per-route CSS split. Without this the
// cards render unstyled: .uh-grid loses `display:grid`, .uh-card loses
// `overflow:visible`, and the actions menu opens clipped, behind a <select>.
import '../../../src/styles/pages/projects.css'

// THE SIGNED-IN USER HOME, mountable without a session.
//
// ────────────────────────────────────────────────────────────────────────
// WHY A FIXTURE
// ────────────────────────────────────────────────────────────────────────
// /projects shows a project only to a signed-in account, and the acceptance
// suite cannot create one: Firebase's hosts are blocked in the sandboxed runner
// (see the EXPECTED_NOISE list in tests/user-sim/helpers.js, which names
// identitytoolkit). Without a fixture, the entire signed-in half of this feature
// — which is the half the founder asked for — would have no rendered coverage at
// all, and a card that throws on a malformed project would ship green.
//
// Same solution the repository already uses twice: fixtures/ui-system-pro.jsx
// mounts UiSystemBuilder with `isPro` forced on, and fixtures/type-save.jsx
// mounts the save control at its quota states. Each is a Vite rollup input (see
// vite.config.js) so it is built and served exactly like a real page.
//
// THE COMPONENTS ARE THE REAL ONES. Nothing here re-implements a card, a menu or
// a tip — the only thing the fixture supplies is the project data a session
// would have supplied.

const clone = () => JSON.parse(JSON.stringify(DEFAULT_DESIGN))

// Three projects covering the three readings the card has to get right.
function untouched() {
  return {
    id: 'fx-untouched',
    name: 'Default Project',
    design: clone(),
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z',
  }
}

// The founder's own example: colours, but no type scale.
function halfBuilt() {
  const design = clone()
  design.palette.colors = ['#0B2A45', '#1F4E79', '#F2A488', '#FDEDE4']
  return {
    id: 'fx-half',
    name: 'Harbour Rebrand',
    design,
    createdAt: '2026-09-02T09:00:00.000Z',
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  }
}

function complete() {
  const design = clone()
  design.palette.colors = ['#1A0B2E', '#4B1F9E', '#8B5CF6', '#C9F24D', '#F5F3FF']
  design.fonts.heading.family = 'Fraunces'
  design.fonts.body.family = 'Manrope'
  design.typeScale.base = 17
  design.typeScale.ratio = 1.333
  design.tints.scale = ['#1A0B2E', '#2E1650', '#4B1F9E', '#6C3FD4', '#8B5CF6', '#B69BF0']
  return {
    id: 'fx-complete',
    name: 'Violet Lime',
    design,
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  }
}

const FOLDERS = ['all', 'brand', 'app', 'marketing', 'personal']

export function UserHomeFixture() {
  const [projects, setProjects] = useState(() => [complete(), halfBuilt(), untouched()])
  const [loadedId, setLoadedId] = useState('fx-complete')
  const [log, setLog] = useState('')
  const [folders, setFolders] = useState({ 'fx-complete': 'brand' })

  const say = (message) => setLog(message)

  return (
    <MemoryRouter>
      <div className="app-shell">
        <main className="app-page" id="main">
          <div className="sec uh">
            <header className="sec-h uh-head">
              <div className="uh-head-main">
                <h1>Projects</h1>
                <p className="uh-sub">Your saved design systems — palette, fonts, type scale, and tints.</p>
                <ul className="uh-stats">
                  <li><strong>3</strong> projects</li>
                  <li><strong>9</strong> colours kept</li>
                  <li><strong>5</strong> of 12 system parts built</li>
                </ul>
              </div>
              <div className="uh-head-actions">
                <button className="btn btn-accent">Save Current</button>
                <button className="btn">New Project</button>
              </div>
            </header>

            <DailyBand suggestion={nextToolSuggestion(projects)} />

            <p id="fixture-log" role="status">{log}</p>

            <div className="uh-grid">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  isCurrent={loadedId === p.id}
                  onLoad={(id) => { setLoadedId(id); say(`Loaded ${id}`) }}
                  onDelete={(id) => { setProjects((list) => list.filter((x) => x.id !== id)); say(`Deleted ${id}`) }}
                  onRename={(id, name) => {
                    setProjects((list) => list.map((x) => (x.id === id ? { ...x, name } : x)))
                    say(`Renamed ${id}`)
                  }}
                  onOverwrite={(id) => say(`Overwrote ${id}`)}
                  onArchive={(id) => {
                    setProjects((list) => list.map((x) => (x.id === id ? { ...x, archived: !x.archived } : x)))
                    say(`Archived ${id}`)
                  }}
                  folder={folders[p.id]}
                  onFolderChange={(id, folder) => setFolders((f) => ({ ...f, [id]: folder }))}
                  folders={FOLDERS}
                  onOpenDetail={(project) => say(`Detail ${project.id}`)}
                  onDuplicate={(id) => say(`Duplicated ${id}`)}
                  onExportCss={(id) => say(`Copied CSS for ${id}`)}
                  onOpenIn={(id, route) => say(`Open ${id} in ${route}`)}
                />
              ))}
            </div>

            <StarterRow />
          </div>
        </main>
      </div>
    </MemoryRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserHomeFixture />
  </StrictMode>,
)
