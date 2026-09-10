// A DEFECT CLASS, NOT A SINGLE BUG — salvaged from PR #269, rewritten for the
// stylesheet as it stands today.
//
// #269 found it live in `.pgal-actions`, the Palette Gallery card's five hover
// actions. That class no longer exists: the layer is the shared
// `.lbry-card-actions` now, and the fault itself was fixed on the way past. So
// the code half of this item is already landed and nothing here re-fixes it.
// What never landed is the GUARD, and main's own stylesheet asks for one in
// prose — the block above `.lbry-card-actions` says "`visibility` stays a plain
// state property and is NEVER in a transition list" and "Read it before
// changing the reveal on any library card". A comment cannot fail a build.
//
// MEASURE FIRST, because the obvious diagnosis is wrong and worth not
// repeating: "visibility:hidden removes descendants from the tab order, so
// focus can never enter, so :focus-within can never fire". That is not what
// happened. A library card holds focusable controls OUTSIDE the actions layer,
// so tabbing into the card does fire `:focus-within`.
//
// The real fault is that `visibility` and `display` are DISCRETE properties.
// Listing one in a `transition` makes it flip at 50% of the duration — 100ms
// into a 200ms transition. A keyboard user tabbing at normal speed outruns
// that, so each Tab resolves while the controls are still hidden and the
// browser skips them. #269 probed it in Chromium against the real DOM:
//
//   visibility:hidden + transition, tabbing normally   → 0 of 5 reached
//   visibility:hidden + transition, 250ms per Tab      → 5 of 5 reached
//   opacity:0 + pointer-events:none, either speed      → 5 of 5 reached
//
// An intermittent, speed-dependent loss is worse than a hard block: it looks
// correct to anyone who slows down to check it.
//
// WHAT THIS FILE CHANGES ABOUT #269'S VERSION, and why it had to change.
// #269's rule looked for the hide and the transition inside ONE declaration
// block. Today's fix splits them across two: `.lbry-card-actions` declares the
// transition at the base and the `visibility:hidden` inside
// `@media(hover:hover)`. #269's rule, pasted, would pass on today's sheet AND
// keep passing after the regression — adding `visibility` to the base
// transition list puts the race straight back and touches neither block that
// #269 compared. So the properties are gathered per TARGET across every rule
// that applies to it, and the hide and the transition are allowed to live
// apart.
//
// NOT ASSERTED HERE, deliberately: that `opacity` should replace `visibility`.
// #269 recommended exactly that and main tried it and measured it WRONG —
// `visibility:hidden` also keeps a node out of the ACCESSIBILITY TREE, and the
// swap put 350 action links into the tab order of a 70-card grid. Hidden until
// engaged is the right behaviour. The bug was only ever the transition, so only
// the transition is guarded.
import test from 'node:test'
import assert from 'node:assert/strict'
import { ALL_CSS } from './appStylesheets.js'

// Comments are stripped FIRST. This file's subject is a declaration that must
// NOT appear, and the sheet's own prose quotes it — the block above
// `.lbry-card-actions` explains the trap in words, and `.ggn-handle-val`'s
// `visibility 0s linear var(--dur-1)` idiom is named there as the thing
// deliberately not used. Matching raw source would pass on the explanation and
// miss the declaration coming back.
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')

const CSS = stripCss(ALL_CSS)

/** Every `prelude{declarations}` pair in the sheet, innermost first. */
function rules(source) {
  const out = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = re.exec(source))) out.push([m[1].trim(), m[2].trim()])
  return out
}

const ALL = rules(CSS)

/** The comma-separated selectors of one rule, trimmed. */
const parts = (prelude) => prelude.split(',').map((s) => s.trim()).filter(Boolean)

const has = (decl, prop, value) =>
  new RegExp(`(^|;)\\s*${prop}\\s*:\\s*${value}`).test(`;${decl}`)

const transitions = (decl, prop) => new RegExp(`transition[^;]*\\b${prop}\\b`).test(decl)

/**
 * The element a `:focus-within` selector reveals — the part after the last
 * `:focus-within`, with any leading combinator dropped so a sibling reveal
 * (`… :focus-within ~ .cs-csys-loupe`) names its target rather than a fragment.
 */
function revealTarget(selector) {
  const at = selector.lastIndexOf(':focus-within')
  return selector.slice(at + ':focus-within'.length).trim().replace(/^[>+~]\s*/, '')
}

/** Does this selector style `target` itself, rather than something inside it? */
const appliesTo = (selector, target) =>
  selector === target || selector.endsWith(` ${target}`) || selector.endsWith(`>${target}`)

const DISCRETE = ['visibility', 'display']
const HIDDEN_VALUE = { visibility: 'hidden', display: 'none' }

/** Every layer some rule reveals on `:focus-within` by changing its visibility. */
function revealTargets() {
  const found = new Set()
  for (const [prelude, decl] of ALL) {
    if (!prelude.includes(':focus-within')) continue
    // Only reveals count. A rule that merely restyles on focus-within — a
    // border colour, a shadow — is not this pattern and has no race to lose.
    if (!/(^|;)\s*(opacity|visibility|display)\s*:/.test(`;${decl}`)) continue
    for (const selector of parts(prelude)) {
      if (!selector.includes(':focus-within')) continue
      const target = revealTarget(selector)
      if (target) found.add(target)
    }
  }
  return found
}

/**
 * Which discrete properties hide `target` AT REST — counting only rules whose
 * selector is the target itself.
 *
 * The distinction earns its keep: `.plb-galpopup-body .lbry-card-actions`
 * carries `display:none`, which suppresses the layer in one CONTEXT and says
 * nothing about how it behaves on a card. Folding that in made the control
 * below pass with the real hide-at-rest deleted — found by mutating the sheet,
 * not by reading it.
 */
function hiddenAtRest(target) {
  const props = new Set()
  for (const [prelude, decl] of ALL) {
    if (!parts(prelude).includes(target)) continue
    for (const prop of DISCRETE) if (has(decl, prop, HIDDEN_VALUE[prop])) props.add(prop)
  }
  return props
}

/** For one target: which discrete properties hide it, and which are transitioned. */
function discreteState(target) {
  const hidden = new Set()
  const transitioned = new Set()
  for (const [prelude, decl] of ALL) {
    if (!parts(prelude).some((s) => appliesTo(s, target))) continue
    for (const prop of DISCRETE) {
      if (has(decl, prop, HIDDEN_VALUE[prop])) hidden.add(prop)
      if (transitions(decl, prop)) transitioned.add(prop)
    }
  }
  return { hidden, transitioned }
}

test('the comment stripper works, so the declarations read below can be trusted', () => {
  const fixture = '.a{color:red}/* .b{visibility:hidden;transition:visibility 1s} */.c{color:blue}'
  const stripped = stripCss(fixture)
  assert.ok(stripped.includes('.a{color:red}'), 'stripping ate a real rule')
  assert.ok(stripped.includes('.c{color:blue}'), 'stripping ate a real rule')
  assert.ok(!stripped.includes('visibility'), 'a block comment survived — prose would read as a declaration')
})

test('the sheet still contains focus-within reveals that hide at rest', () => {
  // The positive control for the rule below, and it is load-bearing: with no
  // hidden-at-rest reveal in the sheet the rule passes by having no subject,
  // which is how a guard goes quietly vacuous. If this list ever empties for a
  // real reason, say so here rather than deleting the assertion under it.
  const hiding = [...revealTargets()].filter((t) => hiddenAtRest(t).size > 0)
  assert.ok(
    hiding.length > 0,
    'no :focus-within layer hides behind a discrete property any more — the rule below now has '
    + 'nothing to check. Confirm that is intended before trusting it.',
  )
  assert.ok(
    hiding.includes('.lbry-card-actions'),
    `the library card action layer is not among the hidden-at-rest reveals (${hiding.join(', ') || 'none'})`,
  )
})

test('nothing revealed by :focus-within hides behind a TRANSITIONED discrete property', () => {
  const broken = []
  for (const target of revealTargets()) {
    const { hidden, transitioned } = discreteState(target)
    for (const prop of hidden) {
      if (transitioned.has(prop)) broken.push(`${target} — hidden by ${prop} and transitioning it`)
    }
  }
  assert.deepEqual(
    broken, [],
    'these layers are revealed by :focus-within but hide behind a TRANSITIONED discrete property, '
    + 'which flips half a duration late. A keyboard outruns it and the browser skips the controls — '
    + 'measured at 0 of 5 actions reachable. Keep the property out of the transition list; do not '
    + 'trade it for opacity, which would put the hidden controls into the accessibility tree.',
  )
})

test('the library card action layer stays hidden at rest and reachable by focus', () => {
  // The named incumbent, kept beside the general rule because it is the one
  // that shipped broken and a named regression reads better in a failure than a
  // computed selector list.
  const rest = ALL.filter(([prelude]) => parts(prelude).some((s) => appliesTo(s, '.lbry-card-actions')))
  assert.ok(rest.length > 0, '.lbry-card-actions has no rules at all — the layer is gone')

  const hidesWithVisibility = rest.some(([, decl]) => has(decl, 'visibility', 'hidden'))
  assert.ok(
    hidesWithVisibility,
    '.lbry-card-actions no longer hides with visibility. opacity alone leaves five actions per card '
    + 'in the accessibility tree and the tab order at rest — measured as 350 spurious links on a '
    + '70-card grid.',
  )

  const revealed = ALL.some(([prelude, decl]) =>
    parts(prelude).some((s) => s.includes(':focus-within') && revealTarget(s) === '.lbry-card-actions')
    && has(decl, 'visibility', 'visible'))
  assert.ok(
    revealed,
    'no :focus-within rule makes .lbry-card-actions visible — a keyboard user loses the card actions '
    + 'entirely, which is worse than the race this file exists for.',
  )
})

test('a hoverless device gets the card actions without hovering', () => {
  // The hide lives inside @media(hover:hover), so a touch device never hides
  // the layer — and the (hover:none) block takes it off the artefact it covers
  // rather than leaving a permanent overlay. Measured on touch before that
  // change: the overlay covered 85% of the fourth palette stripe.
  const hoverNone = [...CSS.matchAll(/@media\s*\(\s*hover\s*:\s*none\s*\)\s*\{([\s\S]*?)\n\}/g)]
    .map((m) => m[1]).join('\n')
  assert.match(
    hoverNone, /\.lbry-card-actions\{[^}]*position\s*:\s*static/,
    'the touch fallback must drop the actions into the card flow, not pin them over the swatch they act on',
  )

  const hoverHover = [...CSS.matchAll(/@media\s*\(\s*hover\s*:\s*hover\s*\)\s*\{([\s\S]*?)\n\}/g)]
    .map((m) => m[1]).join('\n')
  assert.match(
    hoverHover, /\.lbry-card-actions\{[^}]*visibility\s*:\s*hidden/,
    'the hide-at-rest treatment left @media(hover:hover) — a device that cannot hover would now hide '
    + 'a layer it can never reveal',
  )
})
