// C4 — "make the live previews look and feel more like the actual app."
//
// #262 gave the panel a fixed frame (`--hw-frame`) so it stops RESIZING between
// tabs. It deliberately deferred the two-zone split to this slice, because a
// fixed frame without a per-mode re-layout just moves the overflow inside the
// panel: every mode scrolled as a whole, artefact included, and `image`
// overflowed the frame by 118px.
//
// The two zones are the fix. `.hw-stage` holds the artefact and never scrolls;
// `.hw-controls` is the only zone allowed to. That single decision is what makes
// the panel read as a tool window rather than a marketing widget, and the
// control language below is what makes it read as THIS tool:
//
//   · options (icon size, stroke, file type, scale ratio) are a rail of pill
//     tiles, active one inverted;
//   · properties (angle, base size, resolution, compression) are label-left /
//     control-right rows;
//   · the two are never mixed in one stack;
//   · every numeric control has an editable readout, because on a narrow column
//     a slider alone cannot hit a precise value;
//   · hex fields name their colour space.
//
// MEASURED at 1440x900 in Chromium, panel 591px wide, frame 640px, before and
// after. Before: image overflowed the frame by 118px and every mode scrolled the
// whole panel. After: no mode overflows the frame, the artefact never scrolls in
// any mode, and only the controls drawer scrolls.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')

const css = stripCss(read('src/styles/global.css'))
const wb = stripJs(read('src/components/HomeWorkbench.jsx'))

const rule = (selector) => {
  const m = new RegExp(`(^|\\})\\s*${selector.replace(/[.[\]*+?^$|(){}\\]/g, '\\$&')}\\{([^}]*)\\}`, 'm').exec(css)
  return m ? m[2] : null
}

// ── the two zones ───────────────────────────────────────────────────────────

test('every mode is built as a stage and a controls zone', () => {
  // Five panels, five of each. A mode that grows a third top-level child has
  // left the structure that keeps the frame stable.
  const stages = (wb.match(/className="hw-stage/g) || []).length
  const controls = (wb.match(/className="hw-controls/g) || []).length
  assert.equal(stages, 5, `expected one .hw-stage per mode, found ${stages}`)
  assert.equal(controls, 5, `expected one .hw-controls per mode, found ${controls}`)
})

test('only the controls may scroll, and the artefact never does', () => {
  const panel = rule('.hsteps-sticky .hw-panel')
  assert.ok(panel, 'the sticky panel rule is gone')
  assert.match(panel, /overflow\s*:\s*hidden/,
    'the panel itself must not scroll — that was the pre-C4 behaviour and it '
    + 'scrolled the artefact out of the frame along with the controls')

  const stage = rule('.hsteps-sticky .hw-stage')
  assert.ok(stage, 'the stage rule is gone')
  assert.ok(!/overflow-y\s*:\s*auto/.test(stage), 'the artefact zone must never scroll')
  assert.match(stage, /flex\s*:\s*1 1 auto/, 'the stage absorbs the slack in the frame')

  const zone = rule('.hsteps-sticky .hw-controls')
  assert.ok(zone, 'the controls rule is gone')
  assert.match(zone, /overflow-y\s*:\s*auto/, 'the controls are the fallback scroller')
  assert.match(zone, /overscroll-behavior\s*:\s*contain/,
    'without this a controls scroll chains into the page and fights the sticky section')
  assert.match(zone, /max-height\s*:\s*46%/,
    'the controls must never take more than 46% of the frame — the artefact wins')
})

test('the frame survives, and is still not conditional on motion', () => {
  // The anti-jump fix from #262. If a reduced-motion visitor loses it they get
  // the worst version of the original bug: a 451px jump and no transition.
  assert.match(css, /--hw-frame:clamp\(420px,calc\(100svh - var\(--nav-clear\) - var\(--s-8\)\),640px\)/,
    'the fixed frame token is gone or changed')
  const shell = rule('.hsteps-sticky .hw-shell')
  assert.match(shell, /height:var\(--hw-frame\)/, 'the shell no longer takes the fixed frame')
})

test('the per-mode splits collapse inside the sticky column', () => {
  // These were keyed to VIEWPORT width, so at 1440 they stayed two-column
  // inside a 591px panel. That is what made the modes feel cramped.
  const collapsed = rule('.hsteps-sticky .hw-icon-split,.hsteps-sticky .hw-img-split,.hsteps-sticky .hw-type-split')
  assert.ok(collapsed, 'the sticky-column collapse rule is gone')
  assert.match(collapsed, /grid-template-columns\s*:\s*minmax\(0,\s*1fr\)/,
    'canvas above, controls below — not two columns in half a page')
})

// ── the control language ────────────────────────────────────────────────────

test('options are rails of tiles, and the active tile is inverted', () => {
  const tile = rule('.hw-tile')
  assert.ok(tile, '.hw-tile is gone')
  const rail = rule('.hw-rail')
  assert.match(rail, /overflow-x\s*:\s*auto/, 'an options rail scrolls sideways')
  assert.match(tile, /min-height\s*:\s*32px/, 'tiles must clear the 24px target floor')
  const active = rule('.hw-tile[aria-pressed="true"]')
  assert.ok(active, 'the selected tile has no style')
  assert.match(active, /background\s*:\s*var\(--t0\)/,
    'the active tile must be INVERTED — at this size a tint is not a strong '
    + 'enough selected signal beside four neighbours')
})

test('the four option sets are rails, not selects', () => {
  // Icon size, icon stroke, image file type and scale ratio. Each was a <select>
  // and each is now a rail; the vertical space that bought is what closed the
  // image mode's overflow.
  for (const label of ['hw-icon-size-label', 'hw-icon-stroke-label', 'hw-img-fmt-label', 'hw-type-ratio-label']) {
    assert.ok(wb.includes(label), `${label} is gone — that option set is not a rail`)
  }
  assert.ok(!/id="hw-icon-size"/.test(wb), 'icon size is a select again')
  assert.ok(!/id="hw-icon-stroke"/.test(wb), 'icon stroke is a select again')
  assert.ok(!/id="hw-img-fmt"/.test(wb), 'file type is a select again')
})

test('rails keep an accessible name and a pressed state', () => {
  // A rail is a group of toggles, not a tablist — it selects a value, it does
  // not swap a panel. aria-pressed is the honest state for that.
  const rails = [...wb.matchAll(/<div className="hw-rail" role="group" aria-labelledby="([^"]+)"/g)]
  assert.equal(rails.length, 4, `expected four labelled rails, found ${rails.length}`)
  for (const [, id] of rails) {
    assert.ok(new RegExp(`id="${id}"`).test(wb), `${id} has no element to name it`)
  }
  assert.ok(!/className="hw-tile"[^>]*role="tab"/.test(wb),
    'tiles must not claim the tab role — they choose a value, they do not swap a panel')
})

test('numeric controls carry an editable readout', () => {
  const box = rule('.hw-prop-num')
  assert.ok(box, '.hw-prop-num is gone')
  assert.match(box, /min-height\s*:\s*32px/)
  // `input.hw-num`, NOT `.hw-num`, and the element qualifier is load-bearing.
  // The base rule near the top of the sheet is `input[type="number"]{...}` —
  // an attribute selector, so (0,1,1) — and it beats a bare class. MEASURED
  // with the bare class: the readout inherited --font and `padding:9px 14px`,
  // leaving 31px of content box for a 42px value, so "16" rendered as "1".
  // If this lookup ever fails, check whether the selector lost its qualifier
  // before assuming the declaration moved.
  const num = rule('input.hw-num')
  assert.ok(num, 'the readout rule must stay qualified by element to outrank input[type="number"]')
  assert.match(num, /font-family\s*:\s*var\(--mono\)/,
    'the value is mono; the label is --font')
  assert.match(num, /padding\s*:\s*0/,
    'the 9px/14px padding from the base input rule must be cleared or the value clips')
  // The angle slider's number is a real input, not a printed value.
  assert.match(wb, /className="hw-num"[\s\S]{0,200}?aria-label="Gradient angle in degrees"/,
    'the gradient angle has no editable numeric readout')
  assert.match(wb, /className="hw-prop-range"/, 'the coarse slider is gone')
})

test('the hex fields name their colour space', () => {
  assert.match(wb, /className="hw-label-space">sRGB hex</,
    'hex fields must read "sRGB hex", not "Hex" — for a product whose pitch is '
    + 'defensible colour systems, naming the space costs four characters')
  assert.ok(rule('.hw-label-space'), '.hw-label-space has no style')
})

test('the hand-off stays reachable while the controls scroll', () => {
  // "Continue in …" is the point of the panel. A CTA that scrolls out of the
  // drawer is a CTA that does not get pressed.
  const foot = rule('.hsteps-sticky .hw-foot')
  assert.ok(foot, 'the sticky foot rule is gone')
  assert.match(foot, /position\s*:\s*sticky/)
  assert.match(foot, /background\s*:\s*var\(--bg-1\)/,
    'the foot needs its own ground or the controls show through it')
})

test('the chrome stays decorative and the tablist stays out of it', () => {
  // An aria-hidden container cannot hold the section's primary control.
  assert.match(wb, /<div className="hw-chrome" aria-hidden="true">/,
    'the chrome must stay aria-hidden and inert')
  // The chrome bar's OWN content, up to the tabs that follow it.
  const chrome = /<div className="hw-chrome" aria-hidden="true">([\s\S]*?)<div className="hw-tabs"/.exec(wb)?.[1]
  assert.ok(chrome, 'the chrome bar and the tablist are no longer siblings')
  assert.ok(!/role="tablist"|role="tab"/.test(chrome),
    'the tablist has been moved INSIDE the aria-hidden chrome bar — an '
    + 'aria-hidden container cannot hold the section\'s primary control')
  assert.ok(!/<button/.test(chrome), 'nothing in the chrome may be focusable')
})
