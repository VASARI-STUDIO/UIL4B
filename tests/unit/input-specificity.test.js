// A bare `input[type="..."]` selector is specificity (0,1,1). Every component
// class that styles a field — `.cc-hex-input`, `.tt-hex-input`, `.cpk-hue`,
// `.hcmd-input` — is (0,1,0). So a bare type selector silently OUTRANKS the
// component, and every overlapping declaration the component makes is dead.
//
// That is not a hypothetical. It shipped, for months, three times over:
//   #320  `input[type="text"]` beat `.hcmd-input`, so the home hero search bar
//         painted a second bordered box inside itself, a second focus ring, and
//         13px text where the class asked for --fs-body.
//   #319  `input[type="range"]` beat `.cpk-hue`, so the colour picker's hue
//         slider never once painted its rainbow — every declaration present,
//         none applied.
//   #330  the same reset beat six more field components at once: the contrast
//         checker and tint hex fields rendered in Manrope instead of mono, and
//         the gradient angle and stop fields each drew a white rounded box
//         inside a control that already had its own chrome.
//
// Code review cannot catch this — both rules are correct in isolation. A
// geometry sweep cannot catch it — nothing overflows. So the guard is here: the
// reset must stay inside `:where()`, which contributes zero specificity and
// makes it a true default that any component class beats.
//
// The rendered half of this — that the components now actually paint what they
// declare — is tests/user-sim/38-input-specificity.spec.js. This file only
// guards the shape of the stylesheet, which is the cheap half.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const RAW = fs.readFileSync(path.join(process.cwd(), 'src/styles/global.css'), 'utf8')

// Comments are stripped FIRST, and newlines preserved so line numbers survive.
// A previous mutation run found a test that passed only because a comment above
// the code still named the old value; the header of this file is itself full of
// `input[type="text"]` in prose, and would match every pattern below.
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))

const lineOf = (index) => CSS.slice(0, index).split('\n').length

const TYPE_SEL = /input\[type=["']?[a-z]+["']?\]/g

/**
 * Every rule whose prelude mentions `input[type=...]`, split into the individual
 * comma-separated selectors, each tagged with whether that particular selector
 * is safe.
 *
 * A type selector is SAFE when it cannot outrank a lone component class (0,1,0):
 *   - it sits inside a `:where(...)` group, which contributes zero specificity; or
 *   - it is qualified by a class of its own — `.snapv input[type="range"]` is
 *     (0,2,1) and is scoped to that component deliberately.
 * `:is(...)` does NOT count: it takes the specificity of its most specific
 * argument, so `:is(input[type="text"])` is still (0,1,1).
 */
const typeSelectors = () => {
  const out = []
  const ruleRe = /(^|[};])([^{};]*input\[type=[^{};]*)\{/g
  let m
  while ((m = ruleRe.exec(CSS)) !== null) {
    const prelude = m[2]
    const preludeStart = m.index + m[1].length
    const bodyStart = ruleRe.lastIndex - 1
    // split on commas that are not inside parentheses
    const parts = []
    let depth = 0, buf = '', at = 0
    for (let i = 0; i < prelude.length; i++) {
      const c = prelude[i]
      if (c === '(') depth++
      else if (c === ')') depth--
      if (c === ',' && depth === 0) { parts.push({ text: buf, at }); buf = ''; at = i + 1; continue }
      buf += c
    }
    parts.push({ text: buf, at })
    for (const part of parts) {
      TYPE_SEL.lastIndex = 0
      if (!TYPE_SEL.test(part.text)) continue
      // is every type compound in this part inside a :where() group?
      let d = 0, inWhere = 0, safe = true
      for (let i = 0; i < part.text.length; i++) {
        if (part.text.startsWith(':where(', i)) { inWhere++; d++; i += 6; continue }
        if (part.text[i] === '(') d++
        else if (part.text[i] === ')') { d--; if (inWhere > d) inWhere = d }
        else if (part.text.startsWith('input[type=', i) && inWhere === 0) safe = false
      }
      const qualified = /\.[\w-]/.test(part.text)
      out.push({
        selector: part.text.trim(),
        line: lineOf(preludeStart + part.at),
        body: CSS.slice(bodyStart + 1, CSS.indexOf('}', bodyStart)),
        safe: safe || qualified,
      })
    }
  }
  return out
}

// The one deliberate exception, documented in global.css beside it: inside the
// ≤640 block, `font-size:16px` MUST keep element-level strength, because iOS
// zooms the viewport when a focused field is under 16px and a component class
// must not be able to opt out of that. Its padding sits in :where() instead.
const POLICY_EXCEPTION = /font-size:\s*16px/

test('every bare input[type=...] selector is :where()-wrapped or class-qualified', () => {
  const all = typeSelectors()
  assert.ok(all.length > 15, `expected the sheet to still carry type selectors, saw ${all.length}`)
  const offenders = all
    .filter((s) => !s.safe)
    .filter((s) => !(POLICY_EXCEPTION.test(s.body) && !/padding/.test(s.body)))
    .map((s) => `  global.css:${s.line}  ${s.selector.slice(0, 90)}`)
  assert.equal(offenders.length, 0,
    'These selectors outrank every component input class at (0,1,1). Wrap them in\n' +
    ':where(...) so they are defaults, or qualify them with the component class:\n' +
    offenders.join('\n'))
})

test('the mobile 16px floor is still element-strength, and carries no geometry', () => {
  // If someone "tidies" this into the :where() block, components regain control
  // of font-size below 640px and iOS starts zooming on focus again.
  const floor = CSS.match(
    /\n\s*input\[type="text"\][^{]*\{([^}]*)\}/g)?.filter((r) => /font-size:\s*16px/.test(r)) || []
  assert.equal(floor.length, 1, 'expected exactly one element-strength 16px floor rule')
  assert.ok(!/padding/.test(floor[0]),
    'the 16px floor rule must not also set padding — geometry belongs in :where()')
})

test('the reset itself still carries the field defaults it is supposed to', () => {
  // Guards against the opposite mistake: wrapping the reset in :where() and
  // then deleting it because "nothing uses it".
  const reset = CSS.match(/:where\(input\[type="text"\][^)]*\)\s*\{([^}]*)\}/)
  assert.ok(reset, 'the :where()-wrapped input reset is missing')
  for (const prop of ['font-family', 'font-size', 'padding', 'border', 'background', 'color']) {
    assert.match(reset[1], new RegExp(`${prop}:`), `reset lost its ${prop} default`)
  }
})
