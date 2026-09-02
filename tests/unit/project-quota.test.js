// When do we warn a free user about the project cap?
//
// From the 2026-08-12 account lifecycle audit, B6. The downgrade BEHAVIOUR was
// already correct — ProjectContext blocks only new saves and deletes nothing —
// but nothing ever told the user where they stood, so the cap arrived as a flat
// refusal. The fix is a threshold, and a threshold is exactly the kind of thing
// that is quietly wrong for months unless it is pinned across its whole domain.
//
// So this suite is EXHAUSTIVE where it can be: for every cap from 1 to 40 and
// every possible count against it, the state must be one of four, must be the
// right one, and must never skip a step as the count climbs. A rule that is only
// spot-checked at 0/3 and 3/3 would pass while being wrong at 2/3.
//
// The expected threshold is recomputed here from the fraction rather than
// imported as a function, so a broken warnThreshold() cannot define both sides
// of its own assertion.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  WARN_FRACTION, projectQuota, remainingProjects, warnThreshold,
} from '../../src/utils/projectQuota.js'

const expectedThreshold = (limit) => Math.max(1, Math.ceil(limit * WARN_FRACTION))

test('1 · Pro (an uncapped plan) is never counted at all', () => {
  for (const limit of [Infinity, null, undefined, NaN, 'lots']) {
    const q = projectQuota(7, limit)
    assert.equal(q.state, 'unlimited', `limit ${String(limit)} should be uncapped`)
    assert.equal(q.shouldTell, false, 'a Pro user has no allowance to be reminded of')
    assert.equal(q.atLimit, false)
    assert.equal(q.remaining, Infinity)
  }
})

test('2 · the free cap of 3 stays silent until the last slot', () => {
  // The shipped free tier. This is the case the founder will actually look at,
  // so it is asserted literally rather than derived.
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((used) => projectQuota(used, 3).state),
    ['clear', 'clear', 'approaching', 'full', 'full'],
  )
  // P-003: nothing is said over the first two projects.
  assert.equal(projectQuota(0, 3).shouldTell, false)
  assert.equal(projectQuota(1, 3).shouldTell, false)
  // ...and the warning lands with one save still available, not after.
  assert.equal(projectQuota(2, 3).shouldTell, true)
  assert.equal(projectQuota(2, 3).remaining, 1)
  assert.equal(projectQuota(2, 3).atLimit, false, 'the warning must not read as a refusal')
})

test('3 · every cap from 1 to 40 resolves correctly at every count', () => {
  for (let limit = 1; limit <= 40; limit++) {
    const warnAt = expectedThreshold(limit)
    for (let used = 0; used <= limit + 3; used++) {
      const q = projectQuota(used, limit)
      const remaining = Math.max(0, limit - used)

      assert.equal(q.remaining, remaining, `remaining at ${used}/${limit}`)
      assert.equal(q.limit, limit)
      assert.equal(q.used, used)

      const expected = remaining === 0 ? 'full' : remaining <= warnAt ? 'approaching' : 'clear'
      assert.equal(q.state, expected, `state at ${used}/${limit}`)
      assert.equal(q.atLimit, remaining === 0, `atLimit at ${used}/${limit}`)
      assert.equal(q.shouldTell, expected !== 'clear', `shouldTell at ${used}/${limit}`)
    }
  }
})

test('4 · the state only ever moves forwards as projects are saved', () => {
  // A user who saves one more project must never be told LESS than before. A
  // rule that relaxed on the way up would flicker the counter off mid-climb.
  const rank = { clear: 0, approaching: 1, full: 2 }
  for (let limit = 1; limit <= 40; limit++) {
    let previous = -1
    for (let used = 0; used <= limit + 2; used++) {
      const current = rank[projectQuota(used, limit).state]
      assert.ok(current >= previous, `state went backwards at ${used}/${limit}`)
      previous = current
    }
  }
})

test('5 · the warning always leaves at least one save to act on', () => {
  // The whole point of B6 is a warning that arrives IN TIME. If a cap ever
  // resolved its first 'approaching' at zero remaining, the warning and the
  // refusal would land together and this work would be pointless.
  for (let limit = 2; limit <= 40; limit++) {
    const firstWarned = Array.from({ length: limit + 1 }, (_, used) => used)
      .find((used) => projectQuota(used, limit).state === 'approaching')
    assert.notEqual(firstWarned, undefined, `cap ${limit} never warns`)
    assert.ok(
      projectQuota(firstWarned, limit).remaining >= 1,
      `cap ${limit} warned with nothing left to save`,
    )
  }
})

test('6 · the threshold scales with the cap instead of sitting at one', () => {
  // Guards the reason the rule is a fraction: a flat "one left" would be a
  // warning that arrives too late on a large allowance, and the cap is plan
  // data that can move without a deploy.
  assert.equal(warnThreshold(3), 1)
  assert.equal(warnThreshold(5), 1)
  assert.equal(warnThreshold(20), 4)
  assert.equal(warnThreshold(40), 8)
  assert.equal(projectQuota(16, 20).state, 'approaching', 'a cap of 20 warns with 4 left')
  assert.equal(projectQuota(15, 20).state, 'clear', 'and not before')
})

test('7 · a cap of 1 is full immediately after the first save', () => {
  assert.equal(projectQuota(0, 1).state, 'approaching', 'the only slot is the last slot')
  assert.equal(projectQuota(1, 1).state, 'full')
})

test('8 · a nonsense count cannot hide the cap', () => {
  // Defensive: a caller bug must fail towards TELLING the user, never towards
  // silently pretending there is room.
  for (const used of [-5, NaN, undefined, null, 'three']) {
    const q = projectQuota(used, 3)
    assert.equal(q.used, 0, `used ${String(used)} should clamp to 0`)
    assert.equal(q.state, 'clear')
  }
  assert.equal(projectQuota(2.7, 3).used, 2, 'a fractional count floors rather than rounds up')
  assert.equal(projectQuota(2.7, 3).state, 'approaching')
})

test('9 · a cap of zero refuses everything and says so', () => {
  const q = projectQuota(0, 0)
  assert.equal(q.state, 'full', 'no allowance is not a comfortable allowance')
  assert.equal(q.atLimit, true)
  assert.equal(q.remaining, 0)
  assert.equal(projectQuota(0, -2).state, 'full', 'a negative cap cannot mean unlimited')
})

test('10 · remainingProjects agrees with the resolved quota everywhere', () => {
  assert.equal(remainingProjects(1, Infinity), Infinity)
  for (let limit = 1; limit <= 20; limit++) {
    for (let used = 0; used <= limit + 2; used++) {
      assert.equal(remainingProjects(used, limit), projectQuota(used, limit).remaining,
        `disagreement at ${used}/${limit}`)
    }
  }
})
