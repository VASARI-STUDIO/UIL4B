// Safe-area insets only read non-zero when the page opts in to drawing under
// the notch and home indicator. Without `viewport-fit=cover` on the viewport
// meta, every `env(safe-area-inset-*)` in the stylesheets resolves to 0 on a
// real iPhone, so the rules written for it are dead code.
//
// Turning cover on is the other half of the bargain: fixed chrome now draws
// under the notch unless it reads the insets itself. This file pins both halves
// — the meta is there, and the fixed bars that sit on a screen edge use the
// inset for that edge.
//
// Prerender (scripts/prerender.mjs) never writes its own viewport meta: it
// copies dist/index.html, which Vite builds from this index.html. So this one
// tag is the only source.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : p.endsWith('.css') ? [p] : []
  })
}
const css = walk(path.join(root, 'src', 'styles'))
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')

test('index.html viewport meta opts in to viewport-fit=cover', () => {
  const tag = html.match(/<meta\s+name="viewport"\s+content="([^"]*)"/)
  assert.ok(tag, 'index.html has a viewport meta')
  assert.match(tag[1], /(^|,)\s*viewport-fit=cover\s*(,|$)/)
  assert.match(tag[1], /width=device-width/)
})

// Rule bodies for a selector, wherever it appears in a selector list or after
// a prefix such as `html.has-tabbar`. Pseudo-classes are not matched, because
// the selector has to be followed straight away by `{` or `,`.
function bodies(selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(?:^|[}\\s,>])${esc}\\s*[{,][^{}]*?\\{?([^{}]*)\\}`, 'g')
  const out = []
  let m
  while ((m = re.exec(css))) out.push(m[1])
  return out
}

// Fixed or sticky bars on the bottom edge. A rule that places one with a
// `bottom` value must carry the bottom inset itself, or read --bkit-h, which is
// declared as 56px/112px plus that inset.
const BOTTOM_BARS = [
  '.pnav-tabs',
  '.bkit-rail',
  '.toast',
  '.global-feedback-btn',
  '.bill-banner',
  '.cs-undo-toast',
]

for (const sel of BOTTOM_BARS) {
  test(`${sel} keeps clear of the home indicator`, () => {
    const placed = bodies(sel).filter((b) => /(^|[;\s])bottom\s*:/.test(b) || /position\s*:\s*fixed/.test(b))
    assert.ok(placed.length > 0, `found a placing rule for ${sel}`)
    for (const body of placed) {
      assert.match(body, /safe-area-inset-bottom|--bkit-h/, `${sel} { ${body.trim().slice(0, 90)} ... }`)
    }
  })
}

test('the fixed nav pads itself by the top inset', () => {
  assert.match(css, /--nav-top\s*:\s*env\(safe-area-inset-top/)
  const nav = bodies('.pnav').find((b) => /position\s*:\s*fixed/.test(b))
  assert.ok(nav, 'found the fixed .pnav rule')
  assert.match(nav, /padding-top\s*:\s*var\(--nav-top\)/)
  assert.match(nav, /height\s*:\s*calc\(var\(--nav-top\)\s*\+\s*var\(--nav-h\)\)/)
})

// A later phone override that resets a rule's padding or height replaces the
// inset-aware value set earlier in the cascade. So every rule body for these
// selectors that sets the property has to carry the inset itself.
function everyBodyWith(selector, prop) {
  const re = new RegExp(`(^|[;\\s])${prop}\\s*:`)
  const set = bodies(selector).filter((b) => re.test(b))
  assert.ok(set.length > 0, `found a rule setting ${prop} on ${selector}`)
  return set
}

const OVERLAY_PADDING = ['.icust-overlay', '.fg-overlay', '.fnote-overlay', '.fb-overlay']

for (const sel of OVERLAY_PADDING) {
  test(`${sel} keeps its padding clear of the notch at every width`, () => {
    for (const body of everyBodyWith(sel, 'padding')) {
      assert.match(body, /safe-area-inset-top/, `${sel} { ${body.trim().slice(0, 90)} ... }`)
      assert.match(body, /safe-area-inset-left/, `${sel} { ${body.trim().slice(0, 90)} ... }`)
      assert.match(body, /safe-area-inset-right/, `${sel} { ${body.trim().slice(0, 90)} ... }`)
    }
  })
}

test('phone sheets size their height against the top inset', () => {
  for (const sel of ['.fnote', '.fb-modal', '.icust-panel']) {
    for (const body of everyBodyWith(sel, 'max-height')) {
      assert.match(body, /safe-area-inset-top/, `${sel} { ${body.trim().slice(0, 90)} ... }`)
    }
  }
})

test('the Export dialog phone sheet keeps its edges clear of the notch and the home indicator', () => {
  // The sheet is flush with the screen on a phone. Its sides are padded on the card
  // (every rule that pads it reads both side insets), the top inset sits in the head
  // and the bottom inset in the dock, so each bar's own colour still reaches the edge.
  for (const body of everyBodyWith('.xd-card', 'padding')) {
    assert.match(body, /safe-area-inset-left/, `.xd-card { ${body.trim().slice(0, 90)} ... }`)
    assert.match(body, /safe-area-inset-right/, `.xd-card { ${body.trim().slice(0, 90)} ... }`)
  }
  const padsBy = (sel, inset) => bodies(sel).some((b) => new RegExp(`padding[a-z-]*\\s*:[^;]*safe-area-inset-${inset}`).test(b))
  assert.ok(padsBy('.xd-head', 'top'), 'the Export dialog head no longer pads itself by the top inset')
  assert.ok(padsBy('.xd-dock', 'bottom'), 'the Export dialog dock no longer pads itself by the bottom inset')
})

test('the feedback sheets pad their last block by the bottom inset on a phone', () => {
  for (const sel of ['.fnote-foot', '.fb-body', '.fb-success']) {
    const padded = everyBodyWith(sel, 'padding-bottom')
    assert.ok(padded.some((b) => /safe-area-inset-bottom/.test(b)), `${sel} pads its bottom by the inset`)
  }
})

// In landscape the notch sits at the side, and these draw to the edge. Each
// pair is its own test, so a failure names the selector.
const SIDE_GUTTERS = [
  ['.app-page', 'padding'],
  ['.tl-toolbar', 'padding'],
  ['.tl-toolbar', 'padding-inline'],
  ['.sp-shell', 'padding-inline'],
  ['.sp-footer-inner', 'padding'],
  ['.pop.cpk-pop[data-pop-fixed="true"]', 'padding'],
  ['.bkit-card.is-lifted', 'inset-inline'],
  ['html.bkit-on .plb .plb-adjust', 'padding-inline'],
]

for (const [sel, prop] of SIDE_GUTTERS) {
  test(`${sel} ${prop} reads the left and right insets`, () => {
    // The desktop tier of the lifted card pins it to the dock with inset-inline:auto.
    const gutters = everyBodyWith(sel, prop).filter((b) => !/inset-inline\s*:\s*auto/.test(b))
    assert.ok(gutters.length > 0, `found a gutter rule for ${sel}`)
    for (const body of gutters) {
      assert.match(body, /safe-area-inset-left/, `${sel} { ${body.trim().slice(0, 90)} ... }`)
      assert.match(body, /safe-area-inset-right/, `${sel} { ${body.trim().slice(0, 90)} ... }`)
    }
  })
}
