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

/* ── The half the door was missing until #391 ────────────────────────────────
 *
 * The two conditions above are BOTH satisfied by a page React has never run on.
 * index.html ships `<div id="root"><div class="boot-shell" id="boot-shell">`,
 * and scripts/prerender.mjs clones that into all 33 route shells — so
 * `root.firstElementChild` is true of markup the SERVER wrote, and
 * `.page-loading` is absent because App.jsx has not rendered and there is no
 * Suspense fallback yet.
 *
 * #391 caught /create/semantic-color in exactly that state under four parallel
 * workers: h1 not found, accessibility snapshot reading `status: Loading
 * UIL4B`. It worked around it in one spec. The door now carries it.
 */

test('ready() also requires the STATIC BOOT SHELL to be gone', () => {
  const src = readStripped(path.join('tests', 'user-sim', 'helpers.js'))
  const body = src.match(/export\s+async\s+function\s+ready\s*\(([\s\S]*?)\n\}/)
  assert.ok(body, 'helpers.js no longer exports `async function ready(...)`')
  assert.match(body[1], /boot-shell/,
    'ready() stopped checking for the static boot shell. index.html ships one INSIDE\n'
    + '#root and prerender clones it into every route shell, so "#root has a child" and\n'
    + '"no .page-loading" are both true of a page the app has never run on - which is\n'
    + 'the state #391 caught /create/semantic-color in. Without this the readiness door\n'
    + 'returns before React, and the spec that navigated reports a missing element.')
})

// Anti-vacuity for the assertion above. If index.html ever stopped shipping a
// boot shell, the check in ready() would be guarding a state that no longer
// exists and this file would still be green - so pin the thing being guarded,
// not just the guard. Deliberately read from index.html rather than from dist/,
// because the unit suite must not require a build.
test('index.html really does ship a boot shell inside #root, so that check guards something', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  assert.match(html, /<div id="root">\s*<div class="boot-shell" id="boot-shell">/,
    'index.html no longer ships <div id="root"><div class="boot-shell" id="boot-shell">.\n'
    + 'If the static shell is genuinely gone, the boot-shell clause in ready() is dead\n'
    + 'code and this pair of tests should go with it. If it merely MOVED or was renamed,\n'
    + 'ready() is now blind to the pre-hydration window again and the id must be updated\n'
    + 'in tests/user-sim/helpers.js as well.')
})

// ...and that renderState REPORTS it, which is what lets a failure name itself
// instead of blaming a slow route chunk.
test('renderState reports the boot shell, so the diagnostic can name the cause', () => {
  const src = readStripped(path.join('tests', 'user-sim', 'helpers.js'))
  const body = src.match(/export\s+function\s+renderState\s*\(([\s\S]*?)\n\}/)
  assert.ok(body, 'helpers.js no longer exports `function renderState(...)`')
  assert.match(body[1], /booting:/,
    'renderState stopped reporting `booting`. Without it a page stuck on the static\n'
    + 'shell fails with the same message as a slow route chunk, and the next\n'
    + 'investigation goes looking at the route instead of at the entry bundle.')
})

/* ── The state a TOOL renders instead of its content ─────────────────────────
 *
 * One level below the route fallback. The three typography tools render
 * <FontCatalogLoading> INSTEAD of their workbench while the Google Fonts
 * catalogue is in flight, so a route that has arrived can still be showing
 * nothing a spec can measure. Measured on /create/font-gallery: ready()
 * returned at 148ms with .typ-loading up and ZERO .fg-card rows, against 24
 * rows once it settled at 2530ms.
 *
 * That is what 51-typography-paywall hit on 2026-09-06 - "the gallery rendered
 * no rows at all", in a run with no build-asset failure in it at all.
 */

test('ready() also waits for a tool that is showing its own data-loading state', () => {
  const src = readStripped(path.join('tests', 'user-sim', 'helpers.js'))
  const body = src.match(/export\s+async\s+function\s+ready\s*\(([\s\S]*?)\n\}/)
  assert.ok(body, 'helpers.js no longer exports `async function ready(...)`')
  assert.match(body[1], /typ-loading/,
    'ready() stopped waiting for the typography tools\' own loading state. The route arrives,\n'
    + 'the Suspense fallback goes, and the tool then shows <FontCatalogLoading> INSTEAD of its\n'
    + 'workbench - so a spec that measures reads the skeleton and reports zero rows from a\n'
    + 'gallery that is working perfectly.')
})

// Anti-vacuity, and it pins the DISCRIMINATOR rather than just the class name.
// FontMatcher renders a second .typ-loading for "No font catalogue is available
// right now", which is a rendered answer and not a wait; the direct-child
// spinner is the only thing that tells them apart. If FontCatalogLoading lost
// its spinner, ready() would stop waiting and this file would still be green.
test('FontCatalogLoading still renders the spinner the readiness selector keys on', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'components', 'FontCatalogState.jsx'), 'utf8')
  assert.match(src, /className="typ-loading"[\s\S]{0,120}?className="fg-loader"/,
    'FontCatalogState no longer renders <div className="fg-loader"> as a child of\n'
    + '<div className="typ-loading">. ready() keys on `.typ-loading > .fg-loader` to tell the\n'
    + 'LOADING state apart from FontMatcher\'s terminal "No font catalogue is available right\n'
    + 'now", which uses the same class and is a rendered answer rather than a wait. Update the\n'
    + 'selector in tests/user-sim/helpers.js, or this readiness clause is dead.')
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

/* ── The check that could not fail ───────────────────────────────────────────
 *
 * `main, .landing, #root > *` was the suite's idea of "the page is up", and all
 * THREE of its parts match the Suspense fallback: App.jsx renders
 * `<div class="page-loading">` INSIDE `<main id="main">`, so `main` is present,
 * `#root > *` is the fallback itself, and `.landing` never mattered either way.
 * A spec that waited on it and then measured was reading the nav and the footer.
 *
 * Fourteen live uses were removed with [raw-goto-bypasses-readiness]; `go()` and
 * `ready()` now do this properly. Banning the STRING rather than enumerating the
 * ways in is what makes this hold for `page.reload()` too - three sites in
 * 41-theme-control paired this selector with a reload and then measured the
 * theme, and no goto-shaped guard would ever have seen them.
 */

test('no spec uses the readiness check that the loading fallback satisfies', () => {
  const found = SPECS.filter((f) => readStripped(path.join('tests', 'user-sim', f))
    .includes('main, .landing, #root > *'))
  assert.deepEqual(found, [],
    'These specs wait on `main, .landing, #root > *` before measuring. Every part of\n'
    + 'that selector matches the lazy-loading fallback, so it returns immediately on a\n'
    + 'route that has not arrived and the measurement lands on the nav and footer. Use\n'
    + '`go()` (navigate) or `ready()` (after a reload) from ./helpers.js, or wait for\n'
    + 'something the ROUTE itself renders:\n  ' + found.join('\n  '))
})
