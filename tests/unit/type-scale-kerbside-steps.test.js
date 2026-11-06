import assert from 'node:assert/strict'
import test from 'node:test'
import { ladderNote, pickSteps, screenCopy, usedStepNames } from '../../src/components/typescale/kerbsideSteps.js'

// A scale from `up` steps above the base down to `down` below it, largest first,
// as the page builds it (names are the exponent here, which is all these read).
const scale = (up, down) => {
  const out = []
  for (let exp = up; exp >= -down; exp -= 1) out.push({ exp, name: `s${exp}` })
  return out
}

test('a full scale gives each line of the page its own step', () => {
  const p = pickSteps(scale(6, 1), 6)
  assert.deepEqual(
    [p.eta, p.head, p.stat, p.lede, p.base, p.caption].map(s => s.exp),
    [4, 3, 2, 1, 0, -1],
  )
})

test('a short scale reuses its top step for the lines above it', () => {
  const steps = scale(2, 1)
  const p = pickSteps(steps, 2)
  assert.equal(p.eta.exp, 2, 'the time line falls back to the top step')
  assert.equal(p.head.exp, 2)
  assert.equal(p.stat.exp, 2)
  assert.equal(p.lede.exp, 1)
  assert.equal(p.base.exp, 0)
})

test('with no step below the base the caption falls back to the bottom step', () => {
  const steps = scale(3, 0)
  assert.equal(pickSteps(steps, 3).caption.exp, 0)
})

test('the big time line is lit on the Kerbside screen only', () => {
  const steps = scale(6, 1)
  const eta = pickSteps(steps, 6).eta.name
  assert.ok(usedStepNames(steps, 6, false).has(eta), 'Kerbside sets the time line')
  assert.ok(!usedStepNames(steps, 6, true).has(eta), 'the sample screen has no time line')
})

test('a step above the screen is reported as not used', () => {
  const steps = scale(6, 1)
  const used = usedStepNames(steps, 6, false)
  assert.equal(used.size, 6)
  assert.ok(!used.has('s6'), 's6 is above anything the page sets')
  assert.ok(!used.has('s5'))
})

test('the ladder note names an unused step, and otherwise asks for a press', () => {
  const steps = scale(6, 1)
  assert.equal(ladderNote(steps, 6, false, 's6'), 's6 isn’t used on this screen.')
  assert.equal(ladderNote(steps, 6, false, 's2'), 'Press a step to see where it’s used.')
  assert.equal(ladderNote(steps, 6, false, ''), 'Press a step to see where it’s used.')
  // s4 is Kerbside's time line, so it is used there and not on the sample screen.
  assert.equal(ladderNote(steps, 6, false, 's4'), 'Press a step to see where it’s used.')
  assert.equal(ladderNote(steps, 6, true, 's4'), 's4 isn’t used on this screen.')
})

test('Kerbside names its own screen and the sample screen says Sample content', () => {
  const kerb = screenCopy(false)
  assert.equal(kerb.brand, 'Kerbside')
  assert.equal(kerb.caption, null)
  assert.match(kerb.label, /^Kerbside/)
  const own = screenCopy(true)
  assert.equal(own.caption, 'Sample content')
  assert.equal(own.brand, null)
  assert.doesNotMatch(own.label, /Kerbside/)
})
