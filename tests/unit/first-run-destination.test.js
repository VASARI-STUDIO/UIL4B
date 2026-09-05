// Where a new account lands, and where a new customer lands.
//
// The 2026-08-12 account lifecycle audit, B4 and B6:
//
//   B4  Onboarding finished at `/home`, and Home.jsx has NO auth awareness at
//       all — it does not import useAuth. So someone who had just created an
//       account was shown "No more tab hoarding", a "Start building free" CTA
//       and "No credit card · No setup". That CTA loops: App.jsx bounces a
//       signed-in user from /login straight back to /home.
//
//   B6  CheckoutReturn's success CTA pointed at `/dashboard`, which is only a
//       redirect to `/home`. The moment of highest goodwill — right after
//       someone paid — ended on the page trying to acquire them.
//
//   B5  named the fix: "the first real win is the user's first saved project",
//       and "there IS a good teaching empty state (Projects.jsx); it is simply
//       not on the path". It is on the path now.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { LEGACY_REDIRECTS } from '../../src/data/legacyRoutes.js'
import { SIGNED_IN_HOME } from '../../src/utils/onboardingState.js'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

test('every onboarding exit lands somewhere that acknowledges the account', () => {
  const src = stripComments(read('src/pages/Onboarding.jsx'))
  assert.match(src, /const FIRST_RUN_DESTINATION = '\/projects'/)

  // There used to be three exits and all three went through the constant:
  // finish-free, the checkout fallback, and skip. Two of those were the pricing
  // step, which is gone, and the survey skip, which went with the survey.
  //
  // The exits now are: DECLINE, through the constant; and the three first-win
  // cards, which leave to the tool the user picked. So a count of the constant
  // no longer describes the flow, and asserting one would just be pinning an
  // arithmetic fact. What B4 actually cared about is asserted instead, and more
  // strictly than before: EVERY navigate() in this file must be accounted for —
  // the constant, a resume target the user themselves chose, or a first-win
  // route. Anything else is a new exit that has not been thought about.
  // One level of nesting, so `navigate(takeResumeTarget() || X)` is captured
  // whole rather than truncated at the inner bracket.
  const navigations = src.match(/navigate\((?:[^()]|\([^()]*\))*\)/g) || []
  assert.ok(navigations.length > 0, 'onboarding must still leave somewhere')
  const allowed = /^navigate\((?:takeResumeTarget\(\) \|\| )?FIRST_RUN_DESTINATION\)$|^navigate\(win\.route\)$/
  for (const nav of navigations) {
    assert.match(nav, allowed,
      `${nav} is an onboarding exit that does not go to the first-run destination or a chosen first win`)
  }

  // The card routes are the other exit, so they must be real tools. firstWin.js
  // owns that guarantee and tests/unit/first-win.test.js checks it against
  // liveToolRoutes(); this asserts the page still takes them from there rather
  // than spelling a path of its own.
  assert.match(src, /navigate\(win\.route\)/)
  assert.match(src, /FIRST_WINS\.map/)

  assert.ok(!/navigate\('\/home'\)/.test(src),
    'an onboarding exit still sends a brand-new account to the anonymous sales page')
})

test('the sales page is still auth-unaware, which is why the routing lives in App', () => {
  // Not a regression to fix — the homepage is deliberately a sales page
  // (CLAUDE.md: "The homepage is a sales page with a working mini-workspace,
  // not a dashboard"), and that is still exactly what it is.
  //
  // It is also load-bearing for the 2026-09-05 routing change. Because Home.jsx
  // cannot see auth, it renders identically for everybody and CANNOT re-render
  // into a different page once auth resolves — so there is no flash of the wrong
  // page to engineer around. The decision lives one level up, in App.jsx, where
  // it is made once from a synchronous hint. Push auth awareness into this file
  // and that guarantee is gone.
  const home = read('src/pages/Home.jsx')
  assert.ok(!/useAuth/.test(home),
    'Home.jsx now knows about auth — reconsider FIRST_RUN_DESTINATION')
})

test('a new customer is sent to build, not to a redirect back to the sales page', () => {
  const src = stripComments(read('src/pages/CheckoutReturn.jsx'))
  assert.ok(!/to="\/dashboard"/.test(src),
    '/dashboard is only a redirect to /home — the page trying to acquire them')
  assert.match(src, /to="\/projects"/)
})

test('/dashboard reaches the dashboard, not the page selling it', () => {
  // Read from the redirect TABLE, not from App.jsx's source text. This used to
  // grep for a literal <Navigate>, which stopped being true the moment the
  // redirect routes were generated from src/data/legacyRoutes.js — while the
  // behaviour was unchanged. The behaviour is the subject; the spelling was not.
  //
  // The DESTINATION changed on 2026-09-05 and the reasoning inverted with it.
  // This test used to assert /dashboard was ‘just a redirect’ to /home, as
  // evidence that CheckoutReturn and onboarding were right to avoid it. There
  // is a real User Home now, so the honest answer to /dashboard is that home —
  // and the two exits above, which already point at /projects, agree with it
  // rather than route around it.
  assert.deepEqual(
    LEGACY_REDIRECTS.find(([from]) => from === '/dashboard'),
    ['/dashboard', SIGNED_IN_HOME],
  )
  // It must stay a redirect rather than becoming a second dashboard: two pages
  // claiming to be the home is how the destinations drifted apart in the first
  // place (audit B6).
  assert.notEqual(SIGNED_IN_HOME, '/dashboard')
})

test('the projects empty state still teaches, since it is now the first thing seen', () => {
  // It names the two tools to start with and offers the action. That is why it
  // is the destination — a blank list would be a worse landing than the sales
  // page it replaced.
  const src = read('src/pages/Projects.jsx')
  assert.match(src, /No projects yet/)
  assert.match(src, /Create your first project/)
  assert.ok(/to="\/create\/color"/.test(src) && /to="\/create\/font-pair"/.test(src),
    'the empty state should still point at the tools that produce a project')
})
