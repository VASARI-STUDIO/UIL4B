// The date range maths behind the admin overview's range selector.
//
// Every expected day below is counted by hand from the calendar, not produced
// by the code under test, so a shared mistake cannot hide in both. "Today" is a
// local date passed in, which keeps the boundaries fixed whatever day this runs.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ADMIN_RANGES, DEFAULT_RANGE_ID, parseRangeId, rangeWindow, inWindow, dayString,
} from '../../src/utils/adminRange.js'

const TODAY = new Date(2026, 10, 3, 12, 0, 0) // 3 Nov 2026, local

const bounds = (id, now = TODAY) => {
  const { startDay, endDay, days } = rangeWindow(id, now)
  return { startDay, endDay, days }
}

test('the selector offers 7, 30, 60, 90 days, 6 months and 1 year, with 30 days the default', () => {
  assert.deepEqual(ADMIN_RANGES.map(r => r.id), ['7d', '30d', '60d', '90d', '6m', '1y'])
  assert.equal(DEFAULT_RANGE_ID, '30d')
  assert.equal(new Set(ADMIN_RANGES.map(r => r.short)).size, ADMIN_RANGES.length, 'short labels must be distinct')
  assert.equal(new Set(ADMIN_RANGES.map(r => r.phrase)).size, ADMIN_RANGES.length, 'phrases must be distinct')
})

test('every range names what it covers in words a heading can use', () => {
  const phrases = Object.fromEntries(ADMIN_RANGES.map(r => [r.id, r.phrase]))
  assert.deepEqual(phrases, {
    '7d': 'last 7 days',
    '30d': 'last 30 days',
    '60d': 'last 60 days',
    '90d': 'last 90 days',
    '6m': 'last 6 months',
    '1y': 'last 12 months',
  })
})

test('a query value maps to its range, and anything else falls back to the default', () => {
  for (const r of ADMIN_RANGES) assert.equal(parseRangeId(r.id), r.id)
  for (const bad of [null, undefined, '', '30', '30D', '7days', '2y', 'all', ' 7d']) {
    assert.equal(parseRangeId(bad), '30d', `${JSON.stringify(bad)} should fall back`)
  }
})

test('day ranges include today and count back, so 7 days is today and the six before it', () => {
  assert.deepEqual(bounds('7d'), { startDay: '2026-10-28', endDay: '2026-11-03', days: 7 })
  assert.deepEqual(bounds('30d'), { startDay: '2026-10-05', endDay: '2026-11-03', days: 30 })
  assert.deepEqual(bounds('60d'), { startDay: '2026-09-05', endDay: '2026-11-03', days: 60 })
  assert.deepEqual(bounds('90d'), { startDay: '2026-08-06', endDay: '2026-11-03', days: 90 })
})

test('6 months starts the day after the same date six months ago', () => {
  assert.deepEqual(bounds('6m'), { startDay: '2026-05-04', endDay: '2026-11-03', days: 184 })
})

test('1 year is 365 days from the day after this date last year', () => {
  assert.deepEqual(bounds('1y'), { startDay: '2025-11-04', endDay: '2026-11-03', days: 365 })
})

test('a year that spans a leap day is 366 days long', () => {
  const leapDay = new Date(2028, 1, 29, 9, 0, 0)
  assert.deepEqual(bounds('1y', leapDay), { startDay: '2027-03-01', endDay: '2028-02-29', days: 366 })
})

test('stepping back lands on the last day of a shorter month, never the month after', () => {
  const lastOfAugust = new Date(2026, 7, 31)
  // 31 Aug back six months has no 31 Feb: it is 28 Feb, so the window starts 1 Mar.
  assert.deepEqual(bounds('6m', lastOfAugust), { startDay: '2026-03-01', endDay: '2026-08-31', days: 184 })
})

test('windows cross a year boundary', () => {
  const earlyJan = new Date(2026, 0, 5)
  assert.equal(bounds('7d', earlyJan).startDay, '2025-12-30')
  assert.equal(bounds('30d', earlyJan).startDay, '2025-12-07')
  assert.deepEqual(bounds('6m', earlyJan), { startDay: '2025-07-06', endDay: '2026-01-05', days: 184 })
})

test('the time of day never moves the window', () => {
  const justAfterMidnight = new Date(2026, 10, 3, 0, 0, 1)
  const justBeforeMidnight = new Date(2026, 10, 3, 23, 59, 59)
  assert.deepEqual(bounds('90d', justAfterMidnight), bounds('90d', justBeforeMidnight))
  assert.equal(bounds('90d', justBeforeMidnight).endDay, '2026-11-03')
})

test('an unknown id gets the default window rather than an empty one', () => {
  assert.deepEqual(bounds('bogus'), bounds('30d'))
  assert.equal(rangeWindow('bogus', TODAY).id, '30d')
})

test('a longer range always reaches back further than a shorter one', () => {
  const starts = ADMIN_RANGES.map(r => rangeWindow(r.id, TODAY).startDay)
  assert.deepEqual([...starts].sort().reverse(), starts)
  assert.equal(new Set(starts).size, starts.length)
})

test('dayString pads month and day', () => {
  assert.equal(dayString(new Date(2026, 0, 2)), '2026-01-02')
  assert.equal(dayString(new Date(2026, 11, 31)), '2026-12-31')
})

test('a timestamp is inside the window from the first day to the last, and not outside either end', () => {
  const win = rangeWindow('7d', TODAY) // 28 Oct to 3 Nov
  const at = (y, m, d, h = 12) => new Date(y, m, d, h).toISOString()
  assert.equal(inWindow(at(2026, 9, 28, 0), win), true, 'first day, start of day')
  assert.equal(inWindow(at(2026, 10, 3, 23), win), true, 'last day, late evening')
  assert.equal(inWindow(at(2026, 9, 27, 23), win), false, 'the day before the window')
  assert.equal(inWindow(at(2026, 10, 4, 0), win), false, 'the day after the window')
})

test('a missing or unreadable timestamp is outside every window', () => {
  const win = rangeWindow('1y', TODAY)
  for (const bad of [undefined, null, '', 'not a date']) assert.equal(inWindow(bad, win), false)
})
