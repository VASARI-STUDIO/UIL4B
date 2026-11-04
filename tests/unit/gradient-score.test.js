// The Random scorer (spec gradient-generation-v2 §3.2): each of the seven terms at
// its boundaries, the weights, and the pick among the best three.
//
// Every test names the change that makes it fail:
//   valueStepScore band 0.18-0.45 moved (e.g. to 0.25)       -> "value step"
//   cleanMiddleScore uses 0.5 x the lower end, not 0.9 x     -> "clean middle"
//   chromaBalanceScore cap 0.08 changed to 0.12              -> "chroma balance"
//   HUE_BANDS loses the complementary band                   -> "hue relation"
//   ANCHOR_DARK 0.28 changed to 0.40                         -> "anchor"
//   textAreaScore reads the busiest third, not the flattest  -> "text area"
//   notSeenScore ignores a flipped copy (no min of two)      -> "not seen"
//   a weight changed so the sum is not 1                     -> "weights"
//   TOP_PICKS 3 changed to 8                                 -> "pick among the best three"
//   standardStaysClean threshold 0.85 changed to 0.2         -> "Standard stays clean"
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SCORE_WEIGHTS, TOP_PICKS, valueStepScore, cleanMiddleScore, chromaBalanceScore, hueRelationScore,
  anchorScore, textAreaScore, notSeenScore, labEnds, scoreGradient, chooseAmongTop, standardStaysClean,
  colourAt, rampOf, pushRecent, RECENT_RESULTS,
} from '../../src/utils/gradientScore.js'

const near = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`)
const flat = (hex) => Array(13).fill(hex)
const g = (a, b, space = 'oklch') => ({ type: 'Linear', space, stops: [{ color: a, position: 0 }, { color: b, position: 100 }] })

test('weights are the spec table and sum to 1', () => {
  assert.deepEqual({ ...SCORE_WEIGHTS }, { valueStep: 0.25, cleanMiddle: 0.2, chromaBalance: 0.15, hueRelation: 0.15, anchor: 0.1, textArea: 0.1, notSeen: 0.05 })
  near(Object.values(SCORE_WEIGHTS).reduce((s, w) => s + w, 0), 1, 'sum')
})

test('value step: full marks from 0.18 to 0.45, less is flat, more is harsh', () => {
  for (const d of [0.18, 0.3, 0.45, -0.3]) near(valueStepScore(d), 1, `dL ${d}`)
  near(valueStepScore(0), 0, 'no step')
  near(valueStepScore(0.09), 0.5, 'half the step')
  assert.ok(valueStepScore(0.179) < 1 && valueStepScore(0.451) < 1, 'just outside the band')
  near(valueStepScore(0.6), 0.5, 'harsh')
  near(valueStepScore(0.75), 0, 'harsher still')
})

test('clean middle: full marks at 0.9 x the lower end, none at half of that', () => {
  near(cleanMiddleScore(0.09, 0.1), 1, 'at the line')
  near(cleanMiddleScore(0.12, 0.1), 1, 'above the line')
  near(cleanMiddleScore(0.0675, 0.1), 0.5, 'three quarters')
  near(cleanMiddleScore(0.045, 0.1), 0, 'half of the line')
  near(cleanMiddleScore(0, 0), 1, 'a grey end sets no bar')
})

test('chroma balance: full marks to a 0.04 gap, none at the 0.08 cap', () => {
  near(chromaBalanceScore(0.04), 1, '0.04')
  near(chromaBalanceScore(-0.04), 1, '-0.04')
  near(chromaBalanceScore(0.06), 0.5, '0.06')
  near(chromaBalanceScore(0.08), 0, '0.08')
  near(chromaBalanceScore(0.2), 0, 'past the cap')
})

test('hue relation: mono to 10, analogous 25-50, complementary 165-195; off-band scales down', () => {
  for (const d of [0, 10, 25, 37, 50, 165, 180, 195, 360 - 170]) near(hueRelationScore(d, 0.1, 0.1), 1, `gap ${d}`)
  near(hueRelationScore(17.5, 0.1, 0.1), 0.625, 'between mono and analogous')
  near(hueRelationScore(100, 0.1, 0.1), 0, 'nowhere near a band')
  near(hueRelationScore(100, 0.1, 0.005), 1, 'a grey end has no hue to relate')
})

test('anchor: one end at L <= 0.28 or >= 0.88; the nearer end scales down over 0.2', () => {
  near(anchorScore(0.28, 0.6), 1, 'dark, on the line')
  near(anchorScore(0.5, 0.88), 1, 'light, on the line')
  near(anchorScore(0.48, 0.5), 0, 'both mid')
  near(anchorScore(0.38, 0.5), 0.5, 'half way to the dark line')
  near(anchorScore(0.29, 0.6), 0.95, 'just off the dark line')
})

test('text area: the flattest third is measured for 4.5:1 with near-black or near-white', () => {
  near(textAreaScore(flat('#0B0C0E')), 1, 'dark all the way across')
  near(textAreaScore(flat('#F7F7F4')), 1, 'light all the way across')
  assert.ok(textAreaScore(flat('#767676')) < 0.5, 'a mid grey where neither ink reaches 4.5:1')
  // The first third is black and white stripes; the flattest third (indexes 4-8) is dark, the last is mid grey.
  const stripes = ['#000000', '#FFFFFF', '#000000', '#FFFFFF', '#0B0C0E', '#0B0C0E', '#0B0C0E', '#0B0C0E', '#0B0C0E', '#767676', '#777777', '#767676', '#777777']
  near(textAreaScore(stripes), 1, 'the flat dark third is the one measured')
  // Here the only flat third is the mid grey one, so that is what loses marks.
  const stripes2 = ['#000000', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#767676', '#767676', '#767676', '#767676']
  assert.ok(textAreaScore(stripes2) < 0.5)
})

test('not seen: 12 ΔE2000 from each recent result, in either orientation', () => {
  const me = labEnds([['#2F6BFF', '#0B0C0E']])[0]
  near(notSeenScore(me, []), 1, 'no history')
  near(notSeenScore(me, labEnds([['#2F6BFF', '#0B0C0E']])), 0, 'the same gradient')
  near(notSeenScore(me, labEnds([['#0B0C0E', '#2F6BFF']])), 0, 'the same gradient flipped')
  near(notSeenScore(me, labEnds([['#2F6BFF', '#0B0C0E'], ['#E0784E', '#F7F7F4']])), 0.5, 'one near, one far')
  // The distance is the mean of the two ends: #808080 vs #8A8A8A is 3.7, vs #909090 is 5.7 (both under 12).
  const grey = labEnds([['#808080', '#808080']])[0]
  near(notSeenScore(grey, labEnds([['#8A8A8A', '#8A8A8A']])), 0, 'a 3.7 step is still seen')
  near(notSeenScore(grey, labEnds([['#BCBCBC', '#BCBCBC']])), 1, 'a large step is not')
})

test('the total is the weighted sum, and a clean value-stepped pair beats a flat olive one', () => {
  const good = scoreGradient(g('#0B1B3A', '#3A6DE0'))
  let sum = 0
  for (const k of Object.keys(SCORE_WEIGHTS)) sum += SCORE_WEIGHTS[k] * good.terms[k]
  near(good.total, sum, 'weighted sum')
  const flatOlive = scoreGradient(g('#5A5A18', '#5E5E20'))
  assert.ok(good.total - flatOlive.total > 0.1, `${good.total} vs ${flatOlive.total}`)
  assert.ok(good.terms.valueStep === 1 && flatOlive.terms.valueStep < 0.2)
})

test('pick among the best three: never a lower candidate, and all three can be picked', () => {
  const scored = Array.from({ length: 8 }, (_, i) => ({ g: i, score: (i + 1) / 10 })) // 7 is best, then 6, 5
  assert.equal(TOP_PICKS, 3)
  const picked = new Set()
  for (let r = 0; r < 1; r += 0.01) picked.add(chooseAmongTop(scored, () => r))
  assert.deepEqual([...picked].sort(), [5, 6, 7])
  assert.equal(chooseAmongTop(scored, () => 0), 7, 'a low roll takes the best')
  assert.equal(chooseAmongTop(scored, () => 0.999999), 5, 'a high roll takes the third best')
})

test('Standard stays clean: a related pair keeps its middle, a complementary pair goes grey', () => {
  assert.equal(standardStaysClean(g('#0B1B3A', '#3A6DE0').stops), true)
  assert.equal(standardStaysClean(g('#F6C453', '#E0784E').stops), true)
  assert.equal(standardStaysClean(g('#2F6BFF', '#E0784E').stops), false)
})

test('the ramp is read in position order and blended in the space asked for', () => {
  const stops = [{ color: '#FFFFFF', position: 100 }, { color: '#000000', position: 0 }]
  const ramp = rampOf(stops)
  assert.equal(ramp[0].color, '#000000')
  assert.equal(colourAt(ramp, -5, 'oklch'), '#000000')
  assert.equal(colourAt(ramp, 120, 'srgb'), '#FFFFFF')
  assert.equal(colourAt(ramp, 50, 'srgb'), '#808080')
  assert.notEqual(colourAt(ramp, 50, 'oklch'), '#808080', 'OKLCH is perceptual, so its middle is darker (about #636363)')
})

test('the session remembers the last ten results', () => {
  let recent = []
  for (let i = 0; i < 15; i++) recent = pushRecent(recent, g(`#0000${(i + 16).toString(16)}`, '#FFFFFF'))
  assert.equal(recent.length, RECENT_RESULTS)
  assert.equal(recent[0][0], '#000015', 'the five oldest were dropped')
})
