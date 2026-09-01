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
import path from 'node:path'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

test('every onboarding exit lands somewhere that acknowledges the account', () => {
  const src = stripComments(read('src/pages/Onboarding.jsx'))
  // All three exits — finish-free, the checkout fallback, and skip — go through
  // one constant, so they cannot drift apart again.
  assert.match(src, /const FIRST_RUN_DESTINATION = '\/projects'/)
  const exits = src.match(/navigate\((?:takeResumeTarget\(\) \|\| )?FIRST_RUN_DESTINATION\)/g) || []
  assert.ok(exits.length >= 2, `expected the onboarding exits to share the constant, found ${exits.length}`)
  assert.ok(!/navigate\('\/home'\)/.test(src),
    'an onboarding exit still sends a brand-new account to the anonymous sales page')
})

test('the sales page is still auth-unaware, which is why nobody is sent there', () => {
  // Not a regression to fix — the homepage is deliberately a sales page
  // (CLAUDE.md: "The homepage is a sales page with a working mini-workspace,
  // not a dashboard"). It is the REASON a signed-in user must not be routed to
  // it. If this ever changes, the constant above can be revisited.
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

test('/dashboard really is just a redirect, so the fixes above are warranted', () => {
  // Asserted rather than assumed: if it ever becomes a real page, these
  // destinations deserve rethinking rather than silently staying put.
  //
  // Read from the redirect TABLE, not from App.jsx's source text. This used to
  // grep for the literal `path="/dashboard" element={<Navigate to="/home"`,
  // which stopped being true the moment the redirect routes were generated from
  // src/data/legacyRoutes.js — while /dashboard still redirected to /home
  // exactly as before. The behaviour is the subject; the spelling was not.
  assert.deepEqual(
    LEGACY_REDIRECTS.find(([from]) => from === '/dashboard'),
    ['/dashboard', '/home'],
  )
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
