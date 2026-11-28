// The plan step's ledger rows: dates worked out from "now", amounts through the
// money function handed in.
import test from 'node:test'
import assert from 'node:assert/strict'
import { addMonth, buildLedger, shortDate } from '../../src/utils/planLedger.js'

const money = (n) => `US$${n}`
const base = { locale: 'en-GB', money }

test('yearly: trial starts today, reminder 3 days before the first charge, first charge on day 7', () => {
  const l = buildLedger({ ...base, months: 12, trialDays: 7, total: 48, now: new Date(2026, 11, 2) })
  assert.equal(l.kind, 'yearly')
  assert.deepEqual(l.rows.map((r) => [r.id, r.when, r.textKey, r.amount]), [
    ['start', null, 'ledgerTrialStarts', 'US$0'],
    ['reminder', '6 Dec', 'ledgerReminder', ''],
    ['charge', '9 Dec', 'ledgerFirstCharge', 'US$48'],
  ])
  assert.equal(l.cancelDate, '9 Dec')
})

test('yearly: the trial length drives both dates, across a month end', () => {
  const l = buildLedger({ ...base, months: 12, trialDays: 14, total: 48, now: new Date(2026, 11, 25) })
  assert.equal(l.rows[1].when, '5 Jan')
  assert.equal(l.rows[2].when, '8 Jan')
})

test('monthly: Pro starts today and the next charge is one calendar month on', () => {
  const l = buildLedger({ ...base, months: 1, trialDays: 0, total: 7, now: new Date(2026, 11, 2) })
  assert.equal(l.kind, 'monthly')
  assert.deepEqual(l.rows.map((r) => [r.id, r.when, r.textKey, r.amount]), [
    ['start', null, 'ledgerProStarts', 'US$7'],
    ['charge', '2 Jan', 'ledgerNextCharge', 'US$7'],
  ])
  assert.equal(l.cancelDate, '')
})

test('a month-end date lands on the last day of the next month', () => {
  const ymd = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate()]
  assert.deepEqual(ymd(addMonth(new Date(2026, 0, 31))), [2026, 2, 28])
  assert.deepEqual(ymd(addMonth(new Date(2028, 0, 31))), [2028, 2, 29])
  assert.deepEqual(ymd(addMonth(new Date(2026, 7, 31))), [2026, 9, 30])
  assert.deepEqual(ymd(addMonth(new Date(2026, 11, 31))), [2027, 1, 31])
  assert.equal(shortDate(new Date(2026, 1, 28), 'en-GB'), '28 Feb')
})

test('amounts go through the money function, never a fixed figure', () => {
  const yen = (n) => `¥${n * 100}`
  const l = buildLedger({ locale: 'en-GB', money: yen, months: 12, trialDays: 7, total: 3, now: new Date(2026, 0, 1) })
  assert.deepEqual(l.rows.map((r) => r.amount), ['¥0', '', '¥300'])
})
