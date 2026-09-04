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

/* ── The specs that still navigate around the door ───────────────────────────
 *
 * `page.goto()` gets no readiness wait, so these files remain exposed to the
 * defect above wherever they navigate to a lazy route and then measure without
 * waiting for something route-specific themselves. Most do wait - a locator
 * assertion auto-waits, and that is usually enough - so this is a POPULATION,
 * not a defect count.
 *
 * It is pinned rather than fixed because converting 51 call sites across 20
 * files is a mechanical change with real flake risk, and several of these waits
 * are legitimately about animation or debounce rather than about loading.
 * Pinning it means the number can only go DOWN without someone saying so.
 * Backlog: raw-goto-bypasses-readiness.
 */
const KNOWN_RAW_GOTO = [
  '04-premium-home.spec.js',
  '24-mobile-overhaul.spec.js',
  '25-defect-sweep.spec.js',
  '27-motion-guards.spec.js',
  '28-account-menu-keyboard.spec.js',
  '29-image-palette-picker.spec.js',
  '30-founder-requests-0808.spec.js',
  '31-library-filter-multi.spec.js',
  '32-emoji-library.spec.js',
  '33-offline-state.spec.js',
  '34-palette-library-sections.spec.js',
  '35-colour-picker.spec.js',
  '37-toolbar-tablet-band.spec.js',
  '38-input-specificity.spec.js',
  '39-accent-contrast.spec.js',
  '40-gallery-hero.spec.js',
  '41-theme-control.spec.js',
  '42-semantic-usage-examples.spec.js',
  '43-state-token-contrast.spec.js',
  '44-locked-library-tease.spec.js',
]

test('no NEW spec navigates with a bare page.goto()', () => {
  const found = SPECS.filter((f) => /\bpage\.goto\s*\(/.test(readStripped(path.join('tests', 'user-sim', f))))
  const added = found.filter((f) => !KNOWN_RAW_GOTO.includes(f))
  const gone = KNOWN_RAW_GOTO.filter((f) => !found.includes(f))

  assert.deepEqual(added, [],
    'These specs navigate with a bare page.goto(), which does no readiness wait, so a\n'
    + 'slow route chunk is measured as the app rather than as a wait that ran out. Use\n'
    + '`go()` from ./helpers.js, or wait for something the ROUTE renders (not `main`,\n'
    + 'not `#root > *`, and not a character count of document.body - the loading\n'
    + 'fallback satisfies all three):\n  ' + added.join('\n  '))

  assert.deepEqual(gone, [],
    'These specs no longer use page.goto(), which is the right direction - remove them\n'
    + 'from KNOWN_RAW_GOTO so the list keeps meaning what it says:\n  ' + gone.join('\n  '))
})

test('goRaw() has exactly one caller, and it is the spec that proves the wait works', () => {
  // goRaw is the deliberate hole in the door. If it acquires other callers it
  // stops being a documented exception and becomes a second way in.
  const callers = SPECS.filter((f) => /\bgoRaw\s*\(/.test(readStripped(path.join('tests', 'user-sim', f))))
  assert.deepEqual(callers, ['47-lazy-route-readiness.spec.js'],
    'goRaw() skips the readiness wait on purpose, for the one spec that has to observe\n'
    + 'the page BEFORE its route arrives. Any other caller is opting out of the fix:\n  '
    + callers.join('\n  '))
})
