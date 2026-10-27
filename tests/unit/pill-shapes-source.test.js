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
  '.icust-seg', '.icust-seg button', '.adm-tabs', '.fc-seg', '.fc-seg-opt',
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

// ONE HEIGHT, ONE HAIRLINE, ONE FILL FOR EVERY SEARCH BAR.
//
// The header field, the library field (and its font-browser, srf and palette
// variants), the admin field and the /mobile mock all take their height from
// --search-h and their border and ground from the theme tokens. A rule that
// names one of these selectors may not set a height, border or ground of its own
// unless it is one of the readings below, so a page-level override that brings a
// second search height back fails here with the file named.
//   - height / min-height: var(--search-h); the collapsed header search is a 36px
//     icon button, so .pnav-search-field may also say 36px
//   - border: 1px solid var(--border); border-color: var(--border)
//   - background: var(--inp), or var(--bg-3) in a dark-only rule
// Not in the family, so not listed: .hcmd-bar (the 60px hero command bar).
const SEARCH_BARS = ['.pnav-search-field', '.lbry-search', '.spm-ic-search', '.adm-search']
const declared = (body, prop) => {
  const m = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`))
  return m ? m[1].trim().replace(/\s+/g, ' ') : null
}

test('--search-h is 44px, the touch floor', () => {
  const m = ALL_STYLESHEETS.map(({ css }) => stripCss(css).match(/--search-h\s*:\s*([^;}]+)/)).find(Boolean)
  assert.ok(m, '--search-h is not defined anywhere')
  assert.equal(m[1].trim(), '44px')
})

for (const target of SEARCH_BARS) {
  test(`${target} takes the shared search height, hairline and fill`, () => {
    const hits = rules.filter((r) => r.selectors.some((s) => endsWithTarget(s, target)))
    const sized = hits.filter((r) => declared(r.body, 'height') || declared(r.body, 'min-height'))
    assert.ok(sized.length > 0, `${target} sets no height: renamed, or the list is stale`)
    const bad = []
    for (const r of hits) {
      for (const prop of ['height', 'min-height']) {
        const v = declared(r.body, prop)
        if (v === null || v === 'var(--search-h)') continue
        if (target === '.pnav-search-field' && prop === 'height' && v === '36px') continue
        bad.push(`${r.file}: ${prop}:${v}`)
      }
      const border = declared(r.body, 'border')
      if (border !== null && border !== '1px solid var(--border)') bad.push(`${r.file}: border:${border}`)
      const color = declared(r.body, 'border-color')
      if (color !== null && color !== 'var(--border)') bad.push(`${r.file}: border-color:${color}`)
      const ground = declared(r.body, 'background')
      // Dark --inp equals the toolbar card, so a dark-only rule may step up to --bg-3.
      const darkStep = ground === 'var(--bg-3)' && r.selectors.every((sel) => sel.startsWith('[data-theme="dark"]'))
      if (ground !== null && ground !== 'var(--inp)' && !darkStep) bad.push(`${r.file}: background:${ground}`)
    }
    assert.deepEqual(bad, [], `${target} must use --search-h, 1px solid var(--border) and var(--inp)`)
  })
}

// ONE TRAY TREATMENT: A HAIRLINE.
//
// The segmented trays and toolbars were a mix of painted-and-bordered and
// painted-and-borderless. Measured on 25 Oct 2026 the bordered ones were the
// large majority (the library and palette toolbars, the seed and format
// trays, the billing, SEO, admin, modal and icon-customiser trays, the file
// converter's), so the borderless ones (.lbry-filters, .theme-seg, .ig-weight)
// took the hairline. Each tray below must declare a 1px hairline somewhere (a
// border, or the converter's inset ring).
const TRAYS = [
  '.lbry-toolbar', '.lbry-filters', '.theme-seg', '.ig-weight', '.icust-seg', '.adm-tabs',
  '.sp-seeds', '.sp-seg', '.seo-seg', '.pr-billing', '.fc-seg',
]
for (const target of TRAYS) {
  test(`${target} carries the tray hairline`, () => {
    const hits = rules.filter((r) => r.selectors.some((s) => endsWithTarget(s, target)))
    assert.ok(hits.length > 0, `${target} has no rule: renamed, or the list is stale`)
    const hairline = hits.some((r) => /(?:^|;)\s*border\s*:\s*1px solid/.test(r.body) || /box-shadow\s*:\s*inset 0 0 0 1px/.test(r.body))
    assert.ok(hairline, `${target} declares no 1px hairline`)
  })
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
