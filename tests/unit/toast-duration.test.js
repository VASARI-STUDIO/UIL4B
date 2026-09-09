// The toast clock. useToast.js used to hold every message for 1,800ms — the
// flow audit (#436) watched a 56-character refusal vanish unread. The rule is
// now in utils/toastDuration.js as numbers, so this file can hold it to them:
// success stays short, the clock grows with the message, and an error never
// leaves in under six seconds. The rendered half — that the toast is actually
// still on screen, and that its dismiss control works from the keyboard — is
// tests/user-sim/72-flow-followups.spec.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  toastDuration, TOAST_MIN_MS, TOAST_MAX_MS, TOAST_ERROR_MIN_MS,
} from '../../src/utils/toastDuration.js'

const REFUSAL = 'Free plan saves up to 3 projects — go Pro for unlimited.'

test('a short success keeps the old 1.8 seconds — a lingering tick is noise', () => {
  assert.equal(toastDuration('Project saved'), TOAST_MIN_MS)
  assert.ok(toastDuration('Created "Brand v1"') < 2000, 'a one-line success stays under two seconds')
  assert.equal(toastDuration(''), TOAST_MIN_MS)
  assert.equal(toastDuration(undefined), TOAST_MIN_MS)
})

test('the clock grows with the message and never passes the ceiling', () => {
  const short = toastDuration('Project saved')
  const refusal = toastDuration(REFUSAL)
  const essay = toastDuration('x'.repeat(400))
  assert.ok(refusal > short, `a ${REFUSAL.length}-character sentence must outlast a 13-character one`)
  assert.ok(refusal >= 3500, `the refusal gets time to be read, got ${refusal}ms`)
  assert.equal(essay, TOAST_MAX_MS, 'a very long message is capped, not held forever')
  for (let n = 0; n < 200; n += 7) {
    assert.ok(toastDuration('x'.repeat(n + 7)) >= toastDuration('x'.repeat(n)), 'duration must not fall as the message grows')
  }
})

test('an error holds for at least six seconds, whatever its length', () => {
  assert.equal(toastDuration('Failed', 'error'), TOAST_ERROR_MIN_MS)
  assert.equal(toastDuration(REFUSAL, 'error'), TOAST_ERROR_MIN_MS)
  assert.ok(toastDuration('x'.repeat(400), 'error') >= TOAST_ERROR_MIN_MS)
  assert.ok(toastDuration(REFUSAL, 'error') > toastDuration(REFUSAL), 'an error outlives the same words as a success')
})

test('the floors and ceiling stay in the order the rule needs', () => {
  assert.ok(TOAST_MIN_MS < TOAST_MAX_MS)
  assert.ok(TOAST_ERROR_MIN_MS >= 6000, 'the six-second minimum for errors is the contract the toast dismiss control exists for')
})
