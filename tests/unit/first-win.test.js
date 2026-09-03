// The first win is on the path, and the path it points at is real.
//
// The failure this suite exists to prevent is an onboarding card that opens a
// "still building" screen. The three starting points are hard-coded in
// utils/firstWin.js; which tools are LIVE is owned by src/data/toolTree.js. Two
// hand-maintained lists of the same reality drift — that is the exact defect
// toolIndex.js was built to end — so the routes are checked against
// liveToolRoutes() here rather than trusted.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  FIRST_WINS, FIRST_WIN_SKIPPED, FIRST_WIN_EXITED,
  firstWinById, firstWinRoute, firstWinIds, isFirstWinChoice,
} from '../../src/utils/firstWin.js'
import { liveToolRoutes } from '../../src/data/toolTree.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
// Source assertions must never pass on a comment. Every claim below about what
// Onboarding.jsx does is checked against code with the prose stripped out.
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const norm = (r) => String(r).toLowerCase().replace(/\/+$/, '')

// ── Every card opens a tool that exists ─────────────────────────────────────

test('every first-win route is a live Create tool', () => {
  const live = new Set(liveToolRoutes().map(norm))
  for (const win of FIRST_WINS) {
    assert.ok(live.has(norm(win.route)),
      `${win.id} points at ${win.route}, which is not a live tool route`)
  }
})

test('there are three starting points and they are distinct', () => {
  assert.equal(FIRST_WINS.length, 3)
  assert.equal(new Set(FIRST_WINS.map(w => w.id)).size, 3)
  assert.equal(new Set(FIRST_WINS.map(w => w.route)).size, 3)
})

test('the three are the three the sign-up dialog promised', () => {
  // LoginPopup promises "Your palettes, type scales and gradients, kept." A
  // starting point the promise does not name would be a fourth subject change,
  // which is the thing the pricing step was removed for.
  assert.deepEqual(FIRST_WINS.map(w => w.id).sort(), ['gradient', 'palette', 'type-scale'])
  const popup = read('src/components/LoginPopup.jsx')
  assert.match(popup, /palettes, type scales and gradients/,
    'the sign-up promise changed — the first wins must change with it')
})

test('every card carries the copy the screen needs', () => {
  for (const win of FIRST_WINS) {
    assert.ok(win.label && win.label.length > 2, `${win.id} has no label`)
    assert.ok(win.blurb && win.blurb.length > 10, `${win.id} has no blurb`)
    assert.ok(win.activation, `${win.id} names no activation event`)
  }
})

// ── Lookups refuse to guess ─────────────────────────────────────────────────

test('a known id resolves to its card and route', () => {
  assert.equal(firstWinById('palette').route, '/create/palette')
  assert.equal(firstWinRoute('type-scale'), '/create/type-scale')
  assert.equal(firstWinRoute('gradient'), '/create/gradient')
})

test('an unknown id resolves to null rather than somewhere arbitrary', () => {
  // Null forces the caller to decide. A fallback of '/' or '/home' would send
  // someone who hit a bug to the anonymous sales page — the precise landing
  // FIRST_RUN_DESTINATION exists to stop.
  for (const bad of ['', 'nope', null, undefined, 0, {}, 'PALETTE', 'skipped']) {
    assert.equal(firstWinRoute(bad), null, `${String(bad)} must not resolve to a route`)
    assert.equal(firstWinById(bad), null, `${String(bad)} must not resolve to a card`)
  }
})

// ── What may be written to the profile ──────────────────────────────────────

test('only a real card may be persisted as a first-win choice', () => {
  for (const win of FIRST_WINS) assert.equal(isFirstWinChoice(win.id), true)
  // skip() has always refused to write answers nobody gave. A profile field
  // reading "skipped" or "exited" is that same invented blank with a nicer name.
  assert.equal(isFirstWinChoice(FIRST_WIN_SKIPPED), false)
  assert.equal(isFirstWinChoice(FIRST_WIN_EXITED), false)
  for (const bad of ['', null, undefined, 7, {}, 'palette ']) {
    assert.equal(isFirstWinChoice(bad), false, `${String(bad)} must not be persistable`)
  }
})

test('declining and never arriving are counted apart', () => {
  // Same outcome, different failures: one is a problem with the three cards,
  // the other with everything in front of them. One counter would average them.
  assert.notEqual(FIRST_WIN_SKIPPED, FIRST_WIN_EXITED)
  const ids = firstWinIds()
  assert.ok(ids.includes(FIRST_WIN_SKIPPED) && ids.includes(FIRST_WIN_EXITED))
  assert.equal(new Set(ids).size, ids.length, 'counter ids must be unique')
  assert.equal(ids.length, FIRST_WINS.length + 2)
})

// ── The page actually uses it ───────────────────────────────────────────────

test('Onboarding renders the first-win step and no pricing table', () => {
  const src = stripComments(read('src/pages/Onboarding.jsx'))
  assert.match(src, /FIRST_WINS\.map/, 'the cards must be rendered from the one table')
  assert.match(src, /chooseFirstWin/)
  // The step that asked for money before anything had been made is gone.
  assert.doesNotMatch(src, /onb-tiers|onb-billing|useProPrice|PRO_FEATURES/,
    'the pricing step must not survive in the flow')
  assert.doesNotMatch(src, /checkout\(/, 'onboarding must not start a checkout')
})

test('picking a start records the choice and starts the clock before navigating', () => {
  const src = stripComments(read('src/pages/Onboarding.jsx'))
  const fn = src.slice(src.indexOf('const chooseFirstWin'), src.indexOf('const skipFirstWin'))
  assert.ok(fn.includes('recordFirstWin'), 'the choice must be recorded')
  assert.ok(fn.indexOf('recordFirstWin') < fn.indexOf('navigate('),
    'the clock must start before the navigation that ends this component')
})

test('the tier truth stays on the screen with a way to read it', () => {
  const src = stripComments(read('src/pages/Onboarding.jsx'))
  // Removing the step must not amount to hiding the price. A short honest line
  // and a real link is the trade; silence is not.
  assert.match(src, /to="\/plans"/, 'Pro must remain reachable from the first-win step')
})
