// A CSS custom property that is never defined makes its whole declaration
// invalid, and the browser drops it silently — no warning, no console error,
// nothing in a diff. The property simply never applies.
//
// Seven were typo'd. `--radius-m` alone was used 8 times, including on
// `.adm-tabs`, `.adm-stat` and `.adm-card`, so the admin dashboard's tab bar,
// stat tiles and cards rendered with SQUARE corners while everything around
// them was rounded. That is a large part of why it looked unfinished.
//
// This exists so the next typo fails the build instead of quietly deleting a
// style.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ALL_CSS } from './appStylesheets.js'
import { stripCss } from '../helpers/strip-comments.js'

// Every stylesheet, not just global.css. A custom property used in a page
// stylesheet and defined nowhere is exactly as invalid as one used here, and
// eleven families are no longer in global.css at all — scanning it alone would
// quietly stop checking them rather than fail.
// COMMENTS STRIPPED FIRST, and this is the same rule the rest of the suite
// applies in the other direction.
//
// Elsewhere (iconify-stub.test.js, hero-entrance.test.js) source is stripped so
// an explanatory COMMENT CANNOT SATISFY a rule about shipped code. The inverse
// has to hold too: a comment must not FAIL one either. This test went red on
// 2026-09-18 for a nav comment that quoted the pairing it was describing —
// "`background:var(--ink);color:var(--page)`" — naming a token from the design
// FILE rather than one this stylesheet defines. Nothing was broken; a sentence
// about CSS was being read as CSS.
//
// That matters beyond the one comment: this file's whole value is that a red
// build means a declaration is silently dropped. A test that also goes red for
// prose teaches people to stop believing it.
const CSS = stripCss(ALL_CSS)

const definedTokens = () => new Set([...CSS.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(m => m[1]))

// Token FAMILIES a component writes at runtime, one property at a time, with
// the name built by interpolation — e.g. UiSystemLab does
// `element.style.setProperty(\`--uis-${name}\`, value.hex)`. The individual
// names therefore appear nowhere in the source, and no static scan can
// enumerate them. Listing the prefixes is the honest approximation: it keeps
// this test meaningful for every token that is NOT part of such a family.
//
// Each entry is a real, verified producer — not a blanket exemption:
//   --uis-  UiSystemLab / UiSystemMatrix   (UI system preview roles)
//   --pv-   the shared preview surfaces
//   --tsc-  TypeScale specimen rows
//   --tt-   Tint tool preview
//   --fg-   Font Gallery specimen cards
//   --fpr-  Font Pair preview
//   --plb-  Palette Builder board
//   --stc-  style-guide preview
//   --cc-   Contrast Checker live pair
//   --cq-   the admin community queue previews
//   --quota- the AI quota meter fill
const RUNTIME_FAMILIES = [
  '--uis-', '--pv-', '--tsc-', '--tt-', '--fg-', '--fpr-',
  '--plb-', '--stc-', '--cc-', '--cq-', '--quota-', '--hw-type-', '--cs-',
]

test('no stylesheet token is used without being defined or set at runtime', () => {
  const defined = definedTokens()
  const missing = new Set()

  for (const m of CSS.matchAll(/var\((--[a-z0-9-]+)\s*(,)?/g)) {
    if (m[2]) continue                                   // a fallback keeps it valid
    if (defined.has(m[1])) continue
    if (RUNTIME_FAMILIES.some(pre => m[1].startsWith(pre))) continue
    missing.add(m[1])
  }

  assert.deepEqual([...missing], [],
    'these custom properties are used with no fallback, are never defined in CSS, and belong to no runtime family — '
    + `every declaration using one is invalid and silently dropped:\n  ${[...missing].join('\n  ')}`)
})

test("the seven that were typo'd stay fixed", () => {
  // Named explicitly: a regression here is invisible in the rendered page until
  // someone notices a corner is square, which is exactly how these survived.
  for (const gone of ['--radius-m', '--radius-lg', '--shadow-sm', '--s1', '--r-s', '--brand-weak']) {
    assert.ok(!CSS.includes(`var(${gone})`), `${gone} is back, and it is not a real token`)
  }
  // Word-boundary check — a bare substring test would also match --line-height.
  assert.ok(!/var\(--line\)/.test(CSS), '--line is back; the hairline token is --border')
})

test('every length in the stylesheet carries a unit', () => {
  // `margin-left:8` was dropped for exactly this reason.
  const props = 'margin|margin-left|margin-right|margin-top|margin-bottom|padding'
    + '|padding-left|padding-right|padding-top|padding-bottom|width|height|top|left|right|bottom|gap'
  const bad = []
  for (const m of CSS.matchAll(new RegExp(`(?:^|[;{])\\s*(${props})\\s*:\\s*(-?\\d+)\\s*(?=[;}])`, 'gi'))) {
    if (m[2] === '0' || m[2] === '-0') continue           // 0 is legal unitless
    bad.push(`${m[1]}: ${m[2]}`)
  }
  assert.deepEqual(bad, [], `unitless lengths are invalid and are dropped:\n  ${bad.join('\n  ')}`)
})

test('the admin shell uses a radius that resolves', () => {
  // The specific symptom: square corners on the three most visible admin
  // surfaces while everything around them was rounded.
  const defined = definedTokens()
  for (const sel of ['.adm-tabs{', '.adm-stat{', '.adm-card{']) {
    const start = CSS.indexOf(sel)
    assert.ok(start > -1, `${sel} rule is missing`)
    const rule = CSS.slice(start, CSS.indexOf('}', start))
    const token = /border-radius:var\((--[a-z0-9-]+)\)/.exec(rule)
    assert.ok(token, `${sel} should still set a border-radius from a token`)
    assert.ok(defined.has(token[1]), `${sel} uses ${token[1]}, which is not defined`)
  }
})

test('the admin tab bar is a real tablist', () => {
  // It was ten plain <button>s: nothing in the accessibility tree said which
  // was selected, there was no keyboard navigation between them, and "active"
  // was carried by a CSS class alone.
  const src = fs.readFileSync(path.join(process.cwd(), 'src/pages/Admin.jsx'), 'utf8')
  assert.match(src, /role="tablist"/)
  assert.match(src, /role="tab"/)
  assert.match(src, /aria-selected=\{tab === t\.id\}/)
  assert.match(src, /tabIndex=\{tab === t\.id \? 0 : -1\}/, 'a tablist is one tab stop, not ten')
  assert.match(src, /onTabKeyDown/, 'arrows must move within the bar')
})
