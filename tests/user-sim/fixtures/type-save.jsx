import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SaveTypeSystemMenu } from '../../../src/components/SaveTypeSystem'
import { projectQuota } from '../../../src/utils/projectQuota'
import { FREE_SAVE_LIMITS } from '../../../src/config/plans'
import '../../../src/styles/global.css'

// The typography save gate at every quota state, in one page.
//
// WHY A FIXTURE AT ALL. The acceptance suite has no signed-in path — there is
// no auth stub anywhere in tests/user-sim — so the only states a spec can reach
// on /create/font-pair are "signed out" and "signed out". The state that
// actually matters, the wall a free user meets at their third project, is
// unreachable from the real route without a Firebase account.
//
// SaveTypeSystem is split for exactly this reason: SaveTypeSystemMenu is a pure
// view over a resolved quota, so mounting it three times with three quotas
// shows all three states in a real browser, rendered by the real component
// through the real stylesheet. What a spec asserts here is what ships.
//
// THE CAP IS READ, NOT TYPED. FREE_SAVE_LIMITS.projects is the same constant
// ProjectContext enforces against and Plans.jsx quotes, so if the free
// allowance ever moves, this fixture moves with it rather than pinning a stale
// 3 that would keep passing while the product changed underneath it.

const LIMIT = FREE_SAVE_LIMITS.projects

// Three saved projects, so the overwrite list is populated in every state. Its
// presence inside the WALL is a deliberate assertion target: at the cap the new
// slot is withheld, the work is not.
const PROJECTS = Array.from({ length: LIMIT }, (_, i) => ({
  id: `p${i + 1}`,
  name: `Saved project ${i + 1}`,
}))

// used → the state it produces at the free cap. Named rather than derived so a
// spec can address one panel without knowing the arithmetic.
const CASES = [
  { id: 'clear', used: 0, note: 'Nothing saved yet. No counter — P-003: a foot in the door is not a meter.' },
  { id: 'approaching', used: Math.max(0, LIMIT - 1), note: 'One slot left. The allowance speaks, and the save still works.' },
  { id: 'full', used: LIMIT, note: 'At the cap. No name field, no save button — absent, not disabled.' },
]

function Panel({ id, used, note }) {
  const [name, setName] = useState('')
  const [upgrades, setUpgrades] = useState(0)
  const quota = projectQuota(used, LIMIT)
  return (
    <section id={`case-${id}`} data-case={id} data-used={used} style={{ margin: '0 0 40px' }}>
      <h2 style={{ font: '600 13px/1.4 system-ui', margin: '0 0 4px' }}>
        {id} — {used} of {LIMIT} used
      </h2>
      <p style={{ font: '400 11px/1.5 system-ui', color: '#666', margin: '0 0 12px', maxWidth: '52ch' }}>{note}</p>
      {/* .svt-menu opens UPWARD from .svt-wrap, because on both real surfaces
          the trigger sits near the foot of a long page. So the anchor goes at
          the BOTTOM of a tall spacer: put it at the top and every menu renders
          over the panel above it, which is a fixture bug that looks exactly
          like a layout defect in the component. */}
      <div style={{ height: 460, position: 'relative' }}>
        <div className="svt-wrap" style={{ position: 'absolute', bottom: 0, left: 0, display: 'block', height: 0 }}>
          <SaveTypeSystemMenu
            quota={quota}
            projects={PROJECTS}
            isPro={false}
            label="this type scale"
            summary="18px base on a 1.25 ratio, Inter and Inter."
            name={name}
            onName={setName}
            onSave={() => setName('SAVE-CALLED')}
            onOverwrite={(p) => setName(`OVERWRITE-${p.id}`)}
            onUpgrade={() => setUpgrades((n) => n + 1)}
          />
        </div>
      </div>
      <output id={`out-${id}`} style={{ font: '400 11px/1.4 monospace' }}>
        name={name} upgrades={upgrades}
      </output>
    </section>
  )
}

export function TypeSaveFixture() {
  return (
    <BrowserRouter>
      <main style={{ padding: 24, maxWidth: 420, background: 'var(--bg-0)', minHeight: '100vh' }}>
        <h1 style={{ font: '700 15px/1.3 system-ui', margin: '0 0 20px' }}>
          Typography save gate — every quota state
        </h1>
        {CASES.map((c) => <Panel key={c.id} {...c} />)}
      </main>
    </BrowserRouter>
  )
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<StrictMode><TypeSaveFixture /></StrictMode>)
}
