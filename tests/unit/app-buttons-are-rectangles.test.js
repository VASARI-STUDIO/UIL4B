// THE APP'S BUTTONS ARE RECTANGLES, AND THEIR ACCENT IS DERIVED.
//
// Director decision 2026-09-23, from the founder's `UIL4B App.dc.html`: app
// actions are 12px rounded rectangles (10px when small) over a hairline; 999px
// is for meters and for the marketing page, which styles its own `.sp-cta`.
// `.btn` and the legacy `.ui-pill` family used to be pills, and their accent
// fill was `--accent-strong`, a per-theme literal a premium accent never
// reaches. This pins both halves so a later edit cannot quietly put either back.
//
// Reads global.css with comments stripped: the notes beside these rules quote
// the old values, and a comment must never satisfy (or fail) the assertion.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripCss } from '../helpers/strip-comments.js'

const css = stripCss(fs.readFileSync(path.join(process.cwd(), 'src', 'styles', 'global.css'), 'utf8'))

/** Every declaration block whose selector list names `sel` exactly. */
function blocksFor(sel) {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Standalone selectors only: `.plb-toolbar .btn-s` is a page restating the
  // shape in its own context, not the base rule this test is about.
  const re = new RegExp(`(?:^|[},])\\s*${esc}(?=[,{:])[^{}]*\\{([^}]*)\\}`, 'gm')
  return [...css.matchAll(re)].map((m) => m[1])
}

test('the rule reader finds the rules it is about (positive control)', () => {
  assert.ok(blocksFor('.btn').length >= 1, '.btn not found — the reader is not reading global.css')
  assert.ok(blocksFor('.btn-accent').length >= 1, '.btn-accent not found')
  assert.ok(blocksFor('.ui-pill').length >= 1, '.ui-pill not found')
})

test('.btn, .btn-s and .ui-pill take the radius tokens, not the pill', () => {
  const radius = (sel) => blocksFor(sel).map((b) => (b.match(/border-radius:([^;]+)/) || [])[1]).filter(Boolean)
  assert.deepEqual(radius('.btn'), ['var(--radius)'], '.btn must be the 12px rectangle via --radius')
  assert.deepEqual(radius('.btn-s'), ['var(--radius-s)'], '.btn-s must be the 10px rectangle via --radius-s')
  assert.deepEqual(radius('.ui-pill'), ['var(--radius)'], '.ui-pill must follow .btn onto --radius')
})

test('the shared accent fills read the derived family, never --accent-strong or --accent-fg', () => {
  const sels = ['.btn-accent', '.btn-primary', '.ui-pill-accent', '.bill-banner-cta', '.global-feedback-btn']
  for (const sel of sels) {
    const blocks = blocksFor(sel)
    assert.ok(blocks.length > 0, `${sel} has no rule — renamed? update this test, do not let it go vacuous`)
    for (const b of blocks) {
      assert.doesNotMatch(b, /--accent-strong|--accent-fg|--brand\b/,
        `${sel} paints with a legacy literal: {${b.slice(0, 120)}}`)
    }
  }
  const rest = blocksFor('.btn-accent').join(';')
  assert.match(rest, /background:var\(--accent-mid\)/, '.btn-accent rests on --accent-mid')
  assert.match(rest, /color:var\(--accent-ink\)/, '.btn-accent labels with --accent-ink')
})
