// THE TWO-ZONE CONTRACT OF THE STICKY WORKBENCH PANEL — salvaged from PR #269
// (founder item C4), rewritten for the zoning #341 actually shipped.
//
// The behaviour is already on main and was measured when it landed: in all five
// modes `.hw-panel` and `.hw-stage` overflow by 0px, and the clipping chain
// reads `.hw-controls[auto]` → `.hw-panel[hidden]` → `.hw-shell[hidden]`, so the
// control drawer is the ONLY scroller in the ancestor chain. What never landed
// is a guard, and this contract has already come within one merge of being
// undone twice:
//
//   · #262 carried `.hw-panel{overflow-y:auto}`. Rebasing it onto #341 had to
//     DROP that declaration by hand — the comment above the rule in global.css
//     says so — because with the panel scrolling, the stage is squeezed again.
//   · #341's own first attempt let the stage flex down and clip. Every
//     measurement passed: panel inside its budget, hand-off on screen, nothing
//     overflowing. The type ladder had quietly lost two of its four sizes.
//
// That second one is why this file asserts the STAGE's flex basis and not only
// the overflow. A preview that silently drops content is worse than one that
// scrolls, and it is invisible to every geometry check that asks "does anything
// overflow".
//
// WHAT #269'S VERSION ASSERTED AND THIS ONE DOES NOT. #269 tested a control
// vocabulary as well — option rails vs property rows, inverted active tiles,
// editable numeric readouts, `sRGB hex` as a field label. HomeWorkbench.jsx was
// rebuilt underneath that branch and those are live design decisions on a
// surface the founder is still revising; pinning them here would freeze someone
// else's open question. Only the structural contract is taken, which is the part
// that was measured, is still true, and has a recorded history of being undone
// by accident.
import test from 'node:test'
import assert from 'node:assert/strict'
import { HOME_WORKBENCH_TABS } from '../../src/data/toolTree.js'
import { ALL_CSS } from './appStylesheets.js'
import { assertStripperWorks, read, stripComments } from './helpers/source-text.js'

// Comments first, always. The rules below sit under some of the longest prose in
// the stylesheet, and that prose quotes `overflow-y:auto` as the thing that was
// dropped — a raw match would read the explanation as the declaration.
const CSS = ALL_CSS.replace(/\/\*[\s\S]*?\*\//g, '')

const WB = 'src/components/HomeWorkbench.jsx'

/** The declarations of the rule whose selector is exactly `selector`. */
function ruleFor(selector) {
  const re = /([^{}]+)\{([^{}]*)\}/g
  const found = []
  let m
  while ((m = re.exec(CSS))) {
    const parts = m[1].split(',').map((s) => s.trim())
    if (parts.includes(selector)) found.push(m[2].trim())
  }
  return found
}

const declares = (decls, prop, value) =>
  decls.some((d) => new RegExp(`(^|;)\\s*${prop}\\s*:\\s*${value}`).test(`;${d}`))

const anyOverflow = (decls) =>
  decls.some((d) => /(^|;)\s*overflow(-x|-y)?\s*:/.test(`;${d}`))

test('the comment stripper works, so the declarations read below can be trusted', () => {
  assertStripperWorks(assert)
  assert.ok(
    !CSS.includes("#262's `overflow-y:auto`"),
    'a CSS block comment survived — the prose above these rules names the very declaration '
    + 'this file exists to keep out, and would satisfy or defeat the assertions below',
  )
})

test('every workbench mode is built as a stage and a controls zone', () => {
  // Five modes, five of each — derived from the tab table rather than typed, so
  // a sixth mode has to grow both zones or fail here.
  const src = stripComments(read(WB))
  assert.ok(src.includes('hw-stage'), 'stripping ate the workbench own JSX')

  const stages = (src.match(/className="hw-stage[ "]/g) || []).length
  const controls = (src.match(/className="hw-controls[ "]/g) || []).length
  const modes = HOME_WORKBENCH_TABS.length

  assert.equal(stages, modes, `expected one .hw-stage per mode (${modes}), found ${stages}`)
  assert.equal(controls, modes, `expected one .hw-controls per mode (${modes}), found ${controls}`)
})

test('the panel is not the scroller — the stage would be squeezed if it were', () => {
  const panel = ruleFor('.hsteps-sticky .hw-panel')
  assert.ok(panel.length > 0, 'the sticky panel rule is gone — the zoning has no container')

  assert.ok(
    declares(panel, 'overflow', 'hidden'),
    '.hsteps-sticky .hw-panel must clip rather than scroll',
  )
  assert.ok(
    !declares(panel, 'overflow(-y)?', '(auto|scroll)'),
    '.hsteps-sticky .hw-panel scrolls again. That is #262\'s declaration, dropped by hand when it '
    + 'was rebased onto #341: with the panel scrolling, the artefact is inside the scroller and the '
    + 'fixed frame stops meaning anything.',
  )
})

test('the controls drawer is the one zone allowed to scroll', () => {
  const controls = ruleFor('.hsteps-sticky .hw-controls')
  assert.ok(controls.length > 0, 'the control zone rule is gone')

  assert.ok(
    declares(controls, 'overflow-y', 'auto'),
    'the control zone no longer scrolls, so a mode with more controls than room clips them instead',
  )
  assert.ok(
    declares(controls, 'min-height', '0'),
    'without min-height:0 a flex child refuses to shrink below its content and the drawer never '
    + 'scrolls at all — it pushes the panel instead',
  )
})

test('the artefact takes its natural height and is never flexed down', () => {
  const stage = ruleFor('.hsteps-sticky .hw-stage')
  assert.ok(stage.length > 0, 'the stage rule is gone')

  assert.ok(
    declares(stage, 'flex', '0 0 auto'),
    '.hsteps-sticky .hw-stage may shrink again. #341 measured that state passing every geometry '
    + 'check while the type ladder had lost two of its four sizes — nothing overflowed, the preview '
    + 'was simply incomplete. The controls absorb the difference, not the artefact.',
  )
  assert.ok(
    !anyOverflow(stage),
    'the stage declares an overflow of its own. Whatever the value, it makes the artefact a second '
    + 'clipping or scrolling context inside a panel that already has one.',
  )
})

test('the frame is a real boundary, so nothing paints past the shell', () => {
  const shell = ruleFor('.hw-shell')
  assert.ok(shell.length > 0, 'the workbench shell rule is gone')
  assert.ok(
    declares(shell, 'overflow', 'hidden'),
    '.hw-shell no longer clips — the outermost link in the chain that keeps the sticky column '
    + 'inside its frame',
  )
})
