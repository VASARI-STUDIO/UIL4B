// The account switcher's model. The switching itself is
// AuthContext's (a Human Validation Zone, untouched); this holds what the menu
// shows from the device's remembered list, and that nothing secret is in it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { switcherAccounts, accountLabel, accountInitials, accountMethod, uidsToForget, MAX_LISTED } from '../../src/utils/accountSwitcher.js'
import { stripJs } from '../helpers/strip-comments.js'

const A = { uid: 'a', email: 'ann@x.test', displayName: 'Ann Lee', providerIds: ['google.com'] }
const B = { uid: 'b', email: 'bo@y.test', displayName: '', providerIds: ['password'] }
const C = { uid: 'c', email: 'cy@z.test', displayName: 'Cy', provider: 'google.com' }

test('the signed-in account is split out and never listed twice', () => {
  const { current, others } = switcherAccounts([B, A, C, A], 'a')
  assert.equal(current.uid, 'a')
  assert.deepEqual(others.map((x) => x.uid), ['b', 'c'], 'others keep the remembered order, minus the current')
})

test('a broken entry is dropped and the list is capped', () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ uid: `u${i}`, email: `u${i}@x.test` }))
  const { others } = switcherAccounts([null, { email: 'no-uid@x.test' }, ...many], 'nobody')
  assert.equal(others.length, MAX_LISTED)
  assert.equal(switcherAccounts(undefined, 'a').current, null)
})

test('labels, initials and the sign-in method are read from the entry', () => {
  assert.equal(accountLabel(A), 'Ann Lee')
  assert.equal(accountLabel(B), 'bo', 'no display name falls back to the email local part')
  assert.equal(accountLabel({}), 'Account')
  assert.equal(accountInitials(A), 'AL')
  assert.equal(accountInitials(B), 'BY')
  assert.equal(accountMethod(A), 'Google')
  assert.equal(accountMethod(B), 'Email and password')
  assert.equal(accountMethod(C), 'Google', 'the older single `provider` field still counts')
})

test('"Sign out of all" forgets every remembered account', () => {
  assert.deepEqual(uidsToForget([A, B, null, C]), ['a', 'b', 'c'])
})

test('the switcher stores nothing and never reaches for a credential', () => {
  const src = stripJs(fs.readFileSync(path.join(process.cwd(), 'src/utils/accountSwitcher.js'), 'utf8'))
  assert.doesNotMatch(src, /localStorage|sessionStorage|password\s*:|token|firebase/i,
    'the model module must only shape the list AuthContext already keeps')
  const ui = stripJs(fs.readFileSync(path.join(process.cwd(), 'src/components/nav/AccountSwitcher.jsx'), 'utf8'))
  assert.match(ui, /switchAccount\(/, 'the menu switches through AuthContext.switchAccount')
  assert.doesNotMatch(ui, /localStorage|sessionStorage/, 'the menu writes no storage of its own')
})

test('pending account changes are sent before a switch and before every sign-out', () => {
  // After the switch or sign-out the rules refuse the write, so the flush has
  // to come first, in the same handler.
  const src = stripJs(fs.readFileSync(path.join(process.cwd(), 'src/components/nav/AccountSwitcher.jsx'), 'utf8'))
  assert.match(src, /import \{ flushAccountSync \} from '\.\.\/\.\.\/hooks\/useFirestoreSync'/)
  assert.match(src, /await flushAccountSync\(\)\s*\n\s*const res = await switchAccount\(acct\)/, 'the switch does not flush first')
  assert.match(src, /const signOut = async \(\) => \{[^}]*await flushAccountSync\(\);\s*logout\(\)/, 'sign-out does not flush first')
  assert.match(src, /await flushAccountSync\(\)\s*\n\s*await logout\(\)/, '"Sign out of all" does not flush first')
})
