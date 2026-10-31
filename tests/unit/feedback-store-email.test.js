// The browser's own copy of sent feedback (`vs-feedback`) never holds the
// sender's address, and a copy written before that rule loses it the next time
// one is saved. Runs the real saveFeedback; the aggregate harness loads
// analytics.js with an in-memory localStorage.
import test from 'node:test'
import assert from 'node:assert/strict'
import { loadAnalytics, resetAll } from '../helpers/aggregate-harness.js'

async function withStorage(t, initial = {}) {
  const analytics = await loadAnalytics()
  resetAll()
  for (const [k, v] of Object.entries(initial)) globalThis.localStorage.setItem(k, v)
  return analytics
}

const stored = () => JSON.parse(globalThis.localStorage.getItem('vs-feedback'))

test('a saved message keeps its text and drops the sender address', async (t) => {
  const { saveFeedback } = await withStorage(t)
  saveFeedback({ id: 'fb-1', type: 'bug', subject: 'Export', message: 'It broke.', email: 'someone@example.com' })
  const [entry] = stored()
  assert.equal(entry.message, 'It broke.')
  assert.equal(entry.id, 'fb-1')
  assert.equal('email' in entry, false)
  assert.doesNotMatch(globalThis.localStorage.getItem('vs-feedback'), /someone@example\.com/)
})

test('saving the same id again updates that one entry and still stores no address', async (t) => {
  const { saveFeedback } = await withStorage(t)
  saveFeedback({ id: 'fb-1', message: 'first', email: 'a@example.com' })
  saveFeedback({ id: 'fb-1', message: 'second', email: 'a@example.com' })
  const all = stored()
  assert.equal(all.length, 1)
  assert.equal(all[0].message, 'second')
  assert.equal('email' in all[0], false)
})

test('an entry written before the rule loses its address the next time anything is saved', async (t) => {
  const old = [
    { id: 'old-1', message: 'older', email: 'old@example.com', status: 'new' },
    { id: 'old-2', message: 'oldest', status: 'new' },
  ]
  const { saveFeedback } = await withStorage(t, { 'vs-feedback': JSON.stringify(old) })
  saveFeedback({ id: 'fb-9', message: 'new one', email: '' })
  const all = stored()
  assert.equal(all.length, 3)
  assert.deepEqual(all.map(f => 'email' in f), [false, false, false])
  assert.equal(all[0].message, 'older', 'the rest of the old entry is kept')
  assert.equal(all[0].status, 'new')
})

test('saving nothing does not throw and does not bring an address back', async (t) => {
  const { saveFeedback } = await withStorage(t, { 'vs-feedback': JSON.stringify([{ id: 'x', email: 'x@example.com' }]) })
  assert.doesNotThrow(() => saveFeedback(undefined))
  assert.equal(stored().some(f => 'email' in f), false)
})
