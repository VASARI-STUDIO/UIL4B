// The dashboard clock must not be able to render a time during PRERENDER.
//
// ── The failure this file exists for ────────────────────────────────────────
//
// scripts/prerender.mjs writes 39 route shells at build time. A component that
// formats `new Date()` during render bakes BUILD TIME into whatever shell
// contains it: the visitor's first paint shows the moment the deploy ran,
// sometimes days old, search engines index it, and React then swaps the text
// under the reader on hydration because the server string and the client string
// differ by definition.
//
// The defence is that `now` starts as null and is ONLY ever assigned inside an
// effect, which does not run during prerender — so the element is absent until a
// browser has answered. That is a one-line property and a one-line mistake:
// `useState(new Date())` looks tidier and destroys it silently.
//
// tests/user-sim/52-user-home.spec.js covers the RENDERED behaviour — that the
// clock shows this machine's time, carries a machine-readable dateTime and does
// not announce itself. It cannot cover this, because by the time the browser
// paints, the effect has already run and a frozen initial value is gone. So the
// invariant is asserted against source here instead.
//
// Comment-blind on purpose, like iconify-stub.test.js: a rule about source is
// asserted against source with comments stripped, so an explanatory comment
// cannot satisfy it.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { stripJs as strip } from '../helpers/strip-comments.js'

const ROOT = process.cwd()
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const clock = strip(read('src/components/LocalClock.jsx'))

test('the clock starts empty, so prerender cannot bake a timestamp into a shell', () => {
  // The state must initialise to null — not to a Date, not to a formatted
  // string, not to a lazy initialiser that calls Date.
  assert.match(clock, /useState\(\s*null\s*\)/,
    'LocalClock no longer starts as null — a build-time date can now reach a prerendered shell')

  // And nothing may construct a Date outside an effect. Every `new Date()` in
  // the file must sit inside useEffect or a callback it schedules; the render
  // body must be free of them. Checked by removing the effect block and
  // asserting what is left contains no Date construction.
  const withoutEffects = clock.replace(/useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\},\s*\[[^\]]*\]\s*\)/g, '')
  assert.doesNotMatch(withoutEffects, /new Date\(/,
    'LocalClock constructs a Date outside an effect — that runs during prerender')

  // The early return is what makes the absence real rather than an empty string.
  assert.match(clock, /if\s*\(\s*!now\s*\)\s*return null/,
    'LocalClock no longer returns null while it has no time')
})

test('the clock reads the viewer’s own locale and zone, not a hardcoded one', () => {
  // `[]` as the locale argument means "use the browser's own preference", which
  // is the entire point of the founder's request ("make it connect to their
  // browser / computer"). A hardcoded 'en-GB' or 'en-US' would show a
  // Brisbane-shaped date to everyone, and naming a timeZone would pin the hour.
  for (const fn of ['toLocaleDateString', 'toLocaleTimeString']) {
    const call = new RegExp(fn + '\\(\\s*\\[\\s*\\]')
    assert.match(clock, call,
      `${fn} no longer passes [] — it is formatting in a fixed locale rather than the viewer's`)
  }
  assert.doesNotMatch(clock, /timeZone\s*:/,
    'a timeZone is pinned — the clock must resolve to the viewer’s own machine zone')
  assert.doesNotMatch(clock, /'en-[A-Z]{2}'|"en-[A-Z]{2}"/,
    'a locale is hardcoded — pass [] and let the browser decide')
})

test('the clock ticks on the minute and cleans up after itself', () => {
  // A seconds display would re-render this subtree sixty times a minute for the
  // whole visit to show something nobody is timing.
  assert.match(clock, /60000/, 'the tick is no longer a minute')
  assert.doesNotMatch(clock, /setInterval\([^,]+,\s*1000\s*\)/,
    'the clock ticks every second — that is sixty re-renders a minute for no reader benefit')
  // Both timers are cleared. A leaked interval keeps setting state after the
  // dashboard has gone.
  assert.match(clock, /clearTimeout/, 'the alignment timeout is never cleared')
  assert.match(clock, /clearInterval/, 'the minute interval is never cleared')
})
