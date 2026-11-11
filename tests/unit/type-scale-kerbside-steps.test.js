import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { ladderNote, pageLineSteps, pickSteps, screenCopy, usedStepNames } from '../../src/components/typescale/kerbsideSteps.js'

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

// ── pageLineSteps agrees with the lines KerbsidePage sets ────────────────────
// The dock chip counts lines from pageLineSteps; the page draws them from
// KerbsidePage.jsx. Nothing but this test ties the two together, so it reads the
// JSX the way the page's other source-reading tests do: each <Line step={x}> in
// reading order, the audience it belongs to (Kerbside, the sample screen or
// both), and how many times a .map repeats it. It proves the line structure
// matches; what a line looks like at runtime is the browser specs' job (306).
const KERBSIDE_SRC = fs.readFileSync(path.join(process.cwd(), 'src/components/typescale/KerbsidePage.jsx'), 'utf8')

// The step name each tagged line uses, in reading order, for one audience.
function linesInJsx(src, steps, up, mine) {
  const keys = pickSteps(steps, up)
  const mineAt = src.indexOf('{mine ? (')
  const kerbAt = src.indexOf(') : (', mineAt)
  const spacerAt = src.indexOf('tsk-spacer')
  assert.ok(mineAt > 0 && kerbAt > mineAt && spacerAt > kerbAt, 'KerbsidePage.jsx keeps its mine / Kerbside split and its spacer')

  // How many entries a const array literal holds (one per line that opens a [ or {).
  const entries = (name) => {
    const start = src.indexOf(`const ${name} = [`)
    assert.ok(start >= 0, `${name} is declared in KerbsidePage.jsx`)
    const body = src.slice(start, src.indexOf('\n]', start))
    return body.split('\n').slice(1).filter(l => /^\s+[[{]/.test(l)).length
  }

  const out = []
  for (const m of src.matchAll(/<Line\b[^>]*?\bstep=\{(\w+)\}/g)) {
    const at = m.index
    const lineStart = src.lastIndexOf('\n', at) + 1
    const sameLine = src.slice(lineStart, src.indexOf('\n', at))
    let audience
    if (at < mineAt) audience = sameLine.includes('!mine &&') ? 'kerb' : 'both'
    else if (at < kerbAt) audience = 'mine'
    else if (at < spacerAt) audience = 'kerb'
    else audience = src.slice(spacerAt, at).includes('!mine &&') ? 'kerb' : 'both'
    if (audience === 'mine' && !mine) continue
    if (audience === 'kerb' && mine) continue

    assert.ok(keys[m[1]], `<Line step={${m[1]}}> names a step pickSteps returns`)
    // A Line inside "{NAME.map(... => (" is drawn once per entry of NAME.
    const mapped = [...src.slice(Math.max(0, at - 160), at).matchAll(/\{(\w+)\.map\([^\n]*=> \(\s*$/g)].pop()
    const times = mapped ? entries(mapped[1]) : 1
    for (let i = 0; i < times; i += 1) out.push(keys[m[1]].name)
  }
  return out
}

for (const [up, down] of [[6, 1], [4, 1], [2, 1], [1, 1], [3, 0]]) {
  for (const mine of [false, true]) {
    test(`pageLineSteps matches the lines in KerbsidePage.jsx (${up} up, ${down} down, ${mine ? 'sample screen' : 'Kerbside'})`, () => {
      const steps = scale(up, down)
      assert.deepEqual(pageLineSteps(steps, up, mine), linesInJsx(KERBSIDE_SRC, steps, up, mine))
    })
  }
}

test('a line moved to another step in KerbsidePage.jsx makes pageLineSteps disagree with it', () => {
  const steps = scale(6, 1)
  // Kerbside's footer is set on the caption step; set it on the lede step instead.
  const moved = KERBSIDE_SRC.replace(
    /(<div className="tsk-foot">[\s\S]*?<Line step=\{)caption(\})/,
    '$1lede$2',
  )
  assert.notEqual(moved, KERBSIDE_SRC, 'the mutation found the footer line')
  assert.notDeepEqual(pageLineSteps(steps, 6, false), linesInJsx(moved, steps, 6, false))
  assert.deepEqual(pageLineSteps(steps, 6, true), linesInJsx(moved, steps, 6, true), 'the sample screen has no footer, so it still agrees')
})

test('a line added to KerbsidePage.jsx makes pageLineSteps disagree with it', () => {
  const steps = scale(6, 1)
  const added = KERBSIDE_SRC.replace(
    /(\{OWN_DELIVERIES\.map\()/,
    '<Line step={caption}><p>x</p></Line>\n          $1',
  )
  assert.notEqual(added, KERBSIDE_SRC, 'the mutation found the delivery lines')
  assert.equal(linesInJsx(added, steps, 6, true).length, pageLineSteps(steps, 6, true).length + 1, 'the extra line is counted from the JSX')
  assert.notDeepEqual(pageLineSteps(steps, 6, true), linesInJsx(added, steps, 6, true))
})
