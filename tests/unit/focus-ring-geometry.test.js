// A FOCUS STYLE MUST NOT CHANGE THE CONTROL'S GEOMETRY.
//
// An `outline` follows its own element's `border-radius`. So a focus rule that
// declares `border-radius` does not round the RING — it rounds the ELEMENT, and
// the ring then traces the shape it has just been given. The user sees the
// corners change at the moment of focus, and sees a ring that does not match
// the control they were looking at a frame earlier.
//
// The founder reported it as "the search bar has a weird visual, i have noticed
// this on many of the search bars" (2026-09-04, with a screenshot of a blue ring
// whose corners did not follow the field).
//
// The cause was the global rule, which had carried a `border-radius` for a long
// time:
//     :focus-visible{outline:2px solid var(--accent);outline-offset:2px;
//                    border-radius:var(--radius-s)}
// It sits near the top of the stylesheet, so a later `.class{border-radius}` at
// the same (0,1,0) specificity beat it — which is why pill controls were never
// affected and the fault looked intermittent. What it DID reach was every
// focusable element with no radius of its own, plus everything left to the
// `:where()` element resets at (0,0,0) after #331 lowered them.
//
// Measured in a rendered browser over ten routes before the fix: 21 distinct
// control shapes changed geometry on focus. The clearest were
// `input[type=search].adm-search` (0px -> 10px: a square field with a rounded
// ring), `input[type=range]` on the Font Gallery (2px -> 10px: a 2px track with
// a 10px ring) and `button.pgal-stripe` (0px -> 10px at outline-offset:-3px, so
// a rounded ring was drawn INSIDE a hard-cornered colour swatch). After: 0.
//
// Five component rules carried the same mistake locally — each one written as a
// workaround for the global rule, declaring on `:focus-visible` the radius it
// actually wanted. Their radius now lives on the element at rest, which is both
// where the decision belongs and what makes the ring correct for free.
//
// THE RING ITSELF IS NOT OPTIONAL. A visible focus indicator is WCAG 2.4.7, so
// this file also guards that the global rule still paints one. The fix for a
// mismatched ring is a ring that matches, never no ring.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const RAW = fs.readFileSync(path.join(process.cwd(), 'src/styles/global.css'), 'utf8')

// Comments are stripped FIRST, newlines preserved so line numbers survive.
// This matters more here than usual: the explanatory comment on the global rule
// quotes the removed `border-radius:var(--radius-s)` declaration verbatim, and
// so does the header of this very file. A test that scanned raw CSS would match
// the prose describing the bug and pass while the bug was present — the exact
// vacuous-pass shape tests/unit/input-specificity.test.js records.
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))

const lineOf = (index) => CSS.slice(0, index).split('\n').length

/** Every rule whose prelude mentions a :focus pseudo-class. */
const focusRules = () => {
  const out = []
  const ruleRe = /(^|[};])([^{};]*:focus[a-z-]*[^{};]*)\{([^}]*)\}/gm
  let m
  while ((m = ruleRe.exec(CSS)) !== null) {
    out.push({ prelude: m[2].trim(), body: m[3], line: lineOf(m.index + m[1].length) })
  }
  return out
}

test('no :focus rule anywhere in global.css sets border-radius', () => {
  const rules = focusRules()
  // Guard the guard: if the scan finds nothing at all, the regex has rotted and
  // every assertion below would pass vacuously.
  assert.ok(rules.length > 100, `expected the stylesheet to carry many :focus rules, found ${rules.length}`)

  const offenders = rules
    .filter((r) => /(^|[;{\s])border-radius\s*:/.test(r.body))
    .map((r) => `global.css:${r.line}  ${r.prelude}`)

  assert.deepEqual(offenders, [], 'a focus style must not change the element\'s geometry — '
    + 'declare the radius on the element at rest instead, so the outline traces the shape '
    + 'the control actually has:\n  ' + offenders.join('\n  '))
})

test('the global :focus-visible rule still paints a visible ring (WCAG 2.4.7)', () => {
  const rule = focusRules().find((r) => r.prelude === ':focus-visible')
  assert.ok(rule, 'the global :focus-visible rule is gone entirely')
  assert.match(rule.body, /outline\s*:\s*2px\s+solid\s+var\(--accent\)/,
    'the global focus ring must stay a 2px solid --accent outline')
  assert.match(rule.body, /outline-offset\s*:\s*2px/,
    'the ring sits 2px off the control so it clears the control\'s own border')
  assert.doesNotMatch(rule.body, /outline\s*:\s*(none|0)\b/,
    'removing the focus ring is never the fix for a mis-shaped focus ring')
})

test('input[type=search] takes the shared field reset, so its ring has a shape to trace', () => {
  // The field the founder screenshotted was `input[type=search].adm-search`,
  // which set no radius, border or ground of its own and was NOT covered by the
  // element reset — so it rendered as a bare UA box with square corners, and the
  // global rule then drew a 10px-radius ring around it.
  const reset = CSS.match(/:where\(([^)]*\binput\[type="text"\][^)]*)\)\s*\{([^}]*)\}/)
  assert.ok(reset, 'the :where() field reset is gone')
  assert.ok(reset[1].includes('input[type="search"]'),
    'input[type="search"] must sit in the shared field reset alongside text/email/password')
  assert.match(reset[2], /border-radius\s*:/, 'the field reset must give search fields a radius at rest')
})
