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
