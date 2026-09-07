// C2 — where the sticky section swaps the workbench mode.
//
// FOUNDER REPORT: "it should change when the text is slighly higher on the
// screen maybe just before centre." The panel was swapping when the step's text
// had already reached roughly 86% of viewport height — the bottom seventh of
// the screen — so the reader met the new panel long after they had passed the
// text that explains it.
//
// The old trigger was `start:'top 55%'`. The 55 was never the problem; `top`
// was. A `.hstep` reserves 62vh and centres 317–343px of content inside it, so
// the box's top edge sits ~110px above the text. Keying to the step's own
// `center` puts the trigger on the text instead, because the text is what the
// box centres.
//
// THIS FILE USED TO BE A REGEX OVER THE SOURCE, and it read the two numbers out
// of `/const STEP_SWAP\s*=\s*\{([\s\S]*?)\n\}/`. That could not distinguish the
// value the module exports from a number sitting in a comment beside it, and it
// checked the interpolation `center ${STEP_SWAP.down}%` by matching the
// UNEVALUATED template literal — so it proved the source contained that text,
// never that the string handed to ScrollTrigger says `center 52%`. A typo
// inside the interpolation that still matched the pattern would have shipped.
//
// It now LOADS the module and reads the exports. `stepSwapTrigger()` was added
// alongside STEP_SWAP so the interpolation is a value this test can evaluate
// rather than a shape it has to recognise.
//
// One source assertion is kept, deliberately, at the bottom: that the hook's
// ScrollTrigger.create actually spreads the helper. That is WIRING, and wiring
// is the thing a unit test cannot observe here — a correct helper nobody calls
// is exactly the failure this repository has paid for before.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const SOURCE_PATH = 'src/hooks/useHomeMotion.js'
const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const source = read(SOURCE_PATH)

// ── Loading the module ──────────────────────────────────────────────────────
//
// `node --test` cannot `import` this file: it does `from './useSmoothScroll'`
// with no extension, which Vite resolves and Node does not. That is the real
// reason this file (and its siblings) reached for a regex in the first place.
// The repository's answer is the harness in reduced-motion-resolution.test.js —
// rewrite the imports away and execute the module body in a vm — so this uses
// the same one. gsap and ScrollTrigger never come into it: they arrive through
// a dynamic `import()` INSIDE the effect, which is never run here.
const moduleExports = (() => {
  let out = source

  const rewrite = (re, to, what) => {
    assert.match(out, re,
      `this harness could not find ${what} in ${SOURCE_PATH}. The file was `
      + 'refactored; update the rewrite below so this test keeps executing the real '
      + 'source. Do NOT delete the test.')
    out = out.replace(re, to)
  }

  rewrite(/import \{ useLayoutEffect, useRef \} from 'react'/,
    'const useLayoutEffect = () => {}, useRef = () => ({ current: null })', 'the react import')
  rewrite(/import \{ getLenis \} from '\.\/useSmoothScroll'/,
    'const getLenis = () => null', 'the useSmoothScroll import')

  // Nothing else may be imported: a new static import would be a module this
  // harness silently stubs to `undefined`, and the failure would surface as a
  // confusing TypeError rather than as "update the harness".
  assert.ok(!/^\s*import\s/m.test(out),
    `${SOURCE_PATH} has gained a static import this harness does not stub:\n  `
    + (out.match(/^\s*import\s.*$/m) || [''])[0].trim())

  out = out.replace(/^export /gm, '')
  const body = `(function(){\n${out}\n;return { STEP_SWAP, stepSwapTrigger, useHomeMotion };\n})()`
  return vm.runInNewContext(body, { console }, { filename: SOURCE_PATH })
})()

const { STEP_SWAP, stepSwapTrigger } = moduleExports

test('the module really exports the swap point, so nothing below is vacuous', () => {
  // Positive control. Every assertion in this file reads one of these two
  // exports; if the harness returned an empty object they would all throw
  // rather than pass, but a silently-undefined STEP_SWAP would make the
  // hysteresis comparisons `undefined > undefined` — false, and caught — while
  // `Object.keys` checks would pass on nothing. Pin the shape once, here.
  assert.equal(typeof STEP_SWAP, 'object', 'STEP_SWAP is no longer exported')
  assert.deepEqual(Object.keys(STEP_SWAP).sort(), ['down', 'up'],
    'STEP_SWAP must carry both scroll directions and nothing else')
  assert.equal(typeof stepSwapTrigger, 'function', 'stepSwapTrigger is no longer exported')
})

test('the swap point is one named constant, at the approved 52 / 44', () => {
  assert.equal(STEP_SWAP.down, 52, 'scrolling down, the step takes the panel at 52% of viewport height')
  assert.equal(STEP_SWAP.up, 44, 'scrolling up, it takes the panel back at 44%')
})

test('the two thresholds are hysteresis, and point the right way', () => {
  // down > up is what makes the band a dead zone rather than a hair trigger.
  // Inverted, the two thresholds would overlap and a step sitting on the line
  // would re-fire on every sub-pixel scroll jitter — the flicker the split
  // exists to prevent.
  assert.ok(STEP_SWAP.down > STEP_SWAP.up,
    `the down threshold (${STEP_SWAP.down}) must sit below the up threshold on screen, i.e. be `
    + `the larger percentage, or the band stops being hysteresis and starts being a flicker`)
  assert.ok(STEP_SWAP.down - STEP_SWAP.up >= 4,
    `a ${STEP_SWAP.down - STEP_SWAP.up}-point band is too narrow to absorb scroll jitter`)
})

test('both thresholds stay inside the 44–56 tuning window', () => {
  // Outside this range the swap stops reading as "at, or a hair above, centre"
  // in one direction or the other, which is the founder's actual request.
  for (const name of ['down', 'up']) {
    const value = STEP_SWAP[name]
    assert.ok(value >= 44 && value <= 56,
      `STEP_SWAP.${name} = ${value} is outside the 44–56 window the swap is tuned within`)
  }
})

test('the positions handed to ScrollTrigger are the evaluated strings, keyed to centre', () => {
  // The half the old regex could not reach. This is the actual string
  // ScrollTrigger parses, built by the module rather than recognised in it.
  const { start, end } = stepSwapTrigger()
  assert.equal(start, 'center 52%')
  assert.equal(end, 'center 44%')
})

test('the positions are DERIVED from the constant, not two more literals', () => {
  // The point of the constant is that there is exactly one place to nudge.
  // Evaluate the builder against a mutated constant: if the strings do not
  // follow, the helper has its own hard-coded copy of the numbers and the
  // single source of truth is a fiction.
  //
  // This is the assertion the regex version genuinely could not express. It
  // restores the constant afterwards so test order cannot matter.
  const original = { ...STEP_SWAP }
  try {
    STEP_SWAP.down = 51
    STEP_SWAP.up = 43
    const moved = stepSwapTrigger()
    assert.equal(moved.start, 'center 51%',
      'stepSwapTrigger() does not read STEP_SWAP.down — the swap point is hard-coded twice')
    assert.equal(moved.end, 'center 43%',
      'stepSwapTrigger() does not read STEP_SWAP.up — the swap point is hard-coded twice')
  } finally {
    Object.assign(STEP_SWAP, original)
  }
  // Compared field by field rather than with deepEqual: the object comes back
  // from the vm realm, so its prototype is the sandbox's Object.prototype and
  // deepStrictEqual rejects it on identity while printing two identical objects.
  const restored = stepSwapTrigger()
  assert.equal(restored.start, 'center 52%', 'the constant was not restored')
  assert.equal(restored.end, 'center 44%', 'the constant was not restored')
})

test('no raw percentage or `top`/`bottom` position survives in the builder', () => {
  // Keyed off the VALUES now, not the source: any position the builder can
  // produce must name `center`, and must carry a percentage that came from the
  // constant. `top 55%` was the original bug and it must not come back.
  for (const position of Object.values(stepSwapTrigger())) {
    assert.match(position, /^center \d+%$/,
      `"${position}" is not a centre-keyed position — \`top\`/\`bottom\` was the original bug`)
    const pct = Number(position.match(/(\d+)%/)[1])
    assert.ok(Object.values(STEP_SWAP).includes(pct),
      `"${position}" carries ${pct}, which is not one of the STEP_SWAP thresholds`)
  }
})

// ── The wiring, which is the one thing left that only source can show ───────
test('the step trigger actually installs the builder, and no literals beside it', () => {
  // A correct helper nobody calls is the failure mode this repository has
  // already paid for: reverting one call site left the unit suite fully green
  // while the browser suite went red. Everything above proves the helper; this
  // proves it is the thing ScrollTrigger.create is given.
  //
  // Comments are stripped first. The block above STEP_SWAP quotes "top 55%"
  // and both numbers verbatim, so matching raw source would pass on the prose
  // describing the bug — the vacuous-pass shape this whole change is about.
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const create = /ScrollTrigger\.create\(\{[\s\S]*?\}\)/.exec(stripped)?.[0] || ''
  assert.ok(create, 'the step-sync ScrollTrigger is gone')

  assert.match(create, /\.\.\.stepSwapTrigger\(\)/,
    'ScrollTrigger.create no longer spreads stepSwapTrigger(), so every assertion above '
    + 'is testing a helper the hook does not use')
  assert.ok(!/\bstart:|\bend:/.test(create),
    'a start/end position is back inline in the trigger — it must come from stepSwapTrigger()')
  assert.ok(!/\d+%/.test(create),
    'a hard-coded percentage is back in the step trigger — it must come from STEP_SWAP')

  // Hysteresis is worthless if only one direction fires: scrolling up would
  // stick on the last mode.
  assert.match(create, /onEnter:\s*activate/)
  assert.match(create, /onEnterBack:\s*activate/)
})
