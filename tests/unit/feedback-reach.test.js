// WHERE THE FEEDBACK ENTRY POINTS REACH, AND WHY THAT IS TESTED HERE.
//
// The right-click feedback menu is mounted app-wide by FeedbackButton. For most
// of this app's life it was mounted INSIDE AppInner's shell instead, which put
// it below App.jsx's chromeless early return — so it was absent from every
// Create tool, /discover, /learn and /home. Measured 2026-09-10 on a real
// build: a right-click offered to report the element on /projects, /settings
// and /feedback, and did nothing at all on /create/palette, /create/type-scale,
// /create/contrast, /discover, /learn and /home.
//
// That is the fourth time this exact bug has been fixed in this file's
// neighbourhood — BillingBanner, OfflineBanner and SyncNotice all had it, and
// the pipeline note on [multi-breakpoint-ux-audit] records the SyncNotice one
// in the same words. It keeps coming back because "mounted in the obvious
// place" and "reaches every route" look identical in a diff and differ only at
// runtime, on routes nobody re-checks.
//
// So the STRUCTURE is pinned here, in a test that needs no browser and runs on
// every commit: the mount point, and the agreement between the two route lists.
// tests/user-sim/74-right-click-feedback-reach.spec.js proves the behaviour in
// a rendered browser; this proves the shape that makes it possible, and it is
// the one that fails fast when someone tidies the mount back into the shell.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromelessRoutes, createRoutes } from '../../src/data/toolTree.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

const APP = read('src/App.jsx')
const BUTTON = read('src/components/FeedbackButton.jsx')

test('the chromeless list is the Create routes plus the two surface landings', () => {
  const chromeless = chromelessRoutes()
  const created = createRoutes()
  for (const route of created) {
    assert.ok(chromeless.includes(route), `${route} is a Create route and must be chromeless`)
  }
  assert.ok(chromeless.includes('/discover'))
  assert.ok(chromeless.includes('/learn'))
  assert.equal(chromeless.length, created.length + 2, 'nothing else has crept in')
  // Every entry is already normalised, because both consumers match a lowercased,
  // trailing-slash-stripped pathname against it. An unnormalised entry would be
  // dead weight that silently never matches.
  for (const route of chromeless) {
    assert.equal(route, route.toLowerCase(), `${route} must be lowercase`)
    assert.ok(route === '/' || !route.endsWith('/'), `${route} must not have a trailing slash`)
  }
})

test('App.jsx takes its chromeless early return from the shared list, not a second copy', () => {
  // A hand-written second copy is how these two drift: someone adds a Create
  // tool, the router picks it up from the tool tree automatically, and the
  // other list does not know about it.
  assert.match(APP, /const CHROMELESS_PATHS = new Set\(chromelessRoutes\(\)\)/)
  assert.doesNotMatch(
    APP,
    /new Set\(\[\.\.\.[A-Z_]+, '\/discover', '\/learn'\]\)/,
    'App.jsx must not rebuild the chromeless list inline',
  )
})

test('FeedbackButton is mounted OUTSIDE AppInner, so the menu survives the early returns', () => {
  // This is the assertion that actually guards the bug. AppInner returns early
  // for /home, /onboarding, / and every chromeless route; anything mounted
  // inside its shell is absent from all of them.
  const inner = APP.indexOf('function AppInner()')
  const outer = APP.indexOf('export default function App()')
  assert.ok(inner !== -1 && outer !== -1 && inner < outer, 'App.jsx has the shape this test assumes')

  const mounts = [...APP.matchAll(/<FeedbackButton \/>/g)].map((m) => m.index)
  assert.equal(mounts.length, 1, 'exactly one FeedbackButton mount')
  assert.ok(
    mounts[0] > outer,
    'FeedbackButton must be mounted in the outer App wrapper, beside BillingBanner / '
    + 'OfflineBanner / SyncNotice — not inside AppInner, which never runs for the '
    + 'Create tools, /discover, /learn or /home',
  )
})

test('the floating button hides on exactly the routes the mount newly reaches', () => {
  // Hoisting the mount must not paint a fixed bottom-right button onto the
  // Create tools: that corner already collides with the footer attribution and
  // the /seo device toggle (both recorded in global.css), and a wider button
  // was never what was asked for. The button's reach is therefore unchanged,
  // which is only true while NO_BUTTON covers the whole chromeless list.
  assert.match(BUTTON, /const NO_BUTTON = new Set\(\[\s*\.\.\.chromelessRoutes\(\),/,
    'NO_BUTTON must spread the shared chromeless list rather than name routes by hand')

  // Every path App.jsx early-returns on by name must also be in NO_BUTTON,
  // or hoisting the mount would give that route a button it never had.
  const named = new Set(
    // Both spellings App.jsx uses: the bare comparison and the normalised one
    // (lowercased, trailing slashes stripped). A return that only redirects
    // never paints, so it needs no entry.
    [...APP.matchAll(/location\.pathname(?:\.toLowerCase\(\)\.replace\([^)]*\))? === '([^']+)'/g)]
      .filter((m) => !/^\)\s*\{\s*return <Navigate\b/.test(APP.slice(m.index + m[0].length, m.index + m[0].length + 80)))
      .map((m) => m[1]),
  )
  assert.ok(named.size >= 3, 'expected App.jsx to still early-return on named paths')
  const literals = new Set(
    [...BUTTON.matchAll(/'(\/[a-z-]*)'/g)].map((m) => m[1]),
  )
  for (const route of named) {
    assert.ok(
      literals.has(route),
      `App.jsx early-returns on ${route}, so FeedbackButton must list it in NO_BUTTON`,
    )
  }
  // And /feedback, where the page already is the form.
  assert.ok(literals.has('/feedback'))
})
