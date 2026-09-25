// What's left of an AI allowance, and which ceiling bites first.
//
// The audit (2026-08-12 account lifecycle audit § B2) found the warning
// machinery already written and wired to nothing: `getRemainingUses` and
// `getResetTime` were exported from usageTracker.js and imported nowhere, the
// server returned `usage: { used, limit, remaining }` on every response and no
// caller read it, and `purgeStaleUsage` was never called so `vs-usage-*` keys
// accumulated forever.
//
// The sharpest part: Free is 5/day AND 40/month, and the client only ever knew
// the daily figure — so a free user hit the monthly wall on day 8 having never
// been shown a monthly ceiling existed.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  quotaState, quotaMessage, reconcile, isLow, dailyResetAt, monthlyResetAt,
} from '../../src/utils/aiQuota.js'
import { AI_LIMITS } from '../../src/config/plans.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const FREE = { dailyLimit: AI_LIMITS.free.daily, monthlyLimit: AI_LIMITS.free.monthly }

// ── The server is the truth ─────────────────────────────────────────────────

test('before any response, the local count is used and labelled as local', () => {
  const s = quotaState({ localUsed: 2, ...FREE })
  assert.equal(s.source, 'local')
  assert.equal(s.daily.used, 2)
  // Nothing local counts across days, so the monthly bucket must be ABSENT
  // rather than guessed. A wrong ceiling is worse than a missing one.
  assert.equal(s.monthly, null)
})

test('once the server answers, its numbers win and the monthly ceiling appears', () => {
  const s = quotaState({
    server: { used: 4, limit: 5, monthUsed: 33, monthLimit: 40 },
    localUsed: 1, ...FREE,
  })
  assert.equal(s.source, 'server')
  assert.equal(s.daily.used, 4)
  assert.equal(s.monthly.used, 33)
  assert.equal(s.monthly.limit, 40)
})

test('where the two disagree, the figure leaving LESS headroom wins', () => {
  // The local tracker counts one browser; the ceiling is per account. A second
  // device, a cleared cache or a private window all make it an undercount. A
  // quota that reads generous and then refuses is the worst kind — it only
  // fails at the moment of use.
  const s = quotaState({ server: { used: 2, limit: 5 }, localUsed: 4, ...FREE })
  assert.equal(s.daily.used, 4, 'the higher used-count must win')
  assert.equal(s.daily.remaining, 1)
})

test('a response without a usage object never blanks a known figure', () => {
  assert.equal(reconcile(null, 3).used, 3)
  assert.equal(reconcile(undefined, 3).used, 3)
  assert.equal(reconcile({}, 3).used, 3)
})

// ── Which ceiling binds ─────────────────────────────────────────────────────

test('the monthly wall binds even when the day is untouched', () => {
  // The exact scenario the audit describes: day 8 of the month, nothing used
  // today, and the month is gone. The old client saw 5/5 daily remaining and
  // reported the server's refusal as a generic error.
  const s = quotaState({
    server: { used: 0, limit: 5, monthUsed: 40, monthLimit: 40 },
    ...FREE,
  })
  assert.equal(s.blocked, true, 'a full month must block even on a fresh day')
  assert.equal(s.binding, 'month')
  assert.equal(s.daily.exhausted, false)
})

test('a full day binds when the month still has room', () => {
  const s = quotaState({
    server: { used: 5, limit: 5, monthUsed: 10, monthLimit: 40 },
    ...FREE,
  })
  assert.equal(s.blocked, true)
  assert.equal(s.binding, 'day')
})

test('when both are low, the one with less left is named', () => {
  const s = quotaState({
    server: { used: 3, limit: 5, monthUsed: 39, monthLimit: 40 },
    ...FREE,
  })
  assert.equal(s.binding, 'month', '1 monthly left beats 2 daily left')
})

test('a healthy allowance says nothing at all', () => {
  const s = quotaState({ server: { used: 0, limit: 30, monthUsed: 0, monthLimit: 300 }, ...FREE })
  assert.equal(s.binding, null)
  assert.equal(s.blocked, false)
  assert.equal(quotaMessage(s), null, 'silence is correct when there is nothing to warn about')
})

// ── The "low" threshold ─────────────────────────────────────────────────────

test('the free daily allowance warns before it is empty', () => {
  // 25% of 5 rounds to 2. Without the ceiling-and-floor this would warn at 1,
  // which on a 5/day plan is barely a warning at all.
  assert.equal(isLow(2, 5), true)
  assert.equal(isLow(3, 5), false)
})

test('a large allowance warns proportionally, not at a fixed number', () => {
  assert.equal(isLow(8, 30), true)   // 25% of 30 = 8
  assert.equal(isLow(9, 30), false)
})

test('exhausted is not "low" — it is a different message', () => {
  assert.equal(isLow(0, 5), false)
  const s = quotaState({ server: { used: 5, limit: 5, monthUsed: 5, monthLimit: 40 }, ...FREE })
  assert.equal(s.daily.low, false)
  assert.equal(s.daily.exhausted, true)
})

// ── What it says ────────────────────────────────────────────────────────────

test('the message names the right period AND the right reset', () => {
  // Telling someone their MONTHLY wall "resets at midnight" is a lie they act
  // on by coming back tomorrow to the same wall.
  const month = quotaState({ server: { used: 0, limit: 5, monthUsed: 40, monthLimit: 40 }, ...FREE })
  const msg = quotaMessage(month)
  assert.match(msg, /this month/)
  assert.match(msg, /resets on the 1st/)
  assert.doesNotMatch(msg, /midnight/)

  const day = quotaState({ server: { used: 5, limit: 5, monthUsed: 6, monthLimit: 40 }, ...FREE })
  const dmsg = quotaMessage(day)
  assert.match(dmsg, /today/)
  assert.match(dmsg, /00:00 UTC/)
})

// THE SERVER'S DAY IS UTC. api/ai.js keys the daily bucket on the function's
// clock, which is UTC on Vercel, so "resets at midnight" was 10 am in
// Brisbane and 5 pm the day before in San Francisco. The message now says
// UTC, and gives the viewer's own clock time beside it.
test('the daily reset is stated in UTC, with the viewer\'s own time beside it', () => {
  const now = new Date(Date.UTC(2026, 8, 24, 3, 0))
  const day = quotaState({ server: { used: 5, limit: 5, monthUsed: 6, monthLimit: 40 }, ...FREE, now })
  const bne = quotaMessage(day, { timeZone: 'Australia/Brisbane' })
  assert.match(bne, /It resets at 00:00 UTC/)
  assert.match(bne, /10:00\s?(am|AM)/, bne)
  const utc = quotaMessage(day, { timeZone: 'UTC' })
  assert.match(utc, /It resets at 00:00 UTC\.$/, 'no "your time" when your time is UTC')
  const month = quotaState({ server: { used: 0, limit: 5, monthUsed: 40, monthLimit: 40 }, ...FREE, now })
  assert.match(quotaMessage(month, { timeZone: 'Australia/Brisbane' }), /resets on the 1st at 00:00 UTC\.$/)
})

test('the message counts down before it blocks', () => {
  const s = quotaState({ server: { used: 4, limit: 5, monthUsed: 6, monthLimit: 40 }, ...FREE })
  assert.match(quotaMessage(s), /^1 AI generation left today/, 'singular, and states the number')
})

test('a limit of one reads as singular', () => {
  const s = quotaState({ server: { used: 0, limit: 1, monthUsed: 0, monthLimit: 40 }, ...FREE })
  assert.match(quotaMessage(s), /1 AI generation left/)
  assert.doesNotMatch(quotaMessage(s), /generations/)
})

// ── Reset times ─────────────────────────────────────────────────────────────

test('the daily reset is the next UTC midnight, which is when the server rolls over', () => {
  const at = dailyResetAt(new Date(Date.UTC(2026, 7, 12, 15, 30)))
  assert.equal(at.toISOString(), '2026-08-13T00:00:00.000Z')
  // Just before UTC midnight is still the same UTC day, whatever the local clock says.
  assert.equal(dailyResetAt(new Date(Date.UTC(2026, 7, 12, 23, 59))).toISOString(), '2026-08-13T00:00:00.000Z')
})

test('the monthly reset is 00:00 UTC on the 1st of the next month, and rolls the year', () => {
  assert.equal(monthlyResetAt(new Date(Date.UTC(2026, 7, 12))).toISOString(), '2026-09-01T00:00:00.000Z')
  assert.equal(monthlyResetAt(new Date(Date.UTC(2026, 11, 31, 12))).toISOString(), '2027-01-01T00:00:00.000Z')
})

// ── Junk in ─────────────────────────────────────────────────────────────────

test('nonsense figures never produce a negative or NaN allowance', () => {
  for (const bad of [null, undefined, NaN, -5, 'four', Infinity]) {
    const s = quotaState({ server: { used: bad, limit: bad }, localUsed: bad, dailyLimit: bad, monthlyLimit: bad })
    assert.ok(s.daily.used >= 0 && Number.isFinite(s.daily.used), `used broke on ${String(bad)}`)
    assert.ok(s.daily.remaining >= 0 && Number.isFinite(s.daily.remaining), `remaining broke on ${String(bad)}`)
  }
})

// ── The wiring the audit found missing ──────────────────────────────────────

test('both AI tools read the usage object the server returns', () => {
  for (const file of ['src/pages/AltTextGenerator.jsx', 'src/pages/AiPromptGenerator.jsx']) {
    const src = read(file)
    assert.ok(src.includes('quota.absorb(data)'),
      `${file} must feed the server's usage figures back into the meter`)
    assert.ok(src.includes('useAiQuota'), `${file} must use the shared quota hook`)
    assert.ok(src.includes('QuotaMeter'), `${file} must show the allowance`)
  }
})

test('both AI tools block on the MONTHLY ceiling, not only the daily one', () => {
  for (const file of ['src/pages/AltTextGenerator.jsx', 'src/pages/AiPromptGenerator.jsx']) {
    assert.ok(/quota\.blocked \|\| !canUseFeature/.test(read(file)),
      `${file} still gates on the local daily count alone`)
  }
})

test('the server sends the monthly figures on SUCCESS, not just on refusal', () => {
  // Without this the monthly ceiling stays invisible until the 429 that
  // enforces it, which is exactly the dead end the audit described.
  const src = read('api/ai.js')
  assert.ok(src.includes('monthRemaining'),
    'successful responses must carry the monthly remainder')
  const successUsages = src.match(/usage: \{ used: used \+ 1[^}]*\}/g) || []
  assert.ok(successUsages.length >= 2, 'both task runners return a usage object')
  for (const u of successUsages) {
    assert.ok(u.includes('monthLimit'), `a success payload omits the monthly ceiling: ${u}`)
  }
})

test('stale usage keys are actually purged now', () => {
  // purgeStaleUsage existed since usageTracker was written and was never called
  // once, so every vs-usage-<tool>-<date> key a user generated stayed forever.
  const app = read('src/App.jsx')
  assert.ok(app.includes('purgeStaleUsage()'), 'purgeStaleUsage must be called on app start')
})
