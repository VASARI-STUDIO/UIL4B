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
// These tests read shipped source. They cannot prove the swap FEELS right —
// only a browser and the founder can — so they guard the shape of the thing:
// one named constant, hysteresis in the correct direction, and no raw literals
// creeping back into the handler.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// The comment block above STEP_SWAP quotes the very strings under test
// ("top 55%", the numbers, the word hysteresis). Matching raw source would pass
// on the prose. Strip first, always — same reasoning as hero-entrance.test.js.
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const motion = stripJs(read('src/hooks/useHomeMotion.js'))

function swapConstant() {
  const block = /const STEP_SWAP\s*=\s*\{([\s\S]*?)\n\}/.exec(motion)
  assert.ok(block, 'STEP_SWAP is gone — the swap point must stay one named constant')
  const down = /\bdown\s*:\s*(\d+(?:\.\d+)?)/.exec(block[1])
  const up = /\bup\s*:\s*(\d+(?:\.\d+)?)/.exec(block[1])
  assert.ok(down && up, 'STEP_SWAP must carry both scroll directions')
  return { down: Number(down[1]), up: Number(up[1]) }
}

test('the swap point is one named constant, at the approved 52 / 44', () => {
  const { down, up } = swapConstant()
  assert.equal(down, 52, 'scrolling down, the step takes the panel at 52% of viewport height')
  assert.equal(up, 44, 'scrolling up, it takes the panel back at 44%')
})

test('the two thresholds are hysteresis, and point the right way', () => {
  const { down, up } = swapConstant()
  // down > up is what makes the band a dead zone rather than a hair trigger.
  // Inverted, the two thresholds would overlap and a step sitting on the line
  // would re-fire on every sub-pixel scroll jitter — the flicker the split
  // exists to prevent.
  assert.ok(down > up,
    `the down threshold (${down}) must sit below the up threshold on screen, i.e. be the larger `
    + `percentage, or the band stops being hysteresis and starts being a flicker`)
  assert.ok(down - up >= 4,
    `a ${down - up}-point band is too narrow to absorb scroll jitter`)
})

test('both thresholds stay inside the 44–56 tuning window', () => {
  // Outside this range the swap stops reading as "at, or a hair above, centre"
  // in one direction or the other, which is the founder's actual request.
  const { down, up } = swapConstant()
  for (const [name, value] of [['down', down], ['up', up]]) {
    assert.ok(value >= 44 && value <= 56,
      `STEP_SWAP.${name} = ${value} is outside the 44–56 window the swap is tuned within`)
  }
})

test('the trigger is keyed to the step centre, not its top', () => {
  const create = /ScrollTrigger\.create\(\{[\s\S]*?\}\)/.exec(motion)?.[0] || ''
  assert.ok(create, 'the step-sync ScrollTrigger is gone')
  assert.match(create, /start:\s*`center \$\{STEP_SWAP\.down\}%`/,
    'start must read the constant and must key to `center` — `top` is the original bug')
  assert.match(create, /end:\s*`center \$\{STEP_SWAP\.up\}%`/,
    'end must read the constant and key to `center`')
  assert.ok(!/\b(top|bottom) \d+%/.test(create),
    'a raw `top N%` / `bottom N%` position is back in the step trigger')
})

test('no loose percentage literal survives in the handler', () => {
  // The point of the constant is that there is exactly one place to nudge. A
  // second copy of 52 or 44 in the trigger is how that stops being true.
  const create = /ScrollTrigger\.create\(\{[\s\S]*?\}\)/.exec(motion)?.[0] || ''
  assert.ok(!/\d+%/.test(create),
    'a hard-coded percentage is back in the step trigger — it must come from STEP_SWAP')
})

test('both scroll directions still activate, and the pin still wins', () => {
  // Hysteresis is worthless if only one direction fires: scrolling up would
  // stick on the last mode. And once the visitor drives the tablist themselves,
  // scroll must stop overriding them.
  const create = /ScrollTrigger\.create\(\{[\s\S]*?\}\)/.exec(motion)?.[0] || ''
  assert.match(create, /onEnter:\s*activate/)
  assert.match(create, /onEnterBack:\s*activate/)
})
