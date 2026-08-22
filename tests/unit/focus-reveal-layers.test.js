// A defect class, not a single bug: an action layer that is hidden with
// `visibility` / `display`, has that property in its `transition` list, and is
// revealed by `:focus-within`. Found live in `.pgal-actions` — the Palette
// Gallery card's five actions (Builder, Project, Gradient, CSS, Hex).
//
// MEASURE FIRST. The obvious diagnosis is wrong and it is worth not repeating:
// "visibility:hidden removes descendants from the tab order, so focus can never
// enter, so :focus-within can never fire". That is not what happens here.
// `.pgal-card` holds five focusable stripe buttons OUTSIDE the actions layer,
// so tabbing into the card does fire `:focus-within`.
//
// The real fault is that `visibility` is a DISCRETE property. Listing it in a
// `transition` makes it flip at 50% of the duration — 100ms into a 200ms
// transition. A keyboard user tabbing at normal speed outruns that, so each Tab
// resolves while the buttons are still `hidden` and the browser skips them.
// Probed in Chromium against this exact DOM:
//
//   visibility:hidden + transition, tabbing normally   → 0 of 5 reached
//   visibility:hidden + transition, 250ms per Tab      → 5 of 5 reached
//   opacity:0 + pointer-events:none, either speed      → 5 of 5 reached
//
// An intermittent, speed-dependent loss is worse than a hard block: it looks
// correct to anyone who slows down to check it. `opacity` is not discrete and
// never removes anything from the tab order, which is why `.hcomm-acts` on the
// homepage gallery uses it and why this now does too.
//
// The general rule below is deliberately written against the PATTERN rather
// than one class name, because a card grows a hover overlay easily and this
// fault is invisible in review.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// The comments in global.css necessarily QUOTE the strings under test — the
// block above `.pgal-actions` explains the visibility trap in prose. Matching
// raw source would pass on the explanation and miss the declaration coming
// back. Strip comments first, always. (Same reasoning as hero-entrance.test.js.)
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')

const css = stripCss(read('src/styles/global.css'))

// Every `X{...}` rule in the sheet, as [selectorList, declarations].
function rules(source) {
  const out = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = re.exec(source))) out.push([m[1].trim(), m[2].trim()])
  return out
}

const ALL = rules(css)

// A selector list mentioning :focus-within, reduced to the part AFTER the
// :focus-within in each selector — that trailing part is the element revealed.
function revealTargets(selectorList) {
  return selectorList
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.includes(':focus-within'))
    .map((s) => s.slice(s.lastIndexOf(':focus-within') + ':focus-within'.length).trim())
    .filter(Boolean)
}

const has = (decl, prop, value) =>
  new RegExp(`(^|;)\\s*${prop}\\s*:\\s*${value}`).test(`;${decl}`)

test('nothing revealed by :focus-within hides behind a transitioned visibility or display', () => {
  const revealed = new Set()
  for (const [sel, decl] of ALL) {
    if (!sel.includes(':focus-within')) continue
    // Only reveals count: a rule that merely restyles on focus-within is fine.
    if (!/(^|;)\s*(opacity|visibility|display)\s*:/.test(`;${decl}`)) continue
    for (const target of revealTargets(sel)) revealed.add(target)
  }
  assert.ok(revealed.size > 0, 'expected the sheet to contain :focus-within reveals at all')

  const broken = []
  for (const target of revealed) {
    for (const [sel, decl] of ALL) {
      if (sel.trim() !== target) continue
      const hidden = has(decl, 'visibility', 'hidden')
        ? 'visibility'
        : has(decl, 'display', 'none') ? 'display' : null
      if (!hidden) continue
      // The race only exists when the discrete property is transitioned. A
      // hidden-at-rest layer whose reveal class is applied synchronously (see
      // `.cs-csys-pt-del`, revealed by `.is-active` from React's onFocus, with
      // its own keyboard route on the Delete key) flips in the same frame and
      // is not this fault.
      const transitioned = new RegExp(`transition[^;]*\\b${hidden}\\b`).test(decl)
      if (transitioned) {
        broken.push(`${target} — hidden by ${hidden} and transitioning it`)
      }
    }
  }

  assert.deepEqual(broken, [],
    'these layers are revealed by :focus-within but hide behind a TRANSITIONED discrete '
    + 'property, which flips half a duration late — a keyboard outruns it and the browser '
    + 'skips the controls. Hide with opacity:0 + pointer-events:none instead.')
})

test('the Palette Gallery card actions are keyboard-reachable at rest', () => {
  // The specific instance this suite was written for. Kept alongside the general
  // rule because it is the one that shipped broken, and a named regression is
  // easier to read in a failure than a computed selector list.
  const rest = ALL.find(([sel]) => sel.trim() === '.pgal-actions')
  assert.ok(rest, '.pgal-actions rule is gone')
  const decl = rest[1]
  assert.ok(!has(decl, 'visibility', 'hidden'),
    '.pgal-actions hides with visibility again — measured 0 of 5 actions reachable by keyboard')
  assert.ok(!has(decl, 'display', 'none'),
    '.pgal-actions hides with display:none — same fault, same result')
  assert.ok(!/transition[^;]*\b(visibility|display)\b/.test(decl),
    '.pgal-actions must not transition a discrete property — that is what caused the race')
  assert.match(decl, /opacity\s*:\s*0/, '.pgal-actions must hide with opacity')
  assert.match(decl, /pointer-events\s*:\s*none/,
    '.pgal-actions must not swallow pointer input while invisible')

  const reveal = ALL.find(([sel]) => sel.includes('.pgal-card:focus-within .pgal-actions'))
  assert.ok(reveal, 'the :focus-within reveal is gone — keyboard users lose the actions entirely')
  assert.match(reveal[1], /opacity\s*:\s*1/)
  assert.match(reveal[1], /pointer-events\s*:\s*auto/)
})

test('the Palette Gallery card actions are reachable without hover', () => {
  // A hoverless device cannot trigger `.pgal-card:hover` and may have no
  // keyboard either, so the hover-only overlay has to stop being an overlay.
  const blocks = [...css.matchAll(/@media\s*\(\s*hover\s*:\s*none\s*\)\s*\{([\s\S]*?)\n\}/g)]
    .map((m) => m[1])
    .join('\n')
  assert.match(blocks, /\.pgal-actions\{[^}]*opacity\s*:\s*1/,
    'no (hover:none) fallback for .pgal-actions — on touch the actions are unreachable')
  assert.match(blocks, /\.pgal-actions\{[^}]*pointer-events\s*:\s*auto/)
  assert.match(blocks, /\.pgal-actions\{[^}]*position\s*:\s*static/,
    'the touch fallback must drop the actions into flow, not pin them over the swatch they explain')
})
