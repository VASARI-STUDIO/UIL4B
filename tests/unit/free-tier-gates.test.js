// P-003, founder verdict: THE FREE TIER IS A FOOT IN THE DOOR.
//
// That settles the question the proposal posed — "Is free a trial of
// everything, or a genuinely useful small tool?" — and it decides how every
// paid edge should behave.
//
// The proposal's smallest version is not code but a rule: "make every gate
// EXPLICIT rather than silent — the user should always know they hit a paid
// edge, never merely find that something behaved oddly."
//
// For a foot-in-the-door tier that is not merely honest, it is the whole
// mechanism. A silent downgrade teaches the user nothing and reads as the
// product being unreliable; a named one shows them exactly what Pro buys at the
// moment they wanted it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const BUILDER = read('src/pages/PaletteBuilder.jsx')

test('a collapsed system is announced, not swallowed', () => {
  // The board rendered Auto while the chip still read "Analogous". Nothing told
  // the user why, so the tool looked broken rather than gated.
  assert.match(BUILDER, /const collapsedSystem = !isPro && !FREE_SYSTEMS\.includes\(harmony\)/)
  assert.match(BUILDER, /className="plb-collapsed"/, 'the notice must actually render')
  assert.match(BUILDER, /role="status"/, 'and be announced to assistive tech')
})

test('the notice names the system the user chose', () => {
  // "Some features are Pro" teaches nothing. Naming the thing they picked is
  // what makes the upgrade legible.
  assert.match(BUILDER, /\{collapsedSystem\}<\/strong> is a Pro system/)
})

test('the notice reassures that nothing was lost', () => {
  // A foot-in-the-door tier must not make the user think a downgrade destroyed
  // their work — that converts nobody and loses the account.
  assert.match(BUILDER, /Nothing you saved has changed/)
})

test('the notice offers the upgrade, and the gate is named for measurement', () => {
  // P-001 gave every gate an id so the funnel can say WHICH wall converts.
  assert.match(BUILDER, /gate: 'palette-system-collapse'/)
})

test('picking a Pro system still gates explicitly rather than silently', () => {
  // The click path was already correct; this keeps it that way.
  const src = stripComments(BUILDER)
  assert.match(src, /if \(!h\.free && !isPro\) \{[\s\S]{0,120}openProModal\(/)
})

// ── P-004 completion ────────────────────────────────────────────────────────

test('a new board defaults to a FREE system everywhere', () => {
  // P-004 moved the default to Auto, but PaletteBuilder kept its own fallback
  // to 'analogous' — a PAID system, which then silently collapsed to Auto
  // anyway. So the first board a free user saw was the exact confusion P-003
  // is about, produced by the default itself.
  //
  // That fallback is now the named DEFAULT_SYSTEM rather than a repeated
  // literal, because the founder's 2026-09-03 request made the same value the
  // arrival draw's system and Reset's system too — three places that must not
  // be able to disagree. DEFAULT_SYSTEM is itself asserted to be a FREE system
  // in tests/unit/palette-defaults.test.js, so accepting the constant here
  // loses nothing: the literal spelling is checked one layer down.
  const src = stripComments(BUILDER)
  assert.ok(!/design\.palette\.harmony : 'analogous'/.test(src),
    'PaletteBuilder still falls back to a paid system')
  assert.match(src, /design\.palette\.harmony : (?:'auto'|DEFAULT_SYSTEM)/)

  // The default a new board gets, asserted as a VALUE rather than as a
  // string in a file. DEFAULT_DESIGN moved out of ProjectContext.jsx into
  // src/data/designDefaults.js so the User Home could compare saved
  // projects against it without importing React and Firestore. The value
  // did not change — but a grep over the old file could not tell the
  // difference between “moved” and “deleted”, and reported the latter.
  assert.equal(DEFAULT_DESIGN.palette.harmony, 'auto',
    'a new board must start on a FREE system (P-004)')
  const studio = stripComments(read('src/pages/ColorStudio.jsx'))
  assert.ok(!/\|\| 'analogous'/.test(studio), 'ColorStudio still falls back to a paid system')
})

test('the free systems are the ones the gate actually allows', () => {
  // If FREE_SYSTEMS and the HARMONIES free flags disagree, a user is either
  // blocked from something free or silently collapsed out of something the
  // list calls free.
  const free = /const FREE_SYSTEMS = \[([^\]]*)\]/.exec(read('src/utils/constants.js') + BUILDER)?.[1]
  if (!free) return   // defined elsewhere; the flags below still stand on their own
  const flagged = [...BUILDER.matchAll(/\{ id: '([a-z]+)', label: '[^']*', free: true \}/g)].map(m => m[1])
  for (const id of flagged) {
    assert.ok(free.includes(`'${id}'`), `${id} is flagged free but is not in FREE_SYSTEMS`)
  }
})
