// Structural guard for the acceptance suite's ONE navigation door.
//
// THE DEFECT THIS EXISTS AGAINST.
// Nineteen of this app's routes are `lazy()`, and App.jsx renders the Suspense
// fallback INSIDE `<main id="main">`, so while a route chunk is in flight the
// pill nav, the footer and a visible `main` are all still on screen. Measured
// on this build, /privacy shows 421 characters of that chrome against 6537 once
// it arrives, and `main.innerText` is EXACTLY 0 in the fallback state on every
// lazy route. Every readiness check the suite owned was satisfied by it -
// `main, .landing, #root > *` matches it three ways, and `expectRendered()`'s
// `document.body.innerText > 40` matched it by a factor of ten.
//
// So a spec that navigated and then MEASURED did not time out on a slow chunk.
// It measured the chrome and published a confident number about a page that was
// not there. 43-state-token-contrast lost exactly that way in CI, counted ZERO
// state-coloured nodes on /privacy and /sitemap under a 16x CPU throttle, and
// blamed the branch under test.
//
// `go()` in tests/user-sim/helpers.js now waits for the route itself, which
// closes the class for every spec that navigates through it. This file guards
// the two things observation cannot catch: `go()` quietly losing that wait, and
// a NEW spec routing around it. Both would produce a green suite, which is the
// failure mode the whole exercise is against.
//
// Deliberately narrow and deliberately comment-blind - assertions in this repo
// have matched the explanatory comments that quote the string under test more
// than once.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SIM_DIR = path.join(ROOT, 'tests', 'user-sim')

const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

const readStripped = (rel) => stripComments(fs.readFileSync(path.join(ROOT, rel), 'utf8'))

const SPECS = fs.readdirSync(SIM_DIR).filter((f) => f.endsWith('.spec.js')).sort()

test('there are specs to guard, so this file cannot pass by finding nothing', () => {
  assert.ok(SPECS.length >= 20,
    `expected the acceptance suite to still be here; found ${SPECS.length} spec file(s) in ${SIM_DIR}`)
})

test('go() waits for the route to arrive, not merely for the document', () => {
  const src = readStripped(path.join('tests', 'user-sim', 'helpers.js'))
  const body = src.match(/export\s+async\s+function\s+go\s*\(page,\s*url\)\s*\{([\s\S]*?)\n\}/)
  assert.ok(body, 'helpers.js no longer exports `async function go(page, url)`')
  assert.match(body[1], /await\s+ready\s*\(/,
    'go() no longer awaits ready(), so every spec that navigates through it is back to\n'
    + 'measuring whatever had painted when it was asked. The Suspense fallback keeps the\n'
    + 'nav, the footer and a visible <main> on screen, so nothing about that state looks\n'
    + 'like a failure - the suite would stay green and start reporting numbers about\n'
    + 'pages that had not loaded.')
})

test('ready() requires BOTH a mounted root and no Suspense fallback', () => {
  const src = readStripped(path.join('tests', 'user-sim', 'helpers.js'))
  const body = src.match(/export\s+async\s+function\s+ready\s*\(([\s\S]*?)\n\}/)
  assert.ok(body, 'helpers.js no longer exports `async function ready(...)`')
  assert.match(body[1], /page-loading/,
    'ready() stopped looking for the .page-loading fallback. Waiting only for #root to\n'
    + 'have children returns during the fallback, which is the exact state this is for.')
  assert.match(body[1], /getElementById\(.root.\)/,
    'ready() stopped checking that React has mounted. A wait for the fallback to be\n'
    + 'ABSENT is satisfied by a fallback that has not been ATTACHED yet - the whole\n'
    + 'pre-hydration window, in which #root is still the empty div prerender wrote.')
})

/* ── The door has no way around it any more ──────────────────────────
 *
 * This used to be a KNOWN_RAW_GOTO allowlist of twenty spec files, pinned so
 * the population could shrink but not grow. It has now shrunk to nothing:
 * [raw-goto-bypasses-readiness] converted every one of the SIXTY-ONE call sites
 * (the backlog note said fifty-one; the note undercounted by ten, and the
 * recount is in the item).
 *
 * So the assertion below is UNCONDITIONAL - no allowlist, no ratchet, nothing
 * to keep in step with the tree. `page.goto()` in a spec is now simply wrong,
 * and the reason is in the failure message rather than in a list someone has to
 * remember to prune.
 */

test('no spec navigates with a bare page.goto()', () => {
  const found = SPECS.filter((f) => /\bpage\.goto\s*\(/.test(readStripped(path.join('tests', 'user-sim', f))))
  assert.deepEqual(found, [],
    'These specs navigate with a bare page.goto(), which does no readiness wait, so a\n'
    + 'slow route chunk is measured as the app rather than as a wait that ran out. Use\n'
    + '`go()` from ./helpers.js, or wait for something the ROUTE renders (not `main`,\n'
    + 'not `#root > *`, and not a character count of document.body - the loading\n'
    + 'fallback satisfies all three):\n  ' + found.join('\n  '))
})

// Anti-vacuity for the assertion above, which would also pass on a suite that
// had stopped navigating at all, or in which `go` had been renamed. Sixty-one
// sites were converted across twenty files; the floor is deliberately well
// under that so ordinary edits do not trip it.
test('the suite really does navigate, and does it through go()', () => {
  const callers = SPECS.filter((f) => /\bgo\s*\(page/.test(readStripped(path.join('tests', 'user-sim', f))))
  assert.ok(callers.length >= 20,
    `only ${callers.length} spec file(s) call go(page, ...). The no-page.goto assertion\n`
    + 'above cannot fail on a suite that does not navigate, so this is its positive\n'
    + 'control - if go() were renamed or the navigations removed, both would go quiet.')
})

test('goRaw() has exactly the two callers that must read a page before its route arrives', () => {
  // goRaw is the deliberate hole in the door. If it acquires other callers it
  // stops being a documented exception and becomes a second way in.
  const callers = SPECS.filter((f) => /\bgoRaw\s*\(/.test(readStripped(path.join('tests', 'user-sim', f))))
  assert.deepEqual(callers, ['04-premium-home.spec.js', '47-lazy-route-readiness.spec.js'],
    'goRaw() skips the readiness wait on purpose, and only two specs may do that:\n'
    + '47-lazy-route-readiness reads a route while its chunk is still in flight, and\n'
    + '04-premium-home reads #boot-shell before React replaces it. Any other caller is\n'
    + 'opting out of the fix:\n  ' + callers.join('\n  '))
})
