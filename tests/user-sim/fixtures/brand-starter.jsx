import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { BrandStarterWorkbench } from '../../../src/pages/BrandStarter'
import { readPairDraft, readScaleDraft } from '../../../src/utils/typeHandoff'
import '../../../src/styles/global.css'

// THE BRAND STARTER, mountable without a session.
//
// ────────────────────────────────────────────────────────────────────────────
// WHY A FIXTURE, AND WHAT IT DOES **NOT** REPLACE
// ────────────────────────────────────────────────────────────────────────────
// The tool is signed-in only — metering follows the ACCOUNT, not the browser —
// and the acceptance runner cannot create a session: Firebase's hosts are
// blocked in the sandboxed runner (see EXPECTED_NOISE in helpers.js, which
// names identitytoolkit). Without a fixture the entire feature, which is
// signed-in from end to end, would have no rendered coverage at all.
//
// Another agent is building a `signIn(page, { plan })` session helper. It had
// not landed on origin/main when this was written (checked: origin/main was
// still 5c6603a, and no open PR carried it), so this uses the mounted-fixture
// approach the repository already uses three times — fixtures/ui-system-pro.jsx,
// fixtures/type-save.jsx and fixtures/user-home.jsx. When the session helper
// lands, this spec should move onto it and this file should go.
//
// THE ONE THING THIS FAKES IS THE TOKEN. Everything else is the real code
// path: the real component, the real fetch to /api/ai, the real request body,
// the real response handling, the real meter arithmetic, the real refusals and
// the real hand-off slots. The spec stubs /api/ai AT THE NETWORK rather than
// stubbing this component's behaviour, which is the difference between testing
// the wiring and testing a helper in isolation — the trap this repository has
// paid for four separate times.
//
// The plan comes from the query string so one built fixture covers both tiers
// without a second entry point.

const params = new URLSearchParams(window.location.search)
const PLAN = params.get('plan') === 'pro' ? 'pro' : 'free'

// A stand-in for `firebaseAuth.currentUser.getIdToken()`. The page's own default
// export supplies the real one; tests/unit/ai-generation-truth.test.js asserts
// that it does, so this stub cannot become the only implementation.
const TOKEN = 'fixture-id-token'

export function BrandStarterFixture() {
  const [notice, setNotice] = useState('')
  const [staged, setStaged] = useState(() => ({ pair: null, scale: null }))

  // Re-read the slots AFTER any click in the subtree. The staging happens in a
  // <Link>'s own onClick, and nothing else in this tree subscribes to the
  // router, so a navigation alone would not re-render the readout and it would
  // report the state from before the click. The timeout puts this after the
  // link's handler has run rather than racing it.
  const refreshAfterClick = () => {
    setTimeout(() => setStaged({ pair: readPairDraft(), scale: readScaleDraft() }), 0)
  }

  return (
    <MemoryRouter>
      <div className="app-shell" onClick={refreshAfterClick}>
        <main className="app-page" id="main">
          <div className="sec">
            <div className="sec-h bs-head">
              <h1>Brand <em>Starter</em> <span className="bs-beta">Beta</span></h1>
            </div>

            <p id="fixture-toast" role="status">{notice}</p>

            {/* THE HAND-OFF, MADE OBSERVABLE. The font and type-scale hand-offs
                are in-memory slots (utils/typeHandoff.js), so unlike the
                palette's ?c= URL they cannot be followed across a page load —
                the fixture is its own Vite entry with its own module instance.
                Reading the slot back through the REAL readPairDraft() /
                readScaleDraft() is the honest proof available here: those
                re-validate on the way out, so a draft that appears below is one
                a destination tool would actually accept, and an invalid one
                reads as null rather than as whatever was staged. */}
            <pre id="fixture-staged" data-testid="fixture-staged">{JSON.stringify(staged)}</pre>

            <BrandStarterWorkbench
              planId={PLAN}
              getToken={async () => TOKEN}
              toast={setNotice}
            />
          </div>
        </main>
      </div>
    </MemoryRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrandStarterFixture />
  </StrictMode>,
)
