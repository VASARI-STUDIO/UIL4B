// Which saved-project edits have not reached the account (src/utils/unsentTracker.js),
// and how sign-out reads that answer.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  createUnsentTracker, registerUnsentCheck, anyUnsent, forgetOrphanedUnsent,
} from '../../src/utils/unsentTracker.js'
import vm from 'node:vm'

// signOutFlush.js imports through extensionless paths the app's bundler resolves
// and Node does not, so its real source runs here with its three imports
// removed; flushBeforeSignOut takes the same three as parameters.
const flushBeforeSignOut = (() => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/utils/signOutFlush.js'), 'utf8')
  const body = src.replace(/^import\s[^\n]*\n/gm, '').replace(/^export /gm, '')
  assert.ok(/async function flushBeforeSignOut/.test(body), 'signOutFlush.js no longer defines flushBeforeSignOut')
  return vm.runInNewContext(`${body}\n;flushBeforeSignOut`, {
    setTimeout, clearTimeout, Promise,
    flushAccountSync: async () => {}, getSyncState: () => ({ errors: [] }), anyUnsent: () => false,
  })
})()

test('nothing is unsent until something is edited', () => {
  assert.equal(createUnsentTracker().isUnsent(), false)
})

test('an edit stays unsent until a push that started after it succeeds', () => {
  const t = createUnsentTracker()
  t.markChanged()
  assert.equal(t.isUnsent(), true)
  const ticket = t.begin()
  t.finish(ticket, true)
  assert.equal(t.isUnsent(), false)
})

test('an edit made while a push is in flight stays unsent when that push succeeds', () => {
  const t = createUnsentTracker()
  t.markChanged()
  const ticket = t.begin()
  t.markChanged() // edited again before the first write was answered
  t.finish(ticket, true)
  assert.equal(t.isUnsent(), true, 'the second edit was not in what the push sent')
  t.finish(t.begin(), true)
  assert.equal(t.isUnsent(), false, 'a later push that includes it clears the mark')
})

test('a failed push leaves the edit unsent', () => {
  const t = createUnsentTracker()
  t.markChanged()
  t.finish(t.begin(), false)
  assert.equal(t.isUnsent(), true)
})

test('a push that never answers never clears the mark', () => {
  const t = createUnsentTracker()
  t.markChanged()
  t.begin() // started, never finished
  assert.equal(t.isUnsent(), true)
})

test('a new sign-in starts clean, and a push left over from before cannot clear a later edit', () => {
  const t = createUnsentTracker()
  t.markChanged()
  const old = t.begin()
  t.reset()
  assert.equal(t.isUnsent(), false)
  t.markChanged()
  t.finish(old, true)
  assert.equal(t.isUnsent(), true)
})

test('the registry answers true while any holder has unsent work', () => {
  const t = createUnsentTracker()
  const remove = registerUnsentCheck(() => t.isUnsent())
  assert.equal(anyUnsent(), false)
  t.markChanged()
  assert.equal(anyUnsent(), true)
  t.finish(t.begin(), true)
  assert.equal(anyUnsent(), false)
  remove()
})

test('a holder that leaves with unsent work still counts, until sign-out has read it', () => {
  const t = createUnsentTracker()
  t.markChanged()
  const remove = registerUnsentCheck(() => t.isUnsent())
  remove() // the provider unmounted before sign-out looked
  assert.equal(anyUnsent(), true)
  forgetOrphanedUnsent()
  assert.equal(anyUnsent(), false)
})

test('a holder that leaves clean leaves nothing behind', () => {
  const t = createUnsentTracker()
  registerUnsentCheck(() => t.isUnsent())()
  assert.equal(anyUnsent(), false)
})

test('a check that throws does not stop the others being read', () => {
  const remove = registerUnsentCheck(() => { throw new Error('broken') })
  const removeOther = registerUnsentCheck(() => true)
  assert.equal(anyUnsent(), true)
  remove()
  removeOther()
  forgetOrphanedUnsent()
})

test('the sign-out buttons stop on an unsent project edit even when the flush resolves', async () => {
  const done = { flush: async () => {}, readState: () => ({ errors: [] }) }
  assert.equal(await flushBeforeSignOut({ ...done, isUnsent: () => false }), 'sent')
  assert.equal(await flushBeforeSignOut({ ...done, isUnsent: () => true }), 'unsent')
})

test('sign-out reads the unsent answer before it clears saved work', () => {
  const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
  const sync = read('src/hooks/useFirestoreSync.js')
  assert.match(sync, /const holdersUnsent = anyUnsent\(\)[\s\S]*?clearAtSignOut\(/, 'the answer is read before the clearing')
  assert.match(sync, /workIsSafeToLose: discard \|\| \(out\.released && !holdersUnsent/)
  const projects = read('src/contexts/ProjectContext.jsx')
  assert.match(projects, /registerUnsentCheck\(\(\) => unsentRef\.current\.isUnsent\(\)\)/)
  assert.match(projects, /unsentRef\.current\.begin\(\)[\s\S]*?unsentRef\.current\.finish\(ticket, !!result\.ok\)/)
  assert.match(projects, /unsentRef\.current\.markChanged\(\)/)
  const admin = read('src/pages/Admin.jsx')
  assert.match(admin, /await flushBeforeSignOut\(\)\s*await logout\(\)/, 'the admin re-sign-in flushes before it signs out')
})
