// THE WORKSPACE'S PROJECT CARD, mounted with known projects.
//
// /projects renders under a signed-in session now (tests/user-sim/helpers.js
// signIn), so the page itself is what 52-user-home.spec.js drives. This fixture
// stays for the one thing a session cannot pin: four cards in four states side
// by side — all four parts, some, none, and archived — with timestamps fixed
// relative to the page load, so the tag and the "Edited …, n of 4 parts" line
// can be read against a known answer. The card is the real ProjectTile; the
// only thing supplied here is the data a session would have supplied.
//
// Mounted directly rather than through src/pages/Projects.jsx, so it imports the
// page's stylesheet itself.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import ProjectTile from '../../../src/components/userhome/ProjectTile'
import { DEFAULT_DESIGN } from '../../../src/data/designDefaults'
import '../../../src/styles/global.css'
import '../../../src/styles/pages/projects.css'

const clone = () => JSON.parse(JSON.stringify(DEFAULT_DESIGN))
const ago = (ms) => new Date(Date.now() - ms).toISOString()

function untouched() {
  return { id: 'fx-untouched', name: 'Default Project', design: clone(), createdAt: '2026-09-01T09:00:00.000Z', updatedAt: ago(6 * 86_400_000) }
}

function halfBuilt() {
  const design = clone()
  design.palette.colors = ['#0B2A45', '#1F4E79', '#F2A488', '#FDEDE4']
  return { id: 'fx-half', name: 'Harbour Rebrand', design, createdAt: '2026-09-02T09:00:00.000Z', updatedAt: ago(3 * 3_600_000) }
}

function complete() {
  const design = clone()
  design.palette.colors = ['#1A0B2E', '#4B1F9E', '#8B5CF6', '#C9F24D', '#F5F3FF']
  design.fonts.heading.family = 'Fraunces'
  design.fonts.body.family = 'Manrope'
  design.typeScale.base = 17
  design.typeScale.ratio = 1.333
  design.tints.scale = ['#1A0B2E', '#2E1650', '#4B1F9E', '#6C3FD4', '#8B5CF6', '#B69BF0']
  return { id: 'fx-complete', name: 'Violet Lime', design, createdAt: '2026-08-20T09:00:00.000Z', updatedAt: ago(25 * 60_000) }
}

function archived() {
  return { ...halfBuilt(), id: 'fx-archived', name: 'Old Harbour', archived: true }
}

export function UserHomeFixture() {
  const [icons, setIcons] = useState({})
  // The fixture's stand-in for updateProject: the icon rides on the project.
  const [log, setLog] = useState('')
  const projects = [complete(), halfBuilt(), untouched(), archived()].map((p) => (icons[p.id] ? { ...p, icon: icons[p.id] } : p))

  return (
    <MemoryRouter>
      <div className="app-shell">
        <main className="app-page" id="main">
          <div className="uh">
            <div className="uh-main">
              <p id="fixture-log" role="status">{log}</p>
              <div className="uh-grid">
                {projects.map((p) => (
                  <ProjectTile
                    key={p.id}
                    project={p}
                    onPickIcon={(id, glyph) => { setIcons((m) => ({ ...m, [id]: glyph })); setLog(`Icon ${id} ${glyph}`) }}
                  />
                ))}
              </div>
            </div>
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
