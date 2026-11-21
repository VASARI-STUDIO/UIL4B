import { test } from 'node:test'
import assert from 'node:assert/strict'
import { onSignOut, runSignOutHooks } from '../../src/utils/signOutHooks.js'

test('a registered hook runs on sign-out, and stops running once removed', () => {
  let calls = 0
  const off = onSignOut(() => { calls += 1 })
  runSignOutHooks()
  assert.equal(calls, 1)
  off()
  runSignOutHooks()
  assert.equal(calls, 1)
})

test('a hook that throws does not stop the hooks after it', () => {
  const ran = []
  const offA = onSignOut(() => { ran.push('a'); throw new Error('cache would not clear') })
  const offB = onSignOut(() => { ran.push('b') })
  assert.doesNotThrow(() => runSignOutHooks())
  assert.deepEqual(ran, ['a', 'b'])
  offA(); offB()
})
