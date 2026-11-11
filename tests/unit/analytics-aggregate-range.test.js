// The aggregate reader with a lower bound on the day: what the admin overview's
// range selector relies on to report on a window of calendar days.
//
// Documents are written straight into the in-memory Firestore so each day's
// figures are known exactly, and the real reader is run against them.
import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { loadAnalytics, resetAll, store } from '../helpers/aggregate-harness.js'

beforeEach(() => resetAll())

const put = (day, views, extra = {}) => store.set(`analytics-daily/${day}`, { day, views, ...extra })

test('with a start day, documents before it are not summed even when the limit would reach them', async () => {
  const a = await loadAnalytics()
  put('2026-10-01', 1000)
  put('2026-10-20', 10)
  put('2026-10-21', 20)
  put('2026-10-22', 30)
  const got = await a.getAggregateAnalytics(30, { since: '2026-10-20' })
  assert.equal(got.totalViews, 60)
  assert.deepEqual(got.days.map(d => d.day), ['2026-10-20', '2026-10-21', '2026-10-22'])
})

test('the start day itself is included', async () => {
  const a = await loadAnalytics()
  put('2026-10-19', 5)
  put('2026-10-20', 7)
  const got = await a.getAggregateAnalytics(30, { since: '2026-10-20' })
  assert.equal(got.totalViews, 7)
})

test('a quiet stretch does not pull older days into a short window', async () => {
  const a = await loadAnalytics()
  // Three days of traffic, then nothing for weeks, then two days from long ago.
  put('2026-10-30', 1)
  put('2026-10-31', 2)
  put('2026-11-01', 4)
  put('2026-08-01', 100)
  put('2026-08-02', 200)
  // The newest-N-documents read alone: 5 documents fit under a limit of 7.
  assert.equal((await a.getAggregateAnalytics(7)).totalViews, 307)
  // Bounded to the last 7 days (28 Oct onward): only the recent three.
  assert.equal((await a.getAggregateAnalytics(7, { since: '2026-10-28' })).totalViews, 7)
})

test('the limit still caps how many documents are read inside the window', async () => {
  const a = await loadAnalytics()
  for (let d = 1; d <= 9; d++) put(`2026-10-0${d}`, d)
  const got = await a.getAggregateAnalytics(3, { since: '2026-10-01' })
  assert.deepEqual(got.days.map(d => d.day), ['2026-10-07', '2026-10-08', '2026-10-09'])
})

test('a wider window includes everything a narrower one does, plus the extra days', async () => {
  const a = await loadAnalytics()
  put('2026-05-10', 1, { 'view__plans': 1 })
  put('2026-09-10', 10, { 'view__plans': 10 })
  put('2026-10-30', 100, { 'view__plans': 100, 'tool__font-copy': 5 })
  const week = await a.getAggregateAnalytics(7, { since: '2026-10-28' })
  const quarter = await a.getAggregateAnalytics(90, { since: '2026-08-06' })
  const year = await a.getAggregateAnalytics(366, { since: '2025-11-04' })
  assert.deepEqual([week.totalViews, quarter.totalViews, year.totalViews], [100, 110, 111])
  assert.deepEqual(week.byTool, [['font-copy', 5]])
  assert.deepEqual(year.byPath, [['plans', 111]])
})

test('without a start day the read is the newest documents only, as before', async () => {
  const a = await loadAnalytics()
  put('2026-01-01', 1)
  put('2026-10-01', 2)
  assert.equal((await a.getAggregateAnalytics(30)).totalViews, 3)
  assert.equal((await a.getAggregateAnalytics(1)).totalViews, 2)
})
