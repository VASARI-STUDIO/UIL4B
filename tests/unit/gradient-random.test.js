// The gradient randomiser's weighting and its quality rules.
//
// Random is a two-colour, mostly linear tool. The distributions are asserted by
// sampling the whole roll space on a fine grid (the pickers take the roll as an
// argument), and the colour rules by a seeded run of `rollGradient`, so nothing
// here depends on Math.random and nothing is flaky.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  GRAD_TYPE_WEIGHTS, TWO_STOP_SHARE, MIN_MIDPOINT_CHROMA,
  weightedPick, pickGradientType, pickStopCount, pickHarmony, pickTone,
  mulberry32, rollGradient, radialGatePasses, pickFromPool, pickPaletteLook,
} from '../../src/utils/gradientRandom.js'
import { hexToOklchRaw } from '../../src/components/tool/oklch.js'
import { nextSelection, rangeBetween, modeFor } from '../../src/hooks/useShiftSelect.js'

const GRID = 100000
const rolls = Array.from({ length: GRID }, (_, i) => i / GRID)
const shareOf = (fn, value) => rolls.filter((r) => fn(r) === value).length / GRID
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`)

test('type weights are Linear 80, Radial 15, Conic 5, and every type can still appear', () => {
  near(shareOf(pickGradientType, 'Linear'), 0.8, 0.001, 'linear')
  near(shareOf(pickGradientType, 'Radial'), 0.15, 0.001, 'radial')
  near(shareOf(pickGradientType, 'Conic'), 0.05, 0.001, 'conic')
  for (const [type] of GRAD_TYPE_WEIGHTS) assert.ok(shareOf(pickGradientType, type) > 0)
})

test('the stop count is only ever 2 or 3, two at 75%', () => {
  near(shareOf(pickStopCount, 2), TWO_STOP_SHARE, 0.001, 'two-stop')
  near(shareOf(pickStopCount, 2) + shareOf(pickStopCount, 3), 1, 1e-9, 'sum')
  near(TWO_STOP_SHARE, 0.75, 1e-9, 'declared share')
})

test('a two-stop linear is 60% of rolls before the quality gate', () => {
  near(shareOf(pickGradientType, 'Linear') * shareOf(pickStopCount, 2), 0.6, 0.001, 'two-stop linear')
})

test('harmony is 60/25/15 and tone is 70/15/15', () => {
  near(shareOf(pickHarmony, 'Analogous'), 0.6, 0.001, 'analogous')
  near(shareOf(pickHarmony, 'Monochrome'), 0.25, 0.001, 'monochrome')
  near(shareOf(pickHarmony, 'Complementary'), 0.15, 0.001, 'complementary')
  near(shareOf(pickTone, 'Clear'), 0.7, 0.001, 'clear')
  near(shareOf(pickTone, 'Muted'), 0.15, 0.001, 'muted')
  near(shareOf(pickTone, 'Deep'), 0.15, 0.001, 'deep')
})

test('weightedPick lands in the right band and never returns undefined', () => {
  const w = [['a', 2], ['b', 1], ['c', 1]]
  assert.equal(weightedPick(w, 0), 'a')
  assert.equal(weightedPick(w, 0.5), 'b')
  assert.equal(weightedPick(w, 0.75), 'c')
  for (const roll of [1, 1.5, -0.2, Number.EPSILON]) assert.ok(weightedPick(w, roll) !== undefined)
})

// ── Seeded runs of the whole roll ────────────────────────────────────────────
const RUNS = 6000
const seeded = Array.from({ length: RUNS }, (_, i) => rollGradient(mulberry32(1000 + i)))
const oklchOf = (hex) => hexToOklchRaw(hex)

test('the default roll is Plain, 2-3 stops, and two-stop linear is the single biggest share', () => {
  assert.ok(seeded.every((g) => g.style === 'Plain'))
  assert.ok(seeded.every((g) => g.stops.length === 2 || g.stops.length === 3))
  const twoLinear = seeded.filter((g) => g.type === 'Linear' && g.stops.length === 2).length / RUNS
  assert.ok(twoLinear >= 0.55, `two-stop linear share ${twoLinear}`)
  const linear = seeded.filter((g) => g.type === 'Linear').length / RUNS
  // The type is drawn once per press, so the weights hold; the gate adds to Linear and the pick among eight can nudge it.
  assert.ok(linear >= 0.78, `linear share ${linear}`)
  const radial = seeded.filter((g) => g.type === 'Radial').length / RUNS
  assert.ok(radial <= 0.15 + 0.02, `radial share ${radial}`)
})

test('no ramp has a grey or muddy midpoint, and every end is in a sensible lightness range', () => {
  for (const g of seeded) {
    if (g.type === 'Conic') continue
    const a = oklchOf(g.stops[0].color)
    const b = oklchOf(g.stops[g.stops.length - 1].color)
    const midChroma = (a[1] + b[1]) / 2
    assert.ok(midChroma >= MIN_MIDPOINT_CHROMA - 0.005, `midpoint chroma ${midChroma} in ${g.stops.map((s) => s.color)}`)
    for (const c of [a, b]) {
      assert.ok(c[0] >= 0.04 && c[0] <= 0.93, `lightness ${c[0]}`)
    }
    // The two ends differ in chroma by at most 0.08 (one does not shout over the other).
    assert.ok(Math.abs(a[1] - b[1]) <= 0.08 + 0.01, `chroma gap ${Math.abs(a[1] - b[1])}`)
  }
})

test('a complementary pair has a real value step', () => {
  for (const g of seeded.filter((x) => x.harmony === 'Complementary' && x.type !== 'Conic')) {
    const a = oklchOf(g.stops[0].color)
    const b = oklchOf(g.stops[g.stops.length - 1].color)
    assert.ok(Math.abs(a[0] - b[0]) >= 0.1, `lightness gap ${Math.abs(a[0] - b[0])}`)
  }
})

test('a conic gradient has three or more stops and closes its seam', () => {
  const conics = seeded.filter((g) => g.type === 'Conic')
  assert.ok(conics.length > 0)
  for (const g of conics) {
    assert.ok(g.stops.length >= 3)
    assert.equal(g.stops[g.stops.length - 1].color, g.stops[0].color)
    assert.equal(g.stops[g.stops.length - 1].position, 100)
  }
})

test('filters: a Radial-only filter is always radial, a Linear+Conic filter never radial, counts follow the filter', () => {
  const only = Array.from({ length: 800 }, (_, i) => rollGradient(mulberry32(i), { types: ['Radial'] }))
  assert.ok(only.every((g) => g.type === 'Radial'))
  const two = Array.from({ length: 800 }, (_, i) => rollGradient(mulberry32(i + 9), { types: ['Linear', 'Conic'] }))
  assert.ok(two.every((g) => g.type === 'Linear' || g.type === 'Conic'))
  assert.ok(two.filter((g) => g.type === 'Conic').length > 200)
  const five = Array.from({ length: 200 }, (_, i) => rollGradient(mulberry32(i + 5), { types: ['Linear'], counts: [5] }))
  assert.ok(five.every((g) => g.stops.length === 5))
})

test('a filter without Linear never gets Linear, even when the radial gate fails every try', () => {
  // Radial + Conic: a roll that cannot find a pair reading as a light or a vignette keeps Radial.
  const seen = new Set()
  let keptFailing = 0
  for (let i = 0; i < 3000; i++) {
    const g = rollGradient(mulberry32(i), { types: ['Radial', 'Conic'] })
    assert.notEqual(g.type, 'Linear', `seed ${i} came back Linear`)
    seen.add(g.type)
    if (g.type === 'Radial') {
      const a = hexToOklchRaw(g.stops[0].color)
      const b = hexToOklchRaw(g.stops[g.stops.length - 1].color)
      if (!radialGatePasses({ L: a[0], C: a[1] }, { L: b[0], C: b[1] })) keptFailing++
    }
  }
  assert.deepEqual([...seen].sort(), ['Conic', 'Radial'], 'both allowed types still come up')
  // The control: some seeds do run out of tries, so the fallback path is what was exercised.
  assert.ok(keptFailing > 0, 'no Radial roll failed the gate, so the old Linear fallback was never reached')
})

test('the radial gate accepts a light centre or a dark vignette and rejects a flat pair', () => {
  assert.ok(radialGatePasses({ L: 0.85, C: 0.1 }, { L: 0.6, C: 0.1 }))
  assert.ok(radialGatePasses({ L: 0.3, C: 0.1 }, { L: 0.5, C: 0.1 }))
  assert.ok(!radialGatePasses({ L: 0.6, C: 0.1 }, { L: 0.62, C: 0.1 }))
  assert.ok(!radialGatePasses({ L: 0.85, C: 0.02 }, { L: 0.7, C: 0.02 }), 'a light centre with no colour and a small step')
})

test('the same seed always gives the same gradient', () => {
  assert.deepEqual(rollGradient(mulberry32(42)), rollGradient(mulberry32(42)))
})

test('Shuffle from palette returns the count asked for, from the pool', () => {
  const pool = ['#2F6BFF', '#8B5CF0', '#E0784E', '#3FAFA0']
  for (let i = 0; i < 100; i++) {
    const pick = pickFromPool(pool, 3, mulberry32(i))
    assert.equal(pick.length, 3)
    assert.ok(pick.every((c) => pool.includes(c)))
  }
})

// ── The multi-select rules (useShiftSelect) ──────────────────────────────────
test('a plain press replaces the selection, a toggle adds and removes', () => {
  assert.deepEqual(nextSelection(['Linear'], 'Radial', { mode: 'only', any: 'Any' }), ['Radial'])
  assert.deepEqual(nextSelection(['Linear'], 'Radial', { mode: 'toggle', any: 'Any' }), ['Linear', 'Radial'])
  assert.deepEqual(nextSelection(['Linear', 'Radial'], 'Linear', { mode: 'toggle', any: 'Any' }), ['Radial'])
})

test('Any is exclusive, and an empty set returns to Any (or to Plain for Style)', () => {
  assert.deepEqual(nextSelection(['Linear', 'Radial'], 'Any', { mode: 'toggle', any: 'Any' }), ['Any'])
  assert.deepEqual(nextSelection(['Any'], 'Radial', { mode: 'toggle', any: 'Any' }), ['Radial'])
  assert.deepEqual(nextSelection(['Radial'], 'Radial', { mode: 'toggle', any: 'Any' }), ['Any'])
  assert.deepEqual(nextSelection(['Mesh'], 'Mesh', { mode: 'toggle', any: null, fallback: 'Plain' }), ['Plain'])
})

test('a range runs in position order and a touch press always toggles', () => {
  assert.deepEqual(rangeBetween([3, 0, 2, 1], 0, 1), [0, 2, 1])
  assert.deepEqual(rangeBetween([3, 0, 2, 1], 1, 0), [0, 2, 1])
  assert.equal(modeFor({ shiftKey: false }, true), 'toggle')
  assert.equal(modeFor({ shiftKey: false }, false), 'only')
  assert.equal(modeFor({ metaKey: true }, false), 'toggle')
})

// ── Shuffle from palette: the gate and the seam run on the colours drawn ────
// Hand-picked pools. Black and white differ by L ~1.0 (a vignette either way
// round); two near-identical blues differ by ~0.02 L and ~0 hue, so no ordering
// of them reads as a light or a vignette.
const LIGHT_DARK = ['#0B0C0E', '#F7F7F4']
const FLAT = ['#2F6BFF', '#3270FF']
const MIXED = ['#2F6BFF', '#3270FF', '#2D68FA', '#3571FF', '#F7F7F4'] // four flat blues and a white
const FOUR = ['#2F6BFF', '#8B5CF0', '#E0784E', '#3FAFA0']
const endsGate = (colours) => {
  const a = hexToOklchRaw(colours[0])
  const b = hexToOklchRaw(colours[colours.length - 1])
  return radialGatePasses({ L: a[0], C: a[1] }, { L: b[0], C: b[1] })
}
const gapOf = (colours) => Math.abs(hexToOklchRaw(colours[0])[0] - hexToOklchRaw(colours[colours.length - 1])[0])

test('palette look: the sample pools really are a gate pass and a gate fail', () => {
  assert.ok(endsGate(LIGHT_DARK) && endsGate([...LIGHT_DARK].reverse()), 'black and white read either way round')
  assert.ok(!endsGate(FLAT) && !endsGate([...FLAT].reverse()), 'two near-identical blues never read')
})

test('palette look: Radial stays Radial when the drawn colours pass the gate', () => {
  for (let i = 0; i < 200; i++) {
    const { type, colours } = pickPaletteLook(LIGHT_DARK, 2, 'Radial', [], mulberry32(i))
    assert.equal(type, 'Radial', `seed ${i}`)
    assert.ok(endsGate(colours))
  }
})

test('palette look: Radial colours that cannot pass the gate become Linear when Linear is allowed', () => {
  for (const types of [[], ['Linear', 'Radial']]) {
    for (let i = 0; i < 100; i++) {
      const { type, colours } = pickPaletteLook(FLAT, 2, 'Radial', types, mulberry32(i))
      assert.equal(type, 'Linear', `types ${JSON.stringify(types)} seed ${i}`)
      assert.deepEqual([...colours].sort(), FLAT.map((c) => c.toUpperCase()).sort())
    }
  }
})

test('palette look: never a type outside the filter, even when no draw passes the radial gate', () => {
  for (const [type, types] of [['Radial', ['Radial']], ['Radial', ['Radial', 'Conic']], ['Conic', ['Radial', 'Conic']]]) {
    for (let i = 0; i < 300; i++) {
      for (const pool of [FLAT, MIXED, FOUR, LIGHT_DARK]) {
        const out = pickPaletteLook(pool, i % 2 ? 2 : 3, type, types, mulberry32(i))
        assert.equal(out.type, type, `${type} in ${JSON.stringify(types)} came back ${out.type} (seed ${i})`)
      }
    }
  }
})

test('palette look: the radial gate is judged on the drawn palette colours, and a pass is never thrown away', () => {
  // Pool of four: only the pairs that include black or white pass. Whatever comes
  // back as Radial must pass on its own ends; redrawing rescues most rolls.
  let radial = 0
  let linear = 0
  for (let i = 0; i < 600; i++) {
    const { type, colours } = pickPaletteLook(MIXED, 3, 'Radial', [], mulberry32(i))
    if (type === 'Radial') { radial++; assert.ok(endsGate(colours), `seed ${i}: Radial that fails the gate on ${colours}`) }
    else { linear++; assert.equal(type, 'Linear') }
  }
  assert.ok(radial > linear, `three redraws should rescue most rolls (${radial} Radial, ${linear} Linear)`)
  assert.ok(linear > 0, 'and a few seeds do run out of tries')
})

test('palette look: with Linear filtered out and no pass found, the widest lightness gap stands', () => {
  // The first draw of a seed is what pickFromPool gives with the same seed.
  let outOfTries = 0
  for (let i = 0; i < 300; i++) {
    const first = pickFromPool(MIXED, 3, mulberry32(i))
    const { type, colours } = pickPaletteLook(MIXED, 3, 'Radial', ['Radial'], mulberry32(i))
    assert.equal(type, 'Radial')
    if (!endsGate(colours)) outOfTries++
    assert.ok(endsGate(colours) || gapOf(colours) >= gapOf(first) - 1e-9, `seed ${i}: ${colours} is a narrower gap than the first draw ${first}`)
  }
  assert.ok(outOfTries > 0, 'some seeds must run out of tries, or the widest-gap rule was never reached')
})

test('palette look: Conic with three or more pool colours ends on its first colour', () => {
  for (const count of [3, 4, 5]) {
    for (let i = 0; i < 200; i++) {
      const { type, colours } = pickPaletteLook(FOUR, count, 'Conic', [], mulberry32(i))
      assert.equal(type, 'Conic')
      assert.equal(colours.length, count)
      assert.equal(colours[count - 1], colours[0], `${count} stops, seed ${i}: the seam is open on ${colours}`)
      assert.ok(colours.every((c) => FOUR.includes(c)))
    }
  }
  // Only the last colour is rewritten: the ones before it are the draw's own.
  const drawn = pickFromPool(FOUR, 5, mulberry32(7))
  const closed = pickPaletteLook(FOUR, 5, 'Conic', [], mulberry32(7)).colours
  assert.deepEqual(closed.slice(0, 4), drawn.slice(0, 4))
})

test('palette look: a conic roll of two pool colours is left as drawn, and Linear is untouched', () => {
  for (let i = 0; i < 50; i++) {
    assert.deepEqual(pickPaletteLook(FLAT, 4, 'Conic', [], mulberry32(i)).colours, pickFromPool(FLAT, 4, mulberry32(i)))
    const lin = pickPaletteLook(FOUR, 4, 'Linear', [], mulberry32(i))
    assert.equal(lin.type, 'Linear')
    assert.deepEqual(lin.colours, pickFromPool(FOUR, 4, mulberry32(i)))
  }
})

// Wiring: the page rolls through rollGradient, not its own uniform pick.
test('GradientGenerator rolls through the weighted engine', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/pages/GradientGenerator.jsx'), 'utf8')
    .replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  assert.match(src, /rollGradient\(/, 'Random no longer uses the quality engine')
  assert.doesNotMatch(src, /GRAD_TYPES\[Math\.floor\(Math\.random\(\)/)
  assert.doesNotMatch(src, /Math\.random\(\) \* 0xffffff/, 'random hex colours are back')
})

// ── Random v2 (spec gradient-generation-v2 §3): drawn interpolation, narrowed ranges, best of eight ──
// Mutations that make these fail:
//   STANDARD_SHARE 0.3 -> 0.6, or the standardStaysClean call dropped from drawSpace -> "Standard share ..."
//   the complementary guard dropped from drawSpace AND the check dropped              -> "never Standard on a complementary pair"
//   rollCandidate ignores locks.space                                                 -> "a locked interpolation ..."
//   TONE_RANGES.Clear C cap back to 0.20                                              -> "chroma never above 0.17 ..."
//   clearMud / the MUD_TRIES loop removed                                             -> "the mud zone is never produced"
//   ANCHOR_SHARE 0.5 -> 0                                                             -> "anchor"
//   rollPositions always [0, 100] / [0, 50, 100]                                      -> "positions"
//   withStopLocks returns the candidate unchanged                                     -> "stop locks survive ..."
//   chooseAmongTop picks the worst of the three, or TOP_PICKS = 8                     -> "best of eight ..."
//   the notSeen weight set to 0 (or `recent` not passed to scoreContext)              -> "not seen ..."
import {
  rollCandidate, rollCandidates, drawSpace, inMudZone, rollPositions, STANDARD_SHARE,
} from '../../src/utils/gradientRandom.js'
import { standardStaysClean, endsOf, scoreGradient, pushRecent, labEnds } from '../../src/utils/gradientScore.js'
import { deltaE2000 } from '../../src/utils/nearestMatch.js'

const V2 = Array.from({ length: 2000 }, (_, i) => rollGradient(mulberry32(5000 + i)))
const lchOf = (g) => g.stops.map((s) => hexToOklchRaw(s.color))

test('Standard share is at most 30%, and Standard really is drawn', () => {
  const share = V2.filter((g) => g.space === 'srgb').length / V2.length
  // The spec's 30% as a literal, not the exported constant: a constant raised to 0.6 must fail here.
  assert.ok(share <= 0.3, `Standard share ${share}`)
  assert.equal(STANDARD_SHARE, 0.3)
  assert.ok(share >= 0.1, `Standard share ${share}: Standard is never drawn`)
  assert.ok(V2.every((g) => g.space === 'srgb' || g.space === 'oklch'))
})

test('Standard is only used where the middle stays clean, and the check is what holds it back', () => {
  for (const g of V2) if (g.space === 'srgb') assert.ok(standardStaysClean(g.stops), `Standard on ${g.stops.map((s) => s.color)}`)
  // Control: ask for Standard on every roll. Some are refused, so the check is doing work.
  const asked = V2.map((g) => drawSpace(g, 0, g.harmony === 'Complementary'))
  assert.ok(asked.filter((s) => s === 'oklch').length > 100 && asked.filter((s) => s === 'srgb').length > 100)
})

test('never Standard on a complementary pair', () => {
  const comp = V2.filter((g) => g.harmony === 'Complementary')
  assert.ok(comp.length > 100)
  assert.ok(comp.every((g) => g.space === 'oklch'))
  for (const g of comp) assert.equal(drawSpace(g, 0, true), 'oklch')
})

test('a locked interpolation keeps the person\'s choice, even where Standard would be refused', () => {
  for (const space of ['srgb', 'oklch']) {
    for (let i = 0; i < 500; i++) {
      assert.equal(rollGradient(mulberry32(i), { locks: { space } }).space, space)
      assert.equal(rollCandidate(mulberry32(i), { locks: { space } }).space, space)
    }
  }
})

test('the mud zone is never produced, and its edges are where the spec puts them', () => {
  assert.ok(inMudZone({ L: 0.54, C: 0.05, H: 85 }) && inMudZone({ L: 0.3, C: 0.1, H: 135 }))
  assert.ok(!inMudZone({ L: 0.54, C: 0.05, H: 84.9 }) && !inMudZone({ L: 0.54, C: 0.05, H: 135.1 }))
  assert.ok(!inMudZone({ L: 0.55, C: 0.05, H: 100 }) && !inMudZone({ L: 0.4, C: 0.04, H: 100 }))
  for (const g of V2) for (const [L, C, H] of lchOf(g)) assert.ok(!inMudZone({ L, C, H }), `mud ${L} ${C} ${H}`)
  const cands = Array.from({ length: 400 }, (_, i) => rollCandidate(mulberry32(i)))
  assert.ok(cands.every((g) => lchOf(g).every(([L, C, H]) => !inMudZone({ L, C, H }))))
})

test('a draw that lands in the mud zone on every retry is drained of colour, not shipped', () => {
  // A constant rand repeats the same draw on all six tries, so only the drain after the
  // retries can keep it out of the zone. Without the drain, 16% of these 1000 draws are mud.
  for (let k = 0; k < 1000; k++) {
    const v = k / 1000
    const g = rollCandidate(() => v)
    for (const [L, C, H] of lchOf(g)) assert.ok(!inMudZone({ L, C, H }), `mud at constant rand ${v}: ${L} ${C} ${H}`)
  }
})

test('chroma never goes above 0.17 in clear tones (hex rounding allows 0.002)', () => {
  const clear = V2.filter((g) => g.tone === 'Clear')
  assert.ok(clear.length > 1000)
  let top = 0
  for (const g of clear) for (const c of lchOf(g)) top = Math.max(top, c[1])
  assert.ok(top <= 0.172, `top clear chroma ${top}`)
  assert.ok(top >= 0.12, `top clear chroma ${top}: clear tones never reach their range`)
})

test('anchor: at least half the candidates have a dark or a light end, and the shipped ones too', () => {
  const anchored = (g) => endsOf(g).map(hexToOklchRaw).some((c) => c[0] <= 0.28 || c[0] >= 0.88)
  const cands = Array.from({ length: 1000 }, (_, i) => rollCandidate(mulberry32(i)))
  assert.ok(cands.filter(anchored).length / 1000 >= 0.55, 'forced in half, plus those that land there')
  assert.ok(V2.filter(anchored).length / V2.length >= 0.5)
})

test('positions: two stops at 0/100 or 8/92 (about 30% soft), three stops with the middle at 45, 55 or 62', () => {
  const two = Array.from({ length: 2000 }, (_, i) => rollPositions(2, mulberry32(i)))
  assert.ok(two.every((p) => (p[0] === 0 && p[1] === 100) || (p[0] === 8 && p[1] === 92)))
  const soft = two.filter((p) => p[0] === 8).length / 2000
  assert.ok(Math.abs(soft - 0.3) < 0.04, `soft ends ${soft}`)
  const mids = new Set(Array.from({ length: 300 }, (_, i) => rollPositions(3, mulberry32(i))[1]))
  assert.deepEqual([...mids].sort((a, b) => a - b), [45, 55, 62])
  for (const g of V2.filter((x) => x.type === 'Conic')) assert.equal(g.stops[g.stops.length - 1].position, 100)
})

test('stop locks survive best of eight: colour, position, type, angle and interpolation', () => {
  const stops = [
    { color: '#336699', position: 0, lockColour: true, lockPosition: false },
    { color: '#AABBCC', position: 30, lockColour: false, lockPosition: true },
    { color: '#112233', position: 100, lockColour: false, lockPosition: false },
  ]
  const filters = { stops, counts: [3], locks: { type: 'Radial', angle: 77, space: 'srgb' } }
  const seen = new Set()
  for (let i = 0; i < 300; i++) {
    for (const c of rollCandidates(mulberry32(i), filters)) {
      assert.equal(c.g.stops[0].color, '#336699', 'colour lock on every candidate, before scoring')
      assert.equal(c.g.stops[1].position, 30, 'position lock on every candidate')
    }
    const g = rollGradient(mulberry32(i), filters)
    assert.equal(g.stops.length, 3)
    assert.equal(g.stops[0].color, '#336699')
    assert.equal(g.stops[1].position, 30)
    assert.equal(g.stops[0].lockColour, true)
    assert.equal(g.type, 'Radial')
    assert.equal(g.angle, 77)
    assert.equal(g.space, 'srgb')
    seen.add(g.stops[1].color)
  }
  assert.ok(seen.size > 100, 'the position-locked stop still gets a new colour each time')
})

test('best of eight: the shipped gradient scores above the average candidate, for Random and for the palette', () => {
  const pool = ['#2F6BFF', '#8B5CF0', '#E0784E', '#3FAFA0', '#0B0C0E', '#F7F7F4']
  for (const extra of [{}, { palette: pool }]) {
    let shipped = 0
    let single = 0
    for (let i = 0; i < 300; i++) {
      shipped += scoreGradient(rollGradient(mulberry32(100 + i), extra)).total
      single += scoreGradient(rollCandidate(mulberry32(8000 + i), extra)).total
    }
    assert.ok(shipped / 300 > single / 300 + 0.03, `${Object.keys(extra)}: shipped ${shipped / 300} vs single ${single / 300}`)
  }
  // Eight candidates are scored per press.
  assert.equal(rollCandidates(mulberry32(1)).length, 8)
})

test('palette picks stay inside the pool', () => {
  const pool = ['#2F6BFF', '#8B5CF0', '#E0784E', '#3FAFA0']
  for (let i = 0; i < 200; i++) assert.ok(rollGradient(mulberry32(i), { palette: pool }).stops.every((s) => pool.includes(s.color)))
})

test('not seen: remembering the last ten results moves rolls away from them', () => {
  const farShare = (useMemory) => {
    let far = 0
    let total = 0
    for (let s = 0; s < 40; s++) {
      const m = mulberry32(100 + s)
      let recent = []
      for (let i = 0; i < 60; i++) {
        const r = rollGradient(m, { recent: useMemory ? recent : [] })
        if (i >= 10) {
          const me = labEnds([endsOf(r)])[0]
          const dist = (o) => Math.min((deltaE2000(me[0], o[0]) + deltaE2000(me[1], o[1])) / 2, (deltaE2000(me[0], o[1]) + deltaE2000(me[1], o[0])) / 2)
          total++
          if (labEnds(recent).every((o) => dist(o) >= 12)) far++
        }
        recent = pushRecent(recent, r)
      }
    }
    return far / total
  }
  const withMemory = farShare(true)
  const without = farShare(false)
  assert.ok(withMemory > without + 0.02, `with memory ${withMemory}, without ${without}`)
})

test('best of eight is quick: eight candidates, scored, under 2ms on average', (t) => {
  const rand = mulberry32(77)
  for (let i = 0; i < 300; i++) rollGradient(rand) // warm up the JIT
  const start = performance.now()
  const N = 1500
  for (let i = 0; i < N; i++) rollGradient(rand)
  const avg = (performance.now() - start) / N
  t.diagnostic(`best of eight: ${avg.toFixed(3)} ms per press`)
  assert.ok(avg < 2, `${avg} ms`)
})

// Wiring: the page applies the rolled interpolation and offers its lock.
test('GradientGenerator applies the rolled space and shows the interpolation lock', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/pages/GradientGenerator.jsx'), 'utf8')
    .replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  assert.match(src, /setSpace\(g\.space\)/, 'a roll no longer sets the interpolation')
  assert.match(src, /const RANDOM_DRAWS_SPACE = true/)
})

// ── Fix round 1: the space is drawn on the ramp that ships ───────────────────
// Mutation: rollCandidate calls drawSpace before withStopLocks (the old order)  -> "Standard on a locked ramp ..."
// Mutation: endsOfRamp keeps the seam stop for Conic (ends = first + last)       -> "Conic ends ..."
import { hueGap, endsOfRamp } from '../../src/utils/gradientScore.js'

test('Standard on a locked ramp still keeps the middle clean and stays under 140 degrees of hue gap', () => {
  const stops = [
    { color: '#E03030', position: 0, lockColour: true, lockPosition: false },
    { color: '#336699', position: 100, lockColour: false, lockPosition: false },
  ]
  let standard = 0
  for (let i = 0; i < 2000; i++) {
    const g = rollGradient(mulberry32(9000 + i), { stops })
    assert.equal(g.stops.find((s) => s.lockColour).color, '#E03030')
    if (g.space !== 'srgb') continue
    standard++
    assert.ok(standardStaysClean(g.stops), `Standard, dirty middle: ${g.stops.map((s) => s.color)}`)
    const [a, b] = endsOf(g).map(hexToOklchRaw)
    assert.ok(hueGap(a, b) < 140, `Standard on a ${hueGap(a, b)} degree gap: ${g.stops.map((s) => s.color)}`)
  }
  assert.ok(standard > 100, `Standard was drawn only ${standard} times: the test checks nothing`)
})

test('Conic ends are scored on the first stop and the stop before the seam', () => {
  const A = '#1A2A6C'
  const B = '#F5E27A'
  const conic = { type: 'Conic', space: 'oklch', stops: [{ color: A, position: 0 }, { color: B, position: 50 }, { color: A, position: 100 }] }
  assert.deepEqual(endsOf(conic), [A, B])
  assert.deepEqual(endsOfRamp(conic.stops, 'Conic'), [A, B])
  // The ends drive the pair terms, so the conic scores like the open A-to-B ramp, not like A-to-A.
  const open = { type: 'Linear', space: 'oklch', stops: [{ color: A, position: 0 }, { color: B, position: 100 }] }
  const c = scoreGradient(conic).terms
  const l = scoreGradient(open).terms
  for (const k of ['valueStep', 'chromaBalance', 'hueRelation', 'anchor', 'notSeen']) assert.equal(c[k], l[k], k)
  assert.ok(c.valueStep > 0, 'a dark-to-light pair has a value step; A-to-A would have none')
})

// ── The type deck (spec gradient-overhaul §8) ───────────────────────────────
import { drawFromDeck, TYPE_DECK, HUE_RULES, TONE_RULES, USE_RULES, hueInArc } from '../../src/utils/gradientRandom.js'
import { GRADIENT_TAGS } from '../../src/data/gradientGallery.js'
import { inkContrasts } from '../../src/utils/gradientScore.js'

test('the deck is 16 Linear, 3 Radial and 1 Conic', () => {
  const count = (t) => TYPE_DECK.filter((x) => x === t).length
  assert.deepEqual([TYPE_DECK.length, count('Linear'), count('Radial'), count('Conic')], [20, 16, 3, 1])
})

test('the deck shows every type within 20 draws, and 40 draws keep the 80/15/5 counts exactly', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const rand = mulberry32(seed)
    const deck = []
    const drawn = Array.from({ length: 40 }, () => drawFromDeck(deck, rand))
    for (const half of [drawn.slice(0, 20), drawn.slice(20)]) {
      for (const t of ['Linear', 'Radial', 'Conic']) assert.ok(half.includes(t), `seed ${seed} had no ${t} in 20`)
    }
    const count = (t) => drawn.filter((x) => x === t).length
    assert.deepEqual([count('Linear'), count('Radial'), count('Conic')], [32, 6, 2], `seed ${seed}`)
  }
})

test('a type the filter excludes stays in the deck for later', () => {
  const rand = mulberry32(3)
  const deck = []
  const first = drawFromDeck(deck, rand, ['Conic'])
  assert.equal(first, 'Conic')
  assert.equal(deck.filter((t) => t === 'Conic').length, 0)
  assert.equal(deck.length, 19)
})

test('Random with a deck reaches every type within 20 presses, kept rather than turned into Linear', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const rand = mulberry32(seed)
    const deck = []
    const seen = new Set(Array.from({ length: 20 }, () => rollGradient(rand, { deck }).type))
    assert.deepEqual([...seen].sort(), ['Conic', 'Linear', 'Radial'], `seed ${seed}`)
  }
})

test('a type filter or lock ignores the deck', () => {
  const deck = []
  const g = rollGradient(mulberry32(1), { deck, types: ['Radial'] })
  assert.equal(g.type, 'Radial')
  assert.equal(deck.length, 0)
})

// ── The mood tables ─────────────────────────────────────────────────────────
test('the mood words are the gradient library tags', () => {
  for (const w of [...Object.keys(HUE_RULES), ...Object.keys(TONE_RULES)]) assert.ok(GRADIENT_TAGS.includes(w), w)
  assert.deepEqual(Object.keys(USE_RULES), ['background', 'hero', 'button', 'card'])
})

test('warm runs 345 up through 0 to 95 and cool is 175 to 300', () => {
  const { warm, cool } = HUE_RULES
  for (const h of [345, 350, 0, 40, 95]) assert.ok(hueInArc(warm.arc, h), `warm ${h}`)
  for (const h of [96, 200, 344]) assert.ok(!hueInArc(warm.arc, h), `not warm ${h}`)
  for (const h of [175, 250, 300]) assert.ok(hueInArc(cool.arc, h), `cool ${h}`)
  for (const h of [174, 301, 20]) assert.ok(!hueInArc(cool.arc, h), `not cool ${h}`)
})

test('white and near-black ink contrast is the worst case over the whole ramp', () => {
  const dark = { type: 'Linear', space: 'srgb', stops: [{ color: '#102040', position: 0 }, { color: '#304080', position: 100 }] }
  const light = { type: 'Linear', space: 'srgb', stops: [{ color: '#F0E0A0', position: 0 }, { color: '#FFF4C0', position: 100 }] }
  assert.ok(inkContrasts(dark).white >= 4.5 && inkContrasts(dark).dark < 4.5)
  assert.ok(inkContrasts(light).dark >= 4.5 && inkContrasts(light).white < 4.5)
})

// ── Mood filters in the engine (spec gradient-overhaul §8) ──────────────────
// Mutations that make these fail:
//   the hue re-check (moodFits / pullIntoArc) removed        -> "Hue: warm and cool"
//   moodHarmony no longer forces Monochrome for mono         -> "Hue: mono"
//   a Tone's ranges ignored in firstColour / secondColour    -> "Tone: ..."
//   USE_RULES counts, angles or soft ends not applied        -> "Use: ..."
//   firstColour does not return the base                     -> "Base colour ..."
//   the ink rule dropped from scoreGradient                  -> "a button whose ramp ..."
import { HUE_MIN_CHROMA, parseMoodFilters, moodFor, moodWords, poolMatching } from '../../src/utils/gradientRandom.js'
import { inkPasses, scoreGradient as scoreG, chooseAmongTop } from '../../src/utils/gradientScore.js'

const MOOD_SEEDS = 400
const moodRolls = (filters) => Array.from({ length: MOOD_SEEDS }, (_, i) => rollGradient(mulberry32(9000 + i), { ...filters, deck: [] }))
const lchOf2 = (g) => g.stops.map((s) => hexToOklchRaw(s.color))
// A conic gradient's last stop repeats its first, so its second end is the one before the seam.
const endsLch = (g) => { const l = lchOf2(g); return [l[0], l[l.length - (g.type === 'Conic' ? 2 : 1)]] }
const flat = (g) => g.type !== 'Conic'
const within = (v, [lo, hi], slack) => v >= lo - slack && v <= hi + slack

test('filters off or null draw exactly the gradients they always did', () => {
  for (let s = 1; s <= 200; s++) {
    const plain = rollGradient(mulberry32(s), {})
    const nulls = rollGradient(mulberry32(s), { hue: null, tone: null, use: null, base: null })
    const junk = rollGradient(mulberry32(s), { hue: 'sideways', tone: 7, use: {}, base: 'red' })
    assert.deepEqual(nulls, plain, `seed ${s}`)
    assert.deepEqual(junk, plain, `seed ${s}`)
  }
})

test('Hue: warm and cool keep every stop of every roll inside the arc, on the output hexes', () => {
  for (const word of ['warm', 'cool']) {
    const { arc } = HUE_RULES[word]
    for (const g of moodRolls({ hue: word })) {
      assert.notEqual(g.harmony, 'Complementary', `${word} is never complementary`)
      for (const [, C, H] of lchOf2(g)) assert.ok(C < HUE_MIN_CHROMA || hueInArc(arc, H), `${word} stop at hue ${H} in ${g.stops.map((s) => s.color)}`)
    }
  }
})

test('Hue: warm is warm by eye too (reds, oranges and yellows, no greens or blues)', () => {
  for (const g of moodRolls({ hue: 'warm' })) {
    for (const [, C, H] of lchOf2(g)) {
      if (C < 0.03) continue
      assert.ok(H >= 345 || H <= 95, `warm hue ${H}`)
      assert.ok(!(H > 120 && H < 330), `not warm: hue ${H}`)
    }
  }
})

test('Hue: mono is always a monochrome harmony', () => {
  assert.ok(moodRolls({ hue: 'mono' }).every((g) => g.harmony === 'Monochrome'))
})

test('Tone: light, pastel, vivid and dark hold their ranges on the output hexes', () => {
  for (const g of moodRolls({ tone: 'light' }).filter(flat)) for (const [L, C] of endsLch(g)) assert.ok(within(L, [0.82, 0.93], 0.015) && C <= 0.135, `light ${L} ${C}`)
  for (const g of moodRolls({ tone: 'pastel' }).filter(flat)) {
    const e = endsLch(g)
    for (const [L, C] of e) assert.ok(within(L, [0.84, 0.92], 0.015) && C <= 0.105, `pastel ${L} ${C}`)
    assert.ok(Math.abs(e[0][0] - e[1][0]) <= 0.135, 'pastel step')
  }
  const vivid = moodRolls({ tone: 'vivid' }).filter(flat)
  for (const g of vivid) for (const [L, C] of endsLch(g)) assert.ok(within(L, [0.55, 0.75], 0.015) && C <= 0.185, `vivid ${L} ${C}`)
  // Gamut can pull a rare vivid colour under its chroma floor; nearly every roll keeps it.
  const kept = vivid.filter((g) => endsLch(g).every(([, C]) => C >= 0.115)).length / vivid.length
  assert.ok(kept >= 0.98, `vivid chroma kept ${kept}`)
  for (const g of moodRolls({ tone: 'dark' }).filter(flat)) {
    const ls = endsLch(g).map((c) => c[0])
    assert.ok(Math.min(...ls) <= 0.295, `dark anchor ${ls}`)
    assert.ok(Math.max(...ls) <= 0.515, `dark other end ${ls}`)
  }
})

test('Hue and Tone together: warm and light, cool and dark', () => {
  for (const g of moodRolls({ hue: 'warm', tone: 'light' }).filter(flat)) {
    for (const [L, C, H] of lchOf2(g)) { assert.ok(L >= 0.8 && L <= 0.95, `L ${L}`); assert.ok(C < HUE_MIN_CHROMA || hueInArc(HUE_RULES.warm.arc, H)) }
  }
  for (const g of moodRolls({ hue: 'cool', tone: 'dark' }).filter(flat)) {
    assert.ok(Math.min(...endsLch(g).map((c) => c[0])) <= 0.295)
    for (const [, C, H] of lchOf2(g)) assert.ok(C < HUE_MIN_CHROMA || hueInArc(HUE_RULES.cool.arc, H))
  }
})

test('Use: background, hero, button and card shape the roll', () => {
  const step = (g) => { const e = endsLch(g); return Math.abs(e[0][0] - e[1][0]) }
  for (const g of moodRolls({ use: 'background' })) {
    assert.equal(g.stops.length, 2)
    assert.ok(g.type === 'Linear' || g.type === 'Radial')
    if (g.type === 'Linear') assert.ok([160, 180, 200].includes(g.angle), `angle ${g.angle}`)
    assert.ok(step(g) <= 0.195, `step ${step(g)}`)
    assert.ok(endsLch(g).every(([, C]) => C <= 0.115))
  }
  for (const g of moodRolls({ use: 'hero' })) {
    assert.ok(g.type === 'Linear' || g.type === 'Radial')
    assert.ok(g.stops.length === 2 || g.stops.length === 3)
    const ls = endsLch(g).map((c) => c[0])
    assert.ok(step(g) >= 0.235 && step(g) <= 0.435, `step ${step(g)}`)
    assert.ok(Math.min(...ls) <= 0.295 || Math.max(...ls) >= 0.875, `anchor ${ls}`)
  }
  for (const g of moodRolls({ use: 'button' })) {
    assert.equal(g.type, 'Linear')
    assert.equal(g.stops.length, 2)
    assert.ok([90, 135].includes(g.angle), `angle ${g.angle}`)
    assert.ok(step(g) >= 0.045 && step(g) <= 0.155, `step ${step(g)}`)
    assert.ok(inkPasses(g), `ink ${g.stops.map((s) => s.color)}`)
  }
  for (const g of moodRolls({ use: 'card' })) {
    assert.equal(g.type, 'Linear')
    assert.equal(g.stops.length, 2)
    assert.deepEqual(g.stops.map((s) => s.position), [8, 92])
    assert.ok([135, 160].includes(g.angle), `angle ${g.angle}`)
    assert.ok(step(g) <= 0.215, `step ${step(g)}`)
  }
})

test('Use: a Type or Stops the person set wins over the Use rule', () => {
  const radial = Array.from({ length: 100 }, (_, i) => rollGradient(mulberry32(i), { use: 'button', types: ['Radial'], counts: [3] }))
  assert.ok(radial.every((g) => g.type === 'Radial' && g.stops.length === 3))
})

test('Use with the type deck skips a card the rule excludes, and keeps it for later', () => {
  const deck = []
  const rand = mulberry32(4)
  for (let i = 0; i < 20; i++) assert.equal(rollGradient(rand, { use: 'button', deck }).type, 'Linear')
  assert.ok(deck.includes('Conic'), 'the Conic card is still in the deck')
})

test('Base colour is stop 1, whatever the mud rule or Hue say, and Hue is ignored', () => {
  for (const base of ['#E5483B', '#1B3A6B', '#F2E6C9', '#3A7D44', '#5B5A2A']) {
    for (const g of moodRolls({ base, hue: 'cool' }).slice(0, 150)) assert.equal(g.stops[0].color, base)
  }
  // The partner follows the Tone, with the base left where it was.
  for (const g of moodRolls({ base: '#E5483B', tone: 'pastel' }).filter(flat)) {
    assert.equal(g.stops[0].color, '#E5483B')
    const [L, C] = endsLch(g)[1]
    assert.ok(L >= 0.825 && L <= 0.935 && C <= 0.105, `pastel partner ${L} ${C}`)
  }
  for (const g of moodRolls({ base: '#F2E6C9', tone: 'dark' }).filter(flat)) assert.ok(endsLch(g)[1][0] <= 0.295)
})

test('a button whose ramp fails 4.5:1 for both inks scores zero, and only for a button', () => {
  const grey = { type: 'Linear', space: 'srgb', stops: [{ color: '#7B7B7B', position: 0 }, { color: '#7E7E7E', position: 100 }] }
  const navy = { type: 'Linear', space: 'srgb', stops: [{ color: '#1B3A6B', position: 0 }, { color: '#2B4A8B', position: 100 }] }
  assert.equal(inkPasses(grey), false)
  assert.equal(inkPasses(navy), true)
  assert.equal(scoreG(grey, { use: 'button' }).total, 0)
  assert.ok(scoreG(grey, {}).total > 0)
  assert.ok(scoreG(navy, { use: 'button' }).total > 0)
})

test('a zero-score candidate ships only when every candidate is zero', () => {
  const a = { g: 'a', score: 0 }
  const b = { g: 'b', score: 0.4 }
  for (const r of [0, 0.5, 0.99]) assert.equal(chooseAmongTop([a, b, a], () => r), 'b')
  assert.equal(chooseAmongTop([a, a], () => 0), 'a')
})

test('mood filters parse, drop unknown values, and the Pro ones go for a free account', () => {
  assert.deepEqual(parseMoodFilters({ hue: 'warm', tone: 'pastel', use: 'hero', base: '#e5483b' }), { hue: 'warm', tone: 'pastel', use: 'hero', base: '#E5483B' })
  assert.deepEqual(parseMoodFilters({ hue: 'sideways', tone: 'constructor', use: 3, base: '#12' }), { hue: null, tone: null, use: null, base: null })
  assert.deepEqual(parseMoodFilters(null), { hue: null, tone: null, use: null, base: null })
  const all = { hue: 'cool', tone: 'dark', use: 'card', base: '#336699' }
  assert.deepEqual(moodFor(all, false), { hue: 'cool', tone: 'dark', use: null, base: null })
  assert.deepEqual(moodFor(all, true), all)
})

test('mood words read out as a list for the live region', () => {
  assert.deepEqual(moodWords({}), [])
  assert.deepEqual(moodWords({ hue: 'warm', tone: 'light' }), ['warm', 'light'])
  assert.deepEqual(moodWords({ hue: 'cool', use: 'hero', base: '#336699' }), ['cool', 'for a hero', 'from #336699'])
})

test('a palette pool narrows to the colours that match, or falls back to all of it with a line', () => {
  const pool = ['#E5483B', '#F28C28', '#F5C542', '#1B3A6B', '#2E8B8B']
  const warm = poolMatching(pool, 'warm', null)
  assert.deepEqual(warm.pool, ['#E5483B', '#F28C28', '#F5C542'])
  assert.equal(warm.fellBack, false)
  assert.deepEqual(poolMatching(pool, 'mono', null).pool, pool)
  assert.deepEqual(poolMatching(pool, null, null), { pool, fellBack: false, note: null })
  const none = poolMatching(['#E5483B', '#F28C28'], 'cool', null)
  assert.deepEqual(none.pool, ['#E5483B', '#F28C28'])
  assert.equal(none.note, 'None of your palette colours are cool, so Random used all of them.')
  const one = poolMatching(['#E5483B', '#F28C28', '#1B3A6B'], 'cool', null)
  assert.equal(one.fellBack, true)
  assert.match(one.note, /^Only one of your palette colours is cool/)
  const light = poolMatching(['#FDE8E4', '#FCEFD0', '#1B3A6B'], 'warm', 'light')
  assert.deepEqual(light.pool, ['#FDE8E4', '#FCEFD0'])
})
