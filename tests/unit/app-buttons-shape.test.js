// EVERY BUTTON IS A PILL, AND AN ICON-ONLY SQUARE BUTTON IS A CIRCLE.
//
// One token carries the shape: --btn-radius, set to --radius-pill in :root.
// The .btn and .ui-pill families and the tool layout's buttons read it, and so
// does every page rule that shapes a button. A 999px radius on a square box is
// a circle, so icon-only buttons need nothing extra. Inputs, selects, search
// fields, cards, panels and menus keep their own radii.
//
// The sweep below reads every class the JSX puts on a <button> (or on an
// element with role="button", or a link whose class names a btn / cta / pill),
// finds every stylesheet rule whose subject carries one of them, and fails on
// a corner radius that is not the pill — unless the class is in KEEP, which
// names what it is instead of a button. A new button class is a pill by
// default; a new exception has to be written into KEEP with its reason.
//
// Also pins the accent fill of the shared families (--accent-fill, never a
// legacy literal or a text member).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripCss } from '../helpers/strip-comments.js'

const ROOT = process.cwd()
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const css = stripCss(read('src/styles/global.css'))

const walk = (dir, ext) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
  const rel = path.join(dir, e.name)
  return e.isDirectory() ? walk(rel, ext) : ext.test(e.name) ? [rel] : []
})

/** Every declaration block whose selector list names `sel` exactly. */
function blocksFor(sel, source = css) {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(?:^|[},])\\s*${esc}(?=[,{:])[^{}]*\\{([^}]*)\\}`, 'gm')
  return [...source.matchAll(re)].map((m) => m[1])
}

// Classes on button elements that are not drawn as buttons, by what they are.
const KEEP = {
  // colour swatches and swatch triggers: the sample is the control
  swatch: ['cpk-trigger', 'cpk-dropper', 'cpk-swatch', 'grd-stop-swatch', 'emoji-skin-btn', 'tt-cell', 'tt-note', 'uh-card-pick', 'emoji-cell'],
  // rows in a menu, list or popover
  row: ['plb-menu-item', 'plb-varrow', 'plb-varrow-main', 'plb-varrow-cmp', 'plb-tint-row', 'plb-ctx-item', 'icust-proj-btn',
    'ig-rail-item', 'svt-item', 'pop-item', 'pnav-pop-item', 'pnav-sheet-row', 'stc-save-item', 'settings-suggest-item',
    'tl-menu-row', 'ic-acc-head', 'arc-select-btn', 'arc-opt'],
  // selectable cards and tiles
  card: ['cc-pair', 'fc-card', 'fc-frame', 'fbd-tile', 'lang-tile', 'onb-option', 'aipg-preset', 'arc-ratio-card', 'exp-fmt',
    'fg-card-open', 'arc-stat', 'icust-code-box'],
  // fields drawn as inputs or selects
  field: ['pnav-search-field', 'typ-picker-trigger', 'snapv-value', 'rc-dim'],
  // underline and folder tabs, and the phone tab bar's items
  tab: ['pl-tab', 'pl-modal-view', 'fdx-tab', 'pnav-tab'],
  // a switch track, drawn by its own geometry
  switch: ['toggle-switch', 'aipg-rule'],
  // previews of the user's own design system, drawn at the user's radius
  preview: ['uis-demo-button', 'uis-scene-tab'],
}
const KEEP_SET = new Set(Object.values(KEEP).flat())
// Menu rows that reuse the filter-chip class inside a filter menu.
const KEEP_CONTEXT = ['.lbry-filtermenu']
// The sales pages are built to their own drawn radii.
const SALES_SHEETS = new Set(['spectrum.css', 'spectrum-mobile.css', 'spectrum-chrome.css', 'pricing.css'])

const PILL = /^(999px|9999px|var\(--radius-pill\)|var\(--btn-radius\)|50%)(\s*!important)?$/

function buttonClasses() {
  const found = new Set()
  for (const f of walk('src', /\.jsx?$/)) {
    const src = read(f)
    for (const m of src.matchAll(/<(button|Link|a|NavLink|label)\b([^>]*?)>/gs)) {
      const cm = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\}|\{([^}]*)\})/.exec(m[2])
      if (!cm) continue
      const raw = cm[1] || cm[2] || cm[3] || cm[4] || ''
      const names = [...raw.matchAll(/[a-z][a-z0-9]*(?:-[a-z0-9]+)+|\bbtn\b/g)].map((x) => x[0])
      const isButton = m[1] === 'button' || /role="button"/.test(m[2]) || names.some((n) => /btn|cta|pill/.test(n))
      if (isButton) names.forEach((n) => found.add(n))
    }
  }
  return found
}

function nonPillButtonRules(classes) {
  const res = [...classes].map((c) => [c, new RegExp(`\\.${c.replace(/[-]/g, '\\-')}(?![\\w-])`)])
  const out = []
  for (const f of walk('src/styles', /\.css$/)) {
    if (SALES_SHEETS.has(path.basename(f))) continue
    const code = stripCss(read(f))
    for (const m of code.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sel = m[1].trim()
      if (sel.startsWith('@')) continue
      const r = /border-radius\s*:\s*([^;}]+)/.exec(m[2])
      if (!r || PILL.test(r[1].trim())) continue
      for (const one of sel.split(',')) {
        if (KEEP_CONTEXT.some((c) => one.includes(c))) continue
        const parts = one.replace(/::?[\w-]+(\([^)]*\))?/g, '').trim().split(/\s*[\s>+~]\s*/)
        const subject = parts[parts.length - 1] || ''
        const hit = res.find(([c, re]) => re.test(subject) && !KEEP_SET.has(c))
        if (hit) out.push(`${f}: ${one.trim().replace(/\s+/g, ' ')} { border-radius: ${r[1].trim()} }`)
      }
    }
  }
  return out
}

test('the readers find what they are about (positive control)', () => {
  assert.ok(blocksFor('.btn').length >= 1, '.btn not found in global.css')
  assert.ok(blocksFor('.ui-pill').length >= 1, '.ui-pill not found')
  const classes = buttonClasses()
  assert.ok(classes.size > 150, `only ${classes.size} button classes read from the JSX`)
  for (const c of ['btn', 'tl-btn', 'uh-new', 'pnav-iconbtn']) assert.ok(classes.has(c), `${c} was not read as a button class`)
})

test('the button token is the pill, and the base families read it', () => {
  const root = /:root\{[^}]*--btn-radius:([^;]+);/.exec(css)
  assert.ok(root, ':root does not declare --btn-radius')
  assert.equal(root[1].trim(), 'var(--radius-pill)')
  assert.doesNotMatch(css, /\[data-rounding="[a-z]+"\]\{[^}]*--btn-radius/, 'the rounding preference must not un-pill a button')
  const radius = (sel) => blocksFor(sel).map((b) => (b.match(/border-radius:([^;]+)/) || [])[1]).filter(Boolean)
  assert.deepEqual(radius('.btn'), ['var(--btn-radius)'])
  assert.deepEqual(radius('.btn-s'), ['var(--btn-radius)'])
  assert.deepEqual(radius('.ui-pill'), ['var(--btn-radius)'])
  const tl = stripCss(read('src/styles/pages/tool-layout.css'))
  const tlBtn = /:is\(\.tl, \.tl-sheet-layer\) \.tl-btn \{([^}]*)\}/.exec(tl)
  assert.ok(tlBtn, 'the tool layout button rule was not found')
  assert.match(tlBtn[1], /border-radius:\s*var\(--btn-radius\)/, 'ToolButton is not a pill')
})

test('no rule shapes a button as anything but a pill or a circle', () => {
  const found = nonPillButtonRules(buttonClasses())
  assert.deepEqual(found, [], 'a button rule sets a non-pill radius; use var(--btn-radius), or add the class to KEEP with its reason')
})

test('the shared accent fills read the derived family, never --accent-strong or --accent-fg', () => {
  const sels = ['.btn-accent', '.btn-primary', '.ui-pill-accent', '.bill-banner-cta', '.global-feedback-btn']
  for (const sel of sels) {
    const blocks = blocksFor(sel)
    assert.ok(blocks.length > 0, `${sel} has no rule; renamed? update this test, do not let it go vacuous`)
    for (const b of blocks) {
      assert.doesNotMatch(b, /--accent-strong|--accent-fg|--brand\b/, `${sel} paints with a legacy literal: {${b.slice(0, 120)}}`)
    }
  }
  const rest = blocksFor('.btn-accent').join(';')
  assert.match(rest, /background:var\(--accent-fill\)/, '.btn-accent rests on --accent-fill')
  assert.doesNotMatch(rest, /background:var\(--accent-(mid|text|bright)\)/, '.btn-accent fills with a TEXT member of the family')
  assert.match(rest, /color:var\(--accent-ink\)/, '.btn-accent labels with --accent-ink')
})
