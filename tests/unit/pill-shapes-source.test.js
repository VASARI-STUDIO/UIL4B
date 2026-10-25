// EVERY SEARCH BAR AND PILL TOOLBAR NAMES THE PILL IN ITS STYLESHEET.
//
// tests/user-sim/129-pill-shapes.spec.js measures the rendered shape on the
// pages it can reach. This reads the stylesheets, so it also covers the ones
// that sit behind a click or a sign-in (the account menu's theme tray, the icon
// customiser's segments, the admin search, the font browser), and it names the
// file and rule that regressed.
//
// For each selector below, every rule whose subject is that selector and that
// declares a corner radius must declare the pill token. Three readings are
// allowed and nothing else:
//   - var(--radius-pill) or 999px
//   - a library toolbar's 26px, which is what it steps down to when it wraps on a phone
//   - 0 on a tray whose own ground is dropped (background:none), because then the
//     pills inside carry the shape
// Each selector must also declare a radius somewhere, so a rename fails here
// instead of leaving the list guarding nothing.
import test from 'node:test'
import assert from 'node:assert/strict'
import { ALL_STYLESHEETS } from './appStylesheets.js'
import { stripCss } from '../helpers/strip-comments.js'

const TARGETS = [
  // search bars
  '.pnav-search-field', '.lbry-search', '.spm-ic-search', '.adm-search',
  // pill toolbars and segmented trays
  '.lbry-toolbar', '.lbry-filters', '.lbry-filter-ind', '.theme-seg', '.sp-seeds', '.sp-seed',
  '.icust-seg', '.icust-seg button', '.icust-seg-static', '.adm-tabs', '.plb-modal-tabs', '.fc-seg', '.fc-seg-opt',
]

/** Split a selector list on the commas that are not inside parentheses. */
function splitList(list) {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of list) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { out.push(cur); cur = '' } else cur += ch
  }
  out.push(cur)
  return out
}

/** Drop :is()/:where()/:not() groups and state pseudo-classes so the subject is what is left. */
const subject = (sel) => sel.replace(/:(?:is|where|not)\([^)]*\)/g, '').trim().replace(/\s+/g, ' ')

const rules = ALL_STYLESHEETS.flatMap(({ file, css }) => {
  const text = stripCss(css)
  return [...text.matchAll(/([^{}@;]+)\{([^{}]*)\}/g)].map((m) => ({
    file,
    selectors: splitList(m[1]).map(subject),
    body: m[2],
  }))
})

const endsWithTarget = (sel, target) => {
  if (!sel.endsWith(target)) return false
  const before = sel[sel.length - target.length - 1]
  return before === undefined || /[\s>+~]/.test(before)
}

for (const target of TARGETS) {
  test(`${target} takes the pill radius wherever it sets one`, () => {
    const found = []
    for (const r of rules) {
      if (!r.selectors.some((s) => endsWithTarget(s, target))) continue
      const m = r.body.match(/(?:^|;)\s*border-radius\s*:\s*([^;]+)/)
      if (m) found.push({ file: r.file, value: m[1].trim(), body: r.body })
    }
    assert.ok(found.length > 0, `${target} declares no border-radius anywhere: renamed, or the list is stale`)
    const bad = found.filter(({ value, body }) => {
      if (/^(var\(--radius-pill\)|999px)$/.test(value)) return false
      if (target === '.lbry-toolbar' && value === '26px') return false
      if (/^0(px)?$/.test(value) && /background\s*:\s*none/.test(body)) return false
      return true
    })
    assert.deepEqual(bad.map((b) => `${b.file}: border-radius:${b.value}`), [], `${target} must be a full pill`)
  })
}
